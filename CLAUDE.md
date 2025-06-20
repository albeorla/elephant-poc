# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready task management application implementing the Getting Things Done (GTD) methodology with PARA organizational system, comprehensive Todoist integration, built on the T3 Stack. The application features:

- Complete GTD workflow implementation (Capture, Clarify, Organize, Reflect, Engage)
- PARA method organization (Projects, Areas, Resources, Archives)
- Context-based task management (@home, @office, @phone, etc.)
- Energy level and time estimation tracking
- Bidirectional synchronization with Todoist
- User authentication via Discord OAuth

## Essential Commands

### Development
```bash
npm run dev          # Start development server with Turbo
npm run build        # Build for production
npm run typecheck    # Run TypeScript compiler check
npm run check        # Run lint + typecheck together
```

### Database Operations
```bash
npm run db:push      # Push schema changes to database (development)
npm run db:studio    # Open Prisma Studio to view/edit data
npm run db:generate  # Generate Prisma client after schema changes
npm run db:migrate   # Apply migrations (production)
```

### Testing
```bash
npm run test         # Run all tests
npm run test -- --watch  # Run tests in watch mode during development
npm run test:ui      # Run tests with UI interface
npm run test:coverage    # Run tests with coverage report
npm run test src/path/to/test.ts  # Run specific test file
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format:write # Format code with Prettier
```

## Architecture Overview

### tRPC API Structure
The API is organized into routers in `src/server/api/routers/`:
- **Task Router** (`task.ts`) - All task management operations including GTD workflow and Todoist sync
- **Project Router** (`project.ts`) - Project management with PARA categorization
- **Post Router** (`post.ts`) - Legacy demo functionality

Key Task Endpoints:
- `api.task.getAll` - Get all user's tasks
- `api.task.getInbox` - Get unprocessed inbox items
- `api.task.getNextActions` - Get next actions filtered by context/energy/time
- `api.task.getWaitingFor` - Get delegated tasks
- `api.task.getSomedayMaybe` - Get someday/maybe items
- `api.task.processInboxItem` - Process inbox item through GTD workflow
- `api.task.create` - Create task (defaults to inbox)
- `api.task.update` - Update task with bidirectional sync
- `api.task.syncFromTodoist` - Import/sync from Todoist

Key Project Endpoints:
- `api.project.getByType` - Get projects by PARA type
- `api.project.archiveProject` - Archive a project
- `api.project.convertProjectType` - Convert between PARA types

### Database Schema (Prisma)
Core models:
- **User** - NextAuth.js user with `todoistApiToken` field
- **Task** - Tasks with GTD properties:
  - `taskType` (INBOX, ACTION, PROJECT, SOMEDAY, REFERENCE, WAITING)
  - `context` (@home, @office, @phone, @computer, @errands)
  - `energyLevel` (HIGH, MEDIUM, LOW)
  - `timeEstimate` (minutes)
  - `isNextAction` (boolean)
  - `waitingFor` (person/thing waiting on)
  - `todoistId` for external linking
- **Project** - Projects with PARA properties:
  - `projectType` (PROJECT, AREA, RESOURCE, ARCHIVE)
  - `status` (ACTIVE, ON_HOLD, COMPLETED, ARCHIVED)
  - `outcome` (desired outcome)
  - `reviewInterval` (DAILY, WEEKLY, MONTHLY, QUARTERLY)
- **Label** - Many-to-many relationship with tasks
- **ProcessingSession** - Track GTD processing sessions
- **WeeklyReview** - Track weekly reviews
- Standard NextAuth.js models (Account, Session, etc.)

### Authentication Flow
- Discord OAuth via NextAuth.js
- All task operations require authentication (`protectedProcedure`)
- User-scoped data access (tasks filtered by `userId`)

### External Service Integration
- **Todoist Service** (`src/server/services/todoist.ts`) - REST API wrapper for Todoist v2
- Priority mapping: Local (1-4) ↔ Todoist (4-1) 
- Graceful degradation: operations continue locally if Todoist fails

## Key Development Patterns

### tRPC Procedures
Use `protectedProcedure` for authenticated endpoints:
```typescript
someEndpoint: protectedProcedure
  .input(z.object({ /* validation schema */ }))
  .mutation/query(async ({ ctx, input }) => {
    // ctx.session.user is guaranteed to exist
    // ctx.db is the Prisma client
  })
```

### Frontend State Management
- tRPC + React Query for server state
- Optimistic updates with automatic rollback on error
- Cache invalidation pattern: `void utils.task.getAll.invalidate()`

### Error Handling
- Zod validation for all inputs
- Graceful external service failures
- Type-safe error responses via tRPC

### Testing Strategy
Tests are comprehensive (96% coverage) and located in `__tests__/` directories:
- Component tests use React Testing Library
- API tests use tRPC caller pattern
- Service tests mock external APIs
- Test files mirror source structure

### Environment Configuration
Environment variables are validated via Zod in `src/env.js`:
- `DATABASE_URL` - Database connection (required)
- `AUTH_SECRET` - NextAuth.js secret (required in production)
- `AUTH_DISCORD_ID/SECRET` - Discord OAuth credentials
- `TODOIST_API_KEY` - Optional for Todoist integration

## Working with Tasks

### Task Creation Flow
1. Validate input via Zod schema
2. Create local task in database
3. If `syncToTodoist: true` and user has API token:
   - Create in Todoist
   - Update local task with `todoistId`
   - Set `syncedAt` timestamp

### Sync Considerations
- Bidirectional sync maintains data consistency
- Priority conversion between systems (Local 1-4 ↔ Todoist 4-1)
- `syncedAt` timestamp for conflict resolution
- Graceful handling of API failures

### Testing New Features
Always run the full test suite before commits:
```bash
npm run test && npm run check
```

Component tests should cover user interactions, API tests should cover business logic, and service tests should cover external integrations.

## Common Troubleshooting

### Database Issues
- Use `npm run db:studio` to inspect data
- Reset with `npm run db:push -- --force-reset` (destructive!)
- Check migrations with `npx prisma migrate status`

### Todoist Integration
- Test API connectivity via settings panel
- Check rate limiting (450 requests per 15 minutes)
- Verify priority mapping in sync operations

### Type Errors
- Regenerate Prisma client: `npx prisma generate`
- Check tRPC type exports from routers
- Ensure Zod schemas match TypeScript interfaces