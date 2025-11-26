import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosInstance from "../axios.config";
import SidebarNavigation from '../components/SidebarNavigation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

const ResultPage = () => {
  const [imgData, setImgData] = useState<string>("");
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 사용자 프로필 가져오기
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

  // sessionStorage에서 이미지 가져오기
  useEffect(() => {
    const storedImage = sessionStorage.getItem("editedImage");
    if (storedImage) {
      setImgData(storedImage);
    } else {
      // fallback: URL에서 가져오기
      const queryParams = new URLSearchParams(window.location.search);
      const imgFromUrl = queryParams.get("image") ?? "";
      if (imgFromUrl) {
        setImgData(imgFromUrl);
      }
    }
  }, []);

  const handleBack = () => {
    // sessionStorage 정리
    sessionStorage.removeItem("capturedImage");
    sessionStorage.removeItem("editedImage");
    sessionStorage.removeItem("uploadedImage");
    navigate("/webcam");
  };

  const handleDownload = async () => {
    if (!imgData) {
      alert("저장할 이미지가 없습니다.");
      return;
    }

    setIsSaving(true);

    try {
      // Blob URL을 Blob으로 변환
      const response = await fetch(imgData);
      const blob = await response.blob();

      // FormData 생성
      const formData = new FormData();
      formData.append("image", blob, "passport_photo.png");

      // 서버에 저장 (POST /passport-photos로 통합됨)
      const saveResponse = await axiosInstance.post("/passport-photos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("사진 저장 완료:", saveResponse.data);

      // 브라우저 다운로드도 수행
      const link = document.createElement("a");
      link.href = imgData;
      link.download = "passport_img.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // sessionStorage 정리
      sessionStorage.removeItem("capturedImage");
      sessionStorage.removeItem("editedImage");
      sessionStorage.removeItem("uploadedImage");

      // 성공 모달 표시
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("사진 저장 실패:", error);
      
      // 에러 상세 정보 출력
      if (error.response) {
        console.error("에러 상태:", error.response.status);
        console.error("에러 데이터:", error.response.data);
      }
      
      alert("사진 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  // 로딩 중
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

  // 로그인 안됨
  if (!userProfile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      {/* 다운로드 완료 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
              저장 완료!
            </h3>
            
            <p className="text-gray-600 text-center mb-8">
              여권 사진이 성공적으로 저장되었습니다.<br />
              갤러리에서 확인하실 수 있습니다.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/gallery");
                }}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
              >
                갤러리로 이동
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/");
                }}
                className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* 결과 사진 */}
        <div className="mb-8">
          {imgData ? (
            <img 
              src={imgData} 
              alt="Passport Photo"
              className="w-[214px] h-[275px] rounded-3xl shadow-2xl object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-[214px] h-[275px] bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl flex items-center justify-center border-2 border-gray-200">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">이미지를 불러오는 중...</p>
              </div>
            </div>
          )}
        </div>

        {/* 버튼 컨테이너 */}
        <div className="flex flex-col gap-3 w-80">
          <button
            onClick={handleBack}
            className="w-full px-6 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl border-2 border-gray-300 transition-colors shadow-md"
          >
            버리고 다시 촬영
          </button>
          
          <button
            onClick={handleDownload}
            disabled={isSaving || !imgData}
            className={`w-full px-6 py-4 font-semibold rounded-xl transition-colors shadow-md ${
              isSaving || !imgData
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSaving ? "저장 중..." : "여권 사진 저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;