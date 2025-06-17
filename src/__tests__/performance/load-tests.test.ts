import { describe, it, expect, beforeEach } from 'vitest';
import { setupDatabaseTests, testDataFactory } from '../helpers/test-db';
import { TestAuthHelper, createAuthenticatedContext } from '../helpers/test-auth';
import { createCallerFactory } from '../../server/api/trpc';
import { taskRouter } from '../../server/api/routers/task';

// Performance and Load Tests
describe('Performance Tests', () => {
  setupDatabaseTests();
  
  const createCaller = createCallerFactory(taskRouter);
  let authHelper: TestAuthHelper;

  beforeEach(() => {
    authHelper = TestAuthHelper.getInstance();
  });

  describe('Database Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create 100 tasks
      const start = Date.now();
      const tasks = [];
      
      for (let i = 0; i < 100; i++) {
        tasks.push(await testDataFactory.task.create(user.id, {
          title: `Performance Test Task ${i + 1}`,
          description: `Description for task ${i + 1}`,
          priority: (i % 4) + 1,
          completed: i % 3 === 0,
        }));
      }
      
      const createTime = Date.now() - start;
      console.log(`Created 100 tasks in ${createTime}ms`);

      expect(tasks).toHaveLength(100);
      expect(createTime).toBeLessThan(10000); // Should create within 10 seconds

      // Test querying large dataset
      const queryStart = Date.now();
      const allTasks = await caller.getAll();
      const queryTime = Date.now() - queryStart;
      
      console.log(`Queried 100 tasks in ${queryTime}ms`);
      
      expect(allTasks).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // Should query within 1 second
    });

    it('should handle concurrent operations under load', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create 20 tasks concurrently
      const start = Date.now();
      const createPromises = Array.from({ length: 20 }, (_, i) =>
        caller.create({
          title: `Concurrent Task ${i + 1}`,
          priority: (i % 4) + 1,
          labels: [`batch-${Math.floor(i / 5)}`, 'concurrent'],
        })
      );

      const createdTasks = await Promise.all(createPromises);
      const concurrentTime = Date.now() - start;
      
      console.log(`Created 20 tasks concurrently in ${concurrentTime}ms`);

      expect(createdTasks).toHaveLength(20);
      expect(concurrentTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test concurrent updates
      const updateStart = Date.now();
      const updatePromises = createdTasks.map((task, i) =>
        caller.update({
          id: task.id,
          completed: i % 2 === 0,
          description: `Updated description ${i}`,
        })
      );

      const updatedTasks = await Promise.all(updatePromises);
      const updateTime = Date.now() - updateStart;
      
      console.log(`Updated 20 tasks concurrently in ${updateTime}ms`);

      expect(updatedTasks).toHaveLength(20);
      expect(updateTime).toBeLessThan(3000); // Should update within 3 seconds
    });

    it('should handle complex label relationships efficiently', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create tasks with many overlapping labels
      const start = Date.now();
      const labelSets = [
        ['work', 'urgent', 'frontend', 'react'],
        ['work', 'backend', 'api', 'database'],
        ['personal', 'urgent', 'health'],
        ['work', 'frontend', 'css', 'design'],
        ['personal', 'learning', 'javascript'],
        ['work', 'urgent', 'bug', 'critical'],
        ['personal', 'hobby', 'side-project'],
        ['work', 'meeting', 'planning'],
        ['personal', 'urgent', 'bills'],
        ['work', 'documentation', 'wiki'],
      ];

      const taskPromises = labelSets.map((labels, i) =>
        caller.create({
          title: `Task with Complex Labels ${i + 1}`,
          labels,
        })
      );

      const tasksWithLabels = await Promise.all(taskPromises);
      const labelTime = Date.now() - start;
      
      console.log(`Created 10 tasks with complex labels in ${labelTime}ms`);

      expect(tasksWithLabels).toHaveLength(10);
      expect(labelTime).toBeLessThan(3000);

      // Verify label relationships
      const allTasks = await caller.getAll();
      const totalLabels = allTasks.reduce((sum, task) => sum + task.labels.length, 0);
      expect(totalLabels).toBeGreaterThan(30); // Should have many label connections
    });

    it('should handle memory efficiently with large operations', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Monitor memory usage during large operations
      const initialMemory = process.memoryUsage();

      // Create 50 tasks with varying complexity
      for (let i = 0; i < 50; i++) {
        await caller.create({
          title: `Memory Test Task ${i + 1}`,
          description: `This is a description for task ${i + 1}. `.repeat(10), // Longer description
          labels: [`label-${i % 10}`, `category-${i % 5}`, 'memory-test'],
          priority: (i % 4) + 1,
        });
      }

      const afterCreationMemory = process.memoryUsage();

      // Query all tasks multiple times
      for (let i = 0; i < 10; i++) {
        await caller.getAll();
      }

      const finalMemory = process.memoryUsage();

      // Memory usage should not grow excessively
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      console.log(`Memory growth: ${heapGrowthMB.toFixed(2)}MB`);
      
      // Should not use more than 50MB additional heap
      expect(heapGrowthMB).toBeLessThan(50);
    });
  });

  describe('API Performance', () => {
    it('should handle rapid API requests efficiently', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Pre-create some tasks
      await testDataFactory.task.createMany(user.id, 10);

      // Make rapid requests
      const start = Date.now();
      const requests = Array.from({ length: 50 }, () => caller.getAll());
      
      const results = await Promise.all(requests);
      const requestTime = Date.now() - start;
      
      console.log(`Handled 50 rapid requests in ${requestTime}ms`);

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveLength(10);
      });
      
      // Should handle 50 requests within 5 seconds
      expect(requestTime).toBeLessThan(5000);
    });

    it('should scale with user count', async () => {
      // Create multiple users with tasks
      const users = await authHelper.createTestUsers(10);
      const callers = users.map(user => 
        createCaller(createAuthenticatedContext(user))
      );

      // Give each user some tasks
      for (let i = 0; i < users.length; i++) {
        await testDataFactory.task.createMany(users[i].id, 5);
      }

      // Simulate concurrent user activity
      const start = Date.now();
      const userPromises = callers.map(async (caller, i) => {
        // Each user performs multiple operations
        const tasks = await caller.getAll();
        await caller.create({ title: `User ${i} new task` });
        if (tasks.length > 0) {
          await caller.update({ 
            id: tasks[0].id, 
            completed: !tasks[0].completed 
          });
        }
        return caller.getAll();
      });

      const results = await Promise.all(userPromises);
      const multiUserTime = Date.now() - start;
      
      console.log(`Handled 10 concurrent users in ${multiUserTime}ms`);

      expect(results).toHaveLength(10);
      results.forEach(userTasks => {
        expect(userTasks.length).toBeGreaterThanOrEqual(5); // At least 5 tasks per user
      });
      
      // Should handle 10 concurrent users within 10 seconds
      expect(multiUserTime).toBeLessThan(10000);
    });

    it('should maintain performance with complex queries', async () => {
      const user = await authHelper.createTestUser();
      
      // Create a large number of tasks with various properties
      const tasks = [];
      for (let i = 0; i < 200; i++) {
        tasks.push(await testDataFactory.task.create(user.id, {
          title: `Query Test Task ${i + 1}`,
          completed: i % 3 === 0,
          priority: (i % 4) + 1,
          dueDate: i % 2 === 0 ? new Date(Date.now() + i * 24 * 60 * 60 * 1000) : null,
        }));
      }

      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Test complex query performance
      const start = Date.now();
      const allTasks = await caller.getAll();
      const queryTime = Date.now() - start;
      
      console.log(`Queried 200 tasks with relationships in ${queryTime}ms`);

      expect(allTasks).toHaveLength(200);
      expect(queryTime).toBeLessThan(2000); // Should query within 2 seconds
    });
  });

  describe('Stress Tests', () => {
    it('should handle edge case data sizes', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create task with very long title and description
      const longTitle = 'A'.repeat(1000);
      const longDescription = 'B'.repeat(5000);
      const manyLabels = Array.from({ length: 50 }, (_, i) => `label-${i}`);

      const start = Date.now();
      const task = await caller.create({
        title: longTitle,
        description: longDescription,
        labels: manyLabels,
      });
      const createTime = Date.now() - start;

      console.log(`Created task with large data in ${createTime}ms`);

      expect(task.title).toBe(longTitle);
      expect(task.description).toBe(longDescription);
      expect(task.labels).toHaveLength(50);
      expect(createTime).toBeLessThan(2000); // Should handle large data within 2 seconds
    });

    it('should handle rapid create/delete cycles', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      const start = Date.now();
      
      // Rapidly create and delete tasks
      for (let cycle = 0; cycle < 20; cycle++) {
        const task = await caller.create({
          title: `Cycle Task ${cycle}`,
        });
        
        await caller.delete({ id: task.id });
      }
      
      const cycleTime = Date.now() - start;
      console.log(`Completed 20 create/delete cycles in ${cycleTime}ms`);

      // Should complete cycles within 10 seconds
      expect(cycleTime).toBeLessThan(10000);

      // Verify no tasks remain
      const remainingTasks = await caller.getAll();
      expect(remainingTasks).toHaveLength(0);
    });

    it('should maintain data integrity under concurrent stress', async () => {
      const user = await authHelper.createTestUser();
      const context = createAuthenticatedContext(user);
      const caller = createCaller(context);

      // Create initial task
      const initialTask = await caller.create({
        title: 'Stress Test Task',
        priority: 1,
      });

      // Perform many concurrent updates to the same task
      const updatePromises = Array.from({ length: 20 }, (_, i) =>
        caller.update({
          id: initialTask.id,
          title: `Updated Title ${i}`,
          priority: (i % 4) + 1,
        })
      );

      const updates = await Promise.all(updatePromises);
      
      // All updates should succeed
      expect(updates).toHaveLength(20);
      
      // Verify final state is consistent
      const finalTask = await caller.getById({ id: initialTask.id });
      expect(finalTask.id).toBe(initialTask.id);
      expect(finalTask.title).toMatch(/Updated Title \d+/);
      expect(finalTask.priority).toBeGreaterThanOrEqual(1);
      expect(finalTask.priority).toBeLessThanOrEqual(4);
    });
  });
});

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    return fn().then(result => {
      const duration = Date.now() - start;
      this.recordMeasurement(operation, duration);
      return result;
    });
  }

  static recordMeasurement(operation: string, duration: number) {
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    this.measurements.get(operation)!.push(duration);
  }

  static getStats(operation: string) {
    const measurements = this.measurements.get(operation) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  static printReport() {
    console.log('\n📊 Performance Report:');
    for (const [operation, measurements] of this.measurements) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`
${operation}:
  Count: ${stats.count}
  Min: ${stats.min}ms
  Max: ${stats.max}ms
  Avg: ${stats.avg.toFixed(2)}ms
  Median: ${stats.median}ms
  95th: ${stats.p95}ms
        `);
      }
    }
  }

  static clear() {
    this.measurements.clear();
  }
}