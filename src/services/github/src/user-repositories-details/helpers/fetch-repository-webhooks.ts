import axios from "axios";
import { githubApiUrl } from "../../common/constants";
import { AppContext } from "../../common/types/app-context";
import schemaParser from "../../common/helpers/schema-parser";
import { WebhooksSchema } from "../validation-schemas/webhooks";
import { UserRepositoryDetails } from "../models/user-repository-details";
import { logAndReturnError } from "../../common/helpers/log-and-return-error";
import { ErrorCode } from "../../common/types/error-code";

export const fetchRepositoryWebhooks = async (
  repository: Pick<UserRepositoryDetails, "owner" | "name">,
  token: string,
  logger: AppContext["logger"],
) => {
  try {
    const { data } = await axios.get(
      `${githubApiUrl}/repos/${repository.owner.login}/${repository.name}/hooks`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    return schemaParser.decode(data, WebhooksSchema, logger);
  } catch (error) {
    throw logAndReturnError({
      error,
      errorCode: ErrorCode.InternalApiError,
      message: "Failed to fetch repository webhooks",
      logger,
    });
  }
};
