import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/product': {
          target: env.VITE_PRODUCT_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/product/, ''),
        },
        '/api/cart': {
          target: env.VITE_CART_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cart/, ''),
        },
        '/api/review': {
          target: env.VITE_REVIEW_API_URL || 'http://localhost:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/review/, ''),
        },
        '/api/order': {
          target: env.VITE_ORDER_API_URL || 'http://localhost:3003',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/order/, ''),
        },
      },
    },
  }
})
