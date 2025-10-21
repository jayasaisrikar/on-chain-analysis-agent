import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  function show(message: string, type?: "success" | "error" | "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }
  return { toast, show };
}

export function Toast({ toast }: { toast: { message: string; type?: string } | null }) {
  if (!toast) return null;
  const color = toast.type === "error" ? "bg-red-600" : toast.type === "success" ? "bg-green-600" : "bg-slate-800";
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg text-white text-sm z-50 ${color} animate-fade-in`}>
      {toast.message}
    </div>
  );
}
