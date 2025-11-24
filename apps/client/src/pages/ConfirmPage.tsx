import { useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import axiosInstance from "../axios.config";
import SidebarNavigation from '../components/SidebarNavigation';
import { PhotoContext } from "../providers/RootProvider";
import loadingImage from '../assets/loading.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

const ConfirmPage = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imgData, setImgData] = useState<string>("");
  const navigate = useNavigate();
  const { verificationResult } = useContext(PhotoContext);
  const valid = verificationResult?.every((item: number) => item === 1) ? true : false;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    const storedImage = sessionStorage.getItem("capturedImage");
    if (storedImage) {
      setImgData(storedImage);
    } else {
      // fallback: URL에서 가져오기
      const queryParams = new URLSearchParams(window.location.search);
      const imgFromUrl = queryParams.get("image") ?? "";
      if (imgFromUrl) {
        setImgData(imgFromUrl);
        sessionStorage.setItem("capturedImage", imgFromUrl);
      }
    }
  }, []);

  const handleToggleChecklist = () => {
    setIsOpen(!isOpen);
  };

  const handleRetakeClick = () => {
    sessionStorage.removeItem("capturedImage");
    sessionStorage.removeItem("editedImage");
    sessionStorage.removeItem("uploadedImage");
    navigate("/");
  };

  const base64ToBlob = (base64: string): Blob => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const mimeString = base64.includes(',') 
      ? base64.split(',')[0].split(':')[1].split(';')[0]
      : 'image/jpeg';

    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([byteArray], { type: mimeString });
  };

  const handleCompleteClick = async () => {
    if (!imgData) {
      alert("이미지가 없습니다.");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("🔄 이미지 편집 시작...");
      
      const blob = base64ToBlob(imgData);
      console.log("📦 Blob 생성 완료:", blob.size, "bytes");

      const formData = new FormData();
      formData.append("image", blob, "photo.jpg");

      console.log("📤 photo-edit API 호출 중...");

      const res = await axiosInstance.post("/photo-edit", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        responseType: "blob",
      });

      console.log("✅ photo-edit 성공");

      const imgUrl = URL.createObjectURL(res.data);
      console.log("🖼️ 이미지 URL 생성:", imgUrl);

      sessionStorage.setItem("editedImage", imgUrl);
      navigate("/result");
    } catch (err: any) {
      console.error("❌ 사진 편집 실패:", err);
      
      if (err.code === 'ECONNABORTED') {
        console.error("⏱️ 타임아웃:", err.message);
        alert("사진 편집 시간이 초과되었습니다. 다시 시도해주세요.");
      } else if (err.response) {
        console.error("에러 상태:", err.response.status);
        console.error("에러 데이터:", err.response.data);
        
        if (err.response.status === 431) {
          alert("이미지 데이터가 너무 큽니다. 다시 촬영해주세요.");
        } else if (err.response.status === 413) {
          alert("이미지 파일 크기가 너무 큽니다. 다시 촬영해주세요.");
        } else {
          alert("사진 편집에 실패했습니다. 다시 시도해주세요.");
        }
      } else if (err.request) {
        console.error("❌ 네트워크 에러: 응답 없음");
        alert("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
      } else {
        console.error("❌ 요청 설정 에러:", err.message);
        alert("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const checklistArr: string[] = [
    "착용물이 없어요",
    "얼굴을 가리지 않았어요",
    "정면이에요",
    "무표정이에요",
    "빛이 충분해요",
  ];

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
      {/* 처리 중 모달 */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl font-semibold mb-2">여권 사진을 만들고 있어요</p>
              <p className="text-sm text-gray-500">
                AI가 이미지를 처리 중입니다...<br />
                최대 1분 정도 소요될 수 있습니다.
              </p>
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
        {/* 사진 미리보기 */}
        {imgData && (
          <img 
            src={imgData} 
            alt="Preview"
            className="w-[214px] h-[275px] rounded-3xl shadow-2xl object-cover border-2 border-gray-200 mb-6"
          />
        )}

        {/* 체크리스트 */}
        <div 
          className={`w-80 bg-white border-2 border-indigo-700 rounded-xl overflow-hidden transition-all duration-300 ease-in-out mb-6 shadow-lg ${
            isOpen ? 'h-[300px]' : 'h-[40px]'
          }`}
        >
          {/* 헤더 */}
          <button
            onClick={handleToggleChecklist}
            className="w-full px-4 py-2 bg-white font-semibold text-base flex items-center justify-between sticky top-0 border-b border-gray-200"
          >
            <span>마지막으로 확인했어요</span>
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 체크리스트 내용 */}
          <div className="overflow-y-auto">
            {(verificationResult || [0, 0, 0, 0, 0]).map((item: number, idx: number) => (
              <div 
                key={idx}
                className={`flex items-center gap-3 px-5 py-2.5 font-semibold text-base ${
                  item ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {checklistArr[idx]}
              </div>
            ))}
          </div>
        </div>

        {/* 버튼 컨테이너 */}
        <div className="flex flex-col gap-3 w-80">
          <button
            onClick={handleRetakeClick}
            className="w-full px-6 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl border-2 border-gray-300 transition-colors shadow-md"
          >
            다시 촬영 (선택)
          </button>
          
          <button
            onClick={valid ? handleCompleteClick : undefined}
            disabled={!valid}
            className={`w-full px-6 py-4 font-semibold rounded-xl transition-colors shadow-md ${
              valid
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            여권 사진 완성
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPage;