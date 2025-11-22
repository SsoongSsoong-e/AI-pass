import { useState } from 'react';
import SidebarNavigation from '../components/SidebarNavigation';

const TEMP_PROFILE = {
  imageUrl: '',
  userName: 'User Name'
};

interface Photo {
  id: string;
  url: string;
  isLocked: boolean;
  createdAt: Date;
}

export default function NewGalleryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
  
  // 임시 데이터 (실제로는 API에서 가져올 데이터)
  const [photos, setPhotos] = useState<Photo[]>([
    { id: '1', url: 'https://via.placeholder.com/200', isLocked: false, createdAt: new Date() },
    { id: '2', url: 'https://via.placeholder.com/200', isLocked: true, createdAt: new Date() },
    { id: '3', url: 'https://via.placeholder.com/200', isLocked: false, createdAt: new Date() },
    { id: '4', url: 'https://via.placeholder.com/200', isLocked: false, createdAt: new Date() },
    { id: '5', url: 'https://via.placeholder.com/200', isLocked: false, createdAt: new Date() },
  ]);

  const handleLogout = () => {
    console.log('로그아웃');
  };

  const toggleLock = (photoId: string) => {
    setPhotos(photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, isLocked: !photo.isLocked }
        : photo
    ));
  };

  // 스켈레톤 로딩 UI
  const SkeletonCard = () => (
    <div className="aspect-square bg-gray-300 rounded-2xl animate-pulse" />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 relative">
      {/* 사이드바 네비게이션 */}
      <SidebarNavigation 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userName={TEMP_PROFILE.userName}
        userImage={TEMP_PROFILE.imageUrl}
        onLogout={handleLogout}
      />

      {/* 프로필 아바타 - 좌상단 */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          {TEMP_PROFILE.imageUrl ? (
            <img 
              src={TEMP_PROFILE.imageUrl} 
              alt={TEMP_PROFILE.userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-gray-700">
              {TEMP_PROFILE.userName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8 pt-16">
          <h1 className="text-5xl font-black text-gray-800">Gallery</h1>
          
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
                    <span>최대 10장의 사진까지 저장됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>최신 순으로 정렬됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>10장을 초과하면 가장 오래된 사진이 자동으로 지워집니다.</span>
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
                key={photo.id}
                className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
                onMouseEnter={() => setHoveredPhotoId(photo.id)}
                onMouseLeave={() => setHoveredPhotoId(null)}
              >
                {/* 사진 */}
                <img 
                  src={photo.url} 
                  alt={`Photo ${photo.id}`}
                  className="w-full h-full object-cover"
                />

                {/* 우측 하단 자물쇠 버튼 (항상 표시, 호버 시 강조) */}
                <button
                  onClick={() => toggleLock(photo.id)}
                  className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    photo.isLocked 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-white/70 hover:bg-white'
                  } ${
                    hoveredPhotoId === photo.id ? 'scale-110' : 'scale-100'
                  }`}
                >
                  {photo.isLocked ? (
                    // 잠금 상태 (파란색 배경)
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    // 잠금 해제 상태 (흰색 배경)
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
            <div className="text-6xl mb-4">📸</div>
            <p className="text-xl text-gray-600 mb-2">아직 저장된 사진이 없습니다</p>
            <p className="text-sm text-gray-500">여권사진을 촬영하거나 업로드해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}