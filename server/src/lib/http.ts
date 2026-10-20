import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import type { Request } from "express";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function zodIssues(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function readBody<T>(schema: ZodType<T>, req: Request): T {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ApiError(400, "اطلاعات واردشده معتبر نیست", zodIssues(result.error));
  }
  return result.data;
}

export function readQuery<T>(schema: ZodType<T>, req: Request): T {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new ApiError(400, "پارامترهای درخواست معتبر نیست", zodIssues(result.error));
  }
  return result.data;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "مسیر مورد نظر پیدا نشد" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "اطلاعات واردشده معتبر نیست", issues: zodIssues(err) });
    return;
  }

  const rawStatus = (err as { status?: number; statusCode?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    500;
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;

  if (status >= 500) {
    console.error(err);
  }

  const body: Record<string, unknown> = {
    error: status >= 500 ? "خطای داخلی سرور" : (err instanceof ApiError ? err.message : "درخواست نامعتبر است"),
  };
  if (err instanceof ApiError && err.issues) body.issues = err.issues;

  res.status(status).json(body);
};
