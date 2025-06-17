# Architecture Documentation

This document provides a comprehensive overview of the application's architecture, design patterns, and technical decisions.

## System Overview

This is a full-stack task management application built with modern web technologies, focusing on type safety, performance, and maintainability. The application follows a clean architecture pattern with clear separation between presentation, business logic, and data layers.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    tRPC Client      │  │
│  │             │  │             │  │                     │  │
│  │ • page.tsx  │  │ • TaskMgr   │  │ • Type-safe APIs    │  │
│  │ • layout    │  │ • Settings  │  │ • React Query       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON (Type-safe)
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (tRPC/Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Middleware  │  │     Services        │  │
│  │             │  │             │  │                     │  │
│  │ • task.ts   │  │ • Auth      │  │ • TodoistService    │  │
│  │ • post.ts   │  │ • Logging   │  │ • Business Logic    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Database (SQLite/Prisma)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Users    │  │    Tasks    │  │       Labels        │  │
│  │             │  │             │  │                     │  │
│  │ • Profile   │  │ • Content   │  │ • Organization      │  │
│  │ • Auth      │  │ • Metadata  │  │ • Tagging           │  │
│  │ • Tokens    │  │ • Sync      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              │
┌─────────────────────────────────────────────────────────────┐
│                   External APIs (Todoist)                   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Technologies

#### Next.js 15 (App Router)
- **Server-Side Rendering**: Pages are rendered on the server for optimal performance
- **App Router**: Modern file-based routing with layouts and nested routes
- **React Server Components**: Automatic optimization with server/client component split
- **Streaming**: Progressive page loading for better user experience

#### React 19
- **Concurrent Features**: Automatic batching and concurrent rendering
- **Suspense**: Declarative loading states
- **Error Boundaries**: Graceful error handling in components
- **Hooks**: Modern state management patterns

#### TypeScript
- **End-to-End Type Safety**: From database to UI
- **Interface Definitions**: Clear contracts between layers
- **IntelliSense**: Enhanced development experience
- **Compile-Time Checks**: Early error detection

#### Tailwind CSS
- **Utility-First**: Rapid UI development
- **Responsive Design**: Mobile-first approach
- **Design System**: Consistent spacing, colors, and typography
- **Performance**: Automatic purging of unused styles

### Backend Technologies

#### tRPC
- **Type Safety**: Shared types between client and server
- **No Code Generation**: Types inferred automatically
- **React Query Integration**: Automatic caching and invalidation
- **Developer Experience**: End-to-end type safety with autocomplete

#### NextAuth.js
- **OAuth Integration**: Discord authentication
- **Session Management**: Secure session handling
- **Database Adapter**: Prisma integration for user management
- **Security**: Built-in CSRF protection and secure cookies

#### Prisma ORM
- **Type-Safe Database Access**: Generated client with TypeScript types
- **Migration System**: Version-controlled database schema changes
- **Query Builder**: Intuitive and safe database queries
- **Database Agnostic**: Easy to switch between databases

### Database Design

#### SQLite
- **Development**: Zero-config local development
- **Performance**: Fast reads and writes for task management
- **Portability**: Single file database
- **Production Ready**: Suitable for small to medium applications

#### Schema Design

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  posts         Post[]
  tasks         Task[]
  todoistApiToken String?
}

model Task {
  id              String    @id @default(cuid())
  todoistId       String?   @unique    // External system linking
  title           String
  description     String?
  completed       Boolean   @default(false)
  priority        Int       @default(1)  // 1-4 priority system
  dueDate         DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt   // Automatic timestamp
  syncedAt        DateTime?              // Sync tracking
  
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  labels          Label[]
  
  @@index([userId])      // Query optimization
  @@index([todoistId])   // External ID lookup
}

model Label {
  id      String @id @default(cuid())
  name    String
  tasks   Task[]
  
  @@unique([name])  // Prevent duplicate labels
}
```

**Design Principles:**
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Indexing Strategy**: Optimized for common query patterns
- **Audit Trail**: Timestamp tracking for synchronization
- **Cascade Deletes**: Automatic cleanup of related data
- **Unique Constraints**: Prevent data duplication

## Application Layers

### Presentation Layer (`src/app/`)

#### Components Architecture
```
_components/
├── TaskManager.tsx          # Main task management interface
├── TodoistSettings.tsx      # Configuration panel
├── post.tsx                 # Legacy post functionality
└── __tests__/              # Component test suite
    └── TaskManager.test.tsx
```

**Component Design Principles:**
- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Components can be composed together
- **Props Interface**: Clear TypeScript interfaces for all props
- **Error Boundaries**: Graceful error handling
- **Accessibility**: ARIA labels and keyboard navigation

#### State Management Strategy
- **Server State**: Managed by tRPC/React Query
- **Local State**: React hooks for UI state
- **Optimistic Updates**: Immediate UI feedback with automatic rollback
- **Cache Invalidation**: Automatic data refresh after mutations

### API Layer (`src/server/api/`)

#### tRPC Router Architecture
```
routers/
├── task.ts              # Task CRUD operations
├── post.ts              # Post operations (legacy)
└── __tests__/           # API test suite
    └── task.test.ts
