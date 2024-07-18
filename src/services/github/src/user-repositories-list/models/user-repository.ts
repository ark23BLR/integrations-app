import { Field, Int, ObjectType } from "type-graphql";
import { RepositoryOwner } from "./repository-owner";

@ObjectType({ description: "User repository" })
export class UserRepository {
  @Field(() => RepositoryOwner, { description: "User repository owner" })
  owner!: RepositoryOwner;

  @Field(() => String, { description: "User repository name" })
  name!: string;

  @Field(() => Int, { description: "User repository size in kilobytes" })
  size!: number;
}
