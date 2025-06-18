# Technical Implementation Documentation

## Architecture Overview

This document details the technical implementation of the GTD/PARA system in the TaskFlow application.

## Database Design

### Schema Extensions

The implementation extends the existing task management schema with GTD/PARA specific fields:

```prisma
// GTD/PARA Enums
enum TaskType {
  INBOX      // Unprocessed items (default for all new tasks)
  ACTION     // Single actionable tasks
  PROJECT    // Multi-step projects
  SOMEDAY    // Someday/maybe items
  REFERENCE  // Reference materials
  WAITING    // Delegated/waiting for items
}

enum EnergyLevel {
  HIGH       // High energy/focus required
  MEDIUM     // Medium energy required  
  LOW        // Low energy/routine tasks
}

enum ProjectType {
  PROJECT    // Active projects with specific outcomes
  AREA       // Areas of responsibility
  RESOURCE   // Reference resources
  ARCHIVE    // Archived items
}

enum ProjectStatus {
  ACTIVE     // Currently active
  ON_HOLD    // Temporarily on hold
  COMPLETED  // Completed successfully
  ARCHIVED   // Moved to archive
}

// Task Model Extensions
model Task {
  // ... existing fields ...
  
  // GTD properties
  taskType     TaskType     @default(INBOX)
  context      String?      // @home, @office, @phone, etc.
  energyLevel  EnergyLevel?
  timeEstimate Int?         // in minutes
  isNextAction Boolean      @default(false)
  waitingFor   String?      // person/thing waiting on
  reviewedAt   DateTime?    // last processing/review date
  
  // Indexes for performance
  @@index([taskType])
  @@index([context])
  @@index([isNextAction])
}

// Project Model Extensions
model Project {
  // ... existing fields ...
  
  // PARA properties
  projectType     ProjectType     @default(PROJECT)
  status          ProjectStatus   @default(ACTIVE)
  outcome         String?         // desired outcome for GTD projects
  reviewInterval  ReviewInterval?
  archivedAt      DateTime?
  
  // Indexes for performance
  @@index([projectType])
  @@index([status])
}
```

### Supporting Models

```prisma
// Processing session tracking
model ProcessingSession {
  id             String   @id @default(cuid())
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  itemsProcessed Int      @default(0)
  notes          String?
  userId         String
  user           User     @relation(fields: [userId], references: [id])
}

// Weekly review tracking
model WeeklyReview {
  id                  String   @id @default(cuid())
  weekStartDate       DateTime
  completedAt         DateTime @default(now())
  inboxZero          Boolean  @default(false)
  projectsReviewed   Int      @default(0)
  nextActionsReviewed Int     @default(0)
  notes              String?
  userId             String
  user               User     @relation(fields: [userId], references: [id])
}
```

## API Design

### Task Router Endpoints

```typescript
// Get unprocessed inbox items
getInbox: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.task.findMany({
    where: {
      userId: ctx.session.user.id,
      taskType: "INBOX",
      completed: false,
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" }, // FIFO processing
    ],
    include: {
      labels: true,
      project: true,
      section: true,
    },
  });
})

// Get next actions with smart filtering
getNextActions: protectedProcedure
  .input(z.object({
    context: z.string().optional(),
    energyLevel: z.nativeEnum(EnergyLevel).optional(),
    maxTime: z.number().optional(), // minutes
  }))
  .query(async ({ ctx, input }) => {
    const where = {
      userId: ctx.session.user.id,
      isNextAction: true,
      completed: false,
      taskType: { in: ["ACTION", "PROJECT"] },
      ...(input?.context && { context: input.context }),
      ...(input?.energyLevel && { energyLevel: input.energyLevel }),
      ...(input?.maxTime && { timeEstimate: { lte: input.maxTime } }),
    };
    
    return ctx.db.task.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
      ],
    });
  })

// Process inbox item through GTD workflow
processInboxItem: protectedProcedure
  .input(z.object({
    id: z.string(),
    taskType: z.nativeEnum(TaskType),
    context: z.string().optional(),
    energyLevel: z.nativeEnum(EnergyLevel).optional(),
    timeEstimate: z.number().optional(),
    isNextAction: z.boolean().optional(),
    waitingFor: z.string().optional(),
    projectId: z.string().optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Update task with GTD properties
    const task = await ctx.db.task.update({
      where: { id: input.id },
      data: {
        ...input,
        reviewedAt: new Date(),
      },
    });
    
    // Track processing session
    await ctx.db.processingSession.upsert({
      where: { id: ctx.session.user.id + "-current" },
      update: { itemsProcessed: { increment: 1 } },
      create: {
        id: ctx.session.user.id + "-current",
        userId: ctx.session.user.id,
        itemsProcessed: 1,
      },
    });
    
    return task;
  })
```

### Project Router Endpoints

```typescript
// Get projects by PARA type
getByType: protectedProcedure
  .input(z.object({
    projectType: z.nativeEnum(ProjectType).optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
  }))
  .query(async ({ ctx, input }) => {
    return ctx.db.project.findMany({
      where: {
        userId: ctx.session.user.id,
        ...(input.projectType && { projectType: input.projectType }),
        ...(input.status && { status: input.status }),
      },
      include: {
        sections: true,
        tasks: { where: { sectionId: null } },
        _count: { select: { tasks: true } },
      },
      orderBy: [
        { status: "asc" },
        { order: "asc" },
      ],
    });
  })

// Archive a project
archiveProject: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.project.update({
      where: { id: input.id },
      data: {
        status: "ARCHIVED",
        projectType: "ARCHIVE",
        archivedAt: new Date(),
      },
    });
  })
```

