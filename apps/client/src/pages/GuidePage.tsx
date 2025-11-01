import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@repo/ui/button";

const GuidePage = () => {
  const navigate = useNavigate();

  const handleWebcamStartClick = () => {
    navigate("/webcam");
  };
  return (
    <Container>
      <Information>
        <InformationHeader>시작 전 안내</InformationHeader>
        <InformationContents>
          핸드폰을 얼굴 가이드라인에 맞게 고정해주세요
        </InformationContents>
        <InformationContents>
          얼굴 윤곽을 가리지 않도록 아래 사항을 확인해주세요
          <br />- 머리카락, 스카프, 목도리 등
        </InformationContents>
        <InformationContents>
          아래 사항을 지켜야 촬영 버튼이 활성화 돼요
          <br />- 안경, 악세사리, 머리띠, 모자, 이어폰 등 미착용
          <br />- 정면, 무표정, 적절한 조명
        </InformationContents>
        <InformationContents>
          촬영 버튼이 활성화된 후 3초 뒤, 자동으로 촬영이 시작돼요
        </InformationContents>
      </Information>
      <Button className={"primary"} clickButton={handleWebcamStartClick}>
        촬영 시작
      </Button>
    </Container>
  );
};

export default GuidePage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;
const Information = styled.div`
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
  border: 1px solid #0c1870;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.8);
  height: 488px;
  margin-bottom: 116px;
`;
const InformationHeader = styled.div`
  font-size: 20px;
  line-height: 32px;
  font-weight: 700;
  margin-bottom: 8px;
`;
const InformationContents = styled.div`
  font-size: 18px;
  line-height: 32px;
  letter-spacing: 1.2%;
  padding-left: 20px;
  position: relative;
  margin-bottom: 5px;
  text-align: left;
  word-break: keep-all;

  &::before {
    content: "•";
    position: absolute;
    left: 5px;
  }
`;
