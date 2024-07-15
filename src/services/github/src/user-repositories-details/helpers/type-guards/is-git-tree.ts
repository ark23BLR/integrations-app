import { Tree } from "generated/index";

export const isGitTree = (tree: unknown): tree is Tree => {
  return (
    typeof tree === "object" &&
    !!tree &&
    "__typename" in tree &&
    tree.__typename === "Tree"
  );
};
