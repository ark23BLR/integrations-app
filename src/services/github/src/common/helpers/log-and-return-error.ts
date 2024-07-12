import { ApolloError } from "apollo-server-express";

import type { Logger } from "winston";
import type { ErrorCode } from "../types/error-code";

export const logAndReturnError = (params: {
  error?: unknown;
  errorCode: ErrorCode;
  logger: Logger;
  message: string;
}): ApolloError => {
  const errorMessage =
    params.error instanceof Error ? params.error.message : params.message;

  params.logger["error"](errorMessage, {
    ...(params.error instanceof Error ? { error: params.error } : {}),
  });

  return new ApolloError(params.message, params.errorCode);
};
