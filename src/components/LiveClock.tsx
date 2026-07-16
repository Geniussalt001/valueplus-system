import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const date = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: "Asia/Bangkok",
  }).format(now);

  const time = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(now);

  return (
    <div className="hidden text-right md:block">
      <p className="flex items-center justify-end gap-2 text-xs text-slate-400">
        <CalendarDays size={13} className="text-cyan-300" />
        {date}
      </p>

      <p className="mt-1 font-mono text-lg tracking-wider text-cyan-100">
        {time}
      </p>
    </div>
  );
}