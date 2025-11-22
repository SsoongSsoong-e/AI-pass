import { useNavigate } from 'react-router-dom';

interface SidebarNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onLogout: () => void;
}

export default function SidebarNavigation({ 
  isOpen, 
  onClose, 
  userName = 'User Name',
  userImage,
  onLogout 
}: SidebarNavigationProps) {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/guide'); // 로그인된 사용자는 가이드 페이지로
    onClose();
  };

  const handleGallery = () => {
    navigate('/result'); // 갤러리 페이지로 (기존 /result 경로 사용)
    onClose();
  };

  const handleLogout = () => {
    onLogout(); // 부모 컴포넌트의 로그아웃 로직 실행 (이미 navigate 포함)
    onClose();
    // navigate는 onLogout 내부에서 처리되므로 여기서는 제거
  };

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 프로필 섹션 */}
        <div className="flex flex-col items-center py-8 border-b border-gray-200">
          {/* 프로필 이미지 */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-3 border-indigo-300 flex items-center justify-center overflow-hidden shadow-lg mb-4">
            {userImage ? (
              <img 
                src={userImage} 
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-indigo-600">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* 사용자 이름 */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {userName}
          </h3>
          <div className="w-32 h-0.5 bg-gradient-to-r from-indigo-300 to-purple-300"></div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="py-6">
          <button
            onClick={handleHome}
            className="w-full px-8 py-4 text-left text-lg font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
          
          <button
            onClick={handleGallery}
            className="w-full px-8 py-4 text-left text-lg font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Gallery
          </button>
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="absolute bottom-8 left-0 w-full px-4">
          <button
            onClick={handleLogout}
            className="w-full px-8 py-4 text-left text-lg font-semibold text-red-600 hover:bg-red-50 transition-colors rounded-lg flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}