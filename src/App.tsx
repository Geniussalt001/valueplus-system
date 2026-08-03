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

  useEffect(() => {
    return startAppsScriptOutboxSync();
  }, []);

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
    setWorkspaceScope(
      getInitialWorkspace(user),
    );
    setRoute("splash");
  };

  const handleLogout = () => {
    setNextProcessPdfPath("");
    setWorkspaceScope("retail");
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

  const changeWorkspace = (
    nextWorkspace: WorkspaceScope,
  ) => {
    setWorkspaceScope(nextWorkspace);
    setNextProcessPdfPath("");
    setRoute("dashboard");
  };

  const backToDashboard = () => {
    setRoute("dashboard");
  };

  const continueToDailySo = (pdfPath: string) => {
    setNextProcessPdfPath(pdfPath);
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
    setRoute("receivables-freight");
  };

  const consumeNextProcessPdf = () => {
    setNextProcessPdfPath("");
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

      case "daily-so":
        return (
          <DailySoPage
            onBack={backToDashboard}
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
            onInitialPdfConsumed={consumeNextProcessPdf}
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
            onBack={backToDashboard}
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
  );
}

export default App;
