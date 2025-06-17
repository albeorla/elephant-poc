import type { Page, BrowserContext } from '@playwright/test';
import { testDb } from '../src/__tests__/helpers/test-db';

export interface TestUser {
  id: string;
  name: string | null;
  email: string | null;
  todoistApiToken?: string | null;
}

/**
 * E2E Authentication Helper for Playwright tests
 */
export class E2EAuthHelper {
  /**
   * Create a test user in the database
   */
  static async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = await testDb.user.create({
      data: {
        id: `e2e-user-${Date.now()}-${Math.random()}`,
        name: 'E2E Test User',
        email: `e2e-${Date.now()}@example.com`,
        ...overrides,
      },
    });

    return user;
  }

  /**
   * Create test user with Todoist integration
   */
  static async createTodoistUser(token: string = 'test-todoist-token'): Promise<TestUser> {
    return this.createTestUser({
      name: 'E2E Todoist User',
      todoistApiToken: token,
    });
  }

  /**
   * Set up authenticated session for a page
   * This simulates the NextAuth.js session cookie
   */
  static async setupAuthenticatedSession(page: Page, user: TestUser) {
    // In a real E2E test environment, we would:
    // 1. Go through the actual OAuth flow
    // 2. Or set up proper NextAuth.js session cookies
    // 
    // For this implementation, we'll simulate the session by:
    // 1. Setting a session cookie with user data
    // 2. Mocking the session API endpoint

    // Set session cookie
    await page.context().addCookies([{
      name: 'next-auth.session-token',
      value: Buffer.from(JSON.stringify({
        userId: user.id,
        name: user.name,
        email: user.email,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })).toString('base64'),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);

    // Mock the session API to return our test user
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: null,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Mock the CSRF token endpoint
    await page.route('**/api/auth/csrf', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          csrfToken: 'test-csrf-token',
        }),
      });
    });
  }

  /**
   * Create test tasks for a user
   */
  static async createTestTasks(userId: string, count: number = 3) {
    const tasks = [];
    for (let i = 0; i < count; i++) {
      const task = await testDb.task.create({
        data: {
          title: `E2E Test Task ${i + 1}`,
          description: i === 0 ? 'This is a test description' : undefined,
          completed: i % 2 === 0,
          priority: (i % 4) + 1,
          userId,
          todoistId: i === 0 ? 'todoist-123' : null,
          syncedAt: i === 0 ? new Date() : null,
        },
        include: {
          labels: true,
        },
      });
      tasks.push(task);
    }
    return tasks;
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Clean up test users and their associated data
    await testDb.task.deleteMany({
      where: {
        userId: {
          startsWith: 'e2e-user-',
        },
      },
    });

    await testDb.user.deleteMany({
      where: {
        id: {
          startsWith: 'e2e-user-',
        },
      },
    });
  }

  /**
   * Wait for page to load with authentication
   */
  static async waitForAuthenticatedPage(page: Page) {
    // Wait for the user's name to appear, indicating successful authentication
    await page.waitForSelector('text=/Logged in as/', { timeout: 10000 });
  }

  /**
   * Sign out user (clear session)
   */
  static async signOut(page: Page) {
    await page.context().clearCookies();
    
    // Mock session endpoint to return null
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  }
}