import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { gql } from "apollo-server-express";
import {
  resolvers as getUserRepositoriesResolver,
  typeDefs as getUserRepositoriesTypeDefs,
} from "./user-repositories-info";
import {
  resolvers as getUserRepositoriesListResolver,
  typeDefs as getUserRepositoriesListTypeDefs,
} from "./user-repositories-list";

export const schema = makeExecutableSchema({
  resolvers: mergeResolvers([
    getUserRepositoriesResolver,
    getUserRepositoriesListResolver,
  ]),
  typeDefs: mergeTypeDefs([
    gql`
      schema {
        query: RootQuery
        mutation: RootMutation
      }

      type RootQuery
      type RootMutation {
        _emptyQuery: String
      }
    `,
    getUserRepositoriesListTypeDefs,
    getUserRepositoriesTypeDefs,
  ]),
});
