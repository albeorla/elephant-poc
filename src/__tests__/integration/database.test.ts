import { describe, it, expect } from 'vitest';
import { setupDatabaseTests, testDataFactory, testDb } from '../helpers/test-db';
import { createCallerFactory } from '../../server/api/trpc';
import { taskRouter } from '../../server/api/routers/task';
import { createTestContext } from '../helpers/test-context';

// Real database integration tests
describe('Database Integration Tests', () => {
  setupDatabaseTests();
  
  const createCaller = createCallerFactory(taskRouter);

  describe('User and Task Relationships', () => {
    it('should create user and associated tasks with real database', async () => {
      // Create a real user
      const user = await testDataFactory.user.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(user.id).toBeTruthy();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');

      // Create tasks for the user
      const task1 = await testDataFactory.task.create(user.id, {
        title: 'First Task',
        priority: 2,
      });

      const task2 = await testDataFactory.task.create(user.id, {
        title: 'Second Task',
        completed: true,
      });

      expect(task1.userId).toBe(user.id);
      expect(task2.userId).toBe(user.id);
      expect(task1.title).toBe('First Task');
      expect(task2.completed).toBe(true);

      // Verify database relationships
      const userWithTasks = await testDb.user.findUnique({
        where: { id: user.id },
        include: { tasks: true },
      });

      expect(userWithTasks?.tasks).toHaveLength(2);
      expect(userWithTasks?.tasks.map(t => t.title)).toContain('First Task');
      expect(userWithTasks?.tasks.map(t => t.title)).toContain('Second Task');
    });

    it('should handle task labels with real database', async () => {
      const user = await testDataFactory.user.create();
      
      // Create task with labels
      const taskWithLabels = await testDataFactory.taskWithLabels.create(user.id, [
        'work', 'urgent', 'frontend'
      ]);

      expect(taskWithLabels.labels).toHaveLength(3);
      expect(taskWithLabels.labels.map(l => l.name)).toContain('work');
      expect(taskWithLabels.labels.map(l => l.name)).toContain('urgent');
      expect(taskWithLabels.labels.map(l => l.name)).toContain('frontend');

      // Verify label reuse
      const secondTask = await testDataFactory.taskWithLabels.create(user.id, [
        'work', 'backend' // 'work' should be reused
      ]);

      expect(secondTask.labels).toHaveLength(2);
      
      // Check total unique labels in database
      const allLabels = await testDb.label.findMany();
      const labelNames = allLabels.map(l => l.name);
      expect(labelNames).toContain('work');
      expect(labelNames).toContain('urgent');
      expect(labelNames).toContain('frontend');
      expect(labelNames).toContain('backend');
      expect(allLabels).toHaveLength(4); // Only 4 unique labels
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create task with non-existent user
      await expect(
        testDb.task.create({
          data: {
            title: 'Orphan Task',
            userId: 'non-existent-user-id',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle user deletion cascade', async () => {
      const user = await testDataFactory.user.create();
      const tasks = await testDataFactory.task.createMany(user.id, 3);

      expect(tasks).toHaveLength(3);

      // Delete user should cascade to tasks
      await testDb.user.delete({
        where: { id: user.id },
      });

      // Verify tasks were deleted
      const remainingTasks = await testDb.task.findMany({
        where: { userId: user.id },
      });

      expect(remainingTasks).toHaveLength(0);
    });
  });

  describe('API Router with Real Database', () => {
    it('should perform complete task CRUD operations', async () => {
      const user = await testDataFactory.user.create();
      const context = createTestContext(user);
      const caller = createCaller(context);

      // CREATE
      const newTask = await caller.create({
        title: 'Real Database Task',
        description: 'This uses the real database',
        priority: 3,
        labels: ['integration', 'test'],
      });

      expect(newTask.id).toBeTruthy();
      expect(newTask.title).toBe('Real Database Task');
      expect(newTask.userId).toBe(user.id);
      expect(newTask.labels).toHaveLength(2);

      // READ
      const fetchedTask = await caller.getById({ id: newTask.id });
      expect(fetchedTask.title).toBe('Real Database Task');
      expect(fetchedTask.labels.map(l => l.name)).toContain('integration');

      const allTasks = await caller.getAll();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].id).toBe(newTask.id);

      // UPDATE
      const updatedTask = await caller.update({
        id: newTask.id,
        title: 'Updated Real Database Task',
        completed: true,
        labels: ['integration', 'updated'],
      });

      expect(updatedTask.title).toBe('Updated Real Database Task');
      expect(updatedTask.completed).toBe(true);
      expect(updatedTask.labels).toHaveLength(2);
      expect(updatedTask.labels.map(l => l.name)).toContain('updated');

      // DELETE
      const deletedTask = await caller.delete({ id: newTask.id });
      expect(deletedTask.id).toBe(newTask.id);

      // Verify deletion
      await expect(
        caller.getById({ id: newTask.id })
      ).rejects.toThrow('Task not found');

      const tasksAfterDelete = await caller.getAll();
      expect(tasksAfterDelete).toHaveLength(0);
    });

    it('should enforce user isolation in real database', async () => {
      const user1 = await testDataFactory.user.create({ name: 'User 1' });
      const user2 = await testDataFactory.user.create({ name: 'User 2' });

      const context1 = createTestContext(user1);
      const context2 = createTestContext(user2);
      const caller1 = createCaller(context1);
      const caller2 = createCaller(context2);

      // User 1 creates tasks
      const task1 = await caller1.create({ title: 'User 1 Task 1' });
      const task2 = await caller1.create({ title: 'User 1 Task 2' });

      // User 2 creates tasks
      const task3 = await caller2.create({ title: 'User 2 Task 1' });

      // User 1 should only see their tasks
      const user1Tasks = await caller1.getAll();
      expect(user1Tasks).toHaveLength(2);
      expect(user1Tasks.map(t => t.title)).toContain('User 1 Task 1');
      expect(user1Tasks.map(t => t.title)).toContain('User 1 Task 2');
      expect(user1Tasks.map(t => t.title)).not.toContain('User 2 Task 1');

      // User 2 should only see their tasks
      const user2Tasks = await caller2.getAll();
      expect(user2Tasks).toHaveLength(1);
      expect(user2Tasks[0].title).toBe('User 2 Task 1');

      // User 1 cannot access User 2's task
      await expect(
        caller1.getById({ id: task3.id })
      ).rejects.toThrow('Task not found');

      // User 2 cannot update User 1's task
      await expect(
        caller2.update({ id: task1.id, title: 'Hacked!' })
      ).rejects.toThrow('Task not found');
    });

    it('should handle complex label operations', async () => {
      const user = await testDataFactory.user.create();
      const context = createTestContext(user);
      const caller = createCaller(context);

      // Create task with initial labels
      const task = await caller.create({
        title: 'Label Test Task',
        labels: ['work', 'urgent', 'frontend'],
      });

      expect(task.labels).toHaveLength(3);

      // Update to different labels
      const updatedTask = await caller.update({
        id: task.id,
        labels: ['work', 'completed', 'archived'], // Remove 'urgent', 'frontend', add 'completed', 'archived'
      });

      expect(updatedTask.labels).toHaveLength(3);
      expect(updatedTask.labels.map(l => l.name).sort()).toEqual(['archived', 'completed', 'work']);

      // Verify labels exist in database but aren't connected to unrelated tasks
      const allLabels = await testDb.label.findMany();
      expect(allLabels.length).toBeGreaterThanOrEqual(5); // All created labels should exist

      // Create another task that reuses some labels
      const secondTask = await caller.create({
        title: 'Second Task',
        labels: ['work', 'new-label'],
      });

      expect(secondTask.labels).toHaveLength(2);
      expect(secondTask.labels.map(l => l.name)).toContain('work'); // Reused
      expect(secondTask.labels.map(l => l.name)).toContain('new-label'); // New
    });

    it('should handle concurrent operations correctly', async () => {
      const user = await testDataFactory.user.create();
      const context = createTestContext(user);
      const caller = createCaller(context);

      // Create multiple tasks concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        caller.create({
          title: `Concurrent Task ${i + 1}`,
          priority: (i % 4) + 1,
        })
      );

      const createdTasks = await Promise.all(createPromises);
      expect(createdTasks).toHaveLength(5);

      // Verify all tasks were created
      const allTasks = await caller.getAll();
      expect(allTasks).toHaveLength(5);

      // Update multiple tasks concurrently
      const updatePromises = createdTasks.map((task, i) =>
        caller.update({
          id: task.id,
          completed: i % 2 === 0,
        })
      );

      const updatedTasks = await Promise.all(updatePromises);
      expect(updatedTasks).toHaveLength(5);

      // Verify updates
      const finalTasks = await caller.getAll();
      const completedCount = finalTasks.filter(t => t.completed).length;
      expect(completedCount).toBe(3); // Tasks 0, 2, 4 should be completed
    });
  });

  describe('Database Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const user = await testDataFactory.user.create();
      const context = createTestContext(user);
      const caller = createCaller(context);

      // Create 50 tasks
      const start = Date.now();
      const tasks = await testDataFactory.task.createMany(user.id, 50);
      const createTime = Date.now() - start;

      expect(tasks).toHaveLength(50);
      expect(createTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Query all tasks
      const queryStart = Date.now();
      const allTasks = await caller.getAll();
      const queryTime = Date.now() - queryStart;

      expect(allTasks).toHaveLength(50);
      expect(queryTime).toBeLessThan(1000); // Should query within 1 second
    });
  });
});