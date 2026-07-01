/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pseudoku/' : '/',
  plugins: [svelte()],
  test: {
    environment: 'node',
  },
}));
