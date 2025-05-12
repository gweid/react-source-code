import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      "react": path.resolve("packages/react"),
      "react-dom": path.resolve("packages/react-dom"),
      "react-dom-bindings": path.resolve("packages/react-dom-bindings"),
      "react-reconciler": path.resolve("packages/react-reconciler"),
      "scheduler": path.resolve("packages/scheduler"),
      "shared": path.resolve("packages/shared"),
    }
  },
  plugins: [react()],
  optimizeDeps: {
    force: true,
  }
})
