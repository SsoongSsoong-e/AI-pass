import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarNavigation from '../components/SidebarNavigation';
import guidePhoneImg from '../assets/guide-phone.png';
import guideFaceImg from '../assets/guide-face.png';
import guideReadyImg from '../assets/guide-ready.png';
import guideSecondImg from '../assets/guide-second.png';
import React from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

export default function NewGuidePage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 사용자 정보 가져오기
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
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
        setUserProfile(userData);
      } else {
        console.error('사용자 정보를 가져올 수 없습니다');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('🚪 [가이드페이지] 로그아웃 시작');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [가이드페이지] 로그아웃 응답 상태:', response.status);

      if (response.ok) {
        console.log('✅ [가이드페이지] 로그아웃 성공');
        setUserProfile(null);
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('🔄 [가이드페이지] 랜딩 페이지로 이동');
        navigate('/', { replace: true });
      } else {
        console.error('❌ [가이드페이지] 로그아웃 실패');
        alert('로그아웃에 실패했습니다.');
      }
    } catch (error) {
      console.error('⚠️ [가이드페이지] 로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  const guides = [
    {
      title: '📱 핸드폰 고정',
      content: '핸드폰을 얼굴 가이드라인에 맞게 고정해주세요',
      image: guidePhoneImg
    },
    {
      title: '👤 얼굴 윤곽 확인',
      content: '얼굴 윤곽을 가리지 않도록 확인해주세요\n\n• 머리카락, 스카프, 목도리 등',
      image: guideFaceImg
    },
    {
      title: '✨ 촬영 준비',
      content: '아래 사항을 지켜야 촬영 버튼이 활성화돼요\n\n• 안경, 악세사리, 머리띠, 모자, 이어폰 등 미착용\n• 정면, 무표정, 적절한 조명',
      image: guideReadyImg
    },
    {
      title: '⏱️ 자동 촬영',
      content: '촬영 버튼이 활성화된 후 3초 뒤,\n자동으로 촬영이 시작돼요',
      image: guideSecondImg
    }
  ];

  const handleNext = () => {
    if (currentSlide < guides.length) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleRealTimeCapture = () => {
    navigate('/webcam');
  };

  const handleUploadPhoto = () => {
    navigate('/album');
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자 정보가 없을 때 (로그인 안 됨)
  if (!userProfile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 overflow-y-auto flex flex-col">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* 사이드바 네비게이션 */}
      <SidebarNavigation 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userName={userProfile.username}
        userImage={userProfile.profile_picture || ''}
        onLogout={handleLogout}
      />

      {/* 프로필 아바타 - 좌상단 */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          {userProfile.profile_picture ? (
            <img 
              src={userProfile.profile_picture} 
              alt={userProfile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-gray-700">
              {userProfile.username.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
        
        {/* 슬라이드 영역 */}
        <div className="w-full max-w-2xl flex items-center justify-center gap-8 mb-8">
          {/* 좌측 화살표 */}
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className={`p-3 transition-all ${
              currentSlide === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 hover:scale-110'
            }`}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 카드 컨테이너 */}
          <div className="flex-1 max-w-xl">
            {currentSlide < guides.length ? (
              // 가이드 카드
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200 min-h-[400px] flex flex-col items-center justify-center">
                {/* 이미지 */}
                <div className="mb-6">
                  <img 
                    src={guides[currentSlide].image} 
                    alt={guides[currentSlide].title}
                    className="w-48 h-48 object-contain"
                  />
                </div>
                
                {/* 텍스트 */}
                <div className="text-center">
                  <h2 className="text-3xl font-black text-gray-800 mb-4">
                    {guides[currentSlide].title}
                  </h2>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {guides[currentSlide].content}
                  </p>
                </div>
              </div>
            ) : (
              // 마지막 슬라이드 - 버튼 선택
              <div className="flex flex-col gap-4 min-h-[400px] justify-center">
                <button
                  onClick={handleRealTimeCapture}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white rounded-3xl p-8 shadow-xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:scale-105"
                >
                  <h3 className="text-2xl font-bold text-gray-800">실시간 촬영하기</h3>
                </button>
                
                <button
                  onClick={handleUploadPhoto}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white rounded-3xl p-8 shadow-xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:scale-105"
                >
                  <h3 className="text-2xl font-bold text-gray-800">사진 업로드 하기</h3>
                </button>
              </div>
            )}
          </div>

          {/* 우측 화살표 */}
          <button
            onClick={handleNext}
            disabled={currentSlide === guides.length}
            className={`p-3 transition-all ${
              currentSlide === guides.length
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 hover:scale-110'
            }`}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 인디케이터 */}
        <div className="flex gap-2 mt-4">
          {[...Array(guides.length + 1)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-indigo-600' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}