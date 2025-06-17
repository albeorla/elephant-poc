import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCallerFactory } from '../../server/api/trpc';
import { taskRouter } from '../../server/api/routers/task';
import type { PrismaClient } from '@prisma/client';

// Integration tests for API endpoints
describe('API Integration Tests', () => {
  const createCaller = createCallerFactory(taskRouter);
  
  // Mock context for integration tests
  const createMockContext = (overrides?: any) => ({
    session: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    db: {
      task: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaClient,
    ...overrides,
  });

  describe('Task Operations Flow', () => {
    it('should handle complete task lifecycle', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Mock database responses for the complete flow
      const createdTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        completed: false,
        priority: 2,
        dueDate: new Date('2024-01-15'),
        todoistId: null,
        syncedAt: null,
        userId: 'test-user-id',
        labels: [],
      };

      const updatedTask = { ...createdTask, completed: true };

      // Setup mocks
      mockContext.db.task.create.mockResolvedValue(createdTask);
      mockContext.db.task.findFirst.mockResolvedValue(createdTask);
      mockContext.db.task.update.mockResolvedValue(updatedTask);
      mockContext.db.task.findMany.mockResolvedValue([createdTask]);
      mockContext.db.task.delete.mockResolvedValue(createdTask);

      // 1. Create task
      const createResult = await caller.create({
        title: 'Test Task',
        description: 'Test Description',
        priority: 2,
        dueDate: new Date('2024-01-15'),
        labels: [],
        syncToTodoist: false,
      });
      expect(createResult).toEqual(createdTask);

      // 2. Get all tasks
      const getAllResult = await caller.getAll();
      expect(getAllResult).toEqual([createdTask]);

      // 3. Get specific task
      const getByIdResult = await caller.getById({ id: 'task-1' });
      expect(getByIdResult).toEqual(createdTask);

      // 4. Update task
      const updateResult = await caller.update({
        id: 'task-1',
        completed: true,
      });
      expect(updateResult).toEqual(updatedTask);

      // 5. Delete task
      const deleteResult = await caller.delete({ id: 'task-1' });
      expect(deleteResult).toEqual(createdTask);
    });

    it('should handle task creation with Todoist sync', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Mock user with Todoist token
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'valid-token',
      });

      // Mock successful task creation
      const createdTask = {
        id: 'task-1',
        title: 'Synced Task',
        todoistId: 'todoist-123',
        syncedAt: new Date(),
        userId: 'test-user-id',
        labels: [],
      };

      mockContext.db.task.create.mockResolvedValue(createdTask);

      // Mock Todoist API (this would be mocked at a higher level in real integration tests)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'todoist-123',
          content: 'Synced Task',
          priority: 3,
        }),
      });

      const result = await caller.create({
        title: 'Synced Task',
        syncToTodoist: true,
      });

      expect(result.todoistId).toBe('todoist-123');
      expect(result.syncedAt).toBeTruthy();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Simulate database error
      mockContext.db.task.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(caller.getAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent operations', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      const task1 = { id: 'task-1', title: 'Task 1', userId: 'test-user-id', labels: [] };
      const task2 = { id: 'task-2', title: 'Task 2', userId: 'test-user-id', labels: [] };

      mockContext.db.task.create
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);

      // Create multiple tasks concurrently
      const promises = [
        caller.create({ title: 'Task 1' }),
        caller.create({ title: 'Task 2' }),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Task 1');
      expect(results[1].title).toBe('Task 2');
    });

    it('should handle partial failures in batch operations', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Mock one success and one failure
      mockContext.db.task.update
        .mockResolvedValueOnce({ id: 'task-1', completed: true })
        .mockRejectedValueOnce(new Error('Task not found'));

      const updates = [
        caller.update({ id: 'task-1', completed: true }),
        caller.update({ id: 'task-2', completed: true }),
      ];

      const results = await Promise.allSettled(updates);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should enforce user isolation', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Mock tasks for current user
      const userTasks = [
        { id: 'task-1', userId: 'test-user-id', title: 'My Task', labels: [] },
      ];

      mockContext.db.task.findMany.mockResolvedValue(userTasks);

      const result = await caller.getAll();

      // Verify query includes user filter
      expect(mockContext.db.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        include: { labels: true },
      });

      expect(result).toEqual(userTasks);
    });

    it('should prevent access to other users tasks', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Return null when trying to access another user's task
      mockContext.db.task.findFirst.mockResolvedValue(null);

      await expect(caller.getById({ id: 'other-user-task' })).rejects.toThrow('Task not found');

      // Verify query includes user filter
      expect(mockContext.db.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-user-task', userId: 'test-user-id' },
        include: { labels: true },
      });
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate input data across the full stack', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      // Test invalid priority
      await expect(
        caller.create({
          title: 'Test',
          priority: 10, // Invalid - should be 1-4
        })
      ).rejects.toThrow();

      // Test empty title
      await expect(
        caller.create({
          title: '', // Invalid - should not be empty
        })
      ).rejects.toThrow();

      // Test invalid ID format
      await expect(
        caller.getById({
          id: '', // Invalid - should not be empty
        })
      ).rejects.toThrow();
    });

    it('should handle edge cases in data processing', async () => {
      const mockContext = createMockContext();
      const caller = createCaller(mockContext);

      const edgeCaseTask = {
        id: 'task-1',
        title: '   Test Task   ', // Whitespace
        description: null,
        priority: 1,
        dueDate: null,
        labels: [],
        userId: 'test-user-id',
      };

      mockContext.db.task.create.mockResolvedValue(edgeCaseTask);

      const result = await caller.create({
        title: '   Test Task   ',
        description: undefined,
        priority: 1,
        dueDate: undefined,
        labels: [],
      });

      expect(result).toEqual(edgeCaseTask);
    });
  });
});