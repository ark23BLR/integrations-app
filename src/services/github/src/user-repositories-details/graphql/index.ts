import { gql } from "graphql-request";

export const UserRepositoriesDetails = gql`
  query UserRepositoriesDetails($count: Int!, $cursor: String) {
    viewer {
      repositories(first: $count, after: $cursor) {
        nodes {
          name
          owner {
            login
            id
          }
          isPrivate
          defaultBranchRef {
            __typename
            target {
              ... on Commit {
                __typename
                tree {
                  ... on Tree {
                    __typename
                    entries {
                      path
                      name
                      extension
                      type
                      object {
                        __typename
                        ... on Tree {
                          __typename
                          entries {
                            path
                            name
                            extension
                            type
                            object {
                              __typename
                              ... on Tree {
                                __typename
                                entries {
                                  path
                                  name
                                  extension
                                  type
                                  object {
                                    __typename
                                    ... on Tree {
                                      __typename
                                      entries {
                                        path
                                        name
                                        extension
                                        type
                                        object {
                                          __typename
                                          ... on Tree {
                                            __typename
                                            entries {
                                              path
                                              name
                                              extension
                                              type
                                              object {
                                                __typename
                                                ... on Tree {
                                                  __typename
                                                  entries {
                                                    path
                                                    name
                                                    extension
                                                    type
                                                    object {
                                                      __typename
                                                      ... on Tree {
                                                        __typename
                                                        entries {
                                                          path
                                                          name
                                                          extension
                                                          type
                                                          object {
                                                            __typename
                                                            ... on Tree {
                                                              __typename
                                                              entries {
                                                                path
                                                                name
                                                                extension
                                                                type
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        edges {
          cursor
        }
      }
    }
  }
`;
