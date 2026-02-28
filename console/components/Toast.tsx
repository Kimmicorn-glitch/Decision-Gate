"use client";

type ToastProps = {
  message: string;
  variant?: "error" | "warning" | "info" | "success";
  onDismiss: () => void;
};

export default function Toast({ message, variant = "error", onDismiss }: ToastProps) {
  const styleMap: Record<NonNullable<ToastProps["variant"]>, string> = {
    error: "border-red-400/30 bg-red-500/10 text-red-100",
    warning: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    info: "border-blue-400/30 bg-blue-500/10 text-blue-100",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  };

  const buttonStyleMap: Record<NonNullable<ToastProps["variant"]>, string> = {
    error: "border-red-300/30 text-red-100 hover:bg-red-500/20",
    warning: "border-amber-300/30 text-amber-100 hover:bg-amber-500/20",
    info: "border-blue-300/30 text-blue-100 hover:bg-blue-500/20",
    success: "border-emerald-300/30 text-emerald-100 hover:bg-emerald-500/20"
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-[420px] rounded-xl border px-6 py-4 text-sm backdrop-blur-xl shadow-lg ${styleMap[variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className={`rounded-lg border px-2 py-0.5 text-xs ${buttonStyleMap[variant]}`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
