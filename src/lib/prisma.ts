import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Initialize if it doesn't exist
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
}

// Self-healing check for dev: if contactInquiry is missing, re-instantiate
if (process.env.NODE_ENV !== 'production') {
  const p = globalForPrisma.prisma as any;
  if (!p.contactInquiry || !p.review || !p.order?.fields?.contactNumber) {
    // Check models AND new field
    console.log("Prisma Client out of sync with schema. Attempting to re-instantiate...");
    globalForPrisma.prisma = new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma;