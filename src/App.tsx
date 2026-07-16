import { useEffect, useState } from "react";

import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SplashPage } from "./pages/SplashPage";
import { DailyPickingPage } from "./pages/modules/DailyPickingPage";
import { DailySoPage } from "./pages/modules/DailySoPage";
import { DailySummaryPage } from "./pages/modules/DailySummaryPage";
import { PoDataPage } from "./pages/modules/po-data/PoDataPage";
import { SplitRenamePoPage } from "./pages/modules/SplitRenamePoPage";
import type { AppRoute, WorkRoute } from "./types/app";

function App() {
  const [route, setRoute] = useState<AppRoute>("login");

  useEffect(() => {
    if (route !== "splash") return;

    const timer = window.setTimeout(() => {
      setRoute("dashboard");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [route]);

  if (route === "login") {
    return <LoginPage onLogin={() => setRoute("splash")} />;
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

  const renderPage = () => {
    switch (route) {
      case "daily-picking":
        return <DailyPickingPage onBack={backToDashboard} />;

      case "daily-so":
        return <DailySoPage onBack={backToDashboard} />;

      case "split-rename-po":
        return <SplitRenamePoPage onBack={backToDashboard} />;

      case "daily-summary":
        return <DailySummaryPage onBack={backToDashboard} />;

      case "po-data":
        return <PoDataPage onBack={backToDashboard} />;

      case "dashboard":
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <AppLayout
      currentRoute={route}
      onNavigate={navigate}
      onLogout={() => setRoute("login")}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;