import { test, expect } from '@playwright/test';
import { E2EAuthHelper } from './auth-helper';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authenticated Task Management Flows', () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    // Create test user and set up authentication
    testUser = await E2EAuthHelper.createTestUser({
      name: 'John Doe',
      email: 'john.doe@example.com',
    });

    await E2EAuthHelper.setupAuthenticatedSession(page, testUser);
    await page.goto('/');
  });

  test.afterEach(async () => {
    await E2EAuthHelper.cleanup();
  });

  test('should display authenticated user interface', async ({ page }) => {
    // Wait for authentication to load
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Check authenticated elements are visible
    await expect(page.getByText('Logged in as John Doe')).toBeVisible();
    await expect(page.getByText('Sign out')).toBeVisible();
    await expect(page.getByText('Task Manager')).toBeVisible();
    
    // Check task creation form is visible
    await expect(page.getByPlaceholder('Add a new task...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Fill in task creation form
    const taskInput = page.getByPlaceholder('Add a new task...');
    await taskInput.fill('E2E Test Task');

    // Submit task
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for task to appear in list
    await expect(page.getByText('E2E Test Task')).toBeVisible();

    // Verify input was cleared
    await expect(taskInput).toHaveValue('');
  });

  test('should display existing tasks', async ({ page }) => {
    // Create some test tasks
    await E2EAuthHelper.createTestTasks(testUser.id, 3);

    await page.reload();
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Check tasks are displayed
    await expect(page.getByText('E2E Test Task 1')).toBeVisible();
    await expect(page.getByText('E2E Test Task 2')).toBeVisible();
    await expect(page.getByText('E2E Test Task 3')).toBeVisible();

    // Check task details
    await expect(page.getByText('This is a test description')).toBeVisible();
    await expect(page.getByText('📱 Synced')).toBeVisible(); // First task is synced
  });

  test('should toggle task completion', async ({ page }) => {
    await E2EAuthHelper.createTestTasks(testUser.id, 1);
    await page.reload();
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Find the task checkbox
    const taskCheckbox = page.locator('input[type="checkbox"]').first();
    
    // Toggle completion
    await taskCheckbox.click();

    // Verify task appears completed (strikethrough)
    await expect(page.getByText('E2E Test Task 1')).toHaveClass(/line-through/);
  });

  test('should delete a task', async ({ page }) => {
    await E2EAuthHelper.createTestTasks(testUser.id, 1);
    await page.reload();
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Verify task exists
    await expect(page.getByText('E2E Test Task 1')).toBeVisible();

    // Click delete button
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Verify task is removed
    await expect(page.getByText('E2E Test Task 1')).not.toBeVisible();
    await expect(page.getByText('No tasks yet. Create one above!')).toBeVisible();
  });

  test('should handle empty task state', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Should show empty state
    await expect(page.getByText('No tasks yet. Create one above!')).toBeVisible();
    await expect(page.getByText('Loading tasks...')).not.toBeVisible();
  });

  test('should prevent creating empty tasks', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Try to submit empty task
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Should not create a task
    await expect(page.getByText('No tasks yet. Create one above!')).toBeVisible();
  });

  test('should handle task creation with Enter key', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Fill task and press Enter
    const taskInput = page.getByPlaceholder('Add a new task...');
    await taskInput.fill('Task via Enter');
    await taskInput.press('Enter');

    // Verify task was created
    await expect(page.getByText('Task via Enter')).toBeVisible();
  });

  test('should display loading states', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Intercept task creation to add delay
    await page.route('**/api/trpc/task.create*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Create task
    await page.getByPlaceholder('Add a new task...').fill('Slow Task');
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Should show loading state
    await expect(page.getByText('Adding...')).toBeVisible();
  });
});

