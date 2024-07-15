import { isGitTree } from "./type-guards/is-git-tree";

import type { Commit, Tree } from "generated/index";

const getRepositoryDetailsByGitTree = (
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
  gitCommit: Commit,
): { filesCount: number; ymlFilePath: string | null } => {
  let filesCount = 0;
  let ymlFilePath: string | null = null;

  if (!gitCommit.tree?.entries?.length) {
    return { filesCount, ymlFilePath };
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

    if (
      !entry.object ||
      !Object.keys(entry.object).length ||
      !isGitTree(entry.object)
    ) {
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
