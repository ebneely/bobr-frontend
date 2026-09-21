import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // `next build` with output:"standalone" copies package.json into
  // .next/standalone, so Jest's module map sees two packages both named
  // bobr-frontend and warns on every run. The build output is not a source
  // tree; keep it out of the map entirely.
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/.claude/'],
  // Agent worktrees live in .claude/worktrees INSIDE this repo; their copies
  // of __tests__ would otherwise run against this checkout's lib.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // No thresholds yet — this is a scaffold. Set them to the real measured
  // number minus 2-3 points once there are tests, so the gate is honest today
  // and ratchets up, rather than a decorative 80 nobody can reach.
};

export default createJestConfig(config);
