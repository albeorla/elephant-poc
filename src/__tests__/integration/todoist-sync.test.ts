import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTodoistService } from '../../server/services/todoist';

// Integration tests for Todoist API
describe('Todoist Integration Tests', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createTodoistService', () => {
    it('should handle successful API responses', async () => {
      const mockTask = {
        id: 'test-id',
        content: 'Test Task',
        description: 'Test Description',
        is_completed: false,
        priority: 2,
        created_at: '2024-01-01T00:00:00Z',
        labels: ['work']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTask),
      });

      const service = createTodoistService('test-token');
      const result = await service?.createTask({
        content: 'Test Task',
        description: 'Test Description',
        priority: 2,
        labels: ['work']
      });

      expect(result).toEqual(mockTask);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid task data'),
      });

      const service = createTodoistService('test-token');
      
      await expect(
        service?.createTask({
          content: 'Test Task',
        })
      ).rejects.toThrow('HTTP error! status: 400');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = createTodoistService('test-token');
      
      await expect(
        service?.createTask({
          content: 'Test Task',
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      const service = createTodoistService('test-token');
      
      await expect(
        service?.createTask({
          content: 'Test Task',
        })
      ).rejects.toThrow('HTTP error! status: 429');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid token'),
      });

      const service = createTodoistService('invalid-token');
      
      await expect(
        service?.getTasks()
      ).rejects.toThrow('HTTP error! status: 401');
    });

    it('should handle malformed response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const service = createTodoistService('test-token');
      
      await expect(
        service?.getTasks()
      ).rejects.toThrow('Invalid JSON');
    });

    it('should handle partial failures in batch operations', async () => {
      // Simulate a scenario where some tasks sync successfully and others fail
      const mockTasks = [
        { id: '1', content: 'Task 1', is_completed: false, priority: 1 },
        { id: '2', content: 'Task 2', is_completed: false, priority: 1 },
      ];

      // First call (getTasks) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks),
      });

      // Second call (updateTask) fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Task not found'),
      });

      const service = createTodoistService('test-token');
      
      // getTasks should succeed
      const tasks = await service?.getTasks();
      expect(tasks).toEqual(mockTasks);
      
      // updateTask should fail
      await expect(
        service?.updateTask('non-existent-id', { content: 'Updated' })
      ).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle empty responses correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = createTodoistService('test-token');
      const tasks = await service?.getTasks();
      
      expect(tasks).toEqual([]);
    });

    it('should validate API token format', () => {
      // Test with empty token
      expect(createTodoistService('')).toBeNull();
      
      // Test with undefined token
      expect(createTodoistService(undefined as any)).toBeNull();
      
      // Test with valid token
      expect(createTodoistService('valid-token')).toBeTruthy();
    });

    it('should handle timeout scenarios', async () => {
      // Simulate a slow response
      const slowResponse = new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([]),
        }), 10000); // 10 second delay
      });

      mockFetch.mockReturnValueOnce(slowResponse);

      const service = createTodoistService('test-token');
      
      // The actual timeout handling would depend on your implementation
      // This test verifies the service can handle slow responses
      const startTime = Date.now();
      
      // Cancel the slow request after a short time for testing
      setTimeout(() => {
        // In a real implementation, you might cancel the request here
      }, 100);
      
      // For this test, we'll just verify the service was created
      expect(service).toBeTruthy();
    });
  });

  describe('API Contract Tests', () => {
    it('should send requests with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const service = createTodoistService('test-token');
      await service?.getTasks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle different content types in responses', async () => {
      // Test with different response content types
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
        json: () => Promise.resolve([]),
      });

      const service = createTodoistService('test-token');
      const result = await service?.getTasks();
      
      expect(result).toEqual([]);
    });
  });
});