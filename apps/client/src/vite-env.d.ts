/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client"/>
// client.d.ts

// 이미지 파일 타입 선언 (중복 제거)
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';
declare module '*.webp';