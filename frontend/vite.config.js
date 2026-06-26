import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // แยก vendor (react/router/ฯลฯ) ออกเป็น chunk เสถียร — cache ข้าม deploy ได้
    // ผู้ใช้ที่กลับมาไม่ต้องโหลด vendor ใหม่เมื่อแก้แค่โค้ดแอป
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react-router') || id.includes('/react-dom') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
  },
})
