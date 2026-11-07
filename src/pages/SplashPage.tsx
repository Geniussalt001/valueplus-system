import { BrandLogo } from "../components/BrandLogo";
import "./LoginPage.css";

export function SplashPage() {
  return (
    <main className="doom-login doom-splash" aria-label="กำลังเข้าสู่ระบบ ValuePlus">
      <div className="doom-login-ambient" aria-hidden="true" />
      <section className="doom-login-wrap">
        <div className="doom-login-card doom-splash-card" role="status" aria-live="polite">
          <p className="doom-splash-eyebrow">WELCOME TO</p>
          <BrandLogo size="large" className="doom-login-logo doom-splash-logo" />
          <h1 className="doom-splash-title">VALUEPLUS SYSTEM</h1>
          <div className="doom-splash-dots" aria-hidden="true">
            <span /><span /><span />
          </div>
          <p className="doom-splash-caption">กำลังเตรียมพื้นที่ทำงานของคุณ</p>
          <p className="doom-splash-code">INITIALIZING WORKSPACE</p>
        </div>
      </section>
    </main>
  );
}
