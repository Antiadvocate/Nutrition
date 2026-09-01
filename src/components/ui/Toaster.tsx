import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

let toastFn: (msg: string) => void;

export const toast = (msg: string) => {
  if (toastFn) toastFn(msg);
};

export function Toaster() {
  const [messages, setMessages] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    toastFn = (text: string) => {
      const id = Date.now();
      setMessages(prev => [...prev, { id, text }]);
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== id));
      }, 3000);
    };
  }, []);

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {messages.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#2C2C2E] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium"
          >
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
