"use client";
import { AnimatePresence, motion } from 'framer-motion';

interface Toast {
  id: string;
  message: string;
}

interface ToastNoticeProps {
  toast: Toast | null;
}

export function ToastNotice({ toast }: ToastNoticeProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary-500/30 to-accent-purple-500/30 backdrop-blur-md border border-white/15 shadow-lg text-base-100 text-body-sm"
            role="status"
            aria-live="assertive"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
