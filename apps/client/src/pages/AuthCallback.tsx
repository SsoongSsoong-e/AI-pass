import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import loadingImage from '../assets/loading.png';

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
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-6">
          <img 
            src={loadingImage} 
            alt="로딩 중"
            className="w-64 h-64 mx-auto object-contain animate-pulse"
          />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}