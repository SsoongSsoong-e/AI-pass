import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/button";
import axiosInstance from "../axios.config";
import { PhotoContext } from "../providers/RootProvider";
import SidebarNavigation from '../components/SidebarNavigation';
import loadingImage from '../assets/loading.png';
import WarningImage from "../assets/warning.png";
import React from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || '/api';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  profile_picture?: string;
  role: string;
}

interface PhotoCount {
  total: number;
  locked: number;
  unlocked: number;
  maxCount: number;
}

interface Photo {
  photo_id: string;
  _id: string;
  created_at: string;
  is_locked: boolean;
  s3_key: string;
}

const AlbumUploadPage = () => {
  const navigate = useNavigate();
  const [selectedImgUrl, setSelectedImgUrl] = useState<string>("");
  const { verificationResult, setVerificationResult } = useContext(PhotoContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 모달 상태
  const [showAllLockedModal, setShowAllLockedModal] = useState(false);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [oldestPhotoId, setOldestPhotoId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'select' | 'upload' | null>(null);
  const [hasCheckedOnEntry, setHasCheckedOnEntry] = useState(false);
  
  const [photoCount, setPhotoCount] = useState<PhotoCount>({
    total: 0,
    locked: 0,
    unlocked: 0,
    maxCount: 10
  });

  useEffect(() => {
    const storedImage = sessionStorage.getItem("uploadedImage");
    if (storedImage) {
      setSelectedImgUrl(storedImage);
    } else {
      const queryParams = new URLSearchParams(window.location.search);
      const imgFromUrl = queryParams.get("image");
      if (imgFromUrl) {
        setSelectedImgUrl(imgFromUrl);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      checkPhotoCount();
    }
  }, [userProfile]);

  // 페이지 진입 시 사진 개수 체크
  useEffect(() => {
    if (photoCount.total > 0 && !hasCheckedOnEntry) {
      checkOnPageEntry();
      setHasCheckedOnEntry(true);
    }
  }, [photoCount, hasCheckedOnEntry]);

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

  const checkPhotoCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos?include=count`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Photo count:', data.count);
        
        if (data.count) {
          setPhotoCount(data.count);
        }
      }
    } catch (error) {
      console.error('사진 개수 확인 오류:', error);
    }
  };

  const checkOnPageEntry = async () => {
    console.log('🔍 페이지 진입 시 체크');
    console.log('📊 photoCount:', photoCount);
    console.log('📊 photoCount.total:', photoCount.total);
    console.log('📊 photoCount.locked:', photoCount.locked);
    console.log('📊 photoCount.unlocked:', photoCount.unlocked);
    console.log('📊 photoCount.maxCount:', photoCount.maxCount);

    if (photoCount.total >= photoCount.maxCount) {
      console.log('⚠️ 10장 도달');
      console.log('🔍 잠금 체크: photoCount.locked === photoCount.maxCount?', photoCount.locked === photoCount.maxCount);
      console.log('🔍 unlocked 개수:', photoCount.unlocked);
      
      if (photoCount.locked === photoCount.maxCount) {
        console.log('🔒 모두 잠금 - all-locked 모달 표시');
        setShowAllLockedModal(true);
      } else {
        console.log('🔓 일부 잠금 해제 - auto-delete 모달 표시');
        const oldestId = await getOldestUnlockedPhoto();
        console.log('🎯 가장 오래된 사진 ID:', oldestId);
        
        if (oldestId) {
          setOldestPhotoId(oldestId);
          setShowAutoDeleteModal(true);
          console.log('✅ auto-delete 모달 표시됨');
        } else {
          console.log('❌ 잠금 해제된 사진 없음');
          setShowAllLockedModal(true);
        }
      }
    }
  };

  const getOldestUnlockedPhoto = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📷 API 응답 전체:', data);
        console.log('📷 data의 타입:', typeof data);
        console.log('📷 data.photos 존재?', 'photos' in data);
        console.log('📷 Array.isArray(data)?', Array.isArray(data));
        console.log('📷 Array.isArray(data.photos)?', data.photos ? Array.isArray(data.photos) : 'photos 없음');
        
        // API 응답이 { photos: [...] } 형태일 수도 있고, 바로 배열일 수도 있음
        let photos: Photo[];
        if (Array.isArray(data)) {
          photos = data;
        } else if (data.photos && Array.isArray(data.photos)) {
          photos = data.photos;
        } else {
          console.error('❌ photos 배열을 찾을 수 없음:', data);
          return null;
        }
        
        console.log('📷 사진 배열:', photos);
        console.log('📷 사진 개수:', photos.length);
        
        const unlockedPhotos = photos.filter(photo => !photo.is_locked);
        console.log('🔓 잠금 해제된 사진:', unlockedPhotos);
        console.log('🔓 잠금 해제된 사진 개수:', unlockedPhotos.length);
        
        if (unlockedPhotos.length > 0) {
          const sorted = unlockedPhotos.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          console.log('📅 정렬된 사진:', sorted);
          const oldest = sorted[0];
          console.log('🎯 가장 오래된 사진:', oldest);
          return oldest.photo_id || oldest._id;
        }
      }
    } catch (error) {
      console.error('사진 목록 조회 오류:', error);
    }
    return null;
  };

  const deletePhoto = async (photoId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/passport-photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ 사진 삭제 성공:', photoId);
        return true;
      }
    } catch (error) {
      console.error('사진 삭제 오류:', error);
    }
    return false;
  };

  const handleAutoDelete = async () => {
    if (!oldestPhotoId) return;

    const success = await deletePhoto(oldestPhotoId);
    if (success) {
      await checkPhotoCount();
      setShowAutoDeleteModal(false);
      setOldestPhotoId(null);
      
      // 대기 중인 액션 실행
      if (pendingAction === 'select') {
        executeFileSelect();
      } else if (pendingAction === 'upload') {
        executeUpload();
      }
      setPendingAction(null);
    } else {
      alert('사진 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const executeFileSelect = () => {
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

  const executeUpload = async () => {
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
    executeFileSelect();
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

  const handleUploadClick = () => {
    setPendingAction('upload');
    executeUpload();
  };

  const handleGoToGallery = () => {
    navigate('/gallery');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="mb-6">
            <img 
              src={loadingImage} 
              alt="로딩 중"
              className="w-64 h-64 mx-auto object-contain animate-pulse"
            />
          </div>
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <SidebarNavigation 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userName={userProfile.username}
        userImage={userProfile.profile_picture || ''}
        onLogout={handleLogout}
      />

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

      {/* 모두 잠금 모달 - z-index 최상단 */}
      {showAllLockedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img 
                  src={WarningImage} 
                  alt="warning" 
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                갤러리가 가득 찼어요
              </h3>
              <p className="text-gray-600 mb-2">
                현재 <span className="font-bold text-indigo-600">{photoCount.total}장</span>의 사진이 모두 잠금되어 있습니다.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                새 사진을 업로드하려면 갤러리에서<br />
                잠금을 해제하고 사진을 삭제해주세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGoToGallery}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  갤러리로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 자동 삭제 모달 - z-index 최상단 */}
      {showAutoDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img 
                  src={WarningImage} 
                  alt="warning" 
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                갤러리가 가득 찼어요
              </h3>
              <p className="text-gray-600 mb-2">
                현재 <span className="font-bold text-indigo-600">{photoCount.total}장</span>의 사진이 저장되어 있습니다.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                가장 오래된 사진 한 장을<br />
                자동으로 삭제할까요?
                {photoCount.locked > 0 && (
                  <>
                    <br />
                    <span className="text-gray-400 text-xs">
                      ({photoCount.locked}장은 잠금되어 있습니다)
                    </span>
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGoToGallery}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  아니오
                </button>
                <button
                  onClick={handleAutoDelete}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  네
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="mb-6 relative">
          {selectedImgUrl ? (
            <img 
              src={selectedImgUrl}
              alt="Selected"
              className="w-80 h-[540px] bg-gray-100 rounded-3xl shadow-2xl object-cover border-2 border-gray-200"
            />
          ) : (
            <button
              onClick={handleFileSelect}
              className="w-80 h-[540px] bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl flex items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-white cursor-pointer transition-all"
            >
              <div className="text-center text-indigo-600">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-semibold mb-2">사진 선택하기</p>
                <p className="text-sm">클릭하여 앨범에서 선택</p>
              </div>
            </button>
          )}
        </div>

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