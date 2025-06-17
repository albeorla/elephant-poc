# Authentication Setup Guide

## 🚨 Current Issue: Discord OAuth Error

The authentication error you're seeing is due to invalid Discord OAuth credentials. Here are the solutions:

## 🔧 **Option 1: Set Up Real Discord OAuth (Recommended)**

### Step 1: Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name like "Task Manager Local Dev"
4. Go to "OAuth2" section

### Step 2: Configure OAuth2
1. In "Redirects" add: `http://localhost:3000/api/auth/callback/discord`
2. Copy your **Client ID** and **Client Secret**

### Step 3: Update Environment Variables
```bash
# Replace these in your .env file:
AUTH_DISCORD_ID="your_actual_client_id_here"
AUTH_DISCORD_SECRET="your_actual_client_secret_here"
```

## 🔧 **Option 2: Use Mock Authentication for Development**

If you don't want to set up Discord OAuth right now, here's a quick development solution:

### Create Mock Auth Provider

Add this to your `src/server/auth/config.ts`:

```typescript
import { type NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

// Mock provider for development
const MockProvider = {
  id: "mock",
  name: "Mock Login",
  type: "credentials" as const,
  credentials: {
    email: { label: "Email", type: "email", placeholder: "test@example.com" },
    name: { label: "Name", type: "text", placeholder: "Test User" },
  },
  async authorize(credentials) {
    // Mock authentication - only use in development!
    if (process.env.NODE_ENV === "development") {
      return {
        id: "mock-user-id",
        name: credentials?.name as string || "Test User",
        email: credentials?.email as string || "test@example.com",
      };
    }
    return null;
  },
};

export const authConfig = {
  providers: [
    // Use mock provider in development if Discord isn't configured
    process.env.NODE_ENV === "development" && !process.env.AUTH_DISCORD_ID?.startsWith("your_") 
      ? MockProvider
      : Discord({
          clientId: env.AUTH_DISCORD_ID,
          clientSecret: env.AUTH_DISCORD_SECRET,
        }),
  ],
  // ... rest of your auth config
} satisfies NextAuthConfig;
```

## 🔧 **Option 3: Use GitHub OAuth (Alternative)**

GitHub OAuth is easier to set up than Discord:

### Step 1: Create GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`

### Step 2: Install GitHub Provider
```bash
npm install next-auth/providers/github
```

### Step 3: Update Auth Config
```typescript
import GitHub from "next-auth/providers/github";

export const authConfig = {
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
  ],
  // ... rest of config
} satisfies NextAuthConfig;
```

### Step 4: Update Environment Variables
```bash
# Add to .env:
AUTH_GITHUB_ID="your_github_client_id"
AUTH_GITHUB_SECRET="your_github_client_secret"
```

## 🚀 **Quick Fix: Disable Authentication Temporarily**

If you want to test the app functionality without authentication:

### Update Auth Config
```typescript
export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    jwt: ({ token }) => token,
    session: ({ session, token }) => ({
      ...session,
      user: {
        id: "test-user",
        name: "Test User",
        email: "test@example.com",
      },
    }),
  },
} satisfies NextAuthConfig;
```

## 🧪 **Testing Authentication**

Once you've fixed the auth setup, test it:

```bash
# 1. Restart your dev server
npm run dev

# 2. Navigate to http://localhost:3000
# 3. Click "Sign in"
# 4. Complete the OAuth flow
# 5. You should see "Logged in as [Your Name]"
# 6. Task Manager should appear
```

## 🔍 **Troubleshooting**

### Common Issues:

1. **"Invalid Client" Error**
   - Double-check your CLIENT_ID and CLIENT_SECRET
   - Ensure redirect URL matches exactly: `http://localhost:3000/api/auth/callback/discord`

2. **"Configuration Error"**
   - Restart your dev server after changing .env
   - Check that .env file is in the project root

3. **"Session Not Found"**
   - Clear browser cookies for localhost:3000
   - Check that AUTH_SECRET is set in .env

### Validation Commands:
```bash
# Check if environment variables are loaded
npm run verify

# Test authentication flow
npm run dev
# Then visit http://localhost:3000
```

## 📝 **Environment Variables Checklist**

Make sure these are set in your `.env` file:

```bash
# Required for NextAuth.js
AUTH_SECRET="your-secret-here"

# For Discord OAuth
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# OR for GitHub OAuth
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Database
DATABASE_URL="file:./db.sqlite"

# Optional: Todoist integration
TODOIST_API_KEY="your-todoist-api-key"
```

---

**Quick Solution**: The fastest way to get your app working is **Option 2** (Mock Authentication) - just update your auth config to use the mock provider for development!