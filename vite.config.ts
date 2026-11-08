import { defineConfig } from 'vitest/config';
import { offlineBuild } from './build/offline.ts';
export default defineConfig({ plugins: [offlineBuild()], test: { include: ['src/**/*.test.ts'] } });
