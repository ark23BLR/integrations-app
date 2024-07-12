import { Type } from "@sinclair/typebox";

export const GitTreeSchema = Type.Object({
  tree: Type.Array(
    Type.Object({
      path: Type.String(),
      type: Type.String(),
      url: Type.String(),
    }),
  ),
});
