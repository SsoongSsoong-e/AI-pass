import React, {
  createContext,
  useState,
  Dispatch,
  SetStateAction,
  ReactNode,
} from "react";

interface RootContext {
  verificationResult: number[] | null;
  setVerificationResult: Dispatch<SetStateAction<number[] | null>>;
}

export const PhotoContext = createContext<RootContext>({
  verificationResult: [0, 0, 0, 0, 0],
  setVerificationResult: () => {},
});

interface RootProviderProps {
  children: ReactNode;
}

export const RootProvider: React.FC<RootProviderProps> = ({ children }) => {
  const [verificationResult, setVerificationResult] = useState<number[] | null>(
    null
  );

  return (
    <PhotoContext.Provider
      value={{
        verificationResult,
        setVerificationResult,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
};
