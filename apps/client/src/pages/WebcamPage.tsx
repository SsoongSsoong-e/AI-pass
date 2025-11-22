import { useEffect, useState, useRef, useContext } from "react";
import GuideLine from "../assets/guideLine.svg";
import CheckSymbol from "../assets/checkSymbol.svg?react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/button";
import { Modal } from "@repo/ui/modal";
import { PhotoContext } from "../providers/RootProvider";
import SidebarNavigation from '../components/SidebarNavigation';

const TEMP_PROFILE = {
  imageUrl: '',
  userName: 'User Name'
};

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

  const handleLogout = () => {
    // 로그아웃 로직
    console.log('로그아웃');
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
    //@ts-ignore
    navigate(`/confirm?image=${encodeURIComponent(captureImage())}`);
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

    socketRef.current = io(`${import.meta.env.VITE_BASE_URL}/socket`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex flex-col items-center justify-center px-4 py-8 relative">
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
          className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
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