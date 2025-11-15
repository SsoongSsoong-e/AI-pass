import { Button } from "@repo/ui/button";
import { useNavigate } from "react-router-dom";
import { styled } from "styled-components";
import { useState } from "react";
import axiosInstance from "../axios.config";

const ResultPage = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const imgData = queryParams.get("image") ?? "";
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => {
    navigate("/");
  };

  const handleDownload = async () => {
    if (!imgData) return;

    setIsSaving(true);

    try {
      // Blob URL을 Blob으로 변환
      const response = await fetch(imgData);
      const blob = await response.blob();

      // FormData 생성
      const formData = new FormData();
      formData.append("image", blob, "passport_photo.png");

      // 서버에 저장
      const saveResponse = await axiosInstance.post("/photo-edit/save", formData, {
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

      alert("사진이 저장되었습니다!");
      navigate("/");
    } catch (error: any) {
      console.error("사진 저장 실패:", error);
      alert("사진 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Photo src={imgData} />
      <ButtonContainer>
        <Button className={"second"} clickButton={handleBack}>
          버리고 다시 촬영
        </Button>
        <Button 
          className={"primary"} 
          clickButton={handleDownload}
          disabled={isSaving}
        >
          {isSaving ? "저장 중..." : "여권 사진 저장"}
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default ResultPage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Photo = styled.img`
  margin-top: 40px;
  width: 214px;
  height: 275px;
`;

const ButtonContainer = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 600px;
  width: 86vw;
`;
