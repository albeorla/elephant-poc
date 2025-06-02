import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TodoistService } from '../todoist'
import type { TodoistTask } from '../todoist'

// Mock the env module
vi.mock('~/env', () => ({
  env: {
    TODOIST_API_KEY: undefined
  }
}))

// We need to import createTodoistService after mocking env
const { createTodoistService } = await import('../todoist')

// Mock the global fetch
global.fetch = vi.fn()

describe('TodoistService', () => {
  let service: TodoistService
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    service = new TodoistService(mockApiKey)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('request method', () => {
    it('should make requests with correct headers', async () => {
      const mockResponse = { id: '1', content: 'Test task' }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      await service.getTasks()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
          body: undefined,
        }
      )
    })

    it('should throw error on failed request', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      })

      await expect(service.getTasks()).rejects.toThrow('Todoist API error: Unauthorized')
    })

    it('should handle 204 No Content responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await service.deleteTask('123')
      expect(result).toBeUndefined()
    })
  })

  describe('getTasks', () => {
    it('should fetch all tasks', async () => {
      const mockTasks: TodoistTask[] = [
        {
          id: '1',
          content: 'Task 1',
          priority: 1,
          is_completed: false,
          created_at: '2024-01-01',
        },
        {
          id: '2',
          content: 'Task 2',
          description: 'Description',
          priority: 2,
          is_completed: true,
          created_at: '2024-01-02',
          labels: ['work'],
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTasks,
      })

      const tasks = await service.getTasks()
      expect(tasks).toEqual(mockTasks)
    })
  })

  describe('getTask', () => {
    it('should fetch a single task', async () => {
      const mockTask: TodoistTask = {
        id: '1',
        content: 'Test task',
        priority: 1,
        is_completed: false,
        created_at: '2024-01-01',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      })

      const task = await service.getTask('1')
      expect(task).toEqual(mockTask)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks/1',
        expect.any(Object)
      )
    })
  })

  describe('createTask', () => {
    it('should create a task with all fields', async () => {
      const newTask = {
        content: 'New task',
        description: 'Task description',
        priority: 3,
        due_date: '2024-01-15',
        labels: ['urgent', 'work'],
      }

      const mockCreatedTask: TodoistTask = {
        id: '123',
        ...newTask,
        priority: newTask.priority,
        is_completed: false,
        created_at: '2024-01-01',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCreatedTask,
      })

      const result = await service.createTask(newTask)
      expect(result).toEqual(mockCreatedTask)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newTask),
        })
      )
    })
  })

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updates = {
        content: 'Updated task',
        priority: 2,
      }

      const mockUpdatedTask: TodoistTask = {
        id: '123',
        content: 'Updated task',
        priority: 2,
        is_completed: false,
        created_at: '2024-01-01',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUpdatedTask,
      })

      const result = await service.updateTask('123', updates)
      expect(result).toEqual(mockUpdatedTask)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks/123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updates),
        })
      )
    })
  })

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await service.deleteTask('123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('closeTask', () => {
    it('should close a task', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await service.closeTask('123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks/123/close',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('reopenTask', () => {
    it('should reopen a task', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await service.reopenTask('123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.todoist.com/rest/v2/tasks/123/reopen',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})

describe('createTodoistService', () => {
  const originalEnv = process.env.TODOIST_API_KEY;
  const originalToken = process.env.TODOIST_TOKEN;

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.TODOIST_API_KEY
    delete process.env.TODOIST_TOKEN
  })

  afterEach(() => {
    if (originalEnv !== undefined) process.env.TODOIST_API_KEY = originalEnv
    if (originalToken !== undefined) process.env.TODOIST_TOKEN = originalToken
  })

  it('should create service with provided API key', async () => {
    // Re-import to get fresh module
    const { createTodoistService: createService } = await import('../todoist')
    const service = createService('test-key')
    expect(service).toBeTruthy()
    expect(service).toHaveProperty('getTasks')
    expect(service).toHaveProperty('createTask')
    expect(service).toHaveProperty('updateTask')
    expect(service).toHaveProperty('deleteTask')
  })

  it('should return null if no API key is provided', async () => {
    // Mock env with no API key
    vi.doMock('~/env', () => ({
      env: {
        TODOIST_API_KEY: undefined,
        TODOIST_TOKEN: undefined
      }
    }))
    
    // Re-import to get fresh module with mocked env
    const { createTodoistService: createService } = await import('../todoist')
    const service = createService()
    expect(service).toBeNull()
  })

  it('should use environment API key if available', async () => {
    // Mock env with API key
    vi.doMock('~/env', () => ({
      env: {
        TODOIST_API_KEY: 'env-test-key'
      }
    }))
    
    // Re-import to get fresh module with mocked env
    const { createTodoistService: createService } = await import('../todoist')
    const service = createService()
    expect(service).toBeTruthy()
    expect(service).toHaveProperty('getTasks')
    expect(service).toHaveProperty('createTask')
    expect(service).toHaveProperty('updateTask')
    expect(service).toHaveProperty('deleteTask')
  })
}) 