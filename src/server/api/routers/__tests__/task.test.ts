import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { createCallerFactory } from '../../trpc'
import { taskRouter } from '../task'
import { createTodoistService } from '../../../services/todoist'
import type { PrismaClient } from '@prisma/client'

// Mock auth module
vi.mock('~/server/auth', () => ({
  auth: vi.fn(),
  getServerAuthSession: vi.fn(),
}))

// Mock Todoist service
vi.mock('../../../services/todoist', () => ({
  createTodoistService: vi.fn(),
}))

// Create a mock context
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
})

describe('taskRouter', () => {
  const createCaller = createCallerFactory(taskRouter)
  let mockContext: ReturnType<typeof createMockContext>
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    mockContext = createMockContext()
    caller = createCaller(mockContext)
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return all tasks for the current user', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', labels: [] },
        { id: '2', title: 'Task 2', labels: [] },
      ]
      mockContext.db.task.findMany.mockResolvedValue(mockTasks)

      const result = await caller.getAll()

      expect(result).toEqual(mockTasks)
      expect(mockContext.db.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        include: { labels: true },
      })
    })
  })

  describe('getById', () => {
    it('should return a task by id', async () => {
      const mockTask = { id: '1', title: 'Task 1', userId: 'test-user-id', labels: [] }
      mockContext.db.task.findFirst.mockResolvedValue(mockTask)

      const result = await caller.getById({ id: '1' })

      expect(result).toEqual(mockTask)
      expect(mockContext.db.task.findFirst).toHaveBeenCalledWith({
        where: { id: '1', userId: 'test-user-id' },
        include: { labels: true },
      })
    })

    it('should throw NOT_FOUND error when task does not exist', async () => {
      mockContext.db.task.findFirst.mockResolvedValue(null)

      await expect(caller.getById({ id: '999' })).rejects.toThrow(
        new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      )
    })
  })

  describe('create', () => {
    const createInput = {
      title: 'New Task',
      description: 'Task description',
      priority: 2,
      dueDate: new Date('2024-01-15'),
      labels: ['work', 'urgent'],
      syncToTodoist: false,
    }

    it('should create a task without Todoist sync', async () => {
      const mockCreatedTask = {
        id: 'new-task-id',
        ...createInput,
        todoistId: null,
        syncedAt: null,
        userId: 'test-user-id',
        labels: [
          { id: '1', name: 'work' },
          { id: '2', name: 'urgent' },
        ],
      }
      mockContext.db.task.create.mockResolvedValue(mockCreatedTask)

      const result = await caller.create(createInput)

      expect(result).toEqual(mockCreatedTask)
      expect(mockContext.db.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Task',
          description: 'Task description',
          priority: 2,
          dueDate: createInput.dueDate,
          todoistId: undefined,
          syncedAt: null,
          userId: 'test-user-id',
          labels: {
            connectOrCreate: [
              { where: { name: 'work' }, create: { name: 'work' } },
              { where: { name: 'urgent' }, create: { name: 'urgent' } },
            ],
          },
        }),
        include: { labels: true },
      })
    })

    it('should create a task with Todoist sync', async () => {
      const mockTodoistService = {
        createTask: vi.fn().mockResolvedValue({
          id: 'todoist-task-id',
          content: 'New Task',
          priority: 3,
        }),
      }
      ;(createTodoistService as any).mockReturnValue(mockTodoistService)
      
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-api-token',
      })

      const mockCreatedTask = {
        id: 'new-task-id',
        ...createInput,
        todoistId: 'todoist-task-id',
        syncedAt: new Date(),
        userId: 'test-user-id',
        labels: [],
      }
      mockContext.db.task.create.mockResolvedValue(mockCreatedTask)

      await caller.create({ ...createInput, syncToTodoist: true })

      expect(mockTodoistService.createTask).toHaveBeenCalledWith({
        content: 'New Task',
        description: 'Task description',
        priority: 3, // 5 - 2
        due_date: '2024-01-15',
        labels: ['work', 'urgent'],
      })

      expect(mockContext.db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            todoistId: 'todoist-task-id',
            syncedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should handle Todoist sync failure gracefully', async () => {
      const mockTodoistService = {
        createTask: vi.fn().mockRejectedValue(new Error('API Error')),
      }
      ;(createTodoistService as any).mockReturnValue(mockTodoistService)
      
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-api-token',
      })

      const mockCreatedTask = {
        id: 'new-task-id',
        ...createInput,
        todoistId: null,
        syncedAt: null,
        userId: 'test-user-id',
        labels: [],
      }
      mockContext.db.task.create.mockResolvedValue(mockCreatedTask)

      const result = await caller.create({ ...createInput, syncToTodoist: true })

      // Task should still be created locally even if Todoist sync fails
      expect(result).toEqual(mockCreatedTask)
      expect(mockContext.db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            todoistId: undefined,
            syncedAt: null,
          }),
        })
      )
    })
  })

  describe('update', () => {
    const updateInput = {
      id: 'task-1',
      title: 'Updated Task',
      completed: true,
    }

    it('should update a task without Todoist sync', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Original Task',
        completed: false,
        todoistId: null,
        userId: 'test-user-id',
        labels: [],
      }
      mockContext.db.task.findFirst.mockResolvedValue(existingTask)

      const updatedTask = {
        ...existingTask,
        ...updateInput,
      }
      mockContext.db.task.update.mockResolvedValue(updatedTask)

      const result = await caller.update(updateInput)

      expect(result).toEqual(updatedTask)
    })

    it('should update a task with Todoist sync', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Original Task',
        completed: false,
        todoistId: 'todoist-task-id',
        userId: 'test-user-id',
        labels: [],
      }
      mockContext.db.task.findFirst.mockResolvedValue(existingTask)

      const mockTodoistService = {
        closeTask: vi.fn(),
        updateTask: vi.fn(),
      }
      ;(createTodoistService as any).mockReturnValue(mockTodoistService)
      
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-api-token',
      })

      const updatedTask = { ...existingTask, ...updateInput }
      mockContext.db.task.update.mockResolvedValue(updatedTask)

      await caller.update(updateInput)

      expect(mockTodoistService.closeTask).toHaveBeenCalledWith('todoist-task-id')
      expect(mockTodoistService.updateTask).toHaveBeenCalledWith('todoist-task-id', {
        content: 'Updated Task',
      })
    })

    it('should throw NOT_FOUND error when task does not exist', async () => {
      mockContext.db.task.findFirst.mockResolvedValue(null)

      await expect(caller.update(updateInput)).rejects.toThrow(
        new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      )
    })
  })

  describe('delete', () => {
    it('should delete a task without Todoist sync', async () => {
      const existingTask = {
        id: 'task-1',
        todoistId: null,
        userId: 'test-user-id',
      }
      mockContext.db.task.findFirst.mockResolvedValue(existingTask)
      mockContext.db.task.delete.mockResolvedValue(existingTask)

      const result = await caller.delete({ id: 'task-1' })

      expect(result).toEqual(existingTask)
      expect(mockContext.db.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      })
    })

    it('should delete a task with Todoist sync', async () => {
      const existingTask = {
        id: 'task-1',
        todoistId: 'todoist-task-id',
        userId: 'test-user-id',
      }
      mockContext.db.task.findFirst.mockResolvedValue(existingTask)

      const mockTodoistService = {
        deleteTask: vi.fn(),
      }
      ;(createTodoistService as any).mockReturnValue(mockTodoistService)
      
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-api-token',
      })

      mockContext.db.task.delete.mockResolvedValue(existingTask)

      await caller.delete({ id: 'task-1' })

      expect(mockTodoistService.deleteTask).toHaveBeenCalledWith('todoist-task-id')
      expect(mockContext.db.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      })
    })
  })

  describe('syncFromTodoist', () => {
    it('should sync tasks from Todoist', async () => {
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-api-token',
      })

      const mockTodoistService = {
        getTasks: vi.fn().mockResolvedValue([
          {
            id: 'todoist-1',
            content: 'Todoist Task 1',
            is_completed: false,
            priority: 2,
            created_at: '2024-01-01',
            labels: ['work'],
          },
          {
            id: 'todoist-2',
            content: 'Todoist Task 2',
            is_completed: true,
            priority: 1,
            created_at: '2024-01-02',
          },
        ]),
      }
      ;(createTodoistService as any).mockReturnValue(mockTodoistService)

      mockContext.db.task.findMany.mockResolvedValue([
        {
          id: 'local-1',
          todoistId: 'todoist-2',
          title: 'Old Task 2',
          labels: [],
        },
      ])

      mockContext.db.task.create.mockResolvedValue({})
      mockContext.db.task.update.mockResolvedValue({})

      const result = await caller.syncFromTodoist()

      expect(result).toEqual({ imported: 1, updated: 1 })
      
      // Should create new task
      expect(mockContext.db.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          todoistId: 'todoist-1',
          title: 'Todoist Task 1',
          completed: false,
          priority: 3, // 5 - 2
          userId: 'test-user-id',
        }),
      })

      // Should update existing task
      expect(mockContext.db.task.update).toHaveBeenCalledTimes(2) // Once to clear labels, once to update
    })

    it('should throw error when no API token', async () => {
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: null,
      })

      await expect(caller.syncFromTodoist()).rejects.toThrow(
        new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Todoist API token not configured',
        })
      )
    })
  })

  describe('updateTodoistToken', () => {
    it('should update user Todoist token', async () => {
      mockContext.db.user.update.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'new-token',
      } as any)

      const result = await caller.updateTodoistToken({ token: 'new-token' })

      expect(mockContext.db.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { todoistApiToken: 'new-token' },
      })
      expect((result as any).todoistApiToken).toBe('new-token')
    })

    it('should clear token when undefined', async () => {
      mockContext.db.user.update.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: null,
      })

      await caller.updateTodoistToken({ token: undefined })

      expect(mockContext.db.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { todoistApiToken: undefined },
      })
    })
  })

  describe('getTodoistStatus', () => {
    it('should return connected status when token exists', async () => {
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: 'test-token',
      })

      const result = await caller.getTodoistStatus()

      expect(result).toEqual({ connected: true })
    })

    it('should return disconnected status when no token', async () => {
      mockContext.db.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        todoistApiToken: null,
      })

      const result = await caller.getTodoistStatus()

      expect(result).toEqual({ connected: false })
    })
  })
}) 