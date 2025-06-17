# API Reference

This document provides comprehensive documentation for all tRPC API endpoints available in the application.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Task API](#task-api)
- [Post API](#post-api)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

## Overview

The application uses tRPC for type-safe API communication between the frontend and backend. All API calls are automatically typed and validated at compile time.

### Base Configuration

```typescript
// Client usage
import { api } from "~/trpc/react";

// Server usage
import { api } from "~/trpc/server";
```

### API Structure

The API is organized into the following routers:
- **`api.task.*`** - Task management operations
- **`api.post.*`** - Post operations (legacy demo functionality)

## Authentication

### Authentication Provider
- **Provider**: Discord OAuth via NextAuth.js
- **Session Management**: JWT-based sessions with Prisma adapter
- **Session Storage**: Database-backed sessions

### Authorization Levels

#### Public Procedures
No authentication required. Limited to basic demo endpoints.

#### Protected Procedures
Require valid user session. All task management endpoints are protected.

```typescript
// Example: Checking authentication in components
const { data: session } = useSession();
if (!session) {
  return <SignInButton />;
}
```

### Error Codes
- **`UNAUTHORIZED`** - Missing or invalid session
- **`FORBIDDEN`** - Valid session but insufficient permissions
- **`NOT_FOUND`** - Resource doesn't exist or user lacks access

## Task API

All task endpoints require authentication and automatically filter by the current user.

### Queries

#### `api.task.getAll`

Retrieve all tasks for the authenticated user.

**Parameters**: None

**Returns**: `Task[]`

**Example**:
```typescript
const { data: tasks, isLoading } = api.task.getAll.useQuery();
```

**Response**:
```typescript
[
  {
    id: "clr1234567890",
    title: "Complete project documentation",
    description: "Write comprehensive API docs",
    completed: false,
    priority: 3,
    dueDate: "2024-06-20T14:00:00Z",
    todoistId: "2995104339",
    syncedAt: "2024-06-16T10:30:00Z",
    createdAt: "2024-06-15T09:00:00Z",
    updatedAt: "2024-06-16T10:30:00Z",
    userId: "clr0987654321",
    labels: [
      { id: "clr1111111111", name: "work" },
      { id: "clr2222222222", name: "documentation" }
    ]
  }
]
```

#### `api.task.getById`

Retrieve a specific task by its ID.

**Parameters**:
```typescript
{
  id: string  // Task ID
}
```

**Returns**: `Task`

**Example**:
```typescript
const { data: task } = api.task.getById.useQuery({ 
  id: "clr1234567890" 
});
```

**Errors**:
- `NOT_FOUND` - Task doesn't exist or user doesn't own it

#### `api.task.getTodoistStatus`

Check if the user has Todoist integration configured.

**Parameters**: None

**Returns**:
```typescript
{
  connected: boolean
}
```

**Example**:
```typescript
const { data: status } = api.task.getTodoistStatus.useQuery();
// status.connected === true if user has Todoist API token
```

### Mutations

#### `api.task.create`

Create a new task with optional Todoist synchronization.

**Parameters**:
```typescript
{
  title: string;           // Required, min length: 1, max length: 255
  description?: string;    // Optional, max length: 1000
  priority?: number;       // Optional, 1-4 (default: 1)
  dueDate?: Date;         // Optional
  labels?: string[];      // Optional, max 10 labels (default: [])
  syncToTodoist?: boolean; // Optional (default: false)
}
```

**Returns**: `Task`

**Example**:
```typescript
const createTask = api.task.create.useMutation({
  onSuccess: () => {
    // Invalidate and refetch tasks
    void utils.task.getAll.invalidate();
  },
});

// Usage
createTask.mutate({
  title: "New task",
  description: "Task description",
  priority: 3,
  dueDate: new Date("2024-06-20"),
  labels: ["work", "urgent"],
  syncToTodoist: true
});
```

**Behavior**:
- Creates labels automatically if they don't exist
- Syncs to Todoist if `syncToTodoist: true` and user has API token
- Priority mapping: Local (1-4) → Todoist (4-1)
- Graceful failure: Task created locally even if Todoist sync fails

#### `api.task.update`

Update an existing task with optional Todoist synchronization.

**Parameters**:
```typescript
{
  id: string;             // Required, task ID
  title?: string;         // Optional, min length: 1, max length: 255
  description?: string;   // Optional, max length: 1000, null to clear
  completed?: boolean;    // Optional
  priority?: number;      // Optional, 1-4
  dueDate?: Date | null;  // Optional, null to clear
  labels?: string[];      // Optional, replaces all labels
}
```

**Returns**: `Task`

**Example**:
```typescript
const updateTask = api.task.update.useMutation();

// Mark task as completed
updateTask.mutate({
  id: "clr1234567890",
  completed: true
});

// Update multiple fields
updateTask.mutate({
  id: "clr1234567890",
  title: "Updated title",
  priority: 4,
  labels: ["work", "urgent", "high-priority"]
});
```

**Behavior**:
- Syncs changes to Todoist if task has `todoistId`
- Handles completion status (close/reopen in Todoist)
- Updates label associations (disconnects old, connects new)
- Updates `syncedAt` timestamp on successful sync

**Errors**:
- `NOT_FOUND` - Task doesn't exist or user doesn't own it

#### `api.task.delete`

Delete a task and optionally remove from Todoist.

**Parameters**:
```typescript
{
  id: string  // Task ID
}
```

**Returns**: `Task` (deleted task data)

**Example**:
```typescript
const deleteTask = api.task.delete.useMutation();

deleteTask.mutate({ id: "clr1234567890" });
```

**Behavior**:
- Deletes from Todoist if task has `todoistId`
- Removes all label associations
- Graceful failure: Deletes locally even if Todoist deletion fails

**Errors**:
- `NOT_FOUND` - Task doesn't exist or user doesn't own it

#### `api.task.syncFromTodoist`

Import and update tasks from Todoist API.

**Parameters**: None

**Returns**:
```typescript
{
  imported: number;  // Number of new tasks imported
  updated: number;   // Number of existing tasks updated
}
```

**Example**:
```typescript
const syncFromTodoist = api.task.syncFromTodoist.useMutation({
  onSuccess: (result) => {
    console.log(`Imported: ${result.imported}, Updated: ${result.updated}`);
    void utils.task.getAll.invalidate();
  },
  onError: (error) => {
    console.error('Sync failed:', error.message);
  },
});

syncFromTodoist.mutate();
```

**Behavior**:
- Imports new tasks from Todoist that don't exist locally
- Updates existing linked tasks with latest Todoist data
- Creates/connects labels automatically
- Converts Todoist priorities (4-1) to local priorities (1-4)
- Sets `todoistId` and `syncedAt` for imported/updated tasks

**Errors**:
- `PRECONDITION_FAILED` - No Todoist API token configured
- `INTERNAL_SERVER_ERROR` - Todoist service initialization failed

#### `api.task.updateTodoistToken`

Set or clear the user's Todoist API token.

**Parameters**:
```typescript
{
  token?: string  // Todoist API token, undefined to clear
}
```

**Returns**: `User` (updated user data)

**Example**:
```typescript
const updateToken = api.task.updateTodoistToken.useMutation();

// Set token
updateToken.mutate({ token: "1a2b3c4d5e6f7g8h9i0j" });

// Clear token
updateToken.mutate({ token: undefined });
```

## Post API

Legacy endpoints for demonstration purposes.

### `api.post.hello` (Public)

Simple greeting endpoint.

**Parameters**:
```typescript
{
  text: string
}
```

**Returns**:
```typescript
{
  greeting: string  // "Hello {text}"
}
```

### `api.post.create` (Protected)

Create a new post.

**Parameters**:
```typescript
{
  name: string  // min length: 1
}
```

**Returns**: `Post`

### `api.post.getLatest` (Protected)

Get the user's most recent post.

**Parameters**: None

**Returns**: `Post | null`

### `api.post.getSecretMessage` (Protected)

Demo protected endpoint.

**Parameters**: None

**Returns**: `string` ("you can now see this secret message!")

## Data Models

### Task

```typescript
interface Task {
  id: string;              // CUID identifier
  todoistId?: string;      // External Todoist task ID
  title: string;           // Task title/content
  description?: string;    // Optional detailed description
  completed: boolean;      // Completion status (default: false)
  priority: number;        // Priority 1-4 (1=lowest, 4=highest)
  dueDate?: Date;         // Optional due date
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
  syncedAt?: Date;        // Last Todoist sync timestamp
  userId: string;         // Owner user ID
  labels: Label[];        // Associated labels
}
```

### Label

```typescript
interface Label {
  id: string;     // CUID identifier
  name: string;   // Label name (unique)
  tasks: Task[];  // Associated tasks
}
```

### User

```typescript
interface User {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  todoistApiToken?: string;  // Todoist API token for sync
  tasks: Task[];
  // ... NextAuth.js fields
}
```

### Post

```typescript
interface Post {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}
```

## Error Handling

### Common Error Types

#### Validation Errors
```typescript
// Input validation with Zod
{
  code: "BAD_REQUEST",
  message: "Invalid input",
  cause: {
    fieldErrors: {
      title: ["String must contain at least 1 character(s)"],
      priority: ["Number must be between 1 and 4"]
    }
  }
}
```

#### Authentication Errors
```typescript
{
  code: "UNAUTHORIZED",
  message: "You must be logged in to access this resource"
}
```

#### Not Found Errors
```typescript
{
  code: "NOT_FOUND",
  message: "Task not found"
}
```

#### Precondition Failed
```typescript
{
  code: "PRECONDITION_FAILED",
  message: "Todoist API token not configured"
}
```

### Error Handling in Components

```typescript
const createTask = api.task.create.useMutation({
  onError: (error) => {
    if (error.data?.code === "UNAUTHORIZED") {
      // Redirect to sign in
      void signIn();
    } else if (error.data?.code === "BAD_REQUEST") {
      // Show validation errors
      setErrors(error.data.cause?.fieldErrors);
    } else {
      // Show generic error message
      toast.error(error.message);
    }
  },
});
```

## Usage Examples

### Complete Task Management Flow

```typescript
function TaskManager() {
  const utils = api.useUtils();
  
  // Query all tasks
  const { data: tasks, isLoading } = api.task.getAll.useQuery();
  
  // Create task mutation
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });
  
  // Update task mutation
  const updateTask = api.task.update.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });
  
  // Delete task mutation
  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });
  
  // Sync from Todoist
  const syncFromTodoist = api.task.syncFromTodoist.useMutation({
    onSuccess: (result) => {
      void utils.task.getAll.invalidate();
      toast.success(`Synced! Imported: ${result.imported}, Updated: ${result.updated}`);
    },
  });
  
  const handleCreateTask = (data: CreateTaskInput) => {
    createTask.mutate(data);
  };
  
  const handleToggleComplete = (taskId: string, completed: boolean) => {
    updateTask.mutate({
      id: taskId,
      completed: !completed,
    });
  };
  
  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate({ id: taskId });
  };
  
  return (
    <div>
      {/* Task creation form */}
      <TaskForm onSubmit={handleCreateTask} />
      
      {/* Sync button */}
      <button onClick={() => syncFromTodoist.mutate()}>
        Sync from Todoist
      </button>
      
      {/* Task list */}
      {tasks?.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleComplete={handleToggleComplete}
          onDelete={handleDeleteTask}
        />
      ))}
    </div>
  );
}
```

### Optimistic Updates

```typescript
const updateTask = api.task.update.useMutation({
  onMutate: async (variables) => {
    // Cancel any outgoing refetches
    await utils.task.getAll.cancel();
    
    // Snapshot the previous value
    const previousTasks = utils.task.getAll.getData();
    
    // Optimistically update to the new value
    utils.task.getAll.setData(undefined, (old) =>
      old?.map((task) =>
        task.id === variables.id
          ? { ...task, ...variables }
          : task
      ) ?? []
    );
    
    // Return a context object with the snapshotted value
    return { previousTasks };
  },
  onError: (err, variables, context) => {
    // If the mutation fails, use the context returned from onMutate to roll back
    utils.task.getAll.setData(undefined, context?.previousTasks);
  },
  onSettled: () => {
    // Always refetch after error or success
    void utils.task.getAll.invalidate();
  },
});
```

### Error Handling with React Hook Form

```typescript
function TaskForm() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<CreateTaskInput>();
  
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
    },
    onError: (error) => {
      if (error.data?.code === "BAD_REQUEST" && error.data.cause?.fieldErrors) {
        // Set field-specific errors
        Object.entries(error.data.cause.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof CreateTaskInput, {
            message: messages?.[0],
          });
        });
      } else {
        toast.error(error.message);
      }
    },
  });
  
  const onSubmit = (data: CreateTaskInput) => {
    createTask.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("title", { required: "Title is required" })}
        placeholder="Task title"
      />
      {errors.title && <span>{errors.title.message}</span>}
      
      <button type="submit" disabled={createTask.isPending}>
        {createTask.isPending ? "Creating..." : "Create Task"}
      </button>
    </form>
  );
}
```

### Server-Side Usage

```typescript
// In server components or API routes
import { api } from "~/trpc/server";

export default async function TasksPage() {
  // Server-side data fetching
  const tasks = await api.task.getAll();
  
  return (
    <div>
      <h1>Tasks ({tasks.length})</h1>
      {tasks.map((task) => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
        </div>
      ))}
    </div>
  );
}
```

This API provides a comprehensive, type-safe interface for task management with optional Todoist integration, following tRPC best practices for error handling and data fetching.