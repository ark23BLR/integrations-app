import { gql } from "apollo-server-express";
import { logAndReturnError } from "../common/helpers/log-and-return-error";
import schemaParser from "../common/helpers/schema-parser";
import { ErrorCode } from "../common/types/error-code";
import axios from "axios";
import { WebhooksSchema } from "./validation-schemas/webhooks";

import type {
  Resolvers,
  Mutation,
  QueryUserRepositoriesDetailsArgs,
  UserRepositoriesDetailsOutput,
} from "generated/resolvers";
import type { AppContext } from "../common/types/app-context";
import {
  getRepositoryDetailsByGitCommit,
  isGitCommit,
} from "./helpers/get-repository-details-by-git-commit";
import { YmlFileContentSchema } from "./validation-schemas/yml-file-content";
import { UserRepositoriesDetailsQuery } from "generated/index";

type UserRepository = NonNullable<
  NonNullable<
    UserRepositoriesDetailsQuery["viewer"]["repositories"]["nodes"]
  >[number]
>;

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

  type GithubRepositoryDetails {
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
    Active repository webhooks
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

  type UserRepositoriesDetailsOutput {
    """
    User repositories details
    """
    repositories: [GithubRepositoryDetails!]!
    """
    Cursor of the last item
    """
    cursor: String
  }

  input UserRepositoriesDetailsInput {
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
    userRepositoriesDetails(
      params: UserRepositoriesDetailsInput!
    ): UserRepositoriesDetailsOutput!
  }
`;

export const resolvers: Resolvers = {
  RootQuery: {
    userRepositoriesDetails: async (
      _: Mutation,
      { params }: QueryUserRepositoriesDetailsArgs,
      context: AppContext
    ): Promise<UserRepositoriesDetailsOutput> => {
      if (params.count < 1 || params.count > 20) {
        throw logAndReturnError({
          errorCode: ErrorCode.ValidationError,
          logger: context.logger,
          message: "Incorrect count has been provided",
        });
      }

      let fetchedRepositoriesCount = 0;
      let isCursorExhausted = false;
      let cursor: UserRepositoriesDetailsOutput["cursor"];

      const ymlFilesGithubUrls: string[] = [];
      const userRepositories: UserRepository[] = [];

      try {
        while (
          fetchedRepositoriesCount >= 0 &&
          fetchedRepositoriesCount < params.count &&
          !isCursorExhausted
        ) {
          const numberOfRepositoriesToFetch =
            params.count - fetchedRepositoriesCount === 1 ? 1 : 2;

          const userRepositoriesDetailsResponse =
            await context.sdk.UserRepositoriesDetails(
              {
                count: numberOfRepositoriesToFetch,
                cursor: cursor ?? params.cursor,
              },
              { authorization: `Bearer ${params.token}` }
            );

          if (
            !userRepositoriesDetailsResponse.viewer.repositories.nodes?.length
          ) {
            cursor = null;
            isCursorExhausted = true;
            break;
          }

          userRepositories.push(
            ...userRepositoriesDetailsResponse.viewer.repositories.nodes.filter(
              Boolean
            )
          );

          cursor =
            userRepositoriesDetailsResponse.viewer.repositories.edges?.at(
              -1
            )?.cursor;

          if (!cursor) {
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

      const userRepositoriesDetails: UserRepositoriesDetailsOutput["repositories"] =
        [];

      for (const repository of userRepositories) {
        const targetBranch = repository.defaultBranchRef?.target;

        const repositoryContentDetails = isGitCommit(targetBranch)
          ? getRepositoryDetailsByGitCommit(targetBranch)
          : { filesCount: 0, ymlFilePath: null };

        if (repositoryContentDetails) {
          ymlFilesGithubUrls.push(
            `https://api.github.com/repos/${repository.owner.login}/${repository.name}/contents/${repositoryContentDetails.ymlFilePath}`
          );
        }

        userRepositoriesDetails.push({
          name: repository.name,
          owner: {
            login: repository.owner.login,
            id: repository.owner.id,
          },
          isPrivate: repository.isPrivate,
          webhooks: [],
          filesCount: repositoryContentDetails.filesCount,
        });
      }

      const webhooksResponses = await Promise.allSettled(
        userRepositoriesDetails.map((repository) =>
          axios.get(
            `https://api.github.com/repos/${repository.owner.login}/${repository.name}/hooks`,
            {
              headers: {
                Authorization: `Bearer ${params.token}`,
              },
            }
          )
        )
      );

      try {
        for (const [index, repository] of userRepositoriesDetails.entries()) {
          if (webhooksResponses[index].status === "rejected") {
            continue;
          }

          repository.webhooks = schemaParser
            .decode(
              webhooksResponses[index].value.data,
              WebhooksSchema,
              context.logger
            )
            .filter((webhook) => webhook.active);
        }
      } catch (error) {
        throw logAndReturnError({
          error,
          logger: context.logger,
          message: "Failed to parse repository webhooks",
          errorCode: ErrorCode.InternalApiError,
        });
      }

      const ymlFilesResponses = await Promise.allSettled(
        ymlFilesGithubUrls.map((ymlFileGithubUrl) =>
          axios
            .get(ymlFileGithubUrl, {
              headers: {
                Authorization: `Bearer ${params.token}`,
              },
            })
            .then(({ data }) =>
              schemaParser.decode(data, YmlFileContentSchema, context.logger)
            )
        )
      );

      for (const repository of userRepositoriesDetails) {
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

      return {
        repositories: userRepositoriesDetails,
        cursor,
      };
    },
  },
};
