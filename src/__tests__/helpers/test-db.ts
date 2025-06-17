import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Use a separate test database
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'file:./test.db';

// Create a singleton Prisma client for tests
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const testDb = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = testDb;

// Test database utilities
export async function setupTestDb() {
  // Apply migrations/push schema
  try {
    await testDb.$executeRaw`PRAGMA foreign_keys = ON`;
  } catch (error) {
    // Ignore if not SQLite
  }
}

export async function cleanupTestDb() {
  // Clean up all data in reverse dependency order
  const tablenames = await testDb.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
  `;

  // Disable foreign key checks for cleanup
  await testDb.$executeRaw`PRAGMA foreign_keys = OFF`;

  // Delete all records from all tables
  for (const { name } of tablenames) {
    await testDb.$executeRawUnsafe(`DELETE FROM "${name}"`);
  }

  // Re-enable foreign key checks
  await testDb.$executeRaw`PRAGMA foreign_keys = ON`;
}

export async function closeTestDb() {
  await testDb.$disconnect();
}

// Create test data factories
export const testDataFactory = {
  user: {
    create: async (overrides: Partial<any> = {}) => {
      return testDb.user.create({
        data: {
          id: `test-user-${Date.now()}-${Math.random()}`,
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          ...overrides,
        },
      });
    },
  },

  task: {
    create: async (userId: string, overrides: Partial<any> = {}) => {
      return testDb.task.create({
        data: {
          title: 'Test Task',
          description: 'Test Description',
          completed: false,
          priority: 1,
          userId,
          ...overrides,
        },
        include: {
          labels: true,
        },
      });
    },

    createMany: async (userId: string, count = 3) => {
      const tasks = [];
      for (let i = 0; i < count; i++) {
        tasks.push(await testDataFactory.task.create(userId, {
          title: `Test Task ${i + 1}`,
          priority: (i % 4) + 1,
          completed: i % 2 === 0,
        }));
      }
      return tasks;
    },
  },

  label: {
    create: async (overrides: Partial<any> = {}) => {
      return testDb.label.create({
        data: {
          name: `test-label-${Date.now()}`,
          ...overrides,
        },
      });
    },
  },

  taskWithLabels: {
    create: async (userId: string, labelNames: string[] = ['work', 'urgent']) => {
      return testDb.task.create({
        data: {
          title: 'Task with Labels',
          userId,
          labels: {
            connectOrCreate: labelNames.map(name => ({
              where: { name },
              create: { name },
            })),
          },
        },
        include: {
          labels: true,
        },
      });
    },
  },
};

// Global test setup
export function setupDatabaseTests() {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await closeTestDb();
  });

  return testDb;
}