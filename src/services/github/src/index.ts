import { ApolloServer } from "apollo-server-express";
import http from "http";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { GraphQLClient } from "graphql-request";
import { app } from "./app";
import { schema } from "./schema";
import { getSdk } from "generated";
import { createLogger } from "./common/logger";

import type { AppContext } from "./common/types/app-context";

(async () => {
  const httpServer = http.createServer(app);
  const logger = createLogger();

  const server = new ApolloServer({
    context: () => {
      return {
        sdk: getSdk(new GraphQLClient(process.env.GITHUB_GRAPHQL_URL!)),
        logger,
      } satisfies AppContext;
    },
    debug: true,
    introspection: true,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
    schema,
  });

  await server.start();
  server.applyMiddleware({ app, path: "/" });
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: process.env.APP_PORT! }, resolve),
  );
  console.log(`🚀 Server ready at http://localhost:${process.env.APP_PORT!}`);
})();
