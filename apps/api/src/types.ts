import type { Session, User } from "./repositories/auth-repository";
import type { Logger } from "./lib/logger";

export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
    auth: { user: User; session: Session };
  };
};
