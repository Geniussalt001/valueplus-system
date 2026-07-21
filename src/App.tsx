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

import {
  ProductCatalogPage,
} from "./pages/modules/product-catalog/ProductCatalogPage";

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
  const [route, setRoute] =
    useState<AppRoute>("login");

  const [nextProcessPdfPath, setNextProcessPdfPath] =
    useState("");

  useEffect(() => {
    if (route !== "splash") {
      return;
    }

    const timer = window.setTimeout(() => {
      setRoute("dashboard");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [route]);

  const handleLogin = () => {
    setRoute("splash");
  };

  const handleLogout = () => {
    setNextProcessPdfPath("");
    setRoute("login");
  };

  if (route === "login") {
    return (
      <LoginPage onLogin={handleLogin} />
    );
  }

  if (route === "splash") {
    return <SplashPage />;
  }

  const navigate = (nextRoute: WorkRoute) => {
    setRoute(nextRoute);
  };

  const backToDashboard = () => {
    setRoute("dashboard");
  };

  const continueToDailySo = (pdfPath: string) => {
    setNextProcessPdfPath(pdfPath);
    setRoute("daily-so");
  };

  const consumeNextProcessPdf = () => {
    setNextProcessPdfPath("");
  };

  const renderPage = () => {
    switch (route) {
      case "daily-picking":
        return (
          <DailyPickingPage onBack={backToDashboard} />
        );

      case "daily-so":
        return (
          <DailySoPage
            onBack={backToDashboard}
            initialPdfPath={nextProcessPdfPath}
            onInitialPdfConsumed={consumeNextProcessPdf}
          />
        );

      case "split-rename-po":
        return (
          <SplitRenamePoPage
            onBack={backToDashboard}
            onNextProcess={continueToDailySo}
          />
        );

      case "daily-summary":
        return (
          <DailySummaryPage onBack={backToDashboard} />
        );

      case "product-catalog":
        return (
          <ProductCatalogPage
            onBack={
              backToDashboard
            }
          />
        );

      case "po-data":
        return (
          <PoDataPage
            currentUser={systemUser}
            onBack={backToDashboard}
          />
        );

      case "dashboard":
      default:
        return (
          <DashboardPage onNavigate={navigate} />
        );
    }
  };

  return (
    <AppLayout
      currentRoute={route}
      currentUser={systemUser}
      onNavigate={navigate}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
