"use client";

type ToastProps = {
  message: string;
  onDismiss: () => void;
};

export default function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-sm text-red-100 backdrop-blur-xl shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-red-300/30 px-2 py-0.5 text-xs text-red-100 hover:bg-red-500/20"
        >
          Close
        </button>
      </div>
    </div>
  );
}
