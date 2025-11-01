import { Button } from "@repo/ui/button";
import { styled } from "styled-components";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axios.config";
import { PhotoContext } from "../providers/RootProvider";

const AlbumUploadPage = () => {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const [selectedImgUrl, setSelectedImgUrl] = useState<string>(
    queryParams.get("image") ?? ""
  );
  const { verificationResult, setVerificationResult } =
    useContext(PhotoContext);

  const handleReuploadClick = () => {
    if (selectedImgUrl) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && file.type.startsWith("image/")) {
        }
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const imgUrl = reader.result as string;
            setSelectedImgUrl(imgUrl);

            navigate(`/album?image=${encodeURIComponent(imgUrl)}`);
          };
          reader.readAsDataURL(file);
        } else {
          setSelectedImgUrl("");
        }
      };
      input.click();
    } else {
      return;
    }
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
      navigate(`/confirm?image=${encodeURIComponent(selectedImgUrl)}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container>
      <SelectedPhoto src={selectedImgUrl}></SelectedPhoto>
      <ButtonContainer>
        <Button className="second" clickButton={handleReuploadClick}>
          다시 선택
        </Button>
        <Button className="primary" clickButton={handleUploadClick}>
          선택 완료
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default AlbumUploadPage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SelectedPhoto = styled.img`
  width: 320px;
  height: 540px;
  background-color: #f0f0f0;
  border: 0px solid;
  border-radius: 24px;
`;

const ButtonContainer = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 600px;
  width: 86vw;
`;
