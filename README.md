# Task Manager with Todoist Integration

A modern, full-stack task management application built with the T3 Stack, featuring comprehensive Todoist synchronization capabilities.

## Features

- ✅ **Complete Task Management** - Create, edit, delete, and organize tasks with priorities, due dates, and labels
- 🔄 **Bidirectional Todoist Sync** - Seamlessly sync tasks between the local app and your Todoist account
- 🔐 **Secure Authentication** - Discord OAuth integration with NextAuth.js
- 📱 **Real-time Updates** - Instant UI updates with optimistic mutations
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

### Basic Task Management

- **Create Tasks**: Use the input field to add new tasks
- **Complete Tasks**: Check/uncheck tasks to mark completion
- **Delete Tasks**: Click the delete button to remove tasks
- **Sync Toggle**: Enable "Sync to Todoist" when creating tasks to sync with Todoist

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

For detailed API documentation, see [API.md](./API.md).

## Deployment

The application can be deployed to various platforms:

- **Vercel** (recommended for Next.js apps)
- **Railway** (supports database hosting)
- **Docker** (containerized deployment)

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Architecture

This application follows modern full-stack patterns:

- **Server-Side Rendering**: Next.js App Router with React Server Components
- **Type Safety**: End-to-end TypeScript with tRPC
- **Database**: Prisma ORM with relation management
- **Authentication**: NextAuth.js with OAuth providers
- **State Management**: tRPC React Query integration
- **Testing**: Comprehensive unit and integration testing

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

For detailed development guidelines, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## License

This project is licensed under the MIT License.

## Support

- 📖 [Todoist Integration Guide](./TODOIST_INTEGRATION.md)
- 🏗️ [Architecture Documentation](./ARCHITECTURE.md)
- 🛠️ [Development Guide](./DEVELOPMENT.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 📚 [API Reference](./API.md)