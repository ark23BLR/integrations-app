import "reflect-metadata";
import { logAndReturnError } from "../common/helpers/log-and-return-error";
import { ErrorCode } from "../common/types/error-code";
import { Resolver, Query, Arg, Ctx } from "type-graphql";
import { UserRepositoriesListOutput } from "./models/user-repositories-list-output";
import { UserRepositoriesListInput } from "./models/user-repositories-list-input";

import type { AppContext } from "../common/types/app-context";

@Resolver()
export class UserRepositoriesListResolver {
  @Query(() => UserRepositoriesListOutput)
  async userRepositoriesList(
    @Arg("params", () => UserRepositoriesListInput)
    params: UserRepositoriesListInput,
    @Ctx() context: AppContext,
  ): Promise<UserRepositoriesListOutput> {
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
  }
}
