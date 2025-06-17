import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage should match visual baseline', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of the full page
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      threshold: 0.2, // Allow for small differences
    });
  });

  test('homepage should match mobile visual baseline', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('homepage should match tablet visual baseline', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('should handle dark mode correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if the app has dark mode support
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('should handle high contrast mode', async ({ page }) => {
    await page.goto('/');
    
    // Test with forced colors (high contrast mode)
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-high-contrast.png', {
      fullPage: true,
      threshold: 0.3, // Higher threshold for high contrast differences
    });
  });

  test('should handle reduced motion preference', async ({ page }) => {
    await page.goto('/');
    
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForLoadState('networkidle');
    
    // Verify animations are appropriately reduced
    await expect(page).toHaveScreenshot('homepage-reduced-motion.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('should render correctly with different font sizes', async ({ page }) => {
    await page.goto('/');
    
    // Test with larger font size (simulate user zoom/accessibility preferences)
    await page.addStyleTag({
      content: 'body { font-size: 120% !important; }'
    });
    
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-large-font.png', {
      fullPage: true,
      threshold: 0.3,
    });
  });

  test('should handle print styles correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test print media query
    await page.emulateMedia({ media: 'print' });
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-print.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

test.describe('Component Visual Tests', () => {
  test('navigation should be visually consistent', async ({ page }) => {
    await page.goto('/');
    
    // Focus on navigation area only
    const navigation = page.locator('main').first();
    await expect(navigation).toHaveScreenshot('navigation-component.png', {
      threshold: 0.1,
    });
  });

  test('buttons should have consistent styling', async ({ page }) => {
    await page.goto('/');
    
    // Test button states
    const signInButton = page.getByRole('link', { name: 'Sign in' });
    await expect(signInButton).toHaveScreenshot('signin-button-normal.png');
    
    // Hover state
    await signInButton.hover();
    await expect(signInButton).toHaveScreenshot('signin-button-hover.png');
    
    // Focus state
    await signInButton.focus();
    await expect(signInButton).toHaveScreenshot('signin-button-focus.png');
  });

  test('links should have consistent styling', async ({ page }) => {
    await page.goto('/');
    
    const docLink = page.getByRole('link', { name: /Documentation/i });
    
    // Normal state
    await expect(docLink).toHaveScreenshot('doc-link-normal.png');
    
    // Hover state
    await docLink.hover();
    await expect(docLink).toHaveScreenshot('doc-link-hover.png');
    
    // Focus state
    await docLink.focus();
    await expect(docLink).toHaveScreenshot('doc-link-focus.png');
  });
});