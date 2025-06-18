# Task Manager with Todoist Integration

A modern, full-stack task management application built with the T3 Stack, featuring comprehensive Todoist synchronization capabilities.

## Features

- ✅ **Complete Task Management** - Create, edit, delete, and organize tasks with priorities, due dates, and labels
- 🎯 **GTD/PARA Implementation** - Full Getting Things Done workflow with PARA organizational method
- 🔄 **Bidirectional Todoist Sync** - Seamlessly sync tasks between the local app and your Todoist account
- 📥 **Inbox Processing** - Step-by-step GTD workflow for processing captured items
- 🏷️ **Context-Based Organization** - Organize tasks by context (@home, @office, @phone, etc.)
- ⚡ **Energy & Time Tracking** - Match tasks to your energy levels and available time
- 🔐 **Secure Authentication** - Discord OAuth integration with NextAuth.js
- 📱 **Real-time Updates** - Instant UI updates with optimistic mutations
- ⌨️ **Quick Capture** - Global keyboard shortcut (Cmd/Ctrl+N) for instant task capture
- 🧪 **Comprehensive Testing** - 96% test coverage across components, APIs, and services
- 🎨 **Modern UI** - Responsive design with Tailwind CSS
- 🛡️ **Type Safety** - End-to-end type safety with TypeScript and tRPC

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, NextAuth.js, Prisma ORM
- **Database**: SQLite (easily configurable for other databases)
- **Testing**: Vitest, React Testing Library
- **Authentication**: Discord OAuth

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Discord application for OAuth (for authentication)
- Todoist account and API token (optional, for sync features)

### 1. Clone and Install

```bash
git clone <repository-url>
cd elephant-poc
npm install
```

### 2. Environment Setup

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="file:./db.sqlite"

# NextAuth.js
AUTH_SECRET="your-nextauth-secret"
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# Optional: Todoist Integration
TODOIST_API_KEY="your-todoist-api-token"
```

### 3. Database Setup

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Authentication Setup

### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. In OAuth2 settings, add redirect URI: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret to your `.env` file

### Todoist Integration

1. Go to [Todoist Settings > Integrations](https://todoist.com/app/settings/integrations)
2. Copy your API token
3. Add it to your `.env` file or configure it through the app's settings panel

## Usage

### GTD Workflow

- **Quick Capture**: Press `Cmd/Ctrl+N` anywhere to capture tasks to inbox
- **Process Inbox**: Visit `/inbox` to process items using GTD methodology
- **Next Actions**: Check `/next-actions` filtered by your current context
- **Weekly Review**: Review projects and tasks regularly

### Basic Task Management

- **Create Tasks**: Use quick capture or the input field
- **Complete Tasks**: Check/uncheck tasks to mark completion
- **Delete Tasks**: Click the delete button to remove tasks
- **Organize**: Use contexts, energy levels, and PARA categories

### Todoist Synchronization

- **Setup**: Configure your Todoist API token in the settings panel
- **Import**: Use "Sync from Todoist" to import existing Todoist tasks
- **Bidirectional Sync**: Tasks created in either system will sync automatically
- **Priority Mapping**: Local priorities (1-4) map to Todoist priorities (4-1)

## Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbo
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
npm run test         # Run test suite
npm run test:ui      # Run tests with UI
npm run db:studio    # Open Prisma Studio
npm run format:write # Format code with Prettier
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── _components/        # React components
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── server/                # Backend logic
│   ├── api/               # tRPC routers
│   ├── auth/              # Authentication config
│   ├── services/          # Business logic services
│   └── db.ts              # Database client
└── trpc/                  # tRPC client setup
```

### Testing

Run the comprehensive test suite:

```bash
npm run test
```

Tests cover:
- React component rendering and interactions
- tRPC API endpoints and business logic
- Todoist service integration
- Error handling and edge cases

## API Reference

The application uses tRPC for type-safe API communication. Key endpoints include:

### Task Operations
- `task.getAll` - Fetch all user tasks
- `task.create` - Create new task with optional Todoist sync
- `task.update` - Update task with bidirectional sync
- `task.delete` - Delete task from both systems

### Todoist Integration
- `task.syncFromTodoist` - Import/sync all Todoist tasks
- `task.getTodoistStatus` - Check Todoist connection status
- `task.updateTodoistToken` - Update Todoist API token

For detailed API documentation, see [API.md](./docs/API.md).

## Deployment

The application can be deployed to various platforms:

- **Vercel** (recommended for Next.js apps)
- **Railway** (supports database hosting)
- **Docker** (containerized deployment)

For detailed deployment instructions, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Architecture

This application follows modern full-stack patterns:

- **Server-Side Rendering**: Next.js App Router with React Server Components
- **Type Safety**: End-to-end TypeScript with tRPC
- **Database**: Prisma ORM with relation management
- **Authentication**: NextAuth.js with OAuth providers
- **State Management**: tRPC React Query integration
- **Testing**: Comprehensive unit and integration testing

For detailed architecture documentation, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

For detailed development guidelines, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## License

This project is licensed under the MIT License.

## Documentation

### 📚 [Full Documentation Index](./docs/README.md)

Comprehensive documentation is available in the `/docs` directory:

#### Getting Started
- 🚀 [GTD Quick Start](./docs/QUICK_START.md) - Get started with GTD in 5 minutes
- 🛠️ [Development Guide](./docs/DEVELOPMENT.md) - Setup, coding standards, and workflow
- 🧪 [Testing Guide](./docs/TESTING.md) - Testing strategies and coverage reports
- 🚨 [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

#### Technical Reference
- 🏗️ [Architecture](./docs/ARCHITECTURE.md) - System design and technical decisions
- 📚 [API Reference](./docs/API.md) - Complete tRPC endpoint documentation
- 🎯 [GTD/PARA Guide](./docs/GTD_PARA_GUIDE.md) - Complete GTD methodology implementation
- 🔧 [GTD Technical Docs](./docs/GTD_TECHNICAL_IMPLEMENTATION.md) - GTD system architecture
- 🔄 [Todoist Integration](./docs/TODOIST_INTEGRATION.md) - Sync setup and usage

#### Operations
- 🚀 [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- 📊 [Feature Analysis](./docs/FEATURE-ANALYSIS.md) - User stories and feature evaluation