import { PrismaClient } from '@prisma/client'

// ============================================
// PRISMA DATABASE CLIENT
// ============================================
// Primary ORM for all database operations
// Uses SQLite for local dev, PostgreSQL when DATABASE_URL is a postgres connection

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  });
}

declare global {
  var prisma: PrismaClient | undefined
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

// ============================================
// DATABASE STATUS HELPER
// ============================================
export function getDatabaseProvider(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgresql://') || url.startsWith('postgres://') 
    ? 'postgresql' 
    : 'sqlite';
}
