import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    // Avoid hard dependency on reading `.env` files at config-load time.
    // Vite will still inject `import.meta.env.*` into the client bundle based on runtime env.
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    // In some restricted environments (e.g. sandboxed CI / editors), reading `.env` can throw EPERM.
    // If that happens, point Vite to an alternate env directory so builds can still run.
    let envDir = path.resolve(__dirname, '.');
    try {
      fs.accessSync(path.resolve(__dirname, '.env'), fs.constants.R_OK);
    } catch {
      envDir = path.resolve(__dirname, 'env');
    }

    return {
      envDir,
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
          },
        },
      },
      plugins: [tailwindcss(), react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
