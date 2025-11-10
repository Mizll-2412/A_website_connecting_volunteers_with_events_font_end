import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Cho phép truy cập từ bên ngoài
    allowedHosts: [
      'tinhnguyenvien.io.vn',
      'api.tinhnguyenvien.io.vn',
      '.tinhnguyenvien.io.vn' // Cho phép tất cả subdomain của tinhnguyenvien.io.vn
    ]
  }
});

