# Deployment Guide

This guide covers deploying the Task Manager application to various production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Deployment Platforms](#deployment-platforms)
- [Production Considerations](#production-considerations)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- **Discord Developer Account** - For OAuth authentication
- **Todoist Account** - For task synchronization (optional)
- **Deployment Platform Account** - Vercel, Railway, etc.

### Build Requirements
- Node.js 20+
- npm or yarn
- Git repository

### Pre-deployment Checklist
- [ ] All tests pass (`npm run test`)
- [ ] Code quality checks pass (`npm run check`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Environment variables configured
- [ ] Database schema up to date

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="your-production-database-url"

# Authentication (Required)
AUTH_SECRET="your-very-long-random-secret"  # 32+ characters
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# Application
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"

# Optional: Todoist Integration
TODOIST_API_KEY="your-todoist-api-token"
```

### Generating Secure Secrets

```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Discord OAuth Setup for Production

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create new one)
3. Navigate to **OAuth2 → General**
4. Add production redirect URI: `https://your-domain.com/api/auth/callback/discord`
5. Copy Client ID and Client Secret for environment variables

## Database Setup

### SQLite (Development/Small Production)

For small deployments, SQLite can be used in production:

```env
DATABASE_URL="file:./db.sqlite"
```

**Pros**: Simple setup, no external dependencies
**Cons**: Single-instance only, limited scaling

### PostgreSQL (Recommended for Production)

#### Local PostgreSQL
```env
DATABASE_URL="postgresql://username:password@localhost:5432/taskmanager"
```

#### Hosted PostgreSQL Services

**Supabase**:
```env
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
```

**Railway**:
```env
DATABASE_URL="postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway"
```

**PlanetScale**:
```env
DATABASE_URL="mysql://username:password@host.psdb.cloud/database?sslaccept=strict"
```

### Database Migration

Before deployment, ensure your database schema is up to date:

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Or push schema (for development databases)
npx prisma db push
```

## Deployment Platforms

### Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Setup Steps

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables**
   Add all required environment variables in the Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add each variable for Production environment

4. **Database Configuration**
   ```bash
   # If using PostgreSQL, add to environment variables
   DATABASE_URL="your-postgresql-connection-string"
   ```

5. **Deploy**
   - Vercel automatically deploys on every push to main branch
   - Check deployment logs for any issues

#### Vercel-Specific Configuration

Create `vercel.json` for advanced configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

### Railway

Railway provides both application hosting and PostgreSQL databases.

#### Setup Steps

1. **Create Railway Account**
   - Go to [Railway](https://railway.app/)
   - Connect your GitHub account

2. **Deploy from GitHub**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Next.js configuration

3. **Add PostgreSQL Database**
   - In your project dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway provides DATABASE_URL automatically

4. **Configure Environment Variables**
   - Go to your service → Variables tab
   - Add all required environment variables

5. **Custom Start Command**
   ```bash
   # In Railway service settings
   Start Command: npm run start
   Build Command: npm run build
   ```

#### Railway Configuration File

Create `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start"

[env]
NODE_ENV = "production"
```

### Netlify

While optimized for static sites, Netlify can host Next.js apps with serverless functions.

#### Setup Steps

1. **Connect Repository**
   - Go to [Netlify](https://netlify.com/)
   - Click "New site from Git"
   - Connect your repository

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Install Next.js Plugin**
   ```json
   // netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

4. **Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required variables

### Docker Deployment

For containerized deployments, use the provided Dockerfile:

#### Create Dockerfile

```dockerfile
# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/taskmanager
      - AUTH_SECRET=your-auth-secret
      - AUTH_DISCORD_ID=your-discord-id
      - AUTH_DISCORD_SECRET=your-discord-secret
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=taskmanager
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Initialize Fly app
fly launch

# Set secrets
fly secrets set AUTH_SECRET="your-secret"
fly secrets set AUTH_DISCORD_ID="your-discord-id"
fly secrets set AUTH_DISCORD_SECRET="your-discord-secret"
fly secrets set DATABASE_URL="your-database-url"

# Deploy
fly deploy
```

## Production Considerations

### Performance Optimization

#### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,
  
  // Compress images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable experimental features
  experimental: {
    // Server actions
    serverActions: true,
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Database Optimization

```typescript
// Prisma configuration for production
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  // Enable query engine binary for better performance
  binaryTargets = ["native", "linux-musl"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pooling
  relationMode = "prisma"
}
```

### Security Hardening

#### Environment Security

```bash
# Use proper secret management
# Never commit secrets to repository
# Rotate secrets regularly
# Use least-privilege access
```

#### Headers and HTTPS

```javascript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

#### Database Security

```env
# Use SSL for database connections
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Connection pooling and timeouts
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&connect_timeout=60"
```

### Monitoring Setup

#### Logging

```typescript
// Create logger utility
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: false,
      },
    },
  }),
});

