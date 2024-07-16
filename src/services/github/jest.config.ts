import dotenv from "dotenv";

import type { Config } from "jest";

dotenv.config({ path: ".env" });

const config: Config = {
  clearMocks: true,
  preset: "ts-jest",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["<rootDir>/src/**/tests/**/*.[jt]s"],
  roots: ["<rootDir>"],
  verbose: true,
  modulePaths: ["<rootDir>"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  moduleFileExtensions: ["ts", "js"],
  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/generated/",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts}",
    "!src/**/graphql/*.ts",
    "!src/index.ts",
  ],
};

export default config;
