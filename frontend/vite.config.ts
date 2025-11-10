import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Use the current directory as the project root
      root: '.',
      server: {
        port: 5173,
        host: '0.0.0.0',
        cors: true
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:5001'),
        'process.env.VITE_SOCKET_URL': JSON.stringify(env.VITE_SOCKET_URL || 'http://localhost:5001'),
        'process.env.VITE_TURN_URL': JSON.stringify(env.VITE_TURN_URL || ''),
        'process.env.VITE_TURN_USERNAME': JSON.stringify(env.VITE_TURN_USERNAME || ''),
        'process.env.VITE_TURN_CREDENTIAL': JSON.stringify(env.VITE_TURN_CREDENTIAL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['react-router-dom'],
              socket: ['socket.io-client']
            }
          }
        }
      }
    };
});
