import styled from "styled-components";
import { useEffect, useState, useRef, useContext } from "react";
import GuideLine from "../assets/guideLine.svg";
import CheckSymbol from "../assets/checkSymbol.svg?react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/button";
import { Modal } from "@repo/ui/modal";
import { PhotoContext } from "../providers/RootProvider";

const WebcamPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const { verificationResult, setVerificationResult } =
    useContext(PhotoContext);
  const [countdown, setCountdown] = useState<number>(3);

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

    const captureInterval = setInterval(captureAndSendFrame, 1000);

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
    <Container>
      <>{isLoading ? "loading..." : ""}</>
      <Modal visible={isValid}>
        <>
          움직이지 말아주세요. 움직이면 재촬영이 필요합니다.
          <br /> <br /> {countdown > 0 ? countdown : <br />}
        </>
      </Modal>
      <CameraContainer id="CameraContainer">
        <Canvas ref={canvasRef} id="Canvas" />
        <Line src={GuideLine} alt="guide line" />
        <VideoContainer id="VideoContainer">
          <Video
            ref={videoRef}
            onLoadedMetadata={handleMetadataLoad}
            autoPlay
            loop
            muted
            playsInline
            id="Video"
          />
        </VideoContainer>
      </CameraContainer>
      <Checklist id="Checklist">
        <ChecklistHeader>모든 규정을 지키면 촬영할 수 있어요</ChecklistHeader>
        {verificationResult
          ? verificationResult.map((item, idx) => (
              <ChecklistContents key={idx} active={item}>
                <Check active={item} />
                {checklistArr[idx]}
              </ChecklistContents>
            ))
          : [0, 0, 0, 0, 0].map((item, idx) => (
              <ChecklistContents key={idx} active={item}>
                <Check active={item} />
                {checklistArr[idx]}
              </ChecklistContents>
            ))}
      </Checklist>
      <Button
        className={isValid ? "primary" : "inactive"}
        clickButton={isValid ? () => handleCaptureClick() : () => {}}
      >
        촬영
      </Button>
    </Container>
  );
};

export default WebcamPage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const CameraContainer = styled.div`
  width: 320px;
  height: 414px;
  top: 40px;
`;

const Canvas = styled.canvas`
  top: 40px;
  width: 320px;
  height: 414px;
`;

const Line = styled.img`
  position: relative;
  top: -414px;
  z-index: 1;
`;

const VideoContainer = styled.div`
  width: 320px;
  height: 414px;
  position: absolute;
  top: 32px;
`;

const Video = styled.video`
  transform: scaleX(-1);
  object-fit: cover;
  width: 320px;
  height: 414px;
`;

const Checklist = styled.div`
  width: 320px;
  height: 230px;
  border: 1px solid #0c1870;
  border-radius: 12px;
  background-color: #fff;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: scroll;
  margin-bottom: 40px;
`;

const ChecklistHeader = styled.div`
  font-weight: 600;
  font-size: 16px;
  line-height: 38px;
  letter-spacing: 1.2%;
  position: sticky;
  top: 0px;
  margin-left: 10px;
  background-color: #ffffff;
`;

const ChecklistContents = styled.div<{ active?: number }>`
  font-weight: 600;
  font-size: 16px;
  line-height: 32px;
  letter-spacing: 1.2%;
  margin: 10px 20px;
  display: flex;
  flex-direction: row;
  color: ${({ active, theme }) => (active ? theme.colors.blue : "gray")};
`;

const Check = styled(CheckSymbol)<{ active?: number }>`
  margin-right: 10px;
  path {
    stroke: ${({ active, theme }) => (active ? theme.colors.blue : "gray")};
  }
`;
