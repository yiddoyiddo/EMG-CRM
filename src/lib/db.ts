import { PrismaClient } from '@prisma/client';

// Enhanced Prisma client with connection pooling and performance optimizations
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling configuration for PostgreSQL
  // These settings are optimized for Neon PostgreSQL
  __internal: {
    engine: {
      // Connection pool settings
      connectionLimit: 10, // Maximum connections in pool
      poolTimeout: 20, // Seconds to wait for connection
      acquireTimeout: 60, // Seconds to acquire connection
      timeout: 60, // Query timeout in seconds
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