import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':          resolve(__dirname, 'src'),
      '@app':       resolve(__dirname, 'src/app'),
      '@components':resolve(__dirname, 'src/components'),
      '@pages':     resolve(__dirname, 'src/pages'),
      '@hooks':     resolve(__dirname, 'src/hooks'),
      '@services':  resolve(__dirname, 'src/services'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@locales':   resolve(__dirname, 'src/locales'),
      '@utils':     resolve(__dirname, 'src/utils'),
      '@styles':    resolve(__dirname, 'src/styles'),
      '@types':     resolve(__dirname, 'src/types'),
    },
  },
})
