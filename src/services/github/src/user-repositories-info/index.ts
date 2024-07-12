import { gql } from "apollo-server-express";
import { logAndReturnError } from "../common/helpers/log-and-return-error";
import schemaParser from "../common/helpers/schema-parser";
import { ErrorCode } from "../common/types/error-code";
import axios from "axios";
import { WebhooksSchema } from "./validation-schemas/webhooks";

import type {
  Resolvers,
  Mutation,
  QueryUserRepositoriesInfoArgs,
  UserRepositoriesInfoOutput,
} from "generated/resolvers";
import type { AppContext } from "../common/types/app-context";
import {
  getRepositoryInfoByGitTree,
  isGitTree,
} from "./helpers/get-repository-info-by-git-tree";
import { YmlFileContentSchema } from "./validation-schemas/yml-file-content";

export const typeDefs = gql`
  type WebhookConfig {
    url: String
    content_type: String
    secret: String
    insecure_ssl: String
  }

  type LastWebhookResponse {
    code: Int
    status: String
    message: String
  }

  type Webhook {
    id: Int!
    name: String!
    active: Boolean!
    type: String!
    events: [String!]!
    config: WebhookConfig!
    updated_at: String!
    created_at: String!
    url: String!
    test_url: String!
    ping_url: String!
    deliveries_url: String
    last_response: LastWebhookResponse!
  }

  type GithubRepositoryOwner {
    login: String!
    id: ID!
  }

  type GithubRepositoryInfo {
    name: String!
    isPrivate: Boolean!
    owner: GithubRepositoryOwner!
    webhooks: [Webhook!]!
    ymlFileContent: String
    filesCount: Int!
  }

  type UserRepositoriesInfoOutput {
    repositories: [GithubRepositoryInfo!]!
    cursor: String
  }

  input UserRepositoriesInfoInput {
    token: String!
    cursor: String
    count: Int!
  }

  extend type RootQuery {
    userRepositoriesInfo(
      params: UserRepositoriesInfoInput!
    ): UserRepositoriesInfoOutput!
  }
`;

export const resolvers: Resolvers = {
  RootQuery: {
    userRepositoriesInfo: async (
      _: Mutation,
      { params: { token, count, cursor } }: QueryUserRepositoriesInfoArgs,
      context: AppContext,
    ): Promise<UserRepositoriesInfoOutput> => {
      if (count < 1 || count > 20) {
        throw logAndReturnError({
          errorCode: ErrorCode.ValidationError,
          logger: context.logger,
          message: "Incorrect count has been provided",
        });
      }

      let userRepositoriesInfoResponse: UserRepositoriesInfoOutput = {
        repositories: [],
        cursor,
      };

      let fetchedRepositoriesCount = 0;
      let isCursorExhausted = false;

      const ymlFilesGithubUrls: string[] = [];

      try {
        while (
          fetchedRepositoriesCount >= 0 &&
          fetchedRepositoriesCount < count &&
          !isCursorExhausted
        ) {
          const numberOfRepositoriesToFetch =
            count - fetchedRepositoriesCount === 1 ? 1 : 2;

          const userRepositoriesMainInfoResponse =
            await context.sdk.UserRepositoriesInfo(
              {
                count: numberOfRepositoriesToFetch,
                cursor: userRepositoriesInfoResponse.cursor ?? cursor,
              },
              { authorization: `Bearer ${token}` },
            );

          if (
            !userRepositoriesMainInfoResponse.viewer.repositories.nodes?.length
          ) {
            userRepositoriesInfoResponse.cursor = null;
            isCursorExhausted = true;
            break;
          }

          userRepositoriesInfoResponse.repositories.push(
            ...userRepositoriesMainInfoResponse.viewer.repositories.nodes
              .filter(Boolean)
              .map(({ name, owner, isPrivate, object }) => {
                const { filesCount, ymlFilePath } = isGitTree(object)
                  ? getRepositoryInfoByGitTree(object)
                  : { filesCount: 0, ymlFilePath: null };

                if (ymlFilePath) {
                  ymlFilesGithubUrls.push(
                    `https://api.github.com/repos/${owner.login}/${name}/contents/${ymlFilePath}`,
                  );
                }

                return {
                  name,
                  owner: {
                    login: owner.login,
                    id: owner.id,
                  },
                  isPrivate,
                  webhooks: [],
                  filesCount,
                };
              }),
          );

          userRepositoriesInfoResponse.cursor =
            userRepositoriesMainInfoResponse.viewer.repositories.edges?.at(
              -1,
            )?.cursor;

          if (!userRepositoriesInfoResponse.cursor) {
            isCursorExhausted = true;
            break;
          }

          fetchedRepositoriesCount += numberOfRepositoriesToFetch;
        }
      } catch (error) {
        throw logAndReturnError({
          error,
          errorCode: ErrorCode.InternalApiError,
          logger: context.logger,
          message: "Failed to pull user repositories",
        });
      }

      const webhooksResponses = await Promise.allSettled(
        userRepositoriesInfoResponse.repositories.map((repository) =>
          axios.get(
            `https://api.github.com/repos/${repository.owner}/${repository.name}/hooks`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          ),
        ),
      );

      for (const [
        index,
        repository,
      ] of userRepositoriesInfoResponse.repositories.entries()) {
        try {
          if (webhooksResponses[index].status === "rejected") {
            continue;
          }

          repository.webhooks = schemaParser.decode(
            webhooksResponses[index].value.data,
            WebhooksSchema,
            context.logger,
          );
        } catch (error) {
          throw logAndReturnError({
            error,
            logger: context.logger,
            message: "Failed to parse repository webhooks",
            errorCode: ErrorCode.InternalApiError,
          });
        }
      }

      const ymlFilesResponses = await Promise.allSettled(
        ymlFilesGithubUrls.map((ymlFileGithubUrl) =>
          axios
            .get(ymlFileGithubUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            .then(({ data }) =>
              schemaParser.decode(data, YmlFileContentSchema, context.logger),
            ),
        ),
      );

      for (const repository of userRepositoriesInfoResponse.repositories) {
        const [matchedYmlFile] = ymlFilesResponses
          .filter(
            (ymlFilesPromiseResult) =>
              ymlFilesPromiseResult.status === "fulfilled",
          )
          .map((ymlFilesPromiseResult) => ymlFilesPromiseResult.value)
          .filter((ymlFile) =>
            ymlFile.url.includes(`${repository.owner}/${repository.name}`),
          );

        if (matchedYmlFile) {
          repository.ymlFileContent = Buffer.from(
            matchedYmlFile.content,
            "base64",
          ).toString("utf-8");
        }
      }

      return userRepositoriesInfoResponse;
    },
  },
};
