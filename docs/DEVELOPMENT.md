# Development Guide

This guide provides comprehensive instructions for setting up the development environment, understanding the codebase, and contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

### Local Environment Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd elephant-poc
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./db.sqlite"

# NextAuth.js - Required for authentication
AUTH_SECRET="your-long-random-string-here"  # Generate with: openssl rand -base64 32
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# Optional: Todoist Integration
TODOIST_API_KEY="your-todoist-api-token"
```

#### 4. Discord OAuth Setup

For local development authentication:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "OAuth2" → "General"
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret to your `.env` file

#### 5. Database Setup

```bash
# Push schema to database
npm run db:push

# Optional: Open Prisma Studio to view data
npm run db:studio
```

#### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application running.

### Development Environment Variables

```env
# Core Application
DATABASE_URL="file:./db.sqlite"
AUTH_SECRET="development-secret-key"

# Authentication (Required)
AUTH_DISCORD_ID="123456789012345678"
AUTH_DISCORD_SECRET="abc123def456ghi789"

# External Services (Optional)
TODOIST_API_KEY="1a2b3c4d5e6f7g8h9i0j"

# Development Flags (Optional)
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
```

## Project Structure

### Directory Overview

```
elephant-poc/
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # Prisma schema definition
│   └── db.sqlite              # SQLite database file
├── public/                     # Static assets
│   └── favicon.ico
├── src/                        # Source code
│   ├── app/                   # Next.js App Router
│   │   ├── _components/       # React components
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── server/                # Backend logic
│   │   ├── api/               # tRPC routers
│   │   ├── auth/              # Authentication config
│   │   ├── services/          # Business logic
│   │   └── db.ts              # Database client
│   ├── trpc/                  # tRPC client setup
│   ├── env.js                 # Environment validation
│   └── styles/                # Global styles
├── docs/                       # Documentation files
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS config
├── next.config.js             # Next.js configuration
├── eslint.config.js           # ESLint configuration
├── prettier.config.js         # Prettier configuration
└── vitest.config.ts           # Test configuration
```

### Key Files and Their Purpose

#### Configuration Files
- **`package.json`** - Project dependencies and npm scripts
- **`tsconfig.json`** - TypeScript compiler configuration
- **`next.config.js`** - Next.js build and runtime configuration
- **`tailwind.config.ts`** - Tailwind CSS customization
- **`eslint.config.js`** - Code linting rules
- **`prettier.config.js`** - Code formatting rules
- **`vitest.config.ts`** - Test runner configuration

#### Core Application Files
- **`src/env.js`** - Environment variable validation with Zod
- **`src/server/db.ts`** - Prisma database client
- **`src/server/auth/`** - NextAuth.js configuration
- **`src/trpc/`** - tRPC client setup for frontend

#### Database
- **`prisma/schema.prisma`** - Database schema definition
- **`prisma/db.sqlite`** - Local SQLite database (auto-created)

## Development Workflow

### Daily Development

#### 1. Start Development Environment

```bash
# Start the development server
npm run dev

# In another terminal, optionally start database viewer
npm run db:studio
```

#### 2. Make Changes

Edit files in the `src/` directory. The development server will automatically reload.

#### 3. Database Changes

If you modify the database schema:

```bash
# Push changes to database
npm run db:push

# Or generate and apply migrations
npm run db:generate
npm run db:migrate
```

#### 4. Test Your Changes

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

#### 5. Code Quality Checks

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code
npm run format:write

# Run all checks together
npm run check
```

### Feature Development Workflow

#### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Implement the Feature

Follow this development order:
1. **Database Schema** (if needed) - Update `prisma/schema.prisma`
2. **Types** - Define TypeScript interfaces
3. **Backend Logic** - Create/update tRPC routers and services
4. **Frontend Components** - Build React components
5. **Integration** - Connect frontend to backend
6. **Tests** - Write comprehensive tests
7. **Documentation** - Update relevant docs

#### 3. Testing Strategy

```bash
# Test as you develop
npm run test -- --watch

# Test specific files
npm run test src/app/_components/task/TaskManager.test.tsx

# Test with coverage to identify gaps
npm run test:coverage
```

#### 4. Pre-commit Checklist

```bash
# Run full test suite
npm run test

# Check code quality
npm run check

# Build to ensure no build errors
npm run build
```

## Coding Standards

### TypeScript Guidelines

#### Type Definitions
```typescript
// Use interfaces for object shapes
interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
}

// Use types for unions and computations
type TaskStatus = 'pending' | 'completed' | 'in_progress';
type TaskWithStatus = Task & { status: TaskStatus };

// Use generics for reusable components
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

#### Strict Type Safety
```typescript
// Avoid 'any' - use proper types
const tasks: Task[] = []; // Good
const tasks: any[] = [];   // Avoid

