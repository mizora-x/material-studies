// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages as a project site: https://mizora-x.github.io/material-studies/
export default defineConfig({
  site: 'https://mizora-x.github.io',
  base: '/material-studies',
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    css: { modules: { localsConvention: 'camelCaseOnly' } },
  },
});
