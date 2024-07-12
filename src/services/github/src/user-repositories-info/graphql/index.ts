import { gql } from "graphql-request";

export const UserRepositoriesInfo = gql`
  query UserRepositoriesInfo($count: Int!, $cursor: String) {
    viewer {
      repositories(first: $count, after: $cursor) {
        nodes {
          name
          owner {
            login
            id
          }
          isPrivate
          object(expression: "master:") {
            ... on Tree {
              __typename
              entries {
                path
                name
                extension
                type
                object {
                  ... on Tree {
                    entries {
                      path
                      name
                      extension
                      type
                      object {
                        ... on Tree {
                          entries {
                            path
                            name
                            extension
                            type
                            object {
                              ... on Tree {
                                entries {
                                  path
                                  name
                                  extension
                                  type
                                  object {
                                    ... on Tree {
                                      entries {
                                        path
                                        name
                                        extension
                                        type
                                        object {
                                          ... on Tree {
                                            entries {
                                              path
                                              name
                                              extension
                                              type
                                              object {
                                                ... on Tree {
                                                  entries {
                                                    path
                                                    name
                                                    extension
                                                    type
                                                    object {
                                                      ... on Tree {
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

        edges {
          cursor
        }
      }
    }
  }
`;
