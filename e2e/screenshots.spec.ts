import { test, expect } from '@playwright/test'
import path from 'path'

const shots = [
  { name: '01-home', path: '/', fullPage: true },
  { name: '02-login', path: '/login', fullPage: false },
  { name: '03-register', path: '/register', fullPage: false },
  { name: '04-dashboard', path: '/dashboard', fullPage: true },
  { name: '05-datasets', path: '/datasets', fullPage: true },
  { name: '06-cleaning', path: '/cleaning', fullPage: true },
  { name: '07-training', path: '/training', fullPage: true },
  { name: '08-compare', path: '/compare', fullPage: true },
  { name: '09-visualizations', path: '/visualizations', fullPage: true },
  { name: '10-results', path: '/results', fullPage: true },
]

test.describe('screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure guest session exists so AuthGuard allows protected routes
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem('mlpilot_guest_session')) {
          const g = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
          localStorage.setItem('mlpilot_guest_session', g)
        }
      } catch {}
    })
  })

  for (const s of shots) {
    test(`capture ${s.name}`, async ({ page }) => {
      await page.goto(s.path, { waitUntil: 'domcontentloaded' })
      // Wait a bit for brutal grid + fonts to settle
      await page.waitForTimeout(1500)
      // Hide flaky cursor-follow gradients for deterministic shot
      await page.addStyleTag({ content: '*{scrollbar-width:none} ::-webkit-scrollbar{display:none}' })
      const out = path.join(process.cwd(), 'docs', 'screenshots', `${s.name}.png`)
      await page.screenshot({ path: out, fullPage: s.fullPage })
      expect(out).toBeTruthy()
    })
  }
})
