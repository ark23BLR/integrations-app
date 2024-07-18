import { Field, Int, ObjectType } from "type-graphql";
import { UserRepositoryOwner } from "./user-repository-owner";
import { Webhook } from "./webhook";

@ObjectType({ description: "Github repository details" })
export class UserRepositoryDetails {
  @Field(() => String, { description: "Repository name" })
  name!: string;

  @Field(() => Boolean, {
    description: "Flag, which indicates if the repository is private",
  })
  isPrivate!: boolean;

  @Field(() => Int, {
    description: "Count of existing files in the repository",
    nullable: true,
  })
  filesCount?: number | null;

  @Field(() => String, {
    description: "Content of yml repository file, shown only if exists",
    nullable: true,
  })
  ymlFileContent?: string | null;

  @Field(() => [Webhook], { description: "Active repository webhooks" })
  webhooks!: Webhook[];

  @Field(() => UserRepositoryOwner, { description: "Repository owner" })
  owner!: UserRepositoryOwner;
}