// Use in API routes
import { logger } from '~/lib/logger';

export default async function handler(req, res) {
  try {
    // ... route logic
    logger.info('Task created', { taskId, userId });
  } catch (error) {
    logger.error('Task creation failed', { error, userId });
    throw error;
  }
}
```

#### Health Checks

```typescript
// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        // Add other service checks
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}
```

## Monitoring & Maintenance

### Application Monitoring

#### Error Tracking

**Sentry Integration**:
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

#### Performance Monitoring

**Vercel Analytics**:
```bash
npm install @vercel/analytics
```

```typescript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Database Monitoring

#### Connection Monitoring

```typescript
// Monitor database connections
import { db } from '~/server/db';

// Add to health check endpoint
const connectionCount = await db.$queryRaw`
  SELECT count(*) as count 
  FROM pg_stat_activity 
  WHERE state = 'active'
`;
```

#### Performance Metrics

```bash
# Monitor slow queries (PostgreSQL)
# Add to postgresql.conf:
log_min_duration_statement = 1000  # Log queries > 1 second
log_statement = 'all'
```

### Backup Strategy

#### Database Backups

**Automated PostgreSQL Backups**:
```bash
#!/bin/bash
# backup.sh
DATABASE_URL="your-database-url"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

**Railway Backups**:
Railway provides automatic daily backups. Configure additional backups:
```bash
# Manual backup command
railway run pg_dump $DATABASE_URL > backup.sql
```

### Updates and Maintenance

#### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

#### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy to production
npx prisma migrate deploy

# Reset database (destructive!)
npx prisma migrate reset
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**TypeScript Errors**:
```bash
# Check for type errors
npm run typecheck

# Fix common issues
npm run lint:fix
```

**Missing Dependencies**:
```bash
# Ensure all dependencies are in package.json
npm install --save missing-package

# Check for peer dependency warnings
npm ls
```

#### Runtime Errors

**Database Connection Issues**:
```typescript
// Add connection retry logic
import { db } from '~/server/db';

const connectWithRetry = async (retries = 5) => {
  try {
    await db.$connect();
  } catch (error) {
    if (retries > 0) {
      console.log(`Database connection failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectWithRetry(retries - 1);
    }
    throw error;
  }
};
```

**Environment Variable Issues**:
```bash
# Debug environment variables
node -e "console.log(process.env)" | grep -E "(DATABASE_URL|AUTH_)"

# Validate environment schema
npm run build  # Will fail if env validation fails
```

#### Performance Issues

**Database Query Optimization**:
```bash
# Enable Prisma query logging
DEBUG=prisma:query npm run dev

# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM tasks WHERE userId = 'user-id';
```

**Memory Usage**:
```bash
# Monitor memory usage
node --max-old-space-size=4096 node_modules/.bin/next start

# Profile memory usage
node --inspect node_modules/.bin/next start
```

### Rollback Procedures

#### Application Rollback

**Vercel**:
- Go to Deployments tab
- Click "Promote to Production" on previous deployment

**Railway**:
- Go to deployments
- Click "Redeploy" on previous version

#### Database Rollback

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back migration_name

# Reset to specific migration
npx prisma migrate reset
npx prisma migrate deploy
```

### Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Railway Documentation**: https://docs.railway.app
- **Prisma Documentation**: https://www.prisma.io/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **tRPC Documentation**: https://trpc.io/docs

For deployment-specific issues, consult the platform documentation or create an issue in the project repository.