test.describe('Todoist Integration E2E', () => {
  let todoistUser: any;

  test.beforeEach(async ({ page }) => {
    todoistUser = await E2EAuthHelper.createTodoistUser('test-todoist-token');
    await E2EAuthHelper.setupAuthenticatedSession(page, todoistUser);
    await page.goto('/');
  });

  test.afterEach(async () => {
    await E2EAuthHelper.cleanup();
  });

  test('should show Todoist connection status', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Should show connected status
    await expect(page.getByText('Todoist: Connected')).toBeVisible();
    
    // Sync checkbox should be enabled
    const syncCheckbox = page.getByRole('checkbox', { name: /sync to todoist/i });
    await expect(syncCheckbox).toBeEnabled();
  });

  test('should show Todoist settings panel', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Click settings button
    await page.getByText('Settings').click();

    // Verify settings panel opens
    await expect(page.getByText('Todoist Integration Settings')).toBeVisible();
    await expect(page.getByText('✅ Connected')).toBeVisible();
    await expect(page.getByText('ℹ️ Sync Information')).toBeVisible();

    // Should show disconnect button
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
  });

  test('should handle sync to Todoist option', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Fill task form
    await page.getByPlaceholder('Add a new task...').fill('Synced Task');
    
    // Enable Todoist sync
    const syncCheckbox = page.getByRole('checkbox', { name: /sync to todoist/i });
    await syncCheckbox.check();
    
    await expect(syncCheckbox).toBeChecked();

    // Create task
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Task should be created (sync functionality would require real API)
    await expect(page.getByText('Synced Task')).toBeVisible();
  });

  test('should show sync from Todoist button', async ({ page }) => {
    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Should show sync button for connected users
    await expect(page.getByRole('button', { name: 'Sync from Todoist' })).toBeVisible();
  });
});

test.describe('User Isolation E2E', () => {
  test('should maintain user isolation', async ({ browser }) => {
    // Create two different users
    const user1 = await E2EAuthHelper.createTestUser({ name: 'User One' });
    const user2 = await E2EAuthHelper.createTestUser({ name: 'User Two' });

    // Create tasks for user1
    await E2EAuthHelper.createTestTasks(user1.id, 2);

    // Create two browser contexts (simulating different browsers)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Set up authentication for each user
    await E2EAuthHelper.setupAuthenticatedSession(page1, user1);
    await E2EAuthHelper.setupAuthenticatedSession(page2, user2);

    // Navigate to the app
    await page1.goto('/');
    await page2.goto('/');

    // Wait for authentication
    await E2EAuthHelper.waitForAuthenticatedPage(page1);
    await E2EAuthHelper.waitForAuthenticatedPage(page2);

    // User 1 should see their tasks
    await expect(page1.getByText('Logged in as User One')).toBeVisible();
    await expect(page1.getByText('E2E Test Task 1')).toBeVisible();
    await expect(page1.getByText('E2E Test Task 2')).toBeVisible();

    // User 2 should see empty state
    await expect(page2.getByText('Logged in as User Two')).toBeVisible();
    await expect(page2.getByText('No tasks yet. Create one above!')).toBeVisible();
    await expect(page2.getByText('E2E Test Task 1')).not.toBeVisible();

    // User 2 creates a task
    await page2.getByPlaceholder('Add a new task...').fill('User Two Task');
    await page2.getByRole('button', { name: 'Add Task' }).click();
    await expect(page2.getByText('User Two Task')).toBeVisible();

    // User 1 should not see User 2's task
    await page1.reload();
    await E2EAuthHelper.waitForAuthenticatedPage(page1);
    await expect(page1.getByText('User Two Task')).not.toBeVisible();
    await expect(page1.getByText('E2E Test Task 1')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
    await E2EAuthHelper.cleanup();
  });
});

test.describe('Authentication Flow E2E', () => {
  test('should handle sign out flow', async ({ page }) => {
    const testUser = await E2EAuthHelper.createTestUser();
    await E2EAuthHelper.setupAuthenticatedSession(page, testUser);
    await page.goto('/');

    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Click sign out
    await page.getByRole('link', { name: 'Sign out' }).click();

    // Should redirect to sign out page or show unauthenticated state
    // In a real implementation, this would go through NextAuth.js sign out flow
    await expect(page).toHaveURL(/signout/);

    await E2EAuthHelper.cleanup();
  });

  test('should be accessible for authenticated users', async ({ page }) => {
    const testUser = await E2EAuthHelper.createTestUser();
    await E2EAuthHelper.setupAuthenticatedSession(page, testUser);
    await page.goto('/');

    await E2EAuthHelper.waitForAuthenticatedPage(page);

    // Run accessibility tests on authenticated page
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    await E2EAuthHelper.cleanup();
  });
});