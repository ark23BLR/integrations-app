import {
  TNull,
  TOptional,
  TSchema,
  TUndefined,
  TUnion,
  Type,
} from "@sinclair/typebox";

type TNullable<T extends TSchema = TSchema> = TOptional<
  TUnion<[T, TNull, TUndefined]>
>;

class CustomValidationTypes {
  Nullable<T extends TSchema>(schema: T): TNullable<T> {
    const union = Type.Optional(
      Type.Union([schema, Type.Null(), Type.Undefined()]),
    );
    return { ...union, nullable: true };
  }
}

export default new CustomValidationTypes();
