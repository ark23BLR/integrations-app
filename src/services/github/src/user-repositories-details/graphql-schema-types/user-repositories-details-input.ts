import { Field, InputType, Int } from "type-graphql";

@InputType()
export class UserRepositoriesDetailsInput {
  @Field({ description: "Token of github user to fetch repositories details" })
  token!: string;

  @Field(() => String, {
    description: "Cursor to paginate through user repositories details",
    nullable: true,
  })
  cursor?: string | null;

  @Field(() => Int, { description: "Max number of user repositories to fetch" })
  count!: number;
}
