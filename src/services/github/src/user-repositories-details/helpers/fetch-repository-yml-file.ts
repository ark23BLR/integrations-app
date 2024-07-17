import axios from "axios";
import { YmlFileContentSchema } from "../validation-schemas/yml-file-content";
import { AppContext } from "../../common/types/app-context";
import schemaParser from "../../common/helpers/schema-parser";
import { logAndReturnError } from "../../common/helpers/log-and-return-error";
import { ErrorCode } from "../../common/types/error-code";

export const fetchRepositoryYmlFile = async (
  ymlFileGithubUrl: string,
  token: string,
  logger: AppContext["logger"],
) => {
  try {
    const { data } = await axios.get(ymlFileGithubUrl, {
      headers: {
        Authorization: token,
      },
    });

    return schemaParser.decode(data, YmlFileContentSchema, logger);
  } catch (error) {
    throw logAndReturnError({
      error,
      errorCode: ErrorCode.InternalApiError,
      message: "Failed to fetch repository yml file",
      logger,
    });
  }
};
