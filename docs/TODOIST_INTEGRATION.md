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

## Troubleshooting

### Common Issues

#### "Invalid API Token" Error
**Problem**: Getting authentication errors when trying to sync with Todoist.

**Solutions**:
1. Verify your API token is correct by visiting [Todoist Settings](https://todoist.com/app/settings/integrations)
2. Ensure there are no extra spaces when copying/pasting the token
3. Check that the token hasn't expired or been regenerated
4. Try disconnecting and reconnecting your Todoist integration

#### Tasks Not Syncing
**Problem**: Tasks created locally aren't appearing in Todoist or vice versa.

**Solutions**:
1. Check your internet connection
2. Verify the "Sync to Todoist" toggle is enabled when creating tasks
3. Manual sync by clicking "Sync from Todoist" button
4. Check browser console for any error messages
5. Ensure your Todoist account has sufficient API quota

#### Duplicate Tasks
**Problem**: Same tasks appearing multiple times after sync.

**Solutions**:
1. Avoid rapid successive syncs - wait for completion
2. Check if tasks have conflicting `todoistId` values
3. Clear local database and re-sync if needed:
   ```bash
   npm run db:push --force-reset
   ```

#### Priority Mismatches
**Problem**: Task priorities don't match between systems.

**Explanation**: This is expected behavior due to different priority systems:
- **Local App**: 1 (lowest) → 4 (highest)
- **Todoist**: 1 (highest) → 4 (lowest)

The app automatically converts priorities during sync.

### API Rate Limits

Todoist has the following rate limits:
- **API Requests**: 450 requests per 15-minute window
- **Sync Frequency**: Recommended maximum of once per minute

The app handles rate limiting automatically by:
- Queuing requests when limits are approached
- Showing appropriate error messages
- Implementing exponential backoff for retries

### Error Handling

The application handles various error scenarios:

#### Network Errors
- **Offline Mode**: Tasks continue to work locally
- **Connection Issues**: Graceful degradation with retry logic
- **Timeout Errors**: Automatic retry with exponential backoff

#### API Errors
- **Invalid Token**: Clear error message with reconnection prompt
- **Task Not Found**: Automatic cleanup of orphaned references
- **Quota Exceeded**: Rate limiting with retry scheduling

#### Data Conflicts
- **Modified Tasks**: Local changes take precedence
- **Deleted Tasks**: Proper cleanup in both systems
- **Invalid Data**: Validation with helpful error messages

## Advanced Usage

### Bulk Operations

#### Import All Todoist Tasks
```typescript
// Import all tasks from Todoist
const result = await trpc.task.syncFromTodoist.mutate();
console.log(`Imported: ${result.imported} tasks, Updated: ${result.updated} tasks`);
```

#### Create Multiple Tasks with Sync
```typescript
const tasks = [
  { title: "Task 1", priority: 3, syncToTodoist: true },
  { title: "Task 2", priority: 1, syncToTodoist: true },
  { title: "Task 3", priority: 4, syncToTodoist: true }
];

for (const taskData of tasks) {
  await trpc.task.create.mutate(taskData);
}
```

### Custom Labels and Organization

#### Creating Tasks with Multiple Labels
```typescript
await trpc.task.create.mutate({
  title: "Project meeting",
  description: "Discuss Q4 roadmap",
  labels: ["work", "meeting", "urgent"],
  priority: 3,
  dueDate: new Date("2024-02-15T14:00:00Z"),
  syncToTodoist: true
});
```

#### Filtering and Querying
```typescript
// Get all high-priority incomplete tasks
const highPriorityTasks = tasks?.filter(task => 
  !task.completed && task.priority >= 3
);

// Get tasks due today
const today = new Date().toDateString();
const todayTasks = tasks?.filter(task => 
  task.dueDate && new Date(task.dueDate).toDateString() === today
);
```

### Integration Patterns

#### Webhook Integration (Advanced)
While this app doesn't include webhooks, you can extend it:

```typescript
// Example webhook handler for real-time Todoist updates
export async function handleTodoistWebhook(payload: any) {
  const { event_name, event_data } = payload;
  
  switch (event_name) {
    case 'item:added':
      await syncTaskFromTodoist(event_data.id);
      break;
    case 'item:updated':
      await updateLocalTask(event_data.id, event_data);
      break;
    case 'item:deleted':
      await deleteLocalTask(event_data.id);
      break;
  }
}
```

#### Custom Sync Strategies
```typescript
// Sync only specific project tasks
const syncProjectTasks = async (projectId: string) => {
  const todoistService = createTodoistService(apiToken);
  const projectTasks = await todoistService.getProjectTasks(projectId);
  
  for (const task of projectTasks) {
    await syncSingleTask(task);
  }
};
```

### Performance Optimization

#### Batch Sync Operations
```typescript
// Efficient bulk sync with batching
const batchSyncTasks = async (taskIds: string[]) => {
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < taskIds.length; i += batchSize) {
    batches.push(taskIds.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    await Promise.all(
      batch.map(id => syncSingleTask(id))
    );
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
```

#### Optimistic Updates
The app uses optimistic updates for better UX:
- Task completion toggles immediately
- Create/delete operations show instant feedback
- Failed operations automatically revert with error messages

## Security Considerations

### API Token Storage
- Tokens are stored securely in the database
- Never expose tokens in client-side code
- Use environment variables for server-side tokens
- Implement token rotation for production use

### Data Privacy
- All task data remains private to the authenticated user
- No cross-user data access
- Secure authentication via NextAuth.js
- HTTPS required for production deployments

### Best Practices
1. **Regular Token Rotation**: Update API tokens periodically
2. **Scope Limitation**: Use tokens with minimal required permissions
3. **Error Logging**: Monitor for suspicious API usage patterns
4. **Backup Strategy**: Regular database backups for data recovery

## Notes

- **Priority Mapping**: Local priority 1-4 maps to Todoist priority 4-1 (reversed)
- **Task Ownership**: Tasks created locally can optionally sync to Todoist
- **Persistent Links**: Tasks imported from Todoist maintain their link for future syncs
- **Bidirectional Deletion**: Deleting a linked task removes it from both systems
- **Graceful Degradation**: API errors are logged but don't block local operations
- **Sync Timestamps**: All tasks track `syncedAt` for conflict resolution
- **Label Management**: Labels are automatically created in both systems as needed 