```

#### Task Router Design
```typescript
export const taskRouter = createTRPCRouter({
  // Query operations
  getAll: protectedProcedure.query(async ({ ctx }) => { /* ... */ }),
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(/* ... */),
  
  // Mutation operations
  create: protectedProcedure.input(createTaskSchema).mutation(/* ... */),
  update: protectedProcedure.input(updateTaskSchema).mutation(/* ... */),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
  
  // Todoist integration
  syncFromTodoist: protectedProcedure.mutation(/* ... */),
  updateTodoistToken: protectedProcedure.input(z.object({ token: z.string() })).mutation(/* ... */),
  getTodoistStatus: protectedProcedure.query(/* ... */),
});
```

**API Design Principles:**
- **Input Validation**: Zod schemas for all inputs
- **Authentication**: Protected procedures for all operations
- **Error Handling**: Typed errors with helpful messages
- **Transaction Safety**: Database transactions for multi-step operations

### Service Layer (`src/server/services/`)

#### Business Logic Separation
```
services/
├── todoist.ts           # External API integration
└── __tests__/           # Service test suite
    └── todoist.test.ts
```

#### Todoist Service Architecture
```typescript
interface TodoistService {
  // Core operations
  getTasks(): Promise<TodoistTask[]>;
  createTask(task: CreateTaskInput): Promise<TodoistTask>;
  updateTask(id: string, updates: UpdateTaskInput): Promise<TodoistTask>;
  deleteTask(id: string): Promise<void>;
  
  // Status operations
  completeTask(id: string): Promise<void>;
  reopenTask(id: string): Promise<void>;
}

export const createTodoistService = (apiToken: string): TodoistService => {
  // Factory pattern for service creation
  return {
    // Implementation details...
  };
};
```

**Service Design Principles:**
- **Interface Segregation**: Clean interfaces for external dependencies
- **Factory Pattern**: Service creation with dependency injection
- **Error Abstraction**: Convert external errors to domain errors
- **Rate Limiting**: Built-in handling of API limits
- **Retry Logic**: Exponential backoff for transient failures

### Authentication & Authorization

#### Security Architecture
```typescript
// NextAuth.js configuration
export const authConfig = {
  providers: [
    Discord({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id },
    }),
  },
} satisfies NextAuthConfig;
```

**Security Features:**
- **OAuth Integration**: Secure third-party authentication
- **Session Management**: Database-backed sessions
- **CSRF Protection**: Built-in protection against cross-site requests
- **API Protection**: All routes require authentication
- **Token Storage**: Secure storage of external API tokens

## Data Flow Architecture

### Request/Response Flow

1. **User Interaction**
   ```
   User clicks "Create Task" → Component state update → tRPC mutation
   ```

2. **API Processing**
   ```
   tRPC receives request → Input validation → Authentication check → Business logic
   ```

3. **Business Logic**
   ```
   Task creation → Optional Todoist sync → Database update → Response
   ```

4. **UI Update**
   ```
   Optimistic update → Server response → Cache invalidation → Final UI state
   ```

### Synchronization Flow

#### Todoist Integration Pattern
```typescript
async function createTaskWithSync(input: CreateTaskInput) {
  // 1. Create local task
  const localTask = await db.task.create({ data: input });
  
  if (input.syncToTodoist && user.todoistApiToken) {
    try {
      // 2. Create in Todoist
      const todoistService = createTodoistService(user.todoistApiToken);
      const todoistTask = await todoistService.createTask({
        content: input.title,
        description: input.description,
        priority: mapPriorityToTodoist(input.priority),
        due_date: input.dueDate?.toISOString(),
      });
      
      // 3. Update local task with Todoist ID
      await db.task.update({
        where: { id: localTask.id },
        data: { 
          todoistId: todoistTask.id,
          syncedAt: new Date(),
        },
      });
    } catch (error) {
      // Graceful degradation - task exists locally
      logger.error('Todoist sync failed', error);
    }
  }
  
  return localTask;
}
```

## Performance Optimizations

### Frontend Optimizations

#### React Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Smart retry logic
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});
```

#### Optimistic Updates
```typescript
const createTask = api.task.create.useMutation({
  onMutate: async (newTask) => {
    // Cancel outgoing refetches
    await utils.task.getAll.cancel();
    
    // Snapshot previous value
    const previousTasks = utils.task.getAll.getData();
    
    // Optimistically update
    utils.task.getAll.setData(undefined, (old) => [
      ...(old ?? []),
      { ...newTask, id: 'temp-id', createdAt: new Date() },
    ]);
    
    return { previousTasks };
  },
  onError: (err, newTask, context) => {
    // Rollback on error
    utils.task.getAll.setData(undefined, context?.previousTasks);
  },
  onSettled: () => {
    // Always refetch after error or success
    utils.task.getAll.invalidate();
  },
});
```

### Backend Optimizations

