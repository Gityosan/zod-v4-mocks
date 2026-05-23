import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Type-level tests live in *.test-d.ts and run via `pnpm run test:types`
    // (vitest --typecheck). They are not part of the default runtime run.
    typecheck: {
      include: ['test/**/*.test-d.ts'],
    },
  },
});
