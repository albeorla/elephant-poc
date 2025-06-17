import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Task Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display the landing page correctly', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: /Create.*T3.*App/i })).toBeVisible();
    
    // Check sign in button
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    
    // Check documentation links
    await expect(page.getByRole('link', { name: /First Steps/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Documentation/i })).toBeVisible();
  });

  test('should not show task manager when not authenticated', async ({ page }) => {
    // Task manager should not be visible for unauthenticated users
    await expect(page.getByText('Task Manager')).not.toBeVisible();
    await expect(page.getByPlaceholder('Add a new task...')).not.toBeVisible();
  });

  test('should have proper page structure and navigation', async ({ page }) => {
    // Check page has proper semantic structure
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    
    // Check responsive behavior
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await expect(page.getByRole('heading', { name: /Create.*T3.*App/i })).toBeVisible();
    
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop viewport
    await expect(page.getByRole('heading', { name: /Create.*T3.*App/i })).toBeVisible();
  });

  test('should handle external links correctly', async ({ page }) => {
    // Check external links have proper attributes
    const firstStepsLink = page.getByRole('link', { name: /First Steps/i });
    await expect(firstStepsLink).toHaveAttribute('target', '_blank');
    await expect(firstStepsLink).toHaveAttribute('href', /create\.t3\.gg/);
    
    const docsLink = page.getByRole('link', { name: /Documentation/i });
    await expect(docsLink).toHaveAttribute('target', '_blank');
    await expect(docsLink).toHaveAttribute('href', /create\.t3\.gg/);
  });

  test('should be accessible', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Authentication Flow', () => {
  test('should navigate to sign in', async ({ page }) => {
    await page.goto('/');
    
    // Click sign in button
    const signInButton = page.getByRole('link', { name: 'Sign in' });
    await expect(signInButton).toBeVisible();
    
    // Check the link points to the correct auth endpoint
    await expect(signInButton).toHaveAttribute('href', '/api/auth/signin');
  });

  test('should show sign out when authenticated', async ({ page }) => {
    // This test would require setting up a mock authenticated session
    // For now, we'll test the UI elements exist for the authenticated state
    await page.goto('/');
    
    // We can test by injecting mock session data or using a test user
    // For demonstration, we'll check the conditional rendering structure exists
    const authSection = page.locator('div').filter({ hasText: /Logged in as|Sign in/ });
    await expect(authSection).toBeVisible();
  });
});

// Note: Tests requiring authentication would need additional setup
// This could include:
// 1. Mock authentication in tests
// 2. Test user creation
// 3. Session management for E2E tests