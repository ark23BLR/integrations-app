import { Field, ObjectType } from "type-graphql";
import { UserRepository } from "./user-repository";

@ObjectType({ description: "User repositories list output" })
export class UserRepositoriesListOutput {
  @Field(() => [UserRepository], { description: "User repositories list" })
  repositories!: UserRepository[];

  @Field(() => String, {
    nullable: true,
    description: "Cursor to paginate through user repositories list",
  })
  cursor?: string | null;
}
