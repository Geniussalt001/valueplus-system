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
  AppToastViewport,
} from "./components/common/AppToastViewport";

import {
  StartupUpdateGate,
} from "./components/update/StartupUpdateGate";

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
  DailyPostingPage,
} from "./pages/modules/DailyPostingPage";

import type {
  DailyPostingChildRoute,
} from "./pages/modules/DailyPostingPage";

import {
  MonthlySalesPage,
} from "./pages/modules/MonthlySalesPage";

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

import {
  SalesBillingPage,
} from "./pages/modules/SalesBillingPage";

import {
  WorldwideRetailPage,
} from "./pages/modules/WorldwideRetailPage";

import {
  startAppsScriptOutboxSync,
} from "./services/appsScriptClient";

import type {
  AppRoute,
  WorkspaceScope,
  WorkRoute,
} from "./types/app";

function getInitialWorkspace(
  user: AppUser | null | undefined,
): WorkspaceScope {
  const userCode = String(
    user?.userCode || "",
  )
    .trim()
    .toUpperCase();

  return userCode === "HEADOFFICE"
    ? "head-office"
    : "retail";
}

function App() {
  const [startupCheckComplete, setStartupCheckComplete] =
    useState(false);

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

  const [
    workspaceScope,
    setWorkspaceScope,
  ] = useState<WorkspaceScope>(
    getInitialWorkspace(
      initialSession?.user,
    ),
  );

  const [nextProcessPdfPath, setNextProcessPdfPath] =
    useState("");

  const [nextProcessIvNumber, setNextProcessIvNumber] =
    useState("");

  const [
    dailyPostingReturnRoute,
    setDailyPostingReturnRoute,
  ] = useState<
    "dashboard" | "daily-posting"
  >("dashboard");

  const outboxSyncEnabled =
    startupCheckComplete &&
    Boolean(currentUser) &&
    route !== "login" &&
    route !== "splash";

  useEffect(() => {
    if (!outboxSyncEnabled) {
      return;
    }

    return startAppsScriptOutboxSync();
  }, [outboxSyncEnabled]);

  useEffect(() => {
    if (route !== "splash") {
      return;
    }

    const timer = window.setTimeout(() => {
      setRoute("dashboard");
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [route]);

  if (!startupCheckComplete) {
    return (
      <StartupUpdateGate
        onReady={() => {
          setStartupCheckComplete(true);
        }}
      />
    );
  }

  const handleLogin = (
    user: AppUser,
  ) => {
    setCurrentUser(user);
    setWorkspaceScope(
      getInitialWorkspace(user),
    );
    setRoute("splash");
  };

  const handleLogout = () => {
    setNextProcessPdfPath("");
    setNextProcessIvNumber("");
    setWorkspaceScope("retail");
    setDailyPostingReturnRoute(
      "dashboard",
    );
    setCurrentUser(null);
    setRoute("login");

    void authService.logout();
  };

  if (
    route === "login" ||
    !currentUser
  ) {
    return (
      <>
        <AppToastViewport />
        <LoginPage
          onLogin={handleLogin}
        />
      </>
    );
  }

  if (route === "splash") {
    return (
      <>
        <AppToastViewport />
        <SplashPage />
      </>
    );
  }

  const navigate = (nextRoute: WorkRoute) => {
    setRoute(nextRoute);
  };

  const changeWorkspace = (
    nextWorkspace: WorkspaceScope,
  ) => {
    setWorkspaceScope(nextWorkspace);
    setNextProcessPdfPath("");
    setNextProcessIvNumber("");
    setDailyPostingReturnRoute(
      "dashboard",
    );
    setRoute("dashboard");
  };

  const backToDashboard = () => {
    setRoute("dashboard");
  };

  const openDailyPostingModule = (
    nextRoute:
      DailyPostingChildRoute,
  ) => {
    setNextProcessPdfPath("");
    setNextProcessIvNumber("");
    setDailyPostingReturnRoute(
      "daily-posting",
    );
    setRoute(nextRoute);
  };

  const backFromDailyPostingModule =
    () => {
      setRoute(
        dailyPostingReturnRoute,
      );
    };

  const continueToDailySo = (
    pdfPath: string,
    startIvNumber: string,
  ) => {
    setNextProcessPdfPath(pdfPath);
    setNextProcessIvNumber(startIvNumber);
    setDailyPostingReturnRoute(
      "dashboard",
    );
    setRoute("daily-so");
  };

  const continueToSalesBilling = (pdfPath: string) => {
    setNextProcessPdfPath(pdfPath);
    setRoute("sales-billing");
  };

  const continueToSplitRename = (pdfPath: string) => {
    setNextProcessPdfPath(pdfPath);
    setRoute("split-rename-po");
  };

  const continueToDailySummary = () => {
    setNextProcessPdfPath("");
    setRoute("daily-summary");
  };

  const continueToReceivablesFreight = () => {
    setNextProcessPdfPath("");
    setDailyPostingReturnRoute(
      "dashboard",
    );
    setRoute("receivables-freight");
  };

  const consumeNextProcessPdf = () => {
    setNextProcessPdfPath("");
  };

  const consumeSalesBillingInput = () => {
    setNextProcessPdfPath("");
    setNextProcessIvNumber("");
  };

  const renderPage = () => {
    switch (route) {
      case "daily-picking":
        return (
          <SplitRenamePoPage
            onBack={backToDashboard}
            onNextProcess={continueToDailySo}
          />
        );

      case "daily-posting":
        return (
          <DailyPostingPage
            onBack={backToDashboard}
            onNavigate={
              openDailyPostingModule
            }
          />
        );

      case "daily-so":
        return (
          <DailySoPage
            onBack={
              backFromDailyPostingModule
            }
            initialPdfPath={nextProcessPdfPath}
            onInitialPdfConsumed={consumeNextProcessPdf}
            onNextProcess={continueToSalesBilling}
          />
        );

      case "sales-billing":
        return (
          <SalesBillingPage
            onBack={backToDashboard}
            initialPdfPath={nextProcessPdfPath}
            initialIvNumber={nextProcessIvNumber}
            onInitialPdfConsumed={consumeSalesBillingInput}
            onNextProcess={continueToSplitRename}
          />
        );

      case "split-rename-po":
        return (
          <DailyPickingPage
            onBack={backToDashboard}
            initialPdfPath={nextProcessPdfPath}
            onInitialPdfConsumed={consumeNextProcessPdf}
            onNextProcess={continueToDailySummary}
          />
        );

      case "daily-summary":
        return (
          <DailySummaryPage
            onBack={backToDashboard}
            onNextProcess={continueToReceivablesFreight}
          />
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
            onBack={
              backFromDailyPostingModule
            }
          />
        );

      case "monthly-sales":
        return (
          <MonthlySalesPage
            onBack={() => {
              setRoute(
                "daily-posting",
              );
            }}
          />
        );

      case "retail-worldwide-po":
        return (
          <WorldwideRetailPage
            currentUser={currentUser}
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
          <DashboardPage
            workspaceScope={workspaceScope}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <>
      <AppToastViewport />
      <AppLayout
        currentRoute={route}
        currentUser={currentUser}
        workspaceScope={workspaceScope}
        onWorkspaceChange={changeWorkspace}
        onNavigate={navigate}
        onLogout={handleLogout}
      >
        {renderPage()}
      </AppLayout>
    </>
  );
}

export default App;
