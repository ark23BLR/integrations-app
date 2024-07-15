import { Field, ID, ObjectType } from "type-graphql";

@ObjectType({ description: "Github Repository Owner" })
export class UserRepositoryOwner {
  @Field({ description: "Login of the github repository owner" })
  login!: string;

  @Field(() => ID, { description: "Identifier of the github repository owner" })
  id!: string;
}
