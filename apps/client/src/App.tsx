import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootProvider } from "./providers/RootProvider";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import NewLandingPage from "./pages/NewLandingPage"
import NewGuidePage from "./pages/NewGuidePage"
import WebcamPage from "./pages/WebcamPage";
import UserGalleryPage from "./pages/UserGalleryPage"
import AuthCallback from "./pages/AuthCallback";
import { styled, ThemeProvider } from "styled-components";
import ConfirmPage from "./pages/ConfirmPage";
import theme from "./style/theme";
import ResultPage from "./pages/ResultPage";
import AlbumUploadPage from "./pages/AlbumUploadPage";

const routes = [
  {
    path: "/",
    element: <NewLandingPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />
  },
  {
    path: "/album",
    element: <AlbumUploadPage />,
  },
  {
    path: "/guide",
    element: <NewGuidePage />,
  },
  {
    path: "/gallery",
    element: <UserGalleryPage />,
  },
  {
    path: "/webcam",
    element: <WebcamPage />,
  },
  {
    path: "/confirm",
    element: <ConfirmPage />,
  },
  {
    path: "/result",
    element: <ResultPage />,
  },
  {
    path: "/*",
    element: <LandingPage />,
  },
];

const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

function App() {
  return (
    <RootProvider>
      <ThemeProvider theme={theme}>
        <Wrapper>
          <PageWrapper>
            <RouterProvider router={router} />
          </PageWrapper>
        </Wrapper>
      </ThemeProvider>
    </RootProvider>
  );
}

export default App;

const Wrapper = styled.div`
  padding: "0 27.5px";
  width: "100%";
  height: "100%";
  box-sizing: "border-box";
  display: "flex";
  flex-direction: "column";
  align-items: "center";
`;

const PageWrapper = styled.div`
  width: "100%";
  max-width: "$bp2";
  position: "relative";
`;