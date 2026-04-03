import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const FOCUSABLE = 'button:not([disabled])';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // Escape to cancel
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  // Focus confirm button on open
  React.useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(FOCUSABLE);
      // Focus the cancel button by default (safer for destructive dialogs)
      buttons?.[0]?.focus();
    });
  }, [isOpen]);

  // Tab trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60]"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={handleKeyDown}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {danger && (
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 id={titleId} className="text-base font-bold text-slate-900 mb-1">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                  </div>
                  <button
                    onClick={onCancel}
                    aria-label="Cancel"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    danger
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {isLoading && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook for imperative confirm dialogs
interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    description: '',
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, isOpen: false, resolve: null }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, isOpen: false, resolve: null }));
  }, [state]);

  const ConfirmDialogNode = (
    <ConfirmDialog
      isOpen={state.isOpen}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
    />
  );

  return { confirm, ConfirmDialogNode };
}