## Component Architecture

### Core Components

1. **InboxProcessor** (`/app/_components/gtd/InboxProcessor.tsx`)
   - Implements GTD clarification workflow
   - Step-by-step decision tree
   - Context and energy assignment
   - Bulk processing capabilities

2. **NextActionsList** (`/app/_components/gtd/NextActionsList.tsx`)
   - Context-based grouping
   - Energy and time filtering
   - Quick completion actions
   - Progress indicators

3. **ProjectsList** (`/app/_components/gtd/ProjectsList.tsx`)
   - PARA categorization tabs
   - Project health indicators
   - Type conversion actions
   - Archive functionality

4. **QuickCapture** (`/app/_components/gtd/QuickCapture.tsx`)
   - Global keyboard shortcut (Cmd/Ctrl+N)
   - Minimal friction capture
   - Auto-focus input
   - Toast notifications

### Layout Components

1. **DashboardLayout** (`/app/_components/DashboardLayout.tsx`)
   - Consistent navigation
   - Quick capture integration
   - Responsive design
   - Loading states

2. **Navigation** (`/app/_components/Navigation.tsx`)
   - GTD-specific navigation items
   - Active state indicators
   - Inbox count badge
   - Mobile responsive

## State Management

### Data Fetching Strategy

```typescript
// Using tRPC with React Query for optimal caching
const { data: inboxTasks, refetch } = api.task.getInbox.useQuery();

// Optimistic updates for better UX
const processTask = api.task.processInboxItem.useMutation({
  onSuccess: () => {
    void refetch();
    resetForm();
    advanceToNext();
  },
});
```

### Cache Invalidation

```typescript
// After mutations, invalidate relevant queries
onSuccess: () => {
  void utils.task.getInbox.invalidate();
  void utils.task.getNextActions.invalidate();
}
```

## Performance Optimizations

### Database Indexes

```prisma
// Task indexes for common queries
@@index([userId])
@@index([taskType])
@@index([context])
@@index([isNextAction])
@@index([projectId])

// Project indexes
@@index([userId])
@@index([projectType])
@@index([status])
```

### Query Optimization

1. **Selective Includes**: Only include related data when needed
2. **Pagination**: Implement for large datasets (future)
3. **Batching**: Process multiple items in single transaction

### UI Performance

1. **Lazy Loading**: Routes are code-split automatically
2. **Optimistic Updates**: Immediate UI feedback
3. **Debouncing**: Search and filter inputs
4. **Memoization**: Complex calculations cached

## Security Considerations

### Data Access

```typescript
// All queries filtered by user ID
where: {
  userId: ctx.session.user.id,
  // ... other filters
}
```

### Input Validation

```typescript
// Zod schemas for all inputs
.input(
  z.object({
    id: z.string(),
    taskType: z.nativeEnum(TaskType),
    // ... validated fields
  })
)
```

## Todoist Integration

### Sync Strategy

1. **Bidirectional Sync**: Changes sync both ways
2. **Metadata Preservation**: GTD fields stored locally
3. **Graceful Degradation**: Works offline
4. **Conflict Resolution**: Last write wins

### Field Mapping

```typescript
// Task creation with Todoist
if (input.syncToTodoist && user?.todoistApiToken) {
  const todoistTask = await todoist.createTask({
    content: input.title,
    description: input.description,
    priority: 5 - input.priority, // Reverse mapping
    labels: [input.context?.substring(1)], // Remove @ prefix
  });
}
```

## Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions

### Integration Tests
- API endpoint testing
- Database operations
- Auth flows

### E2E Tests (Future)
- Complete workflows
- Keyboard shortcuts
- Cross-browser testing

## Deployment Considerations

### Environment Variables

```env
# Required
DATABASE_URL=
AUTH_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=

# Optional
TODOIST_API_KEY=
```

### Database Migrations

```bash
# Development
npm run db:push

# Production
npm run db:migrate
```

### Performance Monitoring

1. **Error Tracking**: Sentry integration (future)
2. **Analytics**: Usage patterns
3. **Performance**: Core Web Vitals
4. **Uptime**: Health checks

## Future Enhancements

### Planned Features

1. **Weekly Review Wizard**: Guided weekly review
2. **Natural Language Processing**: Smart task parsing
3. **Mobile App**: React Native implementation
4. **Offline Support**: PWA capabilities
5. **Team Collaboration**: Shared projects
6. **AI Suggestions**: Context recommendations
7. **Time Tracking**: Pomodoro integration
8. **Calendar Integration**: Time blocking

### Technical Debt

1. **Test Coverage**: Increase to 100%
2. **Documentation**: API documentation
3. **Performance**: Query optimization
4. **Accessibility**: WCAG compliance
5. **Internationalization**: Multi-language support

## Conclusion

This implementation provides a robust, scalable foundation for GTD/PARA methodology while maintaining flexibility for future enhancements. The architecture prioritizes user experience, performance, and maintainability.