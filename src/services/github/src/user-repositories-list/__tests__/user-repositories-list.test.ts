import { ApolloServer, gql } from "apollo-server-express";
import { schema } from "../../schema";

import type { AppContext } from "../../common/types/app-context";

const logger = {
  error: console.error,
  info: console.log,
  warn: console.log,
} as AppContext["logger"];

describe("User repositories list query", () => {
  const environment = process.env;
  const bearerToken = "Bearer bearer_token_example";
  const gqlTag = gql`
    query UserRepositoriesList($count: Int!, $token: String!, $cursor: String) {
      userRepositoriesList(
        params: { count: $count, token: $token, cursor: $cursor }
      ) {
        repositories {
          size
          name
          owner {
            login
            id
          }
        }
        cursor
      }
    }
  `;

  beforeEach(() => {
    process.env = { ...environment };
  });

  afterEach(() => {
    process.env = environment;
  });

  it("should call `sdk.UserRepositoriesList` correctly", async () => {
    const sdk = {
      UserRepositoriesList: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: [],
            },
          },
        }),
      ),
    };

    const params = { count: 1, token: bearerToken, cursor: "cursor" };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    await server.executeOperation({
      query: gqlTag,

      variables: { count: 1, token: bearerToken, cursor: "cursor" },
    });

    expect(sdk.UserRepositoriesList).toHaveBeenCalledWith(
      expect.objectContaining({
        count: params.count,
        cursor: params.cursor,
      }),
      {
        authorization: params.token,
      },
    );
  });

  it("should throw a validation error if count less than 1", async () => {
    const sdk = {
      UserRepositoriesList: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: [],
            },
          },
        }),
      ),
    };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    const response = await server.executeOperation({
      query: gqlTag,

      variables: { count: 0, token: bearerToken },
    });

    const result = JSON.stringify(response.errors);
    expect(result).toContain("VALIDATION_ERROR");
  });

  it("should throw validation error if count higher than 20", async () => {
    const sdk = {
      UserRepositoriesList: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: [],
            },
          },
        }),
      ),
    };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    const response = await server.executeOperation({
      query: gqlTag,

      variables: { count: 30, token: bearerToken },
    });

    const result = JSON.stringify(response.errors);
    expect(result).toContain("VALIDATION_ERROR");
  });

  it("should successfully return user repositories if some repositories are null on github side", async () => {
    const expectedUserRepositoriesList = [
      {
        size: 124,
        name: "Repository name",
        owner: {
          id: "Repository owner id",
          login: "Repository owner login",
        },
      },
    ];
    const expectedCursor = "cursor";

    const sdk = {
      UserRepositoriesList: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: [
                ...expectedUserRepositoriesList.map(({ size, ...data }) => ({
                  ...data,
                  diskUsage: size,
                })),
                null,
                null,
              ],
              edges: [
                { cursor: "first-cursor" },
                { cursor: "second-cursor" },
                { cursor: expectedCursor },
              ],
            },
          },
        }),
      ),
    };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    const response = await server.executeOperation({
      query: gqlTag,

      variables: { count: 1, token: bearerToken },
    });

    expect(response.data?.userRepositoriesList).toMatchObject({
      repositories: expectedUserRepositoriesList,
      cursor: expectedCursor,
    });
  });

  it("should successfully return user repositories", async () => {
    const expectedUserRepositoriesList = [
      {
        size: 124,
        name: "Repository name",
        owner: {
          id: "Repository owner id",
          login: "Repository owner login",
        },
      },
    ];
    const expectedCursor = "cursor";

    const sdk = {
      UserRepositoriesList: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: expectedUserRepositoriesList.map(({ size, ...data }) => ({
                ...data,
                diskUsage: size,
              })),
              edges: [{ cursor: "first-cursor" }, { cursor: expectedCursor }],
            },
          },
        }),
      ),
    };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    const response = await server.executeOperation({
      query: gqlTag,

      variables: { count: 1, token: bearerToken },
    });

    expect(response.data?.userRepositoriesList).toMatchObject({
      repositories: expectedUserRepositoriesList,
      cursor: expectedCursor,
    });
  });

  it("should fail with Internal Api Error if `sdk.UserRepositoriesList` is rejected", async () => {
    const error = new Error("Github API Error");
    const sdk = {
      UserRepositoriesList: jest.fn(() => Promise.reject(error)),
    };

    const server = new ApolloServer({
      context: () => ({ logger, sdk }),
      schema,
    });

    const response = await server.executeOperation({
      query: gqlTag,

      variables: { count: 10, token: bearerToken },
    });

    const result = JSON.stringify(response.errors);
    expect(result).toContain("INTERNAL_API_ERROR");
    expect(result).toContain("Failed to pull user repositories");
  });
});
