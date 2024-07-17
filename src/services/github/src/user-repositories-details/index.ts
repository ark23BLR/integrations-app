import "reflect-metadata";
import axios from "axios";
import { logAndReturnError } from "../common/helpers/log-and-return-error";
import schemaParser from "../common/helpers/schema-parser";
import { ErrorCode } from "../common/types/error-code";
import { WebhooksSchema } from "./validation-schemas/webhooks";
import { getRepositoryDetailsByGitCommit } from "./helpers/get-repository-details-by-git-commit";
import { YmlFileContentSchema } from "./validation-schemas/yml-file-content";
import { githubApiUrl } from "../common/constants";
import { Resolver, Query, Arg, Ctx } from "type-graphql";
import { isGitCommit } from "./helpers/type-guards/is-git-commit";
import { UserRepositoriesDetailsOutput } from "./graphql-schema-types/user-repositories-details-output";
import { UserRepositoriesDetailsInput } from "./graphql-schema-types/user-repositories-details-input";

import type { UserRepository } from "../common/types/user-repository";
import type { AppContext } from "../common/types/app-context";

@Resolver()
export class UserRepositoriesDetailsResolver {
  @Query(() => UserRepositoriesDetailsOutput)
  async userRepositoriesDetails(
    @Arg("params", () => UserRepositoriesDetailsInput)
    params: UserRepositoriesDetailsInput,
    @Ctx() context: AppContext,
  ): Promise<UserRepositoriesDetailsOutput> {
    if (params.count < 1 || params.count > 20) {
      throw logAndReturnError({
        errorCode: ErrorCode.ValidationError,
        logger: context.logger,
        message: "Incorrect count has been provided",
      });
    }

    params.token = params.token.replace(/bearer\s+/i, "");

    let fetchedRepositoriesCount = 0;
    let isCursorExhausted = false;
    let cursor: UserRepositoriesDetailsOutput["cursor"];

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
            { authorization: `Bearer ${params.token}` },
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
            Boolean,
          ),
        );

        cursor =
          userRepositoriesDetailsResponse.viewer.repositories.edges?.at(
            -1,
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
    const ymlFilesGithubUrls: string[] = [];

    for (const repository of userRepositories) {
      const targetBranch = repository.defaultBranchRef?.target;

      const repositoryContentDetails = isGitCommit(targetBranch)
        ? getRepositoryDetailsByGitCommit(targetBranch)
        : { filesCount: 0, ymlFilePath: null };

      if (repositoryContentDetails.ymlFilePath) {
        ymlFilesGithubUrls.push(
          `${githubApiUrl}/repos/${repository.owner.login}/${repository.name}/contents/${repositoryContentDetails.ymlFilePath}`,
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
        axios
          .get(
            `${githubApiUrl}/repos/${repository.owner.login}/${repository.name}/hooks`,
            {
              headers: {
                Authorization: `Bearer ${params.token}`,
              },
            },
          )
          .then(({ data }) =>
            schemaParser.decode(data, WebhooksSchema, context.logger),
          ),
      ),
    );

    for (const [index, repository] of userRepositoriesDetails.entries()) {
      if (webhooksResponses[index].status === "rejected") {
        continue;
      }

      repository.webhooks = webhooksResponses[index].value.filter(
        (webhook) => webhook.active,
      );
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
            schemaParser.decode(data, YmlFileContentSchema, context.logger),
          ),
      ),
    );

    for (const repository of userRepositoriesDetails) {
      const matchedYmlFile = ymlFilesResponses
        .filter(
          (ymlFilesPromiseResult) =>
            ymlFilesPromiseResult.status === "fulfilled",
        )
        .map((ymlFilesPromiseResult) => ymlFilesPromiseResult.value)
        .find((ymlFile) =>
          ymlFile.url.includes(`${repository.owner.login}/${repository.name}`),
        );

      if (matchedYmlFile) {
        repository.ymlFileContent = Buffer.from(
          matchedYmlFile.content,
          "base64",
        ).toString("utf-8");
      }
    }

    return {
      repositories: userRepositoriesDetails,
      cursor,
    };
  }
}
