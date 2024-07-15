import { Commit } from "generated/index";

export const isGitCommit = (commit: unknown): commit is Commit => {
  return (
    typeof commit === "object" &&
    !!commit &&
    "__typename" in commit &&
    commit.__typename === "Commit"
  );
};
