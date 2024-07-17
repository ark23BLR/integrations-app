import { buildSchemaSync } from "type-graphql";
import { UserRepositoriesListResolver } from "./user-repositories-list";
import { UserRepositoriesDetailsResolver } from "./user-repositories-details";

export const schema = buildSchemaSync({
  resolvers: [UserRepositoriesListResolver, UserRepositoriesDetailsResolver],
  emitSchemaFile: false,
});
