import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow/tfjs')) {
            return 'tfjs'
          }
          if (id.includes('framer-motion')) {
            return 'motion'
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
