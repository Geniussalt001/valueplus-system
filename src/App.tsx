import {
  useEffect,
  useState,
} from "react";

import type {
  AppUser,
} from "./auth/auth.types";

import {
  authService,
} from "./auth/authService";

import {
  getAuthSession,
} from "./auth/authSession";

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

import {
  ReceivablesFreightPage,
} from "./pages/modules/ReceivablesFreightPage";

import type {
  AppRoute,
  WorkRoute,
} from "./types/app";

function App() {
  const initialSession =
    getAuthSession();

  const [
    currentUser,
    setCurrentUser,
  ] = useState<AppUser | null>(
    initialSession?.user ?? null,
  );

  const [route, setRoute] =
    useState<AppRoute>(
      initialSession
        ? "dashboard"
        : "login",
    );

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

  const handleLogin = (
    user: AppUser,
  ) => {
    setCurrentUser(user);
    setRoute("splash");
  };

  const handleLogout = () => {
    setNextProcessPdfPath("");
    setCurrentUser(null);
    setRoute("login");

    void authService.logout();
  };

  if (
    route === "login" ||
    !currentUser
  ) {
    return (
      <LoginPage
        onLogin={handleLogin}
      />
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

  const continueToPdfSplitter = (pdfPath: string) => {
    setNextProcessPdfPath(pdfPath);
    setRoute("daily-picking");
  };

  const continueToDailySummary = () => {
    setNextProcessPdfPath("");
    setRoute("daily-summary");
  };

  const consumeNextProcessPdf = () => {
    setNextProcessPdfPath("");
  };

  const renderPage = () => {
    switch (route) {
      case "daily-picking":
        return (
          <DailyPickingPage
            onBack={backToDashboard}
            initialPdfPath={nextProcessPdfPath}
            onInitialPdfConsumed={consumeNextProcessPdf}
            onNextProcess={continueToDailySummary}
          />
        );

      case "daily-so":
        return (
          <DailySoPage
            onBack={backToDashboard}
            initialPdfPath={nextProcessPdfPath}
            onInitialPdfConsumed={consumeNextProcessPdf}
            onNextProcess={continueToPdfSplitter}
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

      case "receivables-freight":
        return (
          <ReceivablesFreightPage
            onBack={backToDashboard}
          />
        );

      case "po-data":
        return (
          <PoDataPage
            currentUser={currentUser}
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
      currentUser={currentUser}
      onNavigate={navigate}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
