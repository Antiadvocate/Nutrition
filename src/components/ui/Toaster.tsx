import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { action?: ToastAction; duration?: number; tone?: 'default' | 'error' };
type ToastItem = { id: number; text: string } & ToastOptions;

let toastFn: ((msg: string, options?: ToastOptions) => void) | null = null;

export const toast = (msg: string, options?: ToastOptions) => {
  if (toastFn) toastFn(msg, options);
};

export function Toaster() {
  const [messages, setMessages] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastFn = (text, options) => {
      const id = Date.now() + Math.random();
      const duration = options?.duration ?? (options?.action ? 6000 : 3000);
      setMessages(prev => [...prev.slice(-2), { id, text, ...options }]);
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== id));
      }, duration);
    };
    return () => { toastFn = null; };
  }, []);

  const dismiss = (id: number) => setMessages(prev => prev.filter(m => m.id !== id));

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none">
      <AnimatePresence>
        {messages.map(m => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 max-w-full px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold backdrop-blur-md border ${
              m.tone === 'error'
                ? 'bg-rose-950/95 text-rose-50 border-rose-500/40'
                : 'bg-[#1c1c1f]/95 text-white border-white/10'
            }`}
          >
            <span className="flex-1 leading-snug break-words">{m.text}</span>
            {m.action && (
              <button
                onClick={() => { m.action!.onClick(); dismiss(m.id); }}
                className="flex-shrink-0 tracking-wide text-[10px] font-medium bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {m.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
