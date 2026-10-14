import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    testTimeout: 20000,
    fileParallelism: false,
  },
});
