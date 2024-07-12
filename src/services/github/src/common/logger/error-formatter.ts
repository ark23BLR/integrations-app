import winston from "winston";

export const errorFormatter = winston.format((info) => {
  return {
    ...info,

    ...(info.error instanceof Error
      ? {
          error: { message: info.error.message, stack: info.error.stack },
          message: info.message || info.error.message,
        }
      : {}),

    ...(info.message instanceof Object && info.message?.error instanceof Error
      ? {
          error: {
            message: info.message.error?.message,
            stack: info.message.error?.stack,
          },
          message: info.message.error.message,
        }
      : {}),
  };
});
