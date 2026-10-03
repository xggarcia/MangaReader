/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so assets resolve inside the Capacitor WebView.
  base: './',
  build: {
    target: 'es2022',
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
