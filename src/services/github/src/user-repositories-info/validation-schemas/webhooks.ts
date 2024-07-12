import { Type } from "@sinclair/typebox";
import CustomValidationTypes from "../../common/helpers/custom-validation-types";

export const WebhooksSchema = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    active: Type.Boolean(),
    type: Type.String(),
    events: Type.Array(Type.String()),
    config: Type.Object({
      url: CustomValidationTypes.Nullable(Type.String()),
      content_type: CustomValidationTypes.Nullable(Type.String()),
      secret: CustomValidationTypes.Nullable(Type.String()),
      insecure_ssl: CustomValidationTypes.Nullable(Type.String()),
    }),
    updated_at: Type.String(),
    created_at: Type.String(),
    url: Type.String(),
    test_url: Type.String(),
    ping_url: Type.String(),
    deliveries_url: CustomValidationTypes.Nullable(Type.String()),
    last_response: Type.Object({
      code: CustomValidationTypes.Nullable(Type.Number()),
      status: CustomValidationTypes.Nullable(Type.String()),
      message: CustomValidationTypes.Nullable(Type.String()),
    }),
  }),
);
