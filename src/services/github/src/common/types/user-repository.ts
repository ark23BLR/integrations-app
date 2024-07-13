import type { UserRepositoriesDetailsQuery } from "generated/index";

export type UserRepository = NonNullable<
  NonNullable<
    UserRepositoriesDetailsQuery["viewer"]["repositories"]["nodes"]
  >[number]
>;
