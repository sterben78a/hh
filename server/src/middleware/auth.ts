import type { RequestHandler } from "express";
import { prisma } from "../db";
import { ApiError } from "../lib/http";
import { SESSION_COOKIE } from "../lib/sessions";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const sid = req.cookies[SESSION_COOKIE] as string | undefined;
  if (!sid) {
    next(new ApiError(401, "لطفاً وارد حساب خود شوید"));
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    next(new ApiError(401, "نشست شما منقضی شده است؛ دوباره وارد شوید"));
    return;
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
  };
  next();
};
