# GTD/PARA Implementation Guide

## Overview

This application implements a comprehensive Getting Things Done (GTD) methodology combined with the PARA (Projects, Areas, Resources, Archives) organizational system. This guide explains how the implementation follows GTD/PARA principles and how to use it effectively.

## Table of Contents

1. [GTD Methodology Implementation](#gtd-methodology-implementation)
2. [PARA Method Implementation](#para-method-implementation)
3. [Core Workflows](#core-workflows)
4. [Best Practices](#best-practices)
5. [Technical Implementation](#technical-implementation)
6. [Related Documentation](#related-documentation)

## GTD Methodology Implementation

### The Five Steps of GTD

#### 1. **Capture** - Collect what has your attention
- **Quick Capture Button**: Floating button (bottom-right) available on all screens
- **Keyboard Shortcut**: `Cmd+N` (Mac) or `Ctrl+N` (Windows) from anywhere
- **Default to Inbox**: All new tasks automatically go to the inbox with `taskType: INBOX`
- **Zero Friction**: Just enter a title and hit Enter - no other fields required

#### 2. **Clarify** - Process what it means
The inbox processing view (`/inbox`) implements the GTD clarification workflow:

```
Is it actionable?
├── YES → Is it a single action or project?
│   ├── Single Action → Assign context, energy, time
│   ├── Project → Create project with next action
│   └── Delegate → Mark as "Waiting For"
└── NO → What is it?
    ├── Reference → Store for later reference
    ├── Someday/Maybe → Future possibility
    └── Trash → Delete it
```

#### 3. **Organize** - Put it where it belongs
- **Contexts**: Physical locations or tools required
  - `@home` - Tasks that can only be done at home
  - `@office` - Tasks requiring office presence
  - `@phone` - Phone calls to make
  - `@computer` - Computer-based tasks
  - `@errands` - Tasks while out and about
- **Energy Levels**: Match tasks to your current energy
  - `HIGH` - Tasks requiring focus and creativity
  - `MEDIUM` - Regular work tasks
  - `LOW` - Routine or administrative tasks
- **Time Estimates**: Know how long tasks will take
- **Next Actions**: Clearly marked actionable items

#### 4. **Reflect** - Review frequently
- **Daily Review**: Check next actions by context
- **Weekly Review**: Dedicated review workflow (coming soon)
  - Process inbox to zero
  - Review all projects for next actions
  - Check "Waiting For" items
  - Review "Someday/Maybe" list

#### 5. **Engage** - Simply do
- **Next Actions View** (`/next-actions`): Filter by:
  - Current context (where you are)
  - Available energy level
  - Time available
- **Quick Complete**: Check off tasks as you complete them
- **Batch Processing**: Handle similar tasks together

### GTD Lists Implementation

1. **Inbox** (`taskType: INBOX`)
   - Unprocessed items requiring clarification
   - Goal: Process to zero regularly

2. **Next Actions** (`isNextAction: true`)
   - Concrete, actionable tasks
   - Organized by context
   - Can be filtered by energy and time

3. **Projects** (`taskType: PROJECT`)
   - Multi-step outcomes
   - Must have at least one next action
   - Track progress with task counts

4. **Waiting For** (`taskType: WAITING`)
   - Delegated tasks
   - Track who you're waiting on
   - Convert back to actions when unblocked

5. **Someday/Maybe** (`taskType: SOMEDAY`)
   - Future possibilities
   - Not committed to yet
   - Review during weekly review

6. **Reference** (`taskType: REFERENCE`)
   - Information to keep
   - No action required
   - Searchable archive

## PARA Method Implementation

### The Four Categories

#### 1. **Projects** (`projectType: PROJECT`)
- **Definition**: Series of tasks linked to an outcome with a deadline
- **Characteristics**:
  - Has a specific outcome
  - Active and current
  - Will be completed
- **Implementation**:
  - `outcome` field for desired result
  - `status: ACTIVE` for current projects
  - Progress tracking via task completion
- **Examples**:
  - "Launch new website"
  - "Complete tax return"
  - "Plan vacation"

#### 2. **Areas** (`projectType: AREA`)
- **Definition**: Spheres of activity with standards to maintain
- **Characteristics**:
  - Ongoing responsibilities
  - No end date
  - Standards to maintain
- **Implementation**:
  - `reviewInterval` for regular check-ins
  - Health indicators (task counts)
  - Can contain both projects and tasks
- **Examples**:
  - "Health & Fitness"
  - "Finances"
  - "Home Maintenance"

#### 3. **Resources** (`projectType: RESOURCE`)
- **Definition**: Topics of ongoing interest
- **Characteristics**:
  - Reference materials
  - Future utility
  - No maintenance required
- **Implementation**:
  - Store reference tasks
  - Searchable by labels
  - No active tasks
- **Examples**:
  - "Web Development Resources"
  - "Recipe Collection"
  - "Investment Research"

#### 4. **Archives** (`projectType: ARCHIVE`)
- **Definition**: Inactive items from other categories
- **Characteristics**:
  - Completed projects
  - Inactive areas
  - Historical reference
- **Implementation**:
  - `archivedAt` timestamp
  - `status: ARCHIVED`
  - Searchable history
- **Purpose**:
  - Reduce active item clutter
  - Maintain historical record
  - Enable retrospectives

## Core Workflows

### Daily Workflow

1. **Morning Planning** (5-10 minutes)
   - Check calendar for appointments
   - Review Next Actions by today's contexts
   - Identify 3 most important tasks

2. **Throughout the Day**
   - Quick capture any new items (Cmd+N)
   - Work from Next Actions filtered by current context
   - Check off completed tasks

3. **End of Day** (5 minutes)
   - Process inbox to zero if possible
   - Review tomorrow's calendar
   - Celebrate completions

### Weekly Review Workflow

1. **Get Clear** (20 minutes)
   - Process inbox to zero
   - Review previous calendar entries
   - Clear your head - capture any loose items

2. **Get Current** (30 minutes)
   - Review all active projects
   - Ensure each project has a next action
   - Review "Waiting For" list
   - Check upcoming calendar

3. **Get Creative** (10 minutes)
   - Review "Someday/Maybe" list
   - Brainstorm new projects/ideas
   - Consider activating someday items

### Processing Workflow

1. **Start with Inbox** (`/inbox`)
   - Work through items one at a time
   - No skipping (unless using skip button)
   - Apply 2-minute rule: If < 2 min, do it now

2. **For Each Item Ask**:
   - What is it?
   - Is it actionable?
   - What's the next action?
   - Does it belong to a project?

3. **Assign Properties**:
   - **Context**: Where can this be done?
   - **Energy**: What energy level needed?
   - **Time**: How long will it take?
   - **Priority**: How important is it?

## Best Practices

### Capture Best Practices
- **Capture everything**: Don't try to hold it in your head
- **Be specific**: "Call John about project budget" not "John"
- **One item per task**: Break down compound tasks
- **Use natural language**: Write how you think

### Processing Best Practices
- **Process, don't do**: Focus on deciding, not executing
- **Touch once**: Make a decision on each item
- **Start at the top**: Work sequentially through inbox
- **Regular cadence**: Process inbox at least daily

### Context Best Practices
- **Location-based**: Use physical contexts (@home, @office)
- **Tool-based**: Include required tools (@computer, @phone)
- **Energy-aware**: Match tasks to energy levels
- **Time-boxed**: Consider available time windows

### Project Best Practices
- **Clear outcomes**: Define what "done" looks like
- **Next actions**: Every project needs at least one
- **Regular reviews**: Check project health weekly
- **PARA migration**: Move between categories as needed

## Technical Implementation

### Database Schema

```typescript
// GTD Task Properties
enum TaskType {
  INBOX      // Unprocessed items
  ACTION     // Single actions
  PROJECT    // Multi-step outcomes
  SOMEDAY    // Future possibilities
  REFERENCE  // Reference material
  WAITING    // Delegated items
}

enum EnergyLevel {
  HIGH       // Requires focus/creativity
  MEDIUM     // Normal energy
  LOW        // Low energy/routine
}

// PARA Project Properties  
enum ProjectType {
  PROJECT    // Active projects with outcomes
  AREA       // Ongoing responsibilities
  RESOURCE   // Reference topics
  ARCHIVE    // Inactive/completed
}

enum ProjectStatus {
  ACTIVE     // Currently working on
  ON_HOLD    // Temporarily paused
  COMPLETED  // Successfully finished
  ARCHIVED   // Moved to archive
}
```

### API Endpoints

**Task Management**:
- `task.getInbox` - Unprocessed items
- `task.getNextActions` - Actionable tasks with filtering
- `task.getWaitingFor` - Delegated items
- `task.getSomedayMaybe` - Future possibilities
- `task.processInboxItem` - Apply GTD workflow
- `task.getByContext` - Context-based filtering

**Project Management**:
- `project.getByType` - PARA categorization
- `project.archiveProject` - Move to archive
- `project.convertProjectType` - PARA transitions

### Integration with Todoist

The implementation maintains full compatibility with Todoist:
- Tasks sync bidirectionally
- GTD metadata stored in task properties
- Contexts map to Todoist labels
- PARA categories via project naming

## Keyboard Shortcuts

- `Cmd/Ctrl + N`: Quick capture from anywhere
- `Tab/Shift+Tab`: Navigate between fields
- `Enter`: Save and process next
- `Esc`: Cancel current operation

## Tips for Success

1. **Start Small**: Begin with just inbox processing
2. **Build Habits**: Process inbox same time daily
3. **Trust the System**: Capture everything, decide later
4. **Review Regularly**: Weekly reviews are crucial
5. **Adapt as Needed**: Customize contexts to your life
6. **Stay Current**: Keep projects and areas updated
7. **Celebrate Wins**: Acknowledge completed items

## Troubleshooting

**Inbox Overwhelming**:
- Process in small batches
- Use 2-minute rule aggressively
- Consider bulk operations for similar items

**Too Many Next Actions**:
- Review energy levels honestly
- Check time estimates are realistic
- Consider moving some to Someday/Maybe

**Projects Stalling**:
- Ensure clear next actions
- Review project outcomes
- Consider breaking into smaller projects

**Contexts Not Working**:
- Customize to your actual locations
- Add new contexts as needed
- Remove unused contexts

## Conclusion

This implementation provides a complete GTD/PARA system that helps you:
- Capture everything that has your attention
- Clarify what each item means and what to do
- Organize by context, energy, and time
- Review regularly to stay on track
- Engage with confidence in your choices

The system is designed to reduce cognitive load and increase clarity, allowing you to focus on doing rather than remembering.

## Related Documentation

- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [Technical Implementation](./GTD_TECHNICAL_IMPLEMENTATION.md) - Developer details
- [API Reference](./API.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System design overview