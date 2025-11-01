"use client";

import styled from "styled-components";

import { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  visible: boolean;
}

export const Modal = ({ children, visible }: ModalProps) => {
  return (
    <>
      <Overlay $visible={visible} />
      <StyledModal $visible={visible}>{children}</StyledModal>
    </>
  );
};

const Overlay = styled.div<{ $visible: boolean }>`
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 5;
`;

const StyledModal = styled.div<{ $visible: boolean }>`
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  font-size: 18px;
  line-height: 32px;
  font-weight: 600;
  background-color: #ffffff;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  align-content: center;
  height: 200px;
  width: 90%;
  z-index: 7;
  border-radius: 12px;
  border: 1px solid #0c1870;
`;
