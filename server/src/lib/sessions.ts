import type { Response } from "express";
import crypto from "node:crypto";
import { prisma } from "../db";
import { env } from "./env";

export const SESSION_COOKIE = "hh_sid";

export interface CreatedSession {
  sid: string;
  expiresAt: Date;
}

export async function createSession(userId: string): Promise<CreatedSession> {
  const sid = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);

  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { id: sid, userId, expiresAt } });

  return { sid, expiresAt };
}

export async function destroySession(sid: string | undefined): Promise<void> {
  if (!sid) return;
  await prisma.session.delete({ where: { id: sid } }).catch(() => undefined);
}

export function setSessionCookie(res: Response, session: CreatedSession): void {
  res.cookie(SESSION_COOKIE, session.sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
  });
}
