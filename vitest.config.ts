import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  // Prevent Vitest/Vite from attempting to process CSS
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});






