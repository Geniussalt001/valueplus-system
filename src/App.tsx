import {
  useEffect,
  useState,
} from "react";

import type {
  AppUser,
} from "./auth/auth.types";

import {
  AppLayout,
} from "./layouts/AppLayout";

import {
  DashboardPage,
} from "./pages/DashboardPage";

import {
  LoginPage,
} from "./pages/LoginPage";

import {
  SplashPage,
} from "./pages/SplashPage";

import {
  DailyPickingPage,
} from "./pages/modules/DailyPickingPage";

import {
  DailySoPage,
} from "./pages/modules/DailySoPage";

import {
  DailySummaryPage,
} from "./pages/modules/DailySummaryPage";

import {
  PoDataPage,
} from "./pages/modules/po-data/PoDataPage";

import {
  SplitRenamePoPage,
} from "./pages/modules/SplitRenamePoPage";

import type {
  AppRoute,
  WorkRoute,
} from "./types/app";

const systemUser: AppUser = {
  userCode: "VALUEPLUS",
  displayName: "ValuePlus System",
  role: "admin",
};

function App() {
  const [
    route,
    setRoute,
  ] = useState<AppRoute>(
    "login",
  );

  useEffect(() => {
    if (route !== "splash") {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setRoute(
          "dashboard",
        );
      }, 2200);

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [route]);

  const handleLogin = () => {
    setRoute(
      "splash",
    );
  };

  const handleLogout = () => {
    setRoute(
      "login",
    );
  };

  if (route === "login") {
    return (
      <LoginPage
        onLogin={
          handleLogin
        }
      />
    );
  }

  if (route === "splash") {
    return <SplashPage />;
  }

  const navigate = (
    nextRoute: WorkRoute,
  ) => {
    setRoute(
      nextRoute,
    );
  };

  const backToDashboard = () => {
    setRoute(
      "dashboard",
    );
  };

  const renderPage = () => {
    switch (route) {
      case "daily-picking":
        return (
          <DailyPickingPage
            onBack={
              backToDashboard
            }
          />
        );

      case "daily-so":
        return (
          <DailySoPage
            onBack={
              backToDashboard
            }
          />
        );

      case "split-rename-po":
        return (
          <SplitRenamePoPage
            onBack={
              backToDashboard
            }
          />
        );

      case "daily-summary":
        return (
          <DailySummaryPage
            onBack={
              backToDashboard
            }
          />
        );

      case "po-data":
        return (
          <PoDataPage
            currentUser={
              systemUser
            }
            onBack={
              backToDashboard
            }
          />
        );

      case "dashboard":
      default:
        return (
          <DashboardPage
            onNavigate={
              navigate
            }
          />
        );
    }
  };

  return (
    <AppLayout
      currentRoute={route}
      currentUser={
        systemUser
      }
      onNavigate={
        navigate
      }
      onLogout={
        handleLogout
      }
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;