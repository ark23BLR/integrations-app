import { Field, ObjectType } from "type-graphql";

@ObjectType({ description: "Repository owner" })
export class RepositoryOwner {
  @Field(() => String, { description: "Repository owner login" })
  login!: string;

  @Field(() => String, { description: "Repository owner login" })
  id!: string;
}
