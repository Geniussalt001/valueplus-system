import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  CircleAlert,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  openPath,
} from "@tauri-apps/plugin-opener";

import {
  dailySoService,
} from "../../services/dailySoService";

import {
  devAccessService,
} from "../../services/devAccessService";

import {
  poProcessorService,
} from "../../services/poProcessorService";

interface DevTemplateCenterProps {
  open: boolean;
  onClose: () => void;
}

interface DevTemplateItem {
  id: "daily-picking" | "daily-so";
  title: string;
  fileName: string;
  path: string;
}

export function DevTemplateCenter({
  open,
  onClose,
}: DevTemplateCenterProps) {
  const [userName, setUserName] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [authenticated, setAuthenticated] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [openingId, setOpeningId] =
    useState<DevTemplateItem["id"] | null>(null);
  const [templates, setTemplates] =
    useState<DevTemplateItem[]>([]);
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      return;
    }

    setUserName("");
    setPassword("");
    setAuthenticated(false);
    setLoading(false);
    setOpeningId(null);
    setTemplates([]);
    setError("");
  }, [open]);

  if (!open) {
    return null;
  }

  const authenticate = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    setLoading(true);

    try {
      const verification =
        await devAccessService.verify(
          userName,
          password,
        );

      if (!verification.success) {
        setPassword("");
        setError(verification.message);
        return;
      }

      const [pickingPaths, soPaths] =
        await Promise.all([
          poProcessorService.getDailyPickingPaths(),
          dailySoService.getPaths(),
        ]);

      setTemplates([
        {
          id: "daily-picking",
          title: "Template ออกใบจัดรายวัน",
          fileName:
            "Templete ใบจัดสินค้า-Seven Eleven (ภายใน).xlsx",
          path: pickingPaths.templatePath,
        },
        {
          id: "daily-so",
          title: "Template ลงยอด SO รายวัน",
          fileName: "Data-SO.Import.xlsx",
          path: soPaths.templatePath,
        },
      ]);
      setAuthenticated(true);
      setPassword("");
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  const openTemplate = async (
    template: DevTemplateItem,
  ) => {
    setError("");
    setOpeningId(template.id);

    try {
      await openPath(template.path);
    } catch (reason) {
      setError(
        `เปิด ${template.fileName} ไม่สำเร็จ: ${getErrorMessage(reason)}`,
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-template-title"
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <header className="flex items-start justify-between gap-4 border-b border-sky-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-5 sm:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-white text-sky-600 shadow-sm">
              <ShieldCheck size={22} />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.22em] text-sky-600">
                VALUEPLUS DEV TOOLS
              </p>
              <h2
                id="dev-template-title"
                className="mt-1 text-xl font-bold text-slate-900"
              >
                ศูนย์จัดการ Template
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                สำหรับตรวจสอบและแก้ไขไฟล์มาตรฐานของระบบ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
            aria-label="ปิดหน้าต่าง DEV"
          >
            <X size={19} />
          </button>
        </header>

        {!authenticated ? (
          <form
            onSubmit={(event) => {
              void authenticate(event);
            }}
            className="mx-auto max-w-lg px-6 py-8 sm:px-8 sm:py-10"
          >
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600">
              <KeyRound size={20} className="shrink-0 text-sky-600" />
              กรุณายืนยันสิทธิ์ DEV ก่อนเปิดไฟล์ Template
            </div>

            <label className="block">
              <span className="text-xs font-bold tracking-[0.12em] text-slate-600">
                USER
              </span>
              <input
                autoFocus
                type="text"
                value={userName}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  setUserName(event.target.value);
                  setError("");
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold uppercase text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="กรอก USER"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-xs font-bold tracking-[0.12em] text-slate-600">
                PASSWORD
              </span>
              <input
                type="password"
                inputMode="numeric"
                value={password}
                disabled={loading}
                autoComplete="off"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold tracking-[0.2em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="กรอก PASSWORD"
              />
            </label>

            {error ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <CircleAlert size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !userName.trim() || !password}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 font-bold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <KeyRound size={19} />
              )}
              เข้าสู่ DEV TOOLS
            </button>
          </form>
        ) : (
          <div className="px-6 py-7 sm:px-8">
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="flex min-h-56 flex-col rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-5 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-sm">
                    <FileSpreadsheet size={22} />
                  </span>

                  <h3 className="mt-4 font-bold text-slate-900">
                    {template.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-sky-700">
                    {template.fileName}
                  </p>
                  <p
                    className="mt-3 break-all text-[11px] leading-5 text-slate-500"
                    title={template.path}
                  >
                    {template.path}
                  </p>

                  <button
                    type="button"
                    disabled={openingId !== null}
                    onClick={() => {
                      void openTemplate(template);
                    }}
                    className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white font-bold text-sky-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-50"
                  >
                    {openingId === template.id ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <ExternalLink size={18} />
                    )}
                    เปิดไฟล์ Template
                  </button>
                </article>
              ))}
            </div>

            {error ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <CircleAlert size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              เมื่อเปิดไฟล์แล้ว สามารถแก้ไขและกดบันทึกใน Excel ได้ตามปกติ
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function getErrorMessage(
  reason: unknown,
): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  return String(reason);
}
