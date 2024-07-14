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
    """
    Login of the github repository owner
    """
    login: String!
    """
    Identifier of the github repository owner
    """
    id: ID!
  }

  type GithubRepository {
    """
    Name of the github repository
    """
    name: String!
    """
    Size of the repository, which is calculated in kilobytes
    """
    size: Int!
    """
    Repository owner
    """
    owner: GithubRepositoryOwner!
  }

  type UserRepositoriesListOutput {
    """
    List of user repositories
    """
    repositories: [GithubRepository!]!
    """
    Cursor of the last item
    """
    cursor: String
  }

  input UserRepositoriesListInput {
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
    Fetches list of user repositories
    """
    userRepositoriesList(
      params: UserRepositoriesListInput!
    ): UserRepositoriesListOutput!
  }
`;

export const resolvers: Resolvers = {
  RootQuery: {
    userRepositoriesList: async (
      _: Mutation,
      { params }: QueryUserRepositoriesListArgs,
      context: AppContext
    ): Promise<UserRepositoriesListOutput> => {
      if (params.count < 1 || params.count > 20) {
        throw logAndReturnError({
          errorCode: ErrorCode.ValidationError,
          logger: context.logger,
          message: "Incorrect count has been provided",
        });
      }

      params.token = params.token.replace(/bearer\s+/i, "");

      try {
        const userRepositoriesListResponse =
          await context.sdk.UserRepositoriesList(params, {
            authorization: `Bearer ${params.token}`,
          });

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