// Use type guards for runtime checking
function isTask(obj: unknown): obj is Task {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof (obj as Task).id === 'string';
}
```

### React Component Guidelines

#### Component Structure
```typescript
// Component props interface
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

// Component with proper TypeScript
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <div className="task-item">
      <input 
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <span>{task.title}</span>
      <button onClick={() => onDelete(task.id)}>Delete</button>
    </div>
  );
}
```

#### Hooks Usage
```typescript
// Custom hooks for business logic
function useTaskManager() {
  const utils = api.useUtils();
  
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
  });
  
  return { createTask };
}

// Use in components
export function TaskManager() {
  const { createTask } = useTaskManager();
  // ... rest of component
}
```

### API Design Guidelines

#### tRPC Router Structure
```typescript
export const taskRouter = createTRPCRouter({
  // Queries - for reading data
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.task.findMany({
        where: { userId: ctx.session.user.id },
        include: { labels: true },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Mutations - for modifying data
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      priority: z.number().int().min(1).max(4),
      syncToTodoist: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation here
    }),
});
```

#### Input Validation
```typescript
// Use Zod for runtime validation
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000).optional(),
  priority: z.number().int().min(1).max(4),
  dueDate: z.date().optional(),
  labels: z.array(z.string()).max(10),
  syncToTodoist: z.boolean(),
});

// Export for reuse
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

### Database Guidelines

#### Schema Design
```prisma
model Task {
  id              String    @id @default(cuid())
  title           String    @db.VarChar(255)  // Explicit length for performance
  description     String?   @db.Text         // Larger text fields
  completed       Boolean   @default(false)
  priority        Int       @default(1)      // Always set defaults
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt       // Automatic timestamps
  
  // Relationships
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Indexes for performance
  @@index([userId])
  @@index([createdAt])
}
```

#### Query Patterns
```typescript
// Efficient queries with proper includes
const getUserTasks = async (userId: string) => {
  return db.task.findMany({
    where: { userId },
    include: {
      labels: true,  // Only include what you need
    },
    orderBy: [
      { completed: 'asc' },   // Incomplete tasks first
      { priority: 'desc' },   // High priority first
      { createdAt: 'desc' },  // Recent first
    ],
  });
};
```

## Testing

### Testing Philosophy

- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test API endpoints with database
- **Component Tests** - Test React components with user interactions
- **Error Tests** - Test error handling and edge cases

### Testing Setup

The project uses Vitest with React Testing Library for comprehensive testing.

#### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (recommended during development)
npm run test -- --watch

# Run specific test files
npm run test TaskManager.test.tsx

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (helpful for debugging)
npm run test:ui
```

### Component Testing

#### Example: TaskManager Component Test
```typescript
// src/app/_components/__tests__/TaskManager.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskManager } from '../TaskManager';
import { createTRPCMsw } from 'msw-trpc';
import { appRouter } from '~/server/api/root';

describe('TaskManager', () => {
  it('should create a new task', async () => {
    const user = userEvent.setup();
    
    render(<TaskManager />, {
      wrapper: TestWrapper, // Provides tRPC and auth context
    });

    // Find input and button
    const input = screen.getByPlaceholderText(/add a new task/i);
    const button = screen.getByText(/add task/i);

    // Type task title
    await user.type(input, 'New Task');
    
    // Click create button
    await user.click(button);

    // Verify task appears in list
    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });
});
```

### API Testing

#### Example: Task Router Test
```typescript
// src/server/api/routers/__tests__/task.test.ts
import { createCallerFactory } from '~/server/api/trpc';
import { taskRouter } from '../task';
import { db } from '~/server/db';

const createCaller = createCallerFactory(taskRouter);

