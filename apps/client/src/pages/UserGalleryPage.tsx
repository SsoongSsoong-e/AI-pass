import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarNavigation from '../components/SidebarNavigation';
import galleryEmptyImage from '../assets/gallery.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

interface Photo {
  photo_id: string;
  s3_key: string;
  is_locked: boolean;
  created_at: string;
  presignedUrl?: {
    url: string;
    expiresAt: number;
  };
}

export default function NewGalleryPage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [photoCount, setPhotoCount] = useState({ total: 0, locked: 0, unlocked: 0, maxCount: 10 });

  // 페이지 로드 시 사용자 정보 및 사진 목록 가져오기
  useEffect(() => {
    fetchUserProfile();
    fetchPhotos();
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
    }
  };

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos?includeUrls=true&include=count`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
        if (data.count) {
          setPhotoCount(data.count);
        }
      } else {
        console.error('사진 목록 조회 실패');
      }
    } catch (error) {
      console.error('사진 목록 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
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
        console.log('로그아웃 성공');
        setUserProfile(null);
        await new Promise(resolve => setTimeout(resolve, 200));
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const toggleLock = async (photoId: string) => {
    const photo = photos.find(p => p.photo_id === photoId);
    if (!photo) return;

    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos/${photoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_locked: !photo.is_locked,
        }),
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        setPhotos(photos.map(p => 
          p.photo_id === photoId 
            ? { ...p, is_locked: !p.is_locked }
            : p
        ));
        
        // 카운트 업데이트
        if (photo.is_locked) {
          setPhotoCount(prev => ({
            ...prev,
            locked: prev.locked - 1,
            unlocked: prev.unlocked + 1,
          }));
        } else {
          setPhotoCount(prev => ({
            ...prev,
            locked: prev.locked + 1,
            unlocked: prev.unlocked - 1,
          }));
        }
      } else {
        console.error('잠금 상태 변경 실패');
        alert('잠금 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('잠금 상태 변경 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const deletePhoto = async (photoId: string) => {
    const photo = photos.find(p => p.photo_id === photoId);
    if (photo?.is_locked) {
      alert('잠금된 사진은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm('이 사진을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 로컬 상태에서 제거
        setPhotos(photos.filter(p => p.photo_id !== photoId));
        setPhotoCount(prev => ({
          ...prev,
          total: prev.total - 1,
          unlocked: prev.unlocked - 1,
        }));
      } else {
        const data = await response.json();
        alert(data.message || '사진 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사진 삭제 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  // 스켈레톤 로딩 UI
  const SkeletonCard = () => (
    <div className="aspect-square bg-gray-300 rounded-2xl animate-pulse" />
  );

  // 로딩 중
  if (!userProfile) {
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
    <div className="fixed inset-0 bg-white overflow-y-auto">
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
          className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8 pt-16">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black text-gray-800">Gallery</h1>
            
            {/* 사진 개수 표시 */}
            <span className="text-xl text-gray-500">
              ({photoCount.total}/{photoCount.maxCount})
            </span>
            
            {/* 툴팁 아이콘 */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-8 h-8 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors"
              >
                <span className="text-white font-bold text-sm">?</span>
              </button>
              
              {/* 툴팁 내용 */}
              {showTooltip && (
                <div className="absolute left-10 top-0 w-72 bg-gray-800 text-white text-sm p-4 rounded-xl shadow-2xl z-30">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>최대 {photoCount.maxCount}장의 사진까지 저장됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>최신 순으로 정렬됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>{photoCount.maxCount}장을 초과하면 가장 오래된 사진이 자동으로 지워집니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>잠금기능을 통해 원치않는 자동삭제를 방지하세요.</span>
                    </li>
                  </ul>
                  {/* 툴팁 화살표 */}
                  <div className="absolute left-0 top-3 -translate-x-2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-800" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사진 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {isLoading ? (
            // 로딩 중 - 스켈레톤
            Array.from({ length: 10 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))
          ) : (
            // 사진 목록
            photos.map((photo) => (
              <div
                key={photo.photo_id}
                className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
                onMouseEnter={() => setHoveredPhotoId(photo.photo_id)}
                onMouseLeave={() => setHoveredPhotoId(null)}
              >
                {/* 사진 */}
                <img 
                  src={photo.presignedUrl?.url || ''} 
                  alt={`Photo ${photo.photo_id}`}
                  className="w-full h-full object-cover"
                />

                {/* 호버 시 삭제 버튼 */}
                {hoveredPhotoId === photo.photo_id && !photo.is_locked && (
                  <button
                    onClick={() => deletePhoto(photo.photo_id)}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all duration-300"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* 우측 하단 자물쇠 버튼 */}
                <button
                  onClick={() => toggleLock(photo.photo_id)}
                  className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    photo.is_locked 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-white/70 hover:bg-white'
                  } ${
                    hoveredPhotoId === photo.photo_id ? 'scale-110' : 'scale-100'
                  }`}
                >
                  {photo.is_locked ? (
                    // 잠금 상태
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    // 잠금 해제 상태
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* 사진이 없을 때 */}
        {!isLoading && photos.length === 0 && (
          <div className="text-center py-20">
            <img 
              src={galleryEmptyImage} 
              alt="Empty gallery" 
              className="w-48 h-48 mx-auto mb-4 object-contain"
            />
            <p className="text-xl text-gray-600 mb-2">아직 저장된 사진이 없습니다</p>
            <p className="text-sm text-gray-500">여권사진을 촬영하거나 업로드해보세요</p>
            <button
              onClick={() => navigate('/guide')}
              className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              사진 촬영하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}