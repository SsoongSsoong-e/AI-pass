import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import landingImage from '../assets/landing.png';
import React from 'react';

// 환경변수 또는 설정에서 가져오기
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export default function NewLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = 로딩중
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 세션 확인
  useEffect(() => {
    checkSession();
  }, []);

  // location이 변경될 때마다 (다른 페이지에서 돌아올 때) 세션 재확인
  useEffect(() => {
    if (location.pathname === '/') {
      console.log('📍 [랜딩페이지] 페이지 도착, 세션 재확인');
      setIsLoading(true); // 로딩 상태로 변경
      
      // 약간의 지연을 두고 세션 확인
      const timer = setTimeout(() => {
        checkSession();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname]); // location 전체가 아닌 pathname만 감지

  const checkSession = async () => {
    console.log('🔍 [랜딩페이지] checkSession 시작');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session/user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [랜딩페이지] 세션 응답 상태:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('📦 [랜딩페이지] 응답 데이터:', userData);
        
        // 더미 사용자 체크
        const isDummyUser = userData.email === 'dev@example.com' && 
                           userData.username === 'dev_user';
        
        if (isDummyUser) {
          console.log('⚠️ [랜딩페이지] 더미 사용자 감지');
          setIsLoggedIn(false);
        } else {
          console.log('✅ [랜딩페이지] 로그인된 사용자');
          setIsLoggedIn(true);
        }
      } else {
        console.log('❌ [랜딩페이지] 로그인 안됨');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('⚠️ [랜딩페이지] 세션 확인 오류:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
      console.log('✔️ [랜딩페이지] 최종 상태 - isLoggedIn:', isLoggedIn, 'isLoading:', false);
    }
  };

  const handleGoogleLogin = () => {
    // 백엔드 Google OAuth 엔드포인트로 리다이렉트
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleGallery = () => {
    navigate('/gallery');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsLoggedIn(false);
        console.log('로그아웃 성공');
        // 현재 페이지가 이미 랜딩 페이지라면 리로드만
        window.location.reload();
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex flex-col items-center justify-center">
      {/* 우측 상단 내비게이션 */}
      {isLoggedIn && (
        <div className="absolute top-6 right-8 z-20 flex gap-3">
          <button
            onClick={handleGallery}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <span className="text-base">🖼️</span>
            <span className="text-sm font-semibold text-indigo-700">내 갤러리</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-full border border-red-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <span className="text-sm font-semibold text-red-600">로그아웃</span>
          </button>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-xl w-full">
      <h1 className="text-4xl font-black text-gray-800 mb-2">
            아 맞다 여권사진!
          </h1>
        {/* 곰돌이 이미지 */}
        <div className="mb-8">
          <img 
            src={landingImage}
            alt="여권 신청 곰돌이"
            className="w-300 h-auto"
          />
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            AI-PASS
          </h1>
          <p className="text-base text-gray-600 font-medium">
            실시간 여권 사진 촬영 서비스
          </p>
        </div>

        {/* 로그인 상태에 따른 버튼 표시 */}
        {!isLoggedIn ? (
          <>
            {/* 구글 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              className="w-full max-w-md bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl mb-6"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-base">Google로 계속하기</span>
            </button>

            {/* 하단 안내 텍스트 */}
            <p className="text-xs text-gray-500 text-center max-w-md">
              로그인하시면{' '}
              <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">이용약관</span>
              {' '}및{' '}
              <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">개인정보처리방침</span>
              에 동의하게 됩니다
            </p>
          </>
        ) : (
          <button
            onClick={() => navigate('/guide')}
            className="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <span className="text-base">시작하기</span>
            <span className="text-xl">→</span>
          </button>
        )}
      </div>

      {/* 도움말 버튼 */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center text-lg font-bold z-50">
        ?
      </button>
    </div>
  );
}