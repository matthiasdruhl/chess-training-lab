import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api/chesscom': {
        target: 'https://api.chess.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chesscom/, '/pub'),
      },
    },
  },
});
