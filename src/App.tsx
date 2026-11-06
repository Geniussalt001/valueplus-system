import {
  lazy,
  Suspense,
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
  LoginPage,
} from "./pages/LoginPage";

import {
  SplashPage,
} from "./pages/SplashPage";

import { WorkspaceSkeleton } from "./components/common/WorkspaceSkeleton";

import {
  startAppsScriptOutboxSync,
} from "./services/appsScriptClient";

import type {
  AppRoute,
  WorkspaceScope,
  WorkRoute,
} from "./types/app";
import type {
  PickingQuantityTransfer,
} from "./types/workflowTransfer.types";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);

const PostingCenterPage = lazy(() =>
  import("./pages/modules/PostingCenterPage").then((module) => ({
    default: module.PostingCenterPage,
  })),
);

const SplitRenamePoPage = lazy(() =>
  import("./pages/modules/SplitRenamePoPage").then((module) => ({
    default: module.SplitRenamePoPage,
  })),
);

const DailySoPage = lazy(() =>
  import("./pages/modules/DailySoPage").then((module) => ({
    default: module.DailySoPage,
  })),
);

const SalesBillingPage = lazy(() =>
  import("./pages/modules/SalesBillingPage").then((module) => ({
    default: module.SalesBillingPage,
  })),
);

const DailyPickingPage = lazy(() =>
  import("./pages/modules/DailyPickingPage").then((module) => ({
    default: module.DailyPickingPage,
  })),
);

const DailySummaryPage = lazy(() =>
  import("./pages/modules/DailySummaryPage").then((module) => ({
    default: module.DailySummaryPage,
  })),
);

const ProductCatalogPage = lazy(() =>
  import("./pages/modules/product-catalog/ProductCatalogPage").then((module) => ({
    default: module.ProductCatalogPage,
  })),
);

const ReceivablesFreightPage = lazy(() =>
  import("./pages/modules/ReceivablesFreightPage").then((module) => ({
    default: module.ReceivablesFreightPage,
  })),
);

const WorldwideSalesPage = lazy(() =>
  import("./pages/modules/WorldwideSalesPage").then((module) => ({
    default: module.WorldwideSalesPage,
  })),
);

const PoDataPage = lazy(() =>
  import("./pages/modules/po-data/PoDataPage").then((module) => ({
    default: module.PoDataPage,
  })),
);

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

  const [nextProcessQuantityTransfers, setNextProcessQuantityTransfers] =
    useState<PickingQuantityTransfer[]>([]);

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
    setNextProcessQuantityTransfers([]);
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
    setRoute("dashboard");
  };

  const backToDashboard = () => {
    setRoute("dashboard");
  };

  const backToPostingCenter = () => {
    setRoute("daily-posting");
  };

  const continueToDailySo = (
    pdfPath: string,
    startIvNumber: string,
    quantityTransfers: PickingQuantityTransfer[],
  ) => {
    setNextProcessPdfPath(pdfPath);
    setNextProcessIvNumber(startIvNumber);
    setNextProcessQuantityTransfers(quantityTransfers);
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

  const consumeSalesBillingInput = () => {
    setNextProcessPdfPath("");
    setNextProcessIvNumber("");
    setNextProcessQuantityTransfers([]);
  };

  const renderPage = () => {
    switch (route) {
      case "daily-posting":
        return (
          <PostingCenterPage
            onBack={backToDashboard}
            onNavigate={navigate}
          />
        );

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
            onBack={backToPostingCenter}
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
            initialQuantityTransfers={nextProcessQuantityTransfers}
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
            onBack={backToPostingCenter}
          />
        );

      case "worldwide-sales":
        return (
          <WorldwideSalesPage
            onBack={backToPostingCenter}
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
        <Suspense fallback={<WorkspaceSkeleton />}>
          {renderPage()}
        </Suspense>
      </AppLayout>
    </>
  );
}

export default App;
