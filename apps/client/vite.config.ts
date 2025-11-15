import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  base: "/",
  resolve: {
    alias: {
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@repo/typescript-config": path.resolve(__dirname, "../../packages/typescript-config"),
    },
  },
  esbuild: {
    // TypeScript 설정 파일을 무시하고 직접 컴파일 옵션 지정
    // Vite는 tsconfig.json의 extends를 해결하지 않음
    tsconfigRaw: {
      compilerOptions: {
        jsx: "react-jsx",
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        allowJs: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    },
  },
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
  },
});
