import { Type } from "@sinclair/typebox";

export const YmlFileContentSchema = Type.Object({
  content: Type.String(),
  url: Type.String(),
});
