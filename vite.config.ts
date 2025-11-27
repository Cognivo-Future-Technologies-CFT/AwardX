import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.resolve();

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
