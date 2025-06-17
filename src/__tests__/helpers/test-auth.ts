import { testDb, testDataFactory } from './test-db';
import type { User } from '@prisma/client';

// Test authentication utilities
export class TestAuthHelper {
  private static instance: TestAuthHelper;
  private testUsers = new Map<string, User>();

  static getInstance() {
    if (!TestAuthHelper.instance) {
      TestAuthHelper.instance = new TestAuthHelper();
    }
    return TestAuthHelper.instance;
  }

  /**
   * Create a test user with authentication context
   */
  async createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const user = await testDataFactory.user.create({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      ...overrides,
    });

    this.testUsers.set(user.id, user);
    return user;
  }

  /**
   * Create multiple test users for multi-user scenarios
   */
  async createTestUsers(count: number): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        name: `Test User ${i + 1}`,
        email: `test-user-${i + 1}-${Date.now()}@example.com`,
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create a test user with Todoist integration
   */
  async createTodoistUser(todoistToken = 'test-todoist-token'): Promise<User> {
    return this.createTestUser({
      name: 'Todoist User',
      email: `todoist-${Date.now()}@example.com`,
      todoistApiToken: todoistToken,
    });
  }

  /**
   * Get test user by ID
   */
  getTestUser(userId: string): User | undefined {
    return this.testUsers.get(userId);
  }

  /**
   * Create session object for testing
   */
  createTestSession(user: User) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Clean up test users
   */
  cleanup() {
    this.testUsers.clear();
  }
}

/**
 * Mock NextAuth.js session for component testing
 */
export function mockNextAuthSession(user: User) {
  const session = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  // Mock useSession hook
  return {
    data: session,
    status: 'authenticated' as const,
    update: () => Promise.resolve(session),
  };
}

/**
 * Create authenticated context for API testing
 */
export function createAuthenticatedContext(user: User) {
  return {
    db: testDb,
    session: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

/**
 * Create unauthenticated context for API testing
 */
export function createUnauthenticatedContext() {
  return {
    db: testDb,
    session: null,
  };
}

/**
 * Playwright authentication helpers
 */
export class PlaywrightAuthHelper {
  /**
   * Create a session cookie for Playwright tests
   */
  static async createSessionCookie(user: User) {
    // In a real implementation, this would create a proper NextAuth.js session
    // For testing, we'll create a simplified session token
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      name: user.name,
      email: user.email,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })).toString('base64');

    return {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
    };
  }

  /**
   * Set up authenticated session for Playwright page
   */
  static async setupAuthenticatedSession(page: any, user: User) {
    const sessionCookie = await this.createSessionCookie(user);
    await page.context().addCookies([sessionCookie]);
  }
}

export default TestAuthHelper;