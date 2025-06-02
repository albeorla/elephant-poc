import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskManager } from '../TaskManager'
import { api } from '~/trpc/react'

// Mock tRPC
vi.mock('~/trpc/react', () => ({
  api: {
    task: {
      getAll: {
        useQuery: vi.fn(),
      },
      getTodoistStatus: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
      syncFromTodoist: {
        useMutation: vi.fn(),
      },
    },
    useUtils: vi.fn(() => ({
      task: {
        getAll: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
}))

// Mock TodoistSettings component
vi.mock('../TodoistSettings', () => ({
  TodoistSettings: () => <div data-testid="todoist-settings">Todoist Settings</div>,
}))

describe('TaskManager', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Test Task 1',
      description: 'Description 1',
      completed: false,
      priority: 2,
      dueDate: new Date('2024-01-15'),
      todoistId: 'todoist-1',
      labels: [{ id: 'label-1', name: 'work' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedAt: new Date(),
      userId: 'user-1',
    },
    {
      id: '2',
      title: 'Test Task 2',
      completed: true,
      priority: 1,
      dueDate: null,
      todoistId: null,
      labels: [],
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedAt: null,
      userId: 'user-1',
    },
  ]

  const mockCreateMutation = {
    mutate: vi.fn(),
    isPending: false,
  }

  const mockUpdateMutation = {
    mutate: vi.fn(),
    isPending: false,
  }

  const mockDeleteMutation = {
    mutate: vi.fn(),
    isPending: false,
  }

  const mockSyncMutation = {
    mutate: vi.fn(),
    isPending: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    ;(api.task.getAll.useQuery as any).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    })
    ;(api.task.getTodoistStatus.useQuery as any).mockReturnValue({
      data: { connected: true },
    })
    ;(api.task.create.useMutation as any).mockReturnValue(mockCreateMutation)
    ;(api.task.update.useMutation as any).mockReturnValue(mockUpdateMutation)
    ;(api.task.delete.useMutation as any).mockReturnValue(mockDeleteMutation)
    ;(api.task.syncFromTodoist.useMutation as any).mockReturnValue(mockSyncMutation)
  })

  describe('Rendering', () => {
    it('should render task manager with tasks', () => {
      render(<TaskManager />)
      
      expect(screen.getByText('Task Manager')).toBeInTheDocument()
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
      expect(screen.getByText('Test Task 2')).toBeInTheDocument()
      expect(screen.getByText('Description 1')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      ;(api.task.getAll.useQuery as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      render(<TaskManager />)
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument()
    })

    it('should show empty state when no tasks', () => {
      ;(api.task.getAll.useQuery as any).mockReturnValue({
        data: [],
        isLoading: false,
      })

      render(<TaskManager />)
      expect(screen.getByText('No tasks yet. Create one above!')).toBeInTheDocument()
    })

    it('should show Todoist connection status', () => {
      render(<TaskManager />)
      expect(screen.getByText('Todoist: Connected')).toBeInTheDocument()
    })

    it('should show disconnected status', () => {
      ;(api.task.getTodoistStatus.useQuery as any).mockReturnValue({
        data: { connected: false },
      })

      render(<TaskManager />)
      expect(screen.getByText('Todoist: Not connected')).toBeInTheDocument()
    })
  })

  describe('Task Creation', () => {
    it('should create a task', async () => {
      render(<TaskManager />)
      
      const input = screen.getByPlaceholderText('Add a new task...')
      const addButton = screen.getByText('Add Task')

      fireEvent.change(input, { target: { value: 'New Task' } })
      fireEvent.click(addButton)

      expect(mockCreateMutation.mutate).toHaveBeenCalledWith({
        title: 'New Task',
        syncToTodoist: false,
        priority: 2,
        labels: [],
      })
    })

    it('should create task with Todoist sync', async () => {
      render(<TaskManager />)
      
      const input = screen.getByPlaceholderText('Add a new task...')
      const syncCheckbox = screen.getByRole('checkbox', { name: /sync to todoist/i })
      const addButton = screen.getByText('Add Task')

      fireEvent.change(input, { target: { value: 'New Task' } })
      fireEvent.click(syncCheckbox)
      fireEvent.click(addButton)

      expect(mockCreateMutation.mutate).toHaveBeenCalledWith({
        title: 'New Task',
        syncToTodoist: true,
        priority: 2,
        labels: [],
      })
    })

    it('should create task on Enter key press', () => {
      render(<TaskManager />)
      
      const input = screen.getByPlaceholderText('Add a new task...')
      fireEvent.change(input, { target: { value: 'New Task' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      expect(mockCreateMutation.mutate).toHaveBeenCalled()
    })

    it('should not create empty task', () => {
      render(<TaskManager />)
      
      const addButton = screen.getByText('Add Task')
      fireEvent.click(addButton)

      expect(mockCreateMutation.mutate).not.toHaveBeenCalled()
    })

    it('should disable sync checkbox when not connected to Todoist', () => {
      ;(api.task.getTodoistStatus.useQuery as any).mockReturnValue({
        data: { connected: false },
      })

      render(<TaskManager />)
      const syncCheckbox = screen.getByRole('checkbox', { name: /sync to todoist/i })
      expect(syncCheckbox).toBeDisabled()
    })
  })

  describe('Task Updates', () => {
    it('should toggle task completion', () => {
      render(<TaskManager />)
      
      const checkboxes = screen.getAllByRole('checkbox')
      // First checkbox is the sync checkbox, so task checkboxes start at index 1
      const firstTaskCheckbox = checkboxes[1]
      
      if (firstTaskCheckbox) {
        fireEvent.click(firstTaskCheckbox)
      }

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: '1',
        completed: true,
      })
    })

    it('should show completed task with strikethrough', () => {
      render(<TaskManager />)
      
      const completedTask = screen.getByText('Test Task 2')
      expect(completedTask).toHaveClass('line-through')
    })
  })

  describe('Task Deletion', () => {
    it('should delete a task', () => {
      render(<TaskManager />)
      
      const deleteButtons = screen.getAllByText('Delete')
      if (deleteButtons[0]) {
        fireEvent.click(deleteButtons[0])
      }

      expect(mockDeleteMutation.mutate).toHaveBeenCalledWith({ id: '1' })
    })
  })

  describe('Todoist Sync', () => {
    it('should sync from Todoist', () => {
      render(<TaskManager />)
      
      const syncButton = screen.getByText('Sync from Todoist')
      fireEvent.click(syncButton)

      expect(mockSyncMutation.mutate).toHaveBeenCalled()
    })

    it('should show sync button only when connected', () => {
      ;(api.task.getTodoistStatus.useQuery as any).mockReturnValue({
        data: { connected: false },
      })

      render(<TaskManager />)
      expect(screen.queryByText('Sync from Todoist')).not.toBeInTheDocument()
    })

    it('should show syncing state', () => {
      ;(api.task.syncFromTodoist.useMutation as any).mockReturnValue({
        ...mockSyncMutation,
        isPending: true,
      })

      render(<TaskManager />)
      expect(screen.getByText('Syncing...')).toBeInTheDocument()
    })
  })

  describe('Settings', () => {
    it('should toggle settings visibility', () => {
      render(<TaskManager />)
      
      const settingsButton = screen.getByText('Settings')
      fireEvent.click(settingsButton)

      expect(screen.getByTestId('todoist-settings')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Hide Settings'))
      expect(screen.queryByTestId('todoist-settings')).not.toBeInTheDocument()
    })
  })

  describe('Task Display', () => {
    it('should show task labels', () => {
      render(<TaskManager />)
      expect(screen.getByText('🏷️ work')).toBeInTheDocument()
    })

    it('should show due date', () => {
      render(<TaskManager />)
      expect(screen.getByText(/📅.*2024/)).toBeInTheDocument()
    })

    it('should show sync indicator for Todoist tasks', () => {
      render(<TaskManager />)
      expect(screen.getByText('📱 Synced')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state for create button', () => {
      ;(api.task.create.useMutation as any).mockReturnValue({
        ...mockCreateMutation,
        isPending: true,
      })

      render(<TaskManager />)
      expect(screen.getByText('Adding...')).toBeInTheDocument()
    })

    it('should disable delete button when pending', () => {
      ;(api.task.delete.useMutation as any).mockReturnValue({
        ...mockDeleteMutation,
        isPending: true,
      })

      render(<TaskManager />)
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons[0]).toBeDisabled()
    })
  })
}) 