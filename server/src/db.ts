import { PrismaClient } from "@prisma/client";

// One shared Prisma client for the whole server, so we don't open
// a new pool of database connections every time a file imports it
export const prisma = new PrismaClient();
