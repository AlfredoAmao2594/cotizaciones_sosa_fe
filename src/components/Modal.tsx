import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal: se cierra con Escape, la X o clic fuera (vía onClose, que puede negarse);
 * mantiene el foco dentro, bloquea el scroll de la página y devuelve el foco al elemento que lo abrió.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstInput = panel.current?.querySelector<HTMLElement>("input:not([readonly]):not([disabled]), select, textarea");
    (firstInput ?? panel.current)?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[92vh] flex flex-col bg-white rounded-t-2xl sm:rounded-xl shadow-xl focus:outline-none`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={() => onCloseRef.current()} aria-label="Cerrar"
            className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-slate-500 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
