import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// 환경 변수 확인
const isProduction = process.env.NODE_ENV === 'production';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss()],
  base: "/",
  resolve: {
    alias: {
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@repo/typescript-config": path.resolve(__dirname, "../../packages/typescript-config"),
    },
  },
  // esbuild 설정 제거
  // Vite는 자동으로 tsconfig.json을 읽으므로 tsconfigRaw가 필요하지 않음
  // tsconfig.node.json과 tsconfig.app.json의 설정이 자동으로 적용됨
  server: {
    host: "0.0.0.0", // Docker 컨테이너에서 접근 가능하도록
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Docker에서 파일 변경 감지
    },
    hmr: {
      overlay: true, // 에러 오버레이 표시
    },
    // 프록시 설정: /api/* 요청을 localhost:5002로 전달
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5002',
        changeOrigin: true,
        // 프로덕션 환경에서는 secure: true (HTTPS 검증 활성화)
        // 개발 환경에서는 secure: false (자체 서명 인증서 허용)
        secure: isProduction,
        rewrite: (path) => path.replace(/^\/api/, ''),  // /api 제거하여 백엔드로 전달
        // 쿠키 관련 설정: 프록시를 통해 쿠키가 제대로 전달되도록 설정
        cookieDomainRewrite: process.env.VITE_COOKIE_DOMAIN || 'localhost',
        cookiePathRewrite: '/',
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            // 쿠키가 있으면 로그 출력
            if (req.headers.cookie) {
              console.log('🍪 Cookies being forwarded:', req.headers.cookie);
            }
            console.log('📤 Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Set-Cookie 헤더 확인
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              console.log('🍪 Set-Cookie received:', setCookie);
            }
            console.log('📥 Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
