import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2019',          // baseline ที่เบราว์เซอร์ทั่วโลกรองรับ → บันเดิลเล็กลง
    cssCodeSplit: true,        // แยก CSS ตามหน้า โหลดเฉพาะที่ใช้
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // แยก vendor ที่เปลี่ยนน้อย ออกเป็น chunk ระยะยาว (cache ได้นาน ข้ามดีพลอย)
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
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
