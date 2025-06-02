# Todoist Integration Guide

This application now supports full synchronization with Todoist, allowing you to manage your tasks both locally and in Todoist.

## Features

- **Create tasks** - Create tasks locally with optional sync to Todoist
- **Edit tasks** - Update task details with automatic sync
- **Delete tasks** - Remove tasks from both local database and Todoist
- **Complete/uncomplete tasks** - Mark tasks as done/undone with sync
- **Import from Todoist** - Import all your existing Todoist tasks
- **Two-way sync** - Changes in either system are synchronized

## Setup

### 1. Get your Todoist API Token

1. Go to [Todoist Settings > Integrations](https://todoist.com/app/settings/integrations)
2. Scroll down to "API token"
3. Copy your personal API token

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Existing variables...
DATABASE_URL="file:./db.sqlite"
AUTH_SECRET="your-auth-secret"
AUTH_DISCORD_ID="your-discord-id"
AUTH_DISCORD_SECRET="your-discord-secret"

# Todoist Integration
TODOIST_API_KEY="your-todoist-api-token"
```

### 3. Run Database Migration

After updating the schema, run:

```bash
npm run db:push
# or
npm run db:generate
npm run db:migrate
```

## API Routes

The following tRPC routes are available:

### Task Management
- `task.getAll` - Get all tasks for the current user
- `task.getById` - Get a specific task by ID
- `task.create` - Create a new task (with optional Todoist sync)
- `task.update` - Update an existing task
- `task.delete` - Delete a task

### Todoist Sync
- `task.syncFromTodoist` - Import/update all tasks from Todoist
- `task.updateTodoistToken` - Update user's Todoist API token
- `task.getTodoistStatus` - Check if Todoist is connected

## Usage Examples

### Creating a Task with Todoist Sync

```typescript
const newTask = await trpc.task.create.mutate({
  title: "Complete project documentation",
  description: "Write comprehensive docs for the new feature",
  priority: 2, // 1-4, where 4 is highest
  dueDate: new Date("2024-01-15"),
  labels: ["work", "documentation"],
  syncToTodoist: true // This will create the task in Todoist
});
```

### Syncing All Tasks from Todoist

```typescript
const syncResult = await trpc.task.syncFromTodoist.mutate();
console.log(`Imported: ${syncResult.imported}, Updated: ${syncResult.updated}`);
```

### Updating Task Completion Status

```typescript
await trpc.task.update.mutate({
  id: "task-id",
  completed: true // This will mark the task as complete in Todoist too
});
```

## Task Model

Tasks are stored with the following fields:

- `id` - Unique identifier
- `todoistId` - Todoist task ID (if synced)
- `title` - Task title/content
- `description` - Optional task description
- `completed` - Completion status
- `priority` - Priority level (1-4)
- `dueDate` - Optional due date
- `labels` - Array of task labels
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- `syncedAt` - Last sync with Todoist timestamp

## Notes

- Priority mapping: Local priority 1-4 maps to Todoist priority 4-1 (reversed)
- Tasks created locally can optionally sync to Todoist
- Tasks imported from Todoist maintain their link for future syncs
- Deleting a linked task removes it from both systems
- API errors are logged but don't block local operations 