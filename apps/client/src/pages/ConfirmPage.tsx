import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import CheckSymbol from "../assets/checkSymbol.svg?react";
import Toggle from "../assets/toggle.svg";
import { useContext, useState } from "react";
import { Button } from "@repo/ui/button";
import { PhotoContext } from "../providers/RootProvider";
import axiosInstance from "../axios.config";
import { Modal } from "@repo/ui/modal";

const ConfirmPage = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const navigate = useNavigate();
  const { verificationResult } = useContext(PhotoContext);
  const valid = verificationResult?.every((item) => item === 1) ? true : false;
  const queryParams = new URLSearchParams(window.location.search);
  const imgData = queryParams.get("image") ?? "";

  const handleToggleChecklist = () => {
    setIsOpen(!isOpen);
  };

  const handleRetakeClick = () => {
    navigate("/");
  };

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(",")[1]);
    const byteArray = new Uint8Array(byteString.length);
    const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];

    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([byteArray], { type: mimeString });
  };

  const handleCompleteClick = async () => {
    if (imgData) {
      setIsProcessing(true);
      const blob = base64ToBlob(imgData);

      const formData = new FormData();
      formData.append("image", blob);

      try {
        const res = await axiosInstance.post("/photo-edit", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "blob",
        });

        const imgUrl = URL.createObjectURL(res.data);
        navigate(`/result?image=${encodeURIComponent(imgUrl)}`);
      } catch (err: any) {
        console.error("사진 편집 실패:", err);
        alert("사진 편집에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const checklistArr: string[] = [
    "착용물이 없어요",
    "얼굴을 가리지 않았어요",
    "정면이에요",
    "무표정이에요",
    "빛이 충분해요",
  ];

  return (
    <Container>
      <Modal visible={isProcessing}>여권 사진을 만들고 있어요</Modal>
      <Photo src={imgData} />
      <Checklist id="Checklist" $open={isOpen ? "true" : "false"}>
        <ChecklistHeader onClick={handleToggleChecklist}>
          마지막으로 확인했어요 <ToggleImg src={Toggle} alt="toggle" />
        </ChecklistHeader>
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
      <ButtonContainer>
        <Button className={"second"} clickButton={handleRetakeClick}>
          다시 촬영 (선택)
        </Button>
        <Button
          className={valid ? "primary" : "inactive"}
          clickButton={valid ? () => handleCompleteClick() : () => {}}
        >
          여권 사진 완성
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default ConfirmPage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Photo = styled.img`
  width: 214px;
  height: 275px;
`;

const Checklist = styled.div<{ $open: string }>`
  width: 320px;
  height: 230px;
  border: 1px solid #0c1870;
  border-radius: 12px;
  background-color: #fff;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  transition:
    height 0.3s ease,
    bottom 0.3s ease;
  height: ${({ $open }) => ($open === "true" ? "300px" : "40px")};
  position: relative;
  bottom: ${({ $open }) => ($open === "true" ? "0px" : "-260px")};
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
  display: flex;
  width: 300px;
  justify-content: space-between;
`;

const ToggleImg = styled.img``;

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

const ButtonContainer = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 600px;
  width: 86vw;
`;
