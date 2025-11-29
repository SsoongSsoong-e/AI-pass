import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/api',  // 프록시 사용 시 /api 사용
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,  // 쿠키 자동 전송 (세션 쿠키 포함)
});
export default axiosInstance;
