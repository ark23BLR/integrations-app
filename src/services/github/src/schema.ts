import { buildSchema } from "type-graphql";
import { UserRepositoriesListResolver } from "./user-repositories-list";
import { UserRepositoriesDetailsResolver } from "./user-repositories-details";

export const schemaBuilder = () =>
  buildSchema({
    resolvers: [UserRepositoriesListResolver, UserRepositoriesDetailsResolver],
    emitSchemaFile: false,
  });
