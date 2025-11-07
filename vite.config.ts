import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Cho phép truy cập từ bên ngoài
    allowedHosts: [
      'tinhnguyenvien.buituantu.com',
      'api.buituantu.com',
      '.buituantu.com' // Cho phép tất cả subdomain của buituantu.com
    ]
  }
});

