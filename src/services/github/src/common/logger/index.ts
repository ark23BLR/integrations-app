import winston from "winston";
import { errorFormatter } from "./error-formatter";

export const createLogger = () =>
  winston.createLogger({
    exitOnError: false,
    format: winston.format.combine(
      errorFormatter(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
    level: "debug",
    transports: [new winston.transports.Console()],
  });
