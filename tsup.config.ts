import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  outDir: 'bin',
  shims: true,
  format: ['esm'],
  clean: true,
  // minify: true,
})
