import { PrismaClient } from "@prisma/client";
import "./lib/env";

export const prisma = new PrismaClient();
