import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.PERPLEXITY_API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY),
        'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.GOOGLE_MAPS_API_KEY),
        'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD),
        'process.env.CALM_PASSWORD': JSON.stringify(env.CALM_PASSWORD),
        'process.env.DELETE_PASSWORD': JSON.stringify(env.DELETE_PASSWORD),
        'process.env.FUNCTIONS_BASE_URL': JSON.stringify(env.FUNCTIONS_BASE_URL || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
