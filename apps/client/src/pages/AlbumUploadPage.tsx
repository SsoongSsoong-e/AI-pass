import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/button";
import axiosInstance from "../axios.config";
import { PhotoContext } from "../providers/RootProvider";
import SidebarNavigation from '../components/SidebarNavigation';
import React from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

const AlbumUploadPage = () => {
  const navigate = useNavigate();
  const [selectedImgUrl, setSelectedImgUrl] = useState<string>("");
  const { verificationResult, setVerificationResult } = useContext(PhotoContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // sessionStorage에서 이미지 가져오기
  useEffect(() => {
    const storedImage = sessionStorage.getItem("uploadedImage");
    if (storedImage) {
      setSelectedImgUrl(storedImage);
    } else {
      // fallback: URL에서 가져오기
      const queryParams = new URLSearchParams(window.location.search);
      const imgFromUrl = queryParams.get("image");
      if (imgFromUrl) {
        setSelectedImgUrl(imgFromUrl);
      }
    }
  }, []);

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
      } else {
        console.error('로그아웃 실패');
        alert('로그아웃에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          const imgUrl = reader.result as string;
          setSelectedImgUrl(imgUrl);
          sessionStorage.setItem("uploadedImage", imgUrl);
          navigate("/album");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleReuploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          const imgUrl = reader.result as string;
          setSelectedImgUrl(imgUrl);
          sessionStorage.setItem("uploadedImage", imgUrl);
          navigate("/album");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUploadClick = async () => {
    if (verificationResult) {
      setVerificationResult(null);
    }
    if (!selectedImgUrl) {
      alert("사진을 선택해주세요");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedImgUrl);

    try {
      const res = await axiosInstance.post("/verification", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setVerificationResult(res.data.tempVerificationResult);
      sessionStorage.setItem("capturedImage", selectedImgUrl);
      navigate("/confirm");
    } catch (err) {
      console.error(err);
      alert("사진 검증에 실패했습니다. 다시 시도해주세요.");
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
        {/* 선택된 사진 */}
        <div className="mb-6">
          {selectedImgUrl ? (
            <img 
              src={selectedImgUrl}
              alt="Selected"
              className="w-80 h-[540px] bg-gray-100 rounded-3xl shadow-2xl object-cover border-2 border-gray-200"
            />
          ) : (
            <button
              onClick={handleFileSelect}
              className="w-80 h-[540px] bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl flex items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-white transition-all cursor-pointer"
            >
              <div className="text-center text-indigo-600">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-semibold mb-2">사진 선택하기</p>
                <p className="text-sm text-gray-500">클릭하여 앨범에서 선택</p>
              </div>
            </button>
          )}
        </div>

        {/* 버튼 컨테이너 - 사진이 선택되었을 때만 표시 */}
        {selectedImgUrl ? (
          <div className="flex flex-col gap-3 w-80">
            <Button 
              className="second" 
              clickButton={handleReuploadClick}
            >
              다시 선택
            </Button>
            <Button 
              className="primary" 
              clickButton={handleUploadClick}
            >
              선택 완료
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-80">
            <Button 
              className="primary" 
              clickButton={handleFileSelect}
            >
              사진 선택하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumUploadPage;