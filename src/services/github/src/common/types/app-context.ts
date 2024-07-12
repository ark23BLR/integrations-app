import { createLogger } from "../logger";
import { getSdk } from "generated";

export type AppContext = {
  sdk: ReturnType<typeof getSdk>;
  logger: ReturnType<typeof createLogger>;
};
