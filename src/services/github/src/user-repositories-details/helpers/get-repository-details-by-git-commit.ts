import { Commit, Tree } from "generated/index";

export const isGitCommit = (commit: unknown): commit is Commit => {
  return (
    typeof commit === "object" &&
    !!commit &&
    "__typename" in commit &&
    commit.__typename === "Commit"
  );
};

const isGitTree = (tree: unknown): tree is Tree => {
  return (
    typeof tree === "object" &&
    !!tree &&
    "__typename" in tree &&
    tree.__typename === "Tree"
  );
};

const getRepositoryDetailsByGitTree = (
  gitTree: Tree
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
      ymlFilePath: currentTreeYmlFilePath,
    } = getRepositoryDetailsByGitTree(entry.object);

    filesCount += currentTreeFilesCount;

    if (currentTreeYmlFilePath && !ymlFilePath) {
      ymlFilePath = currentTreeYmlFilePath;
    }
  }

  return { filesCount, ymlFilePath };
};

export const getRepositoryDetailsByGitCommit = (
  gitCommit: Commit
): { filesCount: number; ymlFilePath: string | null } => {
  let filesCount = 0;
  let ymlFilePath: string | null = null;

  if (!gitCommit.tree?.entries?.length) {
    return { filesCount: 0, ymlFilePath };
  }

  for (const entry of gitCommit.tree.entries) {
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

    if (!isGitTree(entry.object)) {
      continue;
    }

    const {
      filesCount: currentTreeFilesCount,
      ymlFilePath: currentTreeYmlFilePath,
    } = getRepositoryDetailsByGitTree(entry.object);

    filesCount += currentTreeFilesCount;

    if (currentTreeYmlFilePath && !ymlFilePath) {
      ymlFilePath = currentTreeYmlFilePath;
    }
  }

  return { filesCount, ymlFilePath };
};
