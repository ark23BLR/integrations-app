import { Value } from "@sinclair/typebox/value";
import { logAndReturnError } from "./log-and-return-error";

import type { StaticDecode, TSchema } from "@sinclair/typebox";
import { ErrorCode } from "../types/error-code";
import { AppContext } from "../types/app-context";

class SchemaParser {
  decode<T extends TSchema>(
    input: unknown,
    schema: T,
    logger: AppContext["logger"],
  ): StaticDecode<T> {
    const typeConverted = Value.Convert(schema, input);

    const good = Value.Check(schema, typeConverted);

    if (!good) {
      const errors = Array.from(Value.Errors(schema, typeConverted)).map(
        (e) => {
          return {
            message: e.message,
            field: e.path.substring(1),
          };
        },
      );

      throw logAndReturnError({
        errorCode: ErrorCode.ValidationError,
        logger,
        error: new Error(JSON.stringify(errors)),
        message: "Failed to parse schema",
      });
    }

    const cleared = Value.Clean(schema, typeConverted);
    return Value.Decode(schema, cleared);
  }
}

export default new SchemaParser();
