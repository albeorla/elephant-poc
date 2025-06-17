import type { User } from '@prisma/client';
import { testDb } from './test-db';

// Create authenticated test context
export function createTestContext(user?: User) {
  return {
    db: testDb,
    session: user ? {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    } : null,
  };
}

// Create unauthenticated test context
export function createUnauthenticatedContext() {
  return {
    db: testDb,
    session: null,
  };
}