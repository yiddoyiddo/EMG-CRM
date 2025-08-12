import { PrismaClient } from '@prisma/client';

// Enhanced Prisma client with connection pooling and performance optimizations
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Quiet the terminal: only log errors and warnings by default.
  // Enable PRISMA_LOG_QUERIES=1 to re-enable query logging when debugging.
  log: process.env.PRISMA_LOG_QUERIES === '1'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Health check function
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
} 