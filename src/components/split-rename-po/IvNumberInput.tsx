import {
  Hash,
} from "lucide-react";

interface IvNumberInputProps {
  value: string;
  disabled?: boolean;
  onChange: (
    value: string,
  ) => void;
}

export function IvNumberInput({
  value,
  disabled = false,
  onChange,
}: IvNumberInputProps) {
  return (
    <label
      className="
        vp-setup-card
        block
        rounded-2xl
        border
        border-cyan-300/15
        bg-[#061524]/80
        p-5
      "
    >
      <span
        className="
          flex
          items-center
          gap-2
          text-xs
          font-semibold
          tracking-[0.16em]
          text-cyan-300
        "
      >
        <Hash size={16} />

        IV NUMBER เริ่มต้น
      </span>

      <div
        className="
          mt-4
          flex
          h-12
          overflow-hidden
          rounded-xl
          border
          border-slate-700/70
          bg-[#020b16]
          focus-within:border-cyan-300/45
        "
      >
        <span
          className="
            flex
            items-center
            border-r
            border-cyan-300/15
            bg-cyan-300/[0.07]
            px-4
            font-semibold
            tracking-wider
            text-cyan-300
          "
        >
          VPR
        </span>

        <input
          type="text"
          value={value}
          disabled={disabled}
          inputMode="numeric"
          placeholder="6907394"
          onChange={(
            event,
          ) => {
            onChange(
              event.target
                .value,
            );
          }}
          className="
            min-w-0
            flex-1
            bg-transparent
            px-4
            text-white
            outline-none
            placeholder:text-slate-700
            disabled:cursor-wait
          "
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        ระบบจะเรียง IV
        ตามลำดับคลัง
        และเรียงเลข PO
        จากน้อยไปมาก
      </p>

      {value && (
        <p className="mt-2 text-xs text-cyan-200">
          IV เริ่มต้น:{" "}
          <span className="font-semibold">
            VPR{value}
          </span>
        </p>
      )}
    </label>
  );
}
