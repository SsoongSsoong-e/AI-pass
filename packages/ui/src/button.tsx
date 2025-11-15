"use client";

import styled, { css } from "styled-components";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  clickButton?: () => void;
  disabled?: boolean;
}

export const Button = ({ children, className, clickButton, disabled }: ButtonProps) => {
  return (
    <StyledButton className={className} onClick={clickButton} disabled={disabled}>
      {children}
    </StyledButton>
  );
};

const StyledButton = styled.button<{ className?: string; disabled?: boolean }>`
  margin: 8px;
  border-radius: 12px;
  padding: 18px 16px;
  font-size: 18px;
  line-height: 32px;
  font-weight: 500;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};

  ${({ className, theme }) => {
    switch (className) {
      case "primary":
        return css`
          border: 1px solid ${theme.colors.blue};
          background-color: ${theme.colors.blue};
          color: white;
        `;
      case "second":
        return css`
          border: 1px solid ${theme.colors.blue};
          background-color: white;
          color: ${theme.colors.blue};
        `;
      case "inactive":
        return css`
          border: 1px solid ${theme.colors.gray};
          background-color: ${theme.colors.gray};
          color: white;
        `;
    }
  }}
`;
