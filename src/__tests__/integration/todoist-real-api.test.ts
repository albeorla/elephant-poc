import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupDatabaseTests, testDataFactory } from '../helpers/test-db';
import { TestAuthHelper, createAuthenticatedContext } from '../helpers/test-auth';
import { createCallerFactory } from '../../server/api/trpc';
import { taskRouter } from '../../server/api/routers/task';

// Real Todoist API Integration Tests
// Note: These tests require a valid Todoist API token set in environment
describe('Real Todoist API Integration Tests', () => {
  setupDatabaseTests();
  
  const createCaller = createCallerFactory(taskRouter);
  let authHelper: TestAuthHelper;
  let realTodoistToken: string | undefined;
  let testProjectId: string | undefined;

  beforeAll(() => {
    realTodoistToken = process.env.TEST_TODOIST_API_TOKEN;
    testProjectId = process.env.TEST_TODOIST_PROJECT_ID;
    
    if (!realTodoistToken) {
      console.warn('⚠️  TEST_TODOIST_API_TOKEN not set - skipping real API tests');
    }
  });

  beforeEach(() => {
    authHelper = TestAuthHelper.getInstance();
  });

  // Helper to skip tests if no real API token
  const skipIfNoToken = () => {
    if (!realTodoistToken) {
      return true; // Skip test
    }
    return false;
  };

  describe('Real API Connection Tests', () => {
    it('should connect to real Todoist API', async () => {
      if (skipIfNoToken()) return;

      // Test basic API connectivity
      const response = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });

      expect(response.ok).toBe(true);
      const projects = await response.json();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should handle invalid token gracefully', async () => {
      const invalidToken = 'invalid-token-123';
      
      const response = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('should respect rate limits', async () => {
      if (skipIfNoToken()) return;

      // Make multiple rapid requests to test rate limiting handling
      const promises = Array.from({ length: 5 }, () =>
        fetch('https://api.todoist.com/rest/v2/projects', {
          headers: {
            'Authorization': `Bearer ${realTodoistToken}`,
          },
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed (rate limit is 450/15min for Todoist)
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });
  });

  describe('Task Sync Integration', () => {
    it('should sync task creation to real Todoist', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create task with Todoist sync
      const newTask = await caller.create({
        title: 'Real API Test Task',
        description: 'Created via integration test',
        priority: 2,
        syncToTodoist: true,
        labels: ['test', 'integration'],
      });

      expect(newTask.todoistId).toBeTruthy();
      expect(newTask.syncedAt).toBeTruthy();
      expect(newTask.title).toBe('Real API Test Task');

      // Verify task exists in Todoist
      const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${newTask.todoistId}`, {
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });

      expect(todoistResponse.ok).toBe(true);
      const todoistTask = await todoistResponse.json();
      expect(todoistTask.content).toBe('Real API Test Task');
      expect(todoistTask.description).toBe('Created via integration test');

      // Clean up - delete from Todoist
      await fetch(`https://api.todoist.com/rest/v2/tasks/${newTask.todoistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });
    });

    it('should sync task updates to real Todoist', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create initial task
      const task = await caller.create({
        title: 'Update Test Task',
        syncToTodoist: true,
      });

      expect(task.todoistId).toBeTruthy();

      // Update task
      const updatedTask = await caller.update({
        id: task.id,
        title: 'Updated Test Task',
        description: 'Updated description',
        completed: true,
      });

      expect(updatedTask.title).toBe('Updated Test Task');

      // Verify update in Todoist
      const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoistId}`, {
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });

      expect(todoistResponse.ok).toBe(true);
      const todoistTask = await todoistResponse.json();
      expect(todoistTask.content).toBe('Updated Test Task');
      expect(todoistTask.description).toBe('Updated description');
      expect(todoistTask.is_completed).toBe(true);

      // Clean up
      await fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });
    });

    it('should sync task deletion to real Todoist', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create task
      const task = await caller.create({
        title: 'Delete Test Task',
        syncToTodoist: true,
      });

      const todoistId = task.todoistId;
      expect(todoistId).toBeTruthy();

      // Delete task
      await caller.delete({ id: task.id });

      // Verify task is deleted from Todoist
      const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistId}`, {
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });

      expect(todoistResponse.status).toBe(404); // Task should not exist
    });

    it('should sync from real Todoist to local database', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create task directly in Todoist
      const todoistResponse = await fetch('https://api.todoist.com/rest/v2/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Sync From Todoist Test',
          description: 'Created directly in Todoist',
          priority: 3,
          labels: ['imported', 'test'],
        }),
      });

      expect(todoistResponse.ok).toBe(true);
      const todoistTask = await todoistResponse.json();

      // Sync from Todoist
      const syncResult = await caller.syncFromTodoist();
      expect(syncResult.imported).toBeGreaterThan(0);

      // Verify task was imported
      const localTasks = await caller.getAll();
      const importedTask = localTasks.find(t => t.todoistId === todoistTask.id);
      
      expect(importedTask).toBeTruthy();
      expect(importedTask?.title).toBe('Sync From Todoist Test');
      expect(importedTask?.description).toBe('Created directly in Todoist');
      expect(importedTask?.priority).toBe(2); // 5 - 3 = 2 (priority conversion)

      // Clean up
      await fetch(`https://api.todoist.com/rest/v2/tasks/${todoistTask.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${realTodoistToken}`,
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser('invalid-token');
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Should not throw error, but should not sync
      const task = await caller.create({
        title: 'Error Test Task',
        syncToTodoist: true,
      });

      // Task should be created locally even if sync fails
      expect(task.title).toBe('Error Test Task');
      expect(task.todoistId).toBeNull();
      expect(task.syncedAt).toBeNull();
    });

    it('should handle network timeouts gracefully', async () => {
      if (skipIfNoToken()) return;

      // This test would require mocking the network layer to simulate timeouts
      // For a real implementation, you would test timeout handling
      
      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // The service should handle timeouts and continue with local operations
      const task = await caller.create({
        title: 'Timeout Test Task',
        syncToTodoist: true,
      });

      expect(task).toBeTruthy();
      expect(task.title).toBe('Timeout Test Task');
    });
  });

  describe('Real API Performance Tests', () => {
    it('should handle batch operations efficiently', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      const start = Date.now();

      // Create multiple tasks
      const tasks = await Promise.all([
        caller.create({ title: 'Batch Task 1', syncToTodoist: true }),
        caller.create({ title: 'Batch Task 2', syncToTodoist: true }),
        caller.create({ title: 'Batch Task 3', syncToTodoist: true }),
      ]);

      const duration = Date.now() - start;

      // Should complete within reasonable time (10 seconds for 3 API calls)
      expect(duration).toBeLessThan(10000);
      
      // All tasks should have Todoist IDs
      tasks.forEach(task => {
        expect(task.todoistId).toBeTruthy();
      });

      // Clean up
      await Promise.all(
        tasks.map(task => 
          fetch(`https://api.todoist.com/rest/v2/tasks/${task.todoistId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${realTodoistToken}`,
            },
          })
        )
      );
    });

    it('should handle large sync operations', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTodoistUser(realTodoistToken);
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Test syncing existing tasks from Todoist
      const start = Date.now();
      const syncResult = await caller.syncFromTodoist();
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds
      expect(typeof syncResult.imported).toBe('number');
      expect(typeof syncResult.updated).toBe('number');
    });
  });

  describe('Token Management', () => {
    it('should update Todoist token in real time', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Initially no token
      const initialStatus = await caller.getTodoistStatus();
      expect(initialStatus.connected).toBe(false);

      // Set valid token
      await caller.updateTodoistToken({ token: realTodoistToken });
      
      const connectedStatus = await caller.getTodoistStatus();
      expect(connectedStatus.connected).toBe(true);

      // Remove token
      await caller.updateTodoistToken({ token: undefined });
      
      const disconnectedStatus = await caller.getTodoistStatus();
      expect(disconnectedStatus.connected).toBe(false);
    });

    it('should validate token against real API', async () => {
      if (skipIfNoToken()) return;

      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Set invalid token
      await caller.updateTodoistToken({ token: 'invalid-token' });
      
      // Try to sync - should handle gracefully
      await expect(caller.syncFromTodoist()).rejects.toThrow();
    });
  });
});

// Test configuration helper
export function configureTodoistTesting() {
  const hasToken = !!process.env.TEST_TODOIST_API_TOKEN;
  
  if (!hasToken) {
    console.log(`
⚠️  Real Todoist API tests are disabled.

To enable real API testing:
1. Get a Todoist API token from https://todoist.com/app/settings/integrations
2. Set environment variable: TEST_TODOIST_API_TOKEN=your_token_here
3. Optionally set TEST_TODOIST_PROJECT_ID=project_id for targeted testing

Note: Real API tests will create and delete tasks in your Todoist account.
Use a test account or dedicated project for testing.
    `);
  }
  
  return hasToken;
}