import { Field, ObjectType } from "type-graphql";
import { UserRepositoryDetails } from "./user-repository-details";

@ObjectType()
export class UserRepositoriesDetailsOutput {
  @Field(() => [UserRepositoryDetails], {
    description: "User repositories details",
  })
  repositories!: UserRepositoryDetails[];

  @Field(() => String, {
    description: "Cursor to paginate through user repositories details",
    nullable: true,
  })
  cursor?: string | null;
}
