type PrismaClientLike = {
  [key: string]: unknown;
};

type PrismaModule = {
  PrismaClient: new (options?: {
    datasourceUrl?: string;
    log?: string[];
  }) => PrismaClientLike;
};

const globalForPrisma = globalThis as {
  prisma?: PrismaClientLike;
};

function loadPrismaClient(): PrismaModule["PrismaClient"] {
  try {
    const prismaModule = require("@prisma/client") as PrismaModule;
    return prismaModule.PrismaClient;
  } catch (error) {
    throw new Error(
      "Prisma client is unavailable. Run `npx prisma generate` before using database features.",
    );
  }
}

const PrismaClient = loadPrismaClient();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