#### Database Query Optimization
```typescript
// Efficient task retrieval with relations
const getUserTasks = async (userId: string) => {
  return db.task.findMany({
    where: { userId },
    include: {
      labels: true,  // Include related labels
    },
    orderBy: [
      { completed: 'asc' },     // Incomplete tasks first
      { priority: 'desc' },     // High priority first
      { createdAt: 'desc' },    // Recent tasks first
    ],
  });
};
```

#### Caching Strategy
- **Query Caching**: React Query for client-side caching
- **Database Indexing**: Strategic indexes for common queries
- **Connection Pooling**: Prisma connection management
- **Static Generation**: Next.js static pages where possible

### External API Optimization

#### Rate Limiting Management
```typescript
class RateLimitedTodoistService {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      await this.delay(1000); // Rate limiting delay
    }
    
    this.isProcessing = false;
  }
  
  async createTask(task: CreateTaskInput): Promise<TodoistTask> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.todoistApi.createTask(task);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
}
```

## Testing Architecture

### Testing Strategy

#### Component Testing
```typescript
// TaskManager.test.tsx
describe('TaskManager', () => {
  it('should create a new task', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: '1', title: 'Test Task' });
    
    render(<TaskManager />, {
      wrapper: ({ children }) => (
        <TRPCProvider mockMutations={{ 'task.create': mockCreate }}>
          {children}
        </TRPCProvider>
      ),
    });
    
    await user.type(screen.getByPlaceholderText(/add a new task/i), 'Test Task');
    await user.click(screen.getByText(/add task/i));
    
    expect(mockCreate).toHaveBeenCalledWith({
      title: 'Test Task',
      priority: 2,
      labels: [],
      syncToTodoist: false,
    });
  });
});
```

#### API Testing
```typescript
// task.test.ts
describe('task router', () => {
  it('should create a task', async () => {
    const task = await caller.task.create({
      title: 'Test Task',
      description: 'Test Description',
      priority: 3,
      labels: ['work'],
      syncToTodoist: false,
    });
    
    expect(task).toMatchObject({
      title: 'Test Task',
      description: 'Test Description',
      priority: 3,
      completed: false,
    });
  });
});
```

#### Service Testing
```typescript
// todoist.test.ts
describe('TodoistService', () => {
  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;
    
    const service = createTodoistService('invalid-token');
    
    await expect(service.getTasks()).rejects.toThrow('Network error');
  });
});
```

### Test Coverage Strategy
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints with database
- **E2E Tests**: Critical user workflows
- **Error Testing**: Edge cases and error conditions

## Deployment Architecture

### Production Considerations

#### Environment Configuration
```typescript
// env.js
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    AUTH_DISCORD_ID: z.string().min(1),
    AUTH_DISCORD_SECRET: z.string().min(1),
    TODOIST_API_KEY: z.string().optional(),
  },
  client: {
    // Public environment variables
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    TODOIST_API_KEY: process.env.TODOIST_API_KEY,
  },
});
```

#### Database Strategy
- **Development**: SQLite for simplicity
- **Production**: PostgreSQL for scalability
- **Migrations**: Automated with Prisma
- **Backups**: Regular automated backups

#### Monitoring & Observability
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: API response times
- **User Analytics**: Usage patterns and feature adoption
- **Health Checks**: Database and external service status

## Security Architecture

### Security Layers

1. **Network Security**
   - HTTPS enforcement
   - CORS configuration
   - Rate limiting

2. **Authentication Security**
   - OAuth 2.0 flow
   - Secure session management
   - Token validation

3. **Authorization Security**
   - User-scoped data access
   - Role-based permissions
   - API endpoint protection

4. **Data Security**
   - SQL injection prevention (Prisma)
   - XSS protection (React)
   - CSRF protection (NextAuth.js)

### Security Best Practices

#### Input Validation
```typescript
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  priority: z.number().int().min(1).max(4),
  dueDate: z.date().optional(),
  labels: z.array(z.string()).max(10),
  syncToTodoist: z.boolean(),
});
```

#### SQL Injection Prevention
```typescript
// Safe with Prisma ORM
const tasks = await db.task.findMany({
  where: {
    userId,
    title: { contains: userInput }, // Automatically sanitized
  },
});
```

#### XSS Prevention
```tsx
// React automatically escapes content
<h3 className="font-medium">
  {task.title} {/* Automatically escaped */}
</h3>
```

## Future Architecture Considerations

### Scalability Planning

#### Horizontal Scaling
- **Database Sharding**: User-based partitioning
- **CDN Integration**: Static asset distribution
- **Load Balancing**: Multiple application instances
- **Caching Layer**: Redis for session storage

#### Feature Expansion
- **Real-time Updates**: WebSocket integration
- **Mobile App**: React Native with shared tRPC types
- **Offline Support**: Service worker and local storage
- **Advanced Analytics**: Task completion patterns

#### Technology Evolution
- **Database Migration**: PostgreSQL for production
- **State Management**: Zustand for complex client state
- **Monitoring**: OpenTelemetry for observability
- **CI/CD**: Automated testing and deployment

This architecture provides a solid foundation for a production-ready task management application with room for future growth and enhancement.