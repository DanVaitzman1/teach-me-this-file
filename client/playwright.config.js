import { defineConfig } from '@playwright/test'
import process from 'node:process'

const profiles = [
  { language: 'en', theme: 'light', width: 1440 },
  { language: 'he', theme: 'dark', width: 375 },
  { language: 'ar', theme: 'light', width: 375 },
  { language: 'fr', theme: 'dark', width: 1440 },
  { language: 'es', theme: 'light', width: 375 },
]

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: Boolean(process.env.CI),
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  projects: profiles.map((profile) => ({
    name: `${profile.language}-${profile.theme}-${profile.width}`,
    metadata: profile,
    use: { viewport: { width: profile.width, height: profile.width < 500 ? 812 : 1000 } },
  })),
  webServer: {
    command: 'npm run dev --prefix ..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