describe('task router', () => {
  it('should create a task', async () => {
    const caller = createCaller({
      session: { user: { id: 'user-1' } },
      db,
    });

    const task = await caller.create({
      title: 'Test Task',
      description: 'Test Description',
      priority: 3,
      labels: [],
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

### Service Testing

#### Example: Todoist Service Test
```typescript
// src/server/services/__tests__/todoist.test.ts
import { createTodoistService } from '../todoist';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('TodoistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task successfully', async () => {
    const mockResponse = {
      id: '123',
      content: 'Test Task',
      priority: 1,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const service = createTodoistService('test-token');
    const result = await service.createTask({
      content: 'Test Task',
      priority: 1,
    });

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.todoist.com/rest/v2/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });
});
```

### Test Utilities

#### Custom Render Function
```typescript
// src/__tests__/setup.ts
import { render } from '@testing-library/react';
import { TRPCProvider } from '../trpc/react';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TRPCProvider>
        {children}
      </TRPCProvider>
    ),
  });
}
```

#### Mock Factories
```typescript
// src/test/factories.ts
export const createMockTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  priority: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
});
```

## Debugging

### Development Tools

#### VS Code Extensions (Recommended)
- **TypeScript and JavaScript** - Built-in TypeScript support
- **Prettier** - Code formatting
- **ESLint** - Code linting
- **Tailwind CSS IntelliSense** - Tailwind class autocomplete
- **Prisma** - Schema syntax highlighting
- **Auto Rename Tag** - HTML tag renaming

#### Browser DevTools

##### React Developer Tools
Install the React DevTools browser extension for component debugging.

##### Network Tab
Monitor API requests and responses:
- tRPC requests appear as `/api/trpc/[procedure]`
- Check request/response payloads
- Monitor timing and performance

### Common Debugging Scenarios

#### Database Issues
```bash
# View database contents
npm run db:studio

# Reset database (destructive!)
npm run db:push -- --force-reset

# Check database connection
node -e "import('./src/server/db.ts').then(db => console.log('Connected!'))"
```

#### tRPC Issues
```typescript
// Enable tRPC logging in development
import { createTRPCNext } from '@trpc/next';

export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        // ... other links
      ],
    };
  },
});
```

#### Authentication Issues
```typescript
// Debug NextAuth.js
export const authConfig = {
  debug: process.env.NODE_ENV === 'development',
  // ... rest of config
};
```

#### Environment Variable Issues
```bash
# Check environment variables are loaded
node -e "console.log(process.env.DATABASE_URL)"

# Validate with Zod schema
node -e "import('./src/env.js').then(env => console.log('Valid:', env))"
```

### Logging

#### Server-Side Logging
```typescript
// Use console.log for development
console.log('Task created:', task);

// For production, consider structured logging
import { logger } from './logger';
logger.info('Task created', { taskId: task.id, userId });
```

#### Client-Side Debugging
```typescript
// React DevTools for component state
// Browser console for general debugging
// React Query DevTools for cache inspection

// Enable React Query DevTools in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <TRPCProvider>
          {children}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        </TRPCProvider>
      </body>
    </html>
  );
}
```

## Contributing

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Make your changes** following the coding standards
5. **Write/update tests** for your changes
6. **Run the test suite** to ensure everything works
7. **Submit a pull request**

### Pull Request Guidelines

#### Before Submitting
```bash
# Ensure all tests pass
npm run test

# Check code quality
npm run check

# Ensure the app builds successfully
npm run build
```

#### PR Description Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] I have added tests that cover my changes
- [ ] All tests pass locally
- [ ] I have tested the changes manually

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation if needed
```

### Code Review Process

1. **Automated Checks** - CI will run tests and linting
2. **Manual Review** - Team members will review the code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, the PR can be merged

### Commit Message Format

Use conventional commits for clear history:

```
feat: add task filtering by priority
fix: resolve Todoist sync timeout issue
docs: update API documentation
test: add tests for TaskManager component
refactor: extract task validation logic
```

## Troubleshooting

### Common Issues

#### "Module not found" Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript path mapping issues
npm run typecheck
```

#### Database Connection Issues
```bash
# Ensure DATABASE_URL is set correctly
echo $DATABASE_URL

# Reset database
npm run db:push -- --force-reset

# Check database file permissions (SQLite)
ls -la prisma/db.sqlite
```

#### Authentication Not Working
```bash
# Check environment variables
echo $AUTH_SECRET
echo $AUTH_DISCORD_ID

# Verify Discord app configuration
# - Redirect URI matches exactly
# - Client ID/Secret are correct
```

#### Build Failures
```bash
# Check TypeScript errors
npm run typecheck

# Check for missing dependencies
npm install

# Clean Next.js cache
rm -rf .next
npm run build
```

#### Test Failures
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific failing test
npm run test -- --run TaskManager.test.tsx

# Update snapshots if needed
npm run test -- --update-snapshots
```

### Getting Help

1. **Check this documentation** first
2. **Search existing issues** on GitHub
3. **Check the logs** for error messages
4. **Ask in discussions** for general questions
5. **Create an issue** for bugs or feature requests

### Performance Issues

#### Slow Development Server
```bash
# Clear Next.js cache
rm -rf .next

# Check for large dependencies
npx bundle-analyzer

# Use Turbo mode (default in this project)
npm run dev --turbo
```

#### Database Performance
```bash
# Check query performance with Prisma Studio
npm run db:studio

# Analyze slow queries (enable logging)
# Set DEBUG=prisma:query in environment
```

#### Memory Issues
```bash
# Check memory usage
node --max-old-space-size=4096 node_modules/.bin/next dev

# Profile with Chrome DevTools
# Open chrome://inspect in Chrome
```

This development guide should help you get started with contributing to the project. For additional questions, please refer to the other documentation files or open an issue on GitHub.