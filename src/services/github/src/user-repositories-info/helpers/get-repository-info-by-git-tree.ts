import { Tree } from "generated/index";

export const isGitTree = (tree: unknown): tree is Tree => {
  return (
    typeof tree === "object" &&
    !!tree &&
    "__typename" in tree &&
    tree.__typename === "Tree"
  );
};

export const getRepositoryInfoByGitTree = (
  gitTree: Tree,
): { filesCount: number; ymlFilePath: string | null } => {
  let filesCount = 0;
  let ymlFilePath: string | null = null;

  if (!gitTree?.entries?.length) {
    return { filesCount: 0, ymlFilePath };
  }

  for (const entry of gitTree.entries) {
    if (!("type" in entry)) {
      continue;
    }

    if (entry.extension === ".yml" && entry.path) {
      ymlFilePath = entry.path;
    }

    if (entry.type === "blob") {
      filesCount += 1;
      continue;
    }

    if (!entry.object || !Object.keys(entry.object).length) {
      continue;
    }

    const {
      filesCount: currentTreeFilesCount,
      ymlFilePath: currentTreeymlFilePath,
    } = getRepositoryInfoByGitTree(entry.object);

    filesCount += currentTreeFilesCount;

    if (currentTreeymlFilePath && !ymlFilePath) {
      ymlFilePath = currentTreeymlFilePath;
    }
  }

  return { filesCount, ymlFilePath };
};
