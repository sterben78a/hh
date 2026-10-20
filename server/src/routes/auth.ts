import { Router } from "express";
import { loginSchema, registerSchema, type UserDto } from "@hh/shared";
import { prisma } from "../db";
import { ApiError, readBody } from "../lib/http";
import { hashPassword, verifyPasswordSafe } from "../lib/passwords";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  setSessionCookie,
} from "../lib/sessions";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

function toUserDto(user: { id: string; email: string; displayName: string }): UserDto {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

authRouter.post("/register", async (req, res) => {
  const input = readBody(registerSchema, req);
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "این ایمیل قبلاً ثبت شده است");
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
    },
  });

  const session = await createSession(user.id);
  setSessionCookie(res, session);

  res.status(201).json(toUserDto(user));
});

authRouter.post("/login", async (req, res) => {
  const input = readBody(loginSchema, req);
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPasswordSafe(input.password, user?.passwordHash ?? null);
  if (!user || !ok) {
    throw new ApiError(401, "ایمیل یا رمز عبور اشتباه است");
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session);

  res.json(toUserDto(user));
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(req.cookies[SESSION_COOKIE] as string | undefined);
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});
