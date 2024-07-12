import { gql } from "apollo-server-express";
import { logAndReturnError } from "../common/helpers/log-and-return-error";
import { ErrorCode } from "../common/types/error-code";

import type { Resolvers } from "generated/resolvers";
import type { AppContext } from "../common/types/app-context";
import type {
  UserRepositoriesListOutput,
  QueryUserRepositoriesListArgs,
  Mutation,
} from "generated/resolvers";

export const typeDefs = gql`
  type GithubRepositoryOwner {
    login: String!
    id: ID!
  }

  type GithubRepository {
    name: String!
    size: Int!
    owner: GithubRepositoryOwner!
  }

  type UserRepositoriesListOutput {
    repositories: [GithubRepository!]!
    cursor: String
  }

  input UserRepositoriesListInput {
    token: String!
    cursor: String
    count: Int!
  }

  extend type RootQuery {
    userRepositoriesList(
      params: UserRepositoriesListInput!
    ): UserRepositoriesListOutput!
  }
`;

export const resolvers: Resolvers = {
  RootQuery: {
    userRepositoriesList: async (
      _: Mutation,
      { params: { token, count, cursor } }: QueryUserRepositoriesListArgs,
      context: AppContext,
    ): Promise<UserRepositoriesListOutput> => {
      if (count < 1 || count > 20) {
        throw logAndReturnError({
          errorCode: ErrorCode.ValidationError,
          logger: context.logger,
          message: "Incorrect count has been provided",
        });
      }

      try {
        const userRepositoriesListResponse =
          await context.sdk.UserRepositoriesList(
            {
              count,
              cursor,
            },
            { authorization: `Bearer ${token}` },
          );

        if (!userRepositoriesListResponse.viewer?.repositories?.nodes) {
          return {
            repositories: [],
          };
        }

        return {
          repositories: userRepositoriesListResponse.viewer.repositories.nodes
            .filter(Boolean)
            .map(({ name, diskUsage, owner }) => ({
              name,
              size: diskUsage ?? 0,
              owner: {
                id: owner.id,
                login: owner.login,
              },
            })),
          cursor:
            userRepositoriesListResponse.viewer.repositories.edges?.at(-1)
              ?.cursor,
        };
      } catch (error) {
        throw logAndReturnError({
          error,
          errorCode: ErrorCode.InternalApiError,
          logger: context.logger,
          message: "Failed to pull user repositories",
        });
      }
    },
  },
};
