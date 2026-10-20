import type { UserDto } from "@hh/shared";

declare global {
  namespace Express {
    interface Request {
      user?: UserDto;
    }
  }
}

export {};
