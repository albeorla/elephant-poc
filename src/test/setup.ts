import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables for testing
process.env.DATABASE_URL = "file:./test.db"
// @ts-ignore - We need to override NODE_ENV for testing
process.env.NODE_ENV = "test"
process.env.SKIP_ENV_VALIDATION = "true"

// Mock Next.js server modules
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: vi.fn(),
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}))

// Mock next-auth/providers
vi.mock('next-auth/providers/discord', () => ({
  default: vi.fn(),
})) 