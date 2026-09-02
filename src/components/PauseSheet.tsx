import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useStore, PAUSE_KINDS, PauseRecord } from '../store/StoreContext';

type Resolution = { outcome: 'ate' | 'passed'; kind: PauseRecord['kind']; looked: boolean };

let openFn: ((onResolve: (r: Resolution) => void) => void) | null = null;

/**
 * Opens the pause. Resolves 'ate' when the person carries on to log something,
 * 'passed' when the urge released on its own. Callers that just want the beat
 * without logging can ignore the outcome.
 */
export const openPause = (onResolve: (r: Resolution) => void) => {
  if (openFn) openFn(onResolve);
  else onResolve({ outcome: 'ate', kind: 'unsure', looked: false });
};

const LOOK_SECONDS = 30;

export function PauseSheet() {
  const { recordPause } = useStore();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PauseRecord['kind']>('unsure');
  const [looking, setLooking] = useState(false);
  const [looked, setLooked] = useState(false);
  const [remaining, setRemaining] = useState(LOOK_SECONDS);
  const resolveRef = useRef<((r: Resolution) => void) | null>(null);

  useEffect(() => {
    openFn = (onResolve) => {
      resolveRef.current = onResolve;
      setKind('unsure');
      setLooking(false);
      setLooked(false);
      setRemaining(LOOK_SECONDS);
      setOpen(true);
    };
    return () => { openFn = null; };
  }, []);

  useEffect(() => {
    if (!looking) return;
    if (remaining <= 0) {
      setLooking(false);
      setLooked(true);
      return;
    }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [looking, remaining]);

  const finish = (outcome: 'ate' | 'passed') => {
    recordPause({ kind, outcome, looked });
    setOpen(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.({ outcome, kind, looked });
  };

  const dismiss = () => {
    setOpen(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    // Closing without answering is not a failure; carry on to what you were doing.
    resolve?.({ outcome: 'ate', kind, looked: false });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[150] bg-[var(--color-bg-base)]/95 backdrop-blur-lg flex items-center justify-center px-5"
        >
          <button
            onClick={dismiss}
            className="absolute top-6 right-6 w-10 h-10 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="w-full max-w-sm space-y-8"
          >
            {looking ? (
              <div className="flex flex-col items-center gap-8 py-6">
                {/* A slow breath to rest against while the urge is looked at. */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full border border-[var(--color-outline)]"
                    animate={reduceMotion ? {} : { scale: [1, 1.18, 1.18, 1], opacity: [0.5, 1, 1, 0.5] }}
                    transition={{ duration: 10, times: [0, 0.4, 0.5, 1], repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.span
                    className="absolute inset-6 rounded-full bg-[var(--color-surface)]"
                    animate={reduceMotion ? {} : { scale: [1, 1.1, 1.1, 1] }}
                    transition={{ duration: 10, times: [0, 0.4, 0.5, 1], repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="relative text-3xl font-light tabular-nums text-[var(--color-on-surface)]">
                    {remaining}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)] text-center leading-relaxed max-w-[16rem]">
                  Where is it, in the body? Watch it without doing anything about it.
                </p>
                <button
                  onClick={() => { setLooking(false); setLooked(true); }}
                  className="text-xs font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
                >
                  That's enough
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-light tracking-tight text-[var(--color-on-surface)]">
                    What's here?
                  </h2>
                  <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                    {looked ? 'Still there, or gone?' : 'No wrong answer. Naming it is the whole exercise.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PAUSE_KINDS.map(option => {
                    const active = kind === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => setKind(option.key)}
                        className={`text-left px-3.5 py-3 rounded-2xl border transition-colors duration-300 cursor-pointer ${
                          active
                            ? 'border-[var(--color-on-surface)]/40 bg-[var(--color-surface)]'
                            : 'border-[var(--color-outline)] bg-transparent hover:bg-[var(--color-surface)]/60'
                        }`}
                      >
                        <span className="block text-[13px] font-medium text-[var(--color-on-surface)]">
                          {option.label}
                        </span>
                        <span className="block text-[10px] text-[var(--color-on-surface-variant)] mt-0.5 leading-snug">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {!looked && (
                    <button
                      onClick={() => { setRemaining(LOOK_SECONDS); setLooking(true); }}
                      className="w-full py-3.5 rounded-2xl border border-[var(--color-outline)] text-[var(--color-on-surface)] text-[13px] font-medium hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                    >
                      Sit with it for {LOOK_SECONDS} seconds
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => finish('passed')}
                      className="flex-1 py-3.5 rounded-2xl border border-[var(--color-outline)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-[13px] font-medium transition-colors cursor-pointer"
                    >
                      It passed
                    </button>
                    <button
                      onClick={() => finish('ate')}
                      className="flex-1 py-3.5 rounded-2xl bg-[var(--color-on-surface)] text-[var(--color-bg-base)] text-[13px] font-medium transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      Carry on
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
