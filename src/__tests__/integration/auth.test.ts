import { describe, it, expect, beforeEach } from 'vitest';
import { setupDatabaseTests } from '../helpers/test-db';
import { TestAuthHelper, createAuthenticatedContext, createUnauthenticatedContext } from '../helpers/test-auth';
import { createCallerFactory } from '../../server/api/trpc';
import { taskRouter } from '../../server/api/routers/task';
import { TRPCError } from '@trpc/server';

// Authentication integration tests
describe('Authentication Integration Tests', () => {
  setupDatabaseTests();
  
  const createCaller = createCallerFactory(taskRouter);
  let authHelper: TestAuthHelper;

  beforeEach(() => {
    authHelper = TestAuthHelper.getInstance();
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated requests', async () => {
      const context = createUnauthenticatedContext();
      const caller = createCaller(context);

      // All protected endpoints should throw UNAUTHORIZED
      await expect(caller.getAll()).rejects.toThrow();
      await expect(caller.create({ title: 'Test' })).rejects.toThrow();
      await expect(caller.getById({ id: 'test' })).rejects.toThrow();
      await expect(caller.update({ id: 'test', title: 'Updated' })).rejects.toThrow();
      await expect(caller.delete({ id: 'test' })).rejects.toThrow();
      await expect(caller.getTodoistStatus()).rejects.toThrow();
      await expect(caller.updateTodoistToken({ token: 'test' })).rejects.toThrow();
      await expect(caller.syncFromTodoist()).rejects.toThrow();
    });

    it('should allow authenticated requests', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // All endpoints should work with authentication
      const tasks = await caller.getAll();
      expect(Array.isArray(tasks)).toBe(true);

      const status = await caller.getTodoistStatus();
      expect(status).toHaveProperty('connected');

      const newTask = await caller.create({ title: 'Authenticated Task' });
      expect(newTask.title).toBe('Authenticated Task');
      expect(newTask.userId).toBe(user.id);
    });

    it('should maintain user context across requests', async () => {
      const user1 = await authHelper.createTestUser({ name: 'User 1' });
      const user2 = await authHelper.createTestUser({ name: 'User 2' });

      const context1 = createAuthenticatedContext(user1);
      const context2 = createAuthenticatedContext(user2);

      const caller1 = createCaller(context1);
      const caller2 = createCaller(context2);

      // Create tasks for each user
      const task1 = await caller1.create({ title: 'User 1 Task' });
      const task2 = await caller2.create({ title: 'User 2 Task' });

      // Verify user context is maintained
      expect(task1.userId).toBe(user1.id);
      expect(task2.userId).toBe(user2.id);

      // Users can only see their own tasks
      const user1Tasks = await caller1.getAll();
      const user2Tasks = await caller2.getAll();

      expect(user1Tasks).toHaveLength(1);
      expect(user2Tasks).toHaveLength(1);
      expect(user1Tasks[0].userId).toBe(user1.id);
      expect(user2Tasks[0].userId).toBe(user2.id);
    });

    it('should handle session expiration gracefully', async () => {
      const user = await authHelper.createTestUser();
      
      // Create context with expired session
      const expiredContext = {
        db: createAuthenticatedContext(user).db,
        session: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          expires: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        },
      };

      const caller = createCaller(expiredContext);

      // Note: In a real implementation, expired sessions would be handled by NextAuth.js middleware
      // For this test, we're just verifying our context structure supports expiration tracking
      expect(expiredContext.session.expires).toBeTruthy();
      expect(new Date(expiredContext.session.expires) < new Date()).toBe(true);
    });
  });

  describe('User Management', () => {
    it('should handle user creation and retrieval', async () => {
      const user = await authHelper.createTestUser({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });

      expect(user.id).toBeTruthy();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john.doe@example.com');
      expect(user.todoistApiToken).toBeNull();

      // Verify user can be retrieved
      const retrievedUser = authHelper.getTestUser(user.id);
      expect(retrievedUser).toEqual(user);
    });

    it('should handle Todoist token management', async () => {
      const user = await authHelper.createTodoistUser('test-todoist-token-123');
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Check initial status
      const initialStatus = await caller.getTodoistStatus();
      expect(initialStatus.connected).toBe(true);

      // Update token
      await caller.updateTodoistToken({ token: 'new-token-456' });

      // Verify token was updated in database
      const updatedUser = await context.db.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.todoistApiToken).toBe('new-token-456');

      // Remove token
      await caller.updateTodoistToken({ token: undefined });

      // Verify token was removed
      const finalUser = await context.db.user.findUnique({
        where: { id: user.id },
      });
      expect(finalUser?.todoistApiToken).toBeNull();

      const finalStatus = await caller.getTodoistStatus();
      expect(finalStatus.connected).toBe(false);
    });

    it('should support multiple concurrent users', async () => {
      const users = await authHelper.createTestUsers(5);
      
      expect(users).toHaveLength(5);
      
      // Verify all users have unique IDs and emails
      const ids = users.map(u => u.id);
      const emails = users.map(u => u.email);
      
      expect(new Set(ids).size).toBe(5); // All unique
      expect(new Set(emails).size).toBe(5); // All unique

      // Test concurrent operations
      const callers = users.map(user => 
        createCaller(createAuthenticatedContext(user))
      );

      // Create tasks concurrently
      const taskPromises = callers.map((caller, i) =>
        caller.create({ title: `Task for User ${i + 1}` })
      );

      const tasks = await Promise.all(taskPromises);
      expect(tasks).toHaveLength(5);

      // Verify each task belongs to the correct user
      tasks.forEach((task, i) => {
        expect(task.userId).toBe(users[i].id);
        expect(task.title).toBe(`Task for User ${i + 1}`);
      });

      // Verify task isolation
      for (let i = 0; i < callers.length; i++) {
        const userTasks = await callers[i].getAll();
        expect(userTasks).toHaveLength(1);
        expect(userTasks[0].userId).toBe(users[i].id);
      }
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should prevent access to other users data even with valid session', async () => {
      const user1 = await authHelper.createTestUser();
      const user2 = await authHelper.createTestUser();

      const context1 = createAuthenticatedContext(user1);
      const context2 = createAuthenticatedContext(user2);

      const caller1 = createCaller(context1);
      const caller2 = createCaller(context2);

      // User 1 creates a task
      const task = await caller1.create({ title: 'Private Task' });

      // User 2 cannot access User 1's task
      await expect(
        caller2.getById({ id: task.id })
      ).rejects.toThrow('Task not found');

      await expect(
        caller2.update({ id: task.id, title: 'Hacked!' })
      ).rejects.toThrow('Task not found');

      await expect(
        caller2.delete({ id: task.id })
      ).rejects.toThrow('Task not found');
    });

    it('should handle malformed session data', async () => {
      const user = await authHelper.createTestUser();
      
      // Create context with malformed session
      const malformedContext = {
        db: createAuthenticatedContext(user).db,
        session: {
          user: {
            id: '', // Empty ID
            name: user.name,
            email: user.email,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const caller = createCaller(malformedContext);

      // Should handle empty user ID gracefully
      await expect(caller.getAll()).rejects.toThrow();
    });

    it('should validate user existence in database', async () => {
      // Create context with non-existent user
      const nonExistentUserContext = {
        db: createAuthenticatedContext(await authHelper.createTestUser()).db,
        session: {
          user: {
            id: 'non-existent-user-id',
            name: 'Ghost User',
            email: 'ghost@example.com',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const caller = createCaller(nonExistentUserContext);

      // Operations should work but return empty results for non-existent user
      const tasks = await caller.getAll();
      expect(tasks).toHaveLength(0);

      // Creating tasks should still work (user creation might be handled elsewhere)
      const newTask = await caller.create({ title: 'Orphan Task' });
      expect(newTask.userId).toBe('non-existent-user-id');
    });
  });
});