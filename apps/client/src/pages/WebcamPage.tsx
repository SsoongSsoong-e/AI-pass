import { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import GuideLine from "../assets/guideLine.svg";
import CheckSymbol from "../assets/checkSymbol.svg?react";
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

const WebcamPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const { verificationResult, setVerificationResult } = useContext(PhotoContext);
  const [countdown, setCountdown] = useState<number>(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

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
      setIsProfileLoading(false);
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
      // sessionStorage에 저장
      sessionStorage.setItem("capturedImage", capturedImageData);
      navigate("/confirm");
    }
  };

  const captureAndSendFrame = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const imageData = canvasRef.current.toDataURL("image/jpeg");
      socketRef.current.emit("stream", { image: imageData });
    }
  };

  const handleMetadataLoad = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    if (verificationResult) {
      setVerificationResult(null);
    }

    socketRef.current = io(`${API_BASE_URL}/socket`);
    socketRef.current.on(
      "stream",
      (data: { tempVerificationResult: number[] | null }) => {
        setVerificationResult(data.tempVerificationResult);
      }
    );

    const setupWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { exact: 414 },
            height: { exact: 320 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("An error ocurred : ", err);
      }
    };
    setupWebcam();

    const captureInterval = setInterval(captureAndSendFrame, 500);

    return () => {
      clearInterval(captureInterval);

      if (videoRef.current && videoRef.current.srcObject) {
        // @ts-ignore
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (verificationResult?.every((item) => item === 1)) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [verificationResult]);

  useEffect(() => {
    if (isValid) {
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
  }, [isValid]);

  const checklistArr: string[] = [
    "착용물이 없어요",
    "얼굴을 가리지 않았어요",
    "정면이에요",
    "무표정이에요",
    "빛이 충분해요",
  ];

  // 프로필 로딩 중
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

  // 로그인 안됨
  if (!userProfile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
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

      {/* 로딩 표시 */}
      {isLoading && <div className="text-gray-600 mb-4">loading...</div>}
      
      {/* 카운트다운 모달 */}
      <Modal visible={isValid}>
        <div className="text-center">
          움직이지 말아주세요. 움직이면 재촬영이 필요합니다.
          <br />
          <br />
          {countdown > 0 ? <span className="text-2xl font-bold">{countdown}</span> : <br />}
        </div>
      </Modal>

      {/* 카메라 컨테이너 */}
      <div className="relative w-80 h-[414px] mb-6">
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-80 h-[414px]"
        />
        
        {/* 가이드라인 */}
        <img 
          src={GuideLine} 
          alt="guide line"
          className="absolute top-0 left-0 w-80 h-[414px] z-10 pointer-events-none"
        />
        
        {/* 비디오 */}
        <div className="absolute top-0 left-0 w-80 h-[414px]">
          <video
            ref={videoRef}
            onLoadedMetadata={handleMetadataLoad}
            autoPlay
            loop
            muted
            playsInline
            className="w-80 h-[414px] object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      </div>

      {/* 체크리스트 */}
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

      {/* 촬영 버튼 */}
      <Button
        className={isValid ? "primary" : "inactive"}
        clickButton={isValid ? () => handleCaptureClick() : () => {}}
      >
        촬영
      </Button>
    </div>
  );
};

export default WebcamPage;