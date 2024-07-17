import { ApolloServer, gql } from "apollo-server-express";
import { schema } from "../../schema";
import nock from "nock";

import type { AppContext } from "../../common/types/app-context";
import { githubApiUrl } from "src/common/constants";
import { WebhooksSchema } from "../validation-schemas/webhooks";
import { Value } from "@sinclair/typebox/value";
import _ from "lodash";

const logger = {
  error: console.error,
  info: console.log,
  warn: console.log,
} as AppContext["logger"];

const ymlFilePath = "path/src";
const filesCount = 1;

// jest.mock("../helpers/type-guards/is-git-commit", () => ({
//   isGitCommit: () => true,
// }));

// jest.mock("../helpers/get-repository-details-by-git-commit", () => ({
//   getRepositoryDetailsByGitCommit: () => ({
//     ymlFilePath,
//     filesCount,
//   }),
// }));

describe("User repositories details query", () => {
  const environment = process.env;
  const bearerToken = "Bearer bearer_token_example";
  const ymlFileContent = "yml file content";
  const cursor = "cursor";
  const gqlTag = gql`
    query UserRepositoriesDetails(
      $count: Int!
      $token: String!
      $cursor: String
    ) {
      userRepositoriesDetails(
        params: { count: $count, token: $token, cursor: $cursor }
      ) {
        repositories {
          isPrivate
          filesCount
          name
          owner {
            login
            id
          }
          ymlFileContent
          webhooks {
            id
            name
            active
          }
        }
        cursor
      }
    }
  `;

  const userRepositoryDetails = {
    name: "repository_name",
    filesCount,
    isPrivate: true,
    owner: {
      login: "Repository_owner_login",
      id: "Repository_owner_id",
    },
    webhooks: [{ ...Value.Create(WebhooksSchema.items), active: true }],
    ymlFileContent,
  };

  const userRepositoryDetailsSdkResponse = {
    viewer: {
      repositories: {
        nodes: [
          {
            ...userRepositoryDetails,
            defaultBranchRef: {
              target: {
                __typename: "Commit",
                tree: {
                  entries: [
                    { type: "blob", extension: ".yml", path: ymlFilePath },
                  ],
                },
              },
            },
          },
        ],
        edges: [{ cursor }],
      },
    },
  };

  beforeEach(() => {
    process.env = { ...environment };
    nock(githubApiUrl)
      .get(
        `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/contents/${ymlFilePath}`,
      )
      .reply(200, {
        content: Buffer.from(ymlFileContent).toString("base64"),
        url: `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/contents/${ymlFilePath}`,
      });

    nock(githubApiUrl)
      .get(
        `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/hooks`,
      )
      .reply(200, userRepositoryDetails.webhooks);
  });

  afterEach(() => {
    process.env = environment;
  });

  it("should call `sdk.UserRepositoriesDetails` correctly", async () => {
    const sdk = {
      UserRepositoriesDetails: jest.fn(() =>
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

    expect(sdk.UserRepositoriesDetails).toHaveBeenCalledWith(
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
      UserRepositoriesDetails: jest.fn(() =>
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
      UserRepositoriesDetails: jest.fn(() =>
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

  it("should not return not active webhooks", async () => {
    nock.cleanAll();

    nock(githubApiUrl)
      .get(
        `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/contents/${ymlFilePath}`,
      )
      .reply(200, {
        content: Buffer.from(ymlFileContent).toString("base64"),
        url: `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/contents/${ymlFilePath}`,
      });

    nock(githubApiUrl)
      .get(
        `/repos/${userRepositoryDetails.owner.login}/${userRepositoryDetails.name}/hooks`,
      )
      .reply(200, [{ ...Value.Create(WebhooksSchema.items), active: false }]);

    const sdk = {
      UserRepositoriesDetails: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: userRepositoryDetailsSdkResponse.viewer.repositories.nodes,
              edges: userRepositoryDetailsSdkResponse.viewer.repositories.edges,
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

    expect(response.data?.userRepositoriesDetails).toMatchObject({
      repositories:
        userRepositoryDetailsSdkResponse.viewer.repositories.nodes.map(
          ({ ...node }) => ({
            ..._.omit(node, "defaultBranchRef"),
            webhooks: [],
          }),
        ),
      cursor,
    });
  });

  it("should successfully return user repositories details if some repositories are null on github side", async () => {
    const sdk = {
      UserRepositoriesDetails: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: [
                ...userRepositoryDetailsSdkResponse.viewer.repositories.nodes,
                null,
                null,
              ],
              edges: userRepositoryDetailsSdkResponse.viewer.repositories.edges,
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

    expect(response.data?.userRepositoriesDetails).toMatchObject({
      repositories:
        userRepositoryDetailsSdkResponse.viewer.repositories.nodes.map(
          ({ webhooks, ...node }) => ({
            ..._.omit(node, "defaultBranchRef"),
            webhooks: _.pick(webhooks, ["id", "name"]),
          }),
        ),
      cursor,
    });
  });

  it("should successfully return user repositories details", async () => {
    const sdk = {
      UserRepositoriesDetails: jest.fn(() =>
        Promise.resolve({
          viewer: {
            repositories: {
              nodes: userRepositoryDetailsSdkResponse.viewer.repositories.nodes,
              edges: userRepositoryDetailsSdkResponse.viewer.repositories.edges,
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

    expect(response.data?.userRepositoriesDetails).toMatchObject({
      repositories:
        userRepositoryDetailsSdkResponse.viewer.repositories.nodes.map(
          ({ webhooks, ...node }) => ({
            ..._.omit(node, "defaultBranchRef"),
            webhooks: _.pick(webhooks, ["id", "name"]),
          }),
        ),
      cursor,
    });
  });

  it("should fail with Internal Api Error if `sdk.UserRepositoriesDetails` is rejected", async () => {
    const error = new Error("Github API Error");
    const sdk = {
      UserRepositoriesDetails: jest.fn(() => Promise.reject(error)),
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
