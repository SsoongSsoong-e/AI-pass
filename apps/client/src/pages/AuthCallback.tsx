import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      
      if (success === 'true') {
        // 세션 확인
        try {
          const response = await fetch(`${API_BASE_URL}/auth/session/user`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('로그인 성공:', userData);
            
            // 가이드 페이지로 이동
            setTimeout(() => {
              navigate('/guide');
            }, 1000);
          } else {
            console.error('세션 확인 실패');
            navigate('/?error=session');
          }
        } catch (error) {
          console.error('인증 확인 오류:', error);
          navigate('/?error=auth');
        }
      } else {
        navigate('/?error=login');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}