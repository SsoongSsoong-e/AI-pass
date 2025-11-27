import { useEffect, useState, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GuideLine from "../assets/guideLine.svg";
import CheckSymbol from "../assets/checkSymbol.svg?react";
import WarningImage from "../assets/warning.png";
import { io } from "socket.io-client";
import { Button } from "@repo/ui/button";
import { Modal } from "@repo/ui/modal";
import { PhotoContext } from "../providers/RootProvider";
import SidebarNavigation from '../components/SidebarNavigation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

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

const WebcamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const { verificationResult, setVerificationResult } = useContext(PhotoContext);
  const [countdown, setCountdown] = useState<number>(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  
  // 모달 상태
  const [showAllLockedModal, setShowAllLockedModal] = useState(false);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [oldestPhotoId, setOldestPhotoId] = useState<string | null>(null);
  const [hasCheckedOnEntry, setHasCheckedOnEntry] = useState(false);
  
  const [photoCount, setPhotoCount] = useState<PhotoCount>({
    total: 0,
    locked: 0,
    unlocked: 0,
    maxCount: 10
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      checkPhotoCount();
    }
  }, [userProfile]);

  // 페이지 진입 시 사진 개수 체크 - 한 번만 실행
  useEffect(() => {
    if (photoCount.total > 0 && !hasCheckedOnEntry) {
      console.log('🎯 페이지 진입 시 한 번만 체크 실행');
      checkOnPageEntry();
      setHasCheckedOnEntry(true);
    }
  }, [photoCount.total]);

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
      setIsProfileLoading(false);
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

    if (photoCount.total >= photoCount.maxCount) {
      console.log('⚠️ 10장 도달');
      
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
        
        let photos: Photo[];
        if (Array.isArray(data)) {
          photos = data;
        } else if (data.photos && Array.isArray(data.photos)) {
          photos = data.photos;
        } else {
          console.error('❌ photos 배열을 찾을 수 없음:', data);
          return null;
        }
        
        const unlockedPhotos = photos.filter(photo => !photo.is_locked);
        
        if (unlockedPhotos.length > 0) {
          const sorted = unlockedPhotos.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const oldest = sorted[0];
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

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 414;

      const context = canvas.getContext("2d");
      if (!context) return;

      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const videoAspectRatio = videoWidth / videoHeight;
      const canvasAspectRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (videoAspectRatio > canvasAspectRatio) {
        drawHeight = canvas.height;
        drawWidth = canvas.height * videoAspectRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = canvas.width / videoAspectRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(
        videoRef.current,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
      context.setTransform(1, 0, 0, 1, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg");
      return dataURL;
    }
  };

  const handleCaptureClick = () => {
    const capturedImageData = captureImage();
    if (capturedImageData) {
      sessionStorage.setItem("capturedImage", capturedImageData);
      navigate("/confirm");
    }
  };

  const handleAutoDelete = async () => {
    if (!oldestPhotoId) return;

    const success = await deletePhoto(oldestPhotoId);
    if (success) {
      await checkPhotoCount();
      setShowAutoDeleteModal(false);
      setOldestPhotoId(null);
      
      // 촬영 진행
      const capturedImageData = captureImage();
      if (capturedImageData) {
        sessionStorage.setItem("capturedImage", capturedImageData);
        navigate("/confirm");
      }
    } else {
      alert('사진 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const captureAndSendFrame = () => {
    if (canvasRef.current && videoRef.current && videoRef.current.readyState === 4) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const imageData = canvasRef.current.toDataURL("image/jpeg");
      if (socketRef.current) {
        socketRef.current.emit("stream", { image: imageData });
      }
    }
  };

  const handleMetadataLoad = () => {
    console.log('📹 Video metadata loaded');
    setIsLoading(false);
  };

  const handleGoToGallery = () => {
    navigate('/gallery');
  };

  // 웹캠 초기화 useEffect
  useEffect(() => {
    console.log('🎬 카메라 초기화 시작 - location.key:', location.key);
    
    if (verificationResult) {
      setVerificationResult(null);
    }

    // Socket 초기화
    socketRef.current = io(`${API_BASE_URL}/socket`);
    socketRef.current.on(
      "stream",
      (data: { tempVerificationResult: number[] | null }) => {
        setVerificationResult(data.tempVerificationResult);
      }
    );

    // 웹캠 설정
    const setupWebcam = async () => {
      try {
        console.log('📹 웹캠 설정 시작');
        
        // 기존 스트림 정리
        if (streamRef.current) {
          console.log('🧹 기존 스트림 정리');
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // 새 스트림 획득
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { exact: 414 },
            height: { exact: 320 },
          },
        });

        console.log('✅ 스트림 획득 성공');
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('🎥 srcObject 설정 완료');
        }
      } catch (err) {
        console.error("❌ 웹캠 설정 오류:", err);
        setIsLoading(false);
      }
    };
    
    setupWebcam();

    // 프레임 캡처 interval
    const captureInterval = setInterval(captureAndSendFrame, 500);

    // Cleanup
    return () => {
      console.log('🔴 Cleanup 실행됨');
      clearInterval(captureInterval);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [location.key]);

  useEffect(() => {
    if (verificationResult?.every((item) => item === 1)) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [verificationResult]);

  useEffect(() => {
    // 10장 미만이고, 모달이 떠있지 않을 때만 자동 촬영
    if (isValid && photoCount.total < photoCount.maxCount && !showAllLockedModal && !showAutoDeleteModal) {
      const countdownIntervalId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      const timeoutId = setTimeout(() => {
        clearInterval(countdownIntervalId);
        handleCaptureClick();
      }, 4000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(countdownIntervalId);
      };
    }
    return () => {
      setCountdown(3);
    };
  }, [isValid, photoCount.total, showAllLockedModal, showAutoDeleteModal]);

  const checklistArr: string[] = [
    "착용물이 없어요",
    "얼굴을 가리지 않았어요",
    "정면이에요",
    "무표정이에요",
    "빛이 충분해요",
  ];

  if (isProfileLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <div className="text-center">
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

      {isLoading && <div className="text-gray-600 mb-4">loading...</div>}
      
      {/* 카운트다운 모달 */}
      <Modal visible={isValid && photoCount.total < photoCount.maxCount && !showAllLockedModal && !showAutoDeleteModal}>
        <div className="text-center">
          움직이지 말아주세요. 움직이면 재촬영이 필요합니다.
          <br />
          <br />
          {countdown > 0 ? <span className="text-2xl font-bold">{countdown}</span> : <br />}
        </div>
      </Modal>

      {/* 모두 잠금 모달 */}
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
                새 사진을 촬영하려면 갤러리에서<br />
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

      {/* 자동 삭제 모달 */}
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

      <div className="relative w-80 h-[414px] mb-6">
        <canvas 
          ref={canvasRef} 
          width={320}
          height={414}
          className="absolute top-0 left-0 w-80 h-[414px] hidden"
        />
        
        <img 
          src={GuideLine} 
          alt="guide line"
          className="absolute top-0 left-0 w-80 h-[414px] z-10 pointer-events-none"
        />
        
        <div className="absolute top-0 left-0 w-80 h-[414px]">
          <video
            ref={videoRef}
            onLoadedMetadata={handleMetadataLoad}
            autoPlay
            playsInline
            muted
            className="w-80 h-[414px] object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      </div>

      <div className="w-80 h-[230px] border-2 border-indigo-700 rounded-xl bg-white z-20 flex flex-col overflow-y-auto mb-6 shadow-lg">
        <div className="sticky top-0 bg-white font-semibold text-base leading-[38px] px-3 border-b border-gray-200">
          모든 규정을 지키면 촬영할 수 있어요
        </div>
        
        {(verificationResult || [0, 0, 0, 0, 0]).map((item, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-3 px-5 py-2.5 font-semibold text-base ${
              item ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <CheckSymbol 
              className={`w-5 h-5 flex-shrink-0 ${
                item ? '[&_path]:stroke-indigo-600' : '[&_path]:stroke-gray-400'
              }`}
            />
            {checklistArr[idx]}
          </div>
        ))}
      </div>

      <Button
        className={isValid && !showAllLockedModal && !showAutoDeleteModal ? "primary" : "inactive"}
        clickButton={isValid && !showAllLockedModal && !showAutoDeleteModal ? handleCaptureClick : () => {}}
      >
        촬영
      </Button>
    </div>
  );
};

export default WebcamPage;