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

    const backendProxyTarget = process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:5001';

    return {
      envDir,
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: backendProxyTarget,
            changeOrigin: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq, req: any) => {
                // Ensure large certificate payloads pass through the proxy
                if (req.body) {
                  const bodyData = JSON.stringify(req.body);
                  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                }
              });
            },
          },
        },
      },
      plugins: [tailwindcss(), react()],
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      },
      build: {
        target: 'es2020',
        cssMinify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('framer-motion') || id.includes('recharts')) {
                return 'vendor-ui-motion';
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'vendor-ui-kit';
              }
              if (
                id.includes('react-router')
                || id.includes('@tanstack/react-query')
                || id.includes('react-dom')
                || id.includes('/react/')
              ) {
                return 'vendor-react-core';
              }
              return undefined;
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
