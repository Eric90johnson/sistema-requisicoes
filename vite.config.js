import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // 🚀 Adicionado

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 🚀 Adicionado
  ],
})