import { Field, InputType, Int } from "type-graphql";

@InputType({ description: "User repositories list input" })
export class UserRepositoriesListInput {
  @Field(() => String, { description: "Github user token" })
  token!: string;

  @Field(() => String, {
    nullable: true,
    description: "Cursor to iterate user repositories",
  })
  cursor?: string | null;

  @Field(() => Int, { description: "Max number of user repositories to fetch" })
  count!: number;
}
