import { gql } from "graphql-request";

export const UserRepositoriesList = gql`
  query UserRepositoriesList($count: Int!, $cursor: String) {
    viewer {
      repositories(first: $count, after: $cursor) {
        nodes {
          name
          owner {
            login
            id
          }
          diskUsage
        }

        edges {
          cursor
        }
      }
    }
  }
`;
