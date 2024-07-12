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
  getRepositoryInfoByGitCommit,
  isGitCommit,
} from "./helpers/get-repository-info-by-git-commit";
import { YmlFileContentSchema } from "./validation-schemas/yml-file-content";

export const typeDefs = gql`
  type WebhookConfig {
    """
    Webhook config url
    """
    url: String
    """
    Webhook config content type
    """
    content_type: String
    """
    Webhook config secret
    """
    secret: String
    """
    Webhook insecure ssl
    """
    insecure_ssl: String
  }

  type LastWebhookResponse {
    """
    Last webhook response status code
    """
    code: Int
    """
    Last webhook response status
    """
    status: String
    """
    Last webhook response message
    """
    message: String
  }

  type Webhook {
    """
    Webhook id
    """
    id: Int!
    """
    Webhook name
    """
    name: String!
    """
    Flag, which indicates if webhook is active
    """
    active: Boolean!
    """
    Type of the webhook
    """
    type: String!
    """
    Webhook events
    """
    events: [String!]!
    """
    Webhook config
    """
    config: WebhookConfig!
    """
    Timestamp, which indicates when webhook was updated
    """
    updated_at: String!
    """
    Timestamp, which indicates when webhook was created
    """
    created_at: String!
    """
    Webhook url
    """
    url: String!
    """
    Webhook test url
    """
    test_url: String!
    """
    Webhook ping url
    """
    ping_url: String!
    """
    Webhook deliveries url
    """
    deliveries_url: String
    """
    Last webhook response
    """
    last_response: LastWebhookResponse!
  }

  type GithubRepositoryOwner {
    """
    Login of the github repository owner
    """
    login: String!
    """
    Identifier of the github repository owner
    """
    id: ID!
  }

  type GithubRepositoryInfo {
    """
    Repository name
    """
    name: String!
    """
    Flag, which indicates if the repository is private
    """
    isPrivate: Boolean!
    """
    Repository owner
    """
    owner: GithubRepositoryOwner!
    """
    Repository webhooks
    """
    webhooks: [Webhook!]!
    """
    Content of yml repository file, shown only if exists
    """
    ymlFileContent: String
    """
    Count of existing files in the repository
    """
    filesCount: Int!
  }

  type UserRepositoriesInfoOutput {
    """
    User repositories details
    """
    repositories: [GithubRepositoryInfo!]!
    """
    Cursor of the last item
    """
    cursor: String
  }

  input UserRepositoriesInfoInput {
    """
    Token of github user to fetch repositories details - Should not start with Bearer
    """
    token: String!
    """
    Cursor to paginate through user repositories
    """
    cursor: String
    """
    Max number of user repositories to fetch
    """
    count: Int!
  }

  extend type RootQuery {
    """
    Fetches user repositories details
    """
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
      context: AppContext
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
              { authorization: `Bearer ${token}` }
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
              .map(({ name, owner, isPrivate, defaultBranchRef }) => {
                const branchTarget = defaultBranchRef?.target;

                const { filesCount, ymlFilePath } = isGitCommit(branchTarget)
                  ? getRepositoryInfoByGitCommit(branchTarget)
                  : { filesCount: 0, ymlFilePath: null };

                if (ymlFilePath) {
                  ymlFilesGithubUrls.push(
                    `https://api.github.com/repos/${owner.login}/${name}/contents/${ymlFilePath}`
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
              })
          );

          userRepositoriesInfoResponse.cursor =
            userRepositoriesMainInfoResponse.viewer.repositories.edges?.at(
              -1
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
            `https://api.github.com/repos/${repository.owner.login}/${repository.name}/hooks`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
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
            context.logger
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
              schemaParser.decode(data, YmlFileContentSchema, context.logger)
            )
        )
      );

      for (const repository of userRepositoriesInfoResponse.repositories) {
        const [matchedYmlFile] = ymlFilesResponses
          .filter(
            (ymlFilesPromiseResult) =>
              ymlFilesPromiseResult.status === "fulfilled"
          )
          .map((ymlFilesPromiseResult) => ymlFilesPromiseResult.value)
          .filter((ymlFile) =>
            ymlFile.url.includes(`${repository.owner.login}/${repository.name}`)
          );

        if (matchedYmlFile) {
          repository.ymlFileContent = Buffer.from(
            matchedYmlFile.content,
            "base64"
          ).toString("utf-8");
        }
      }

      return userRepositoriesInfoResponse;
    },
  },
};
