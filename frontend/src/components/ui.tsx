import React, { useState, createContext, useContext } from "react";
import ReactDOM from "react-dom";

// ─── Button ─────────────────────────────────────────────────────────────────
type ButtonProps<C extends React.ElementType> = {
  as?: C;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
} & React.ComponentPropsWithoutRef<C>;

export const Button = <C extends React.ElementType = "button">({
  as,
  variant = "primary",
  children,
  className,
  ...props
}: ButtonProps<C>) => {
  const Component = as || "button";

  const base =
    "px-4 py-2 sm:px-5 sm:py-2.5 font-bold transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm sm:text-base border-4 border-[var(--border)] uppercase tracking-wide";

  const variants: Record<string, string> = {
    primary:
      "bg-[var(--nb-yellow)] hover:bg-[var(--nb-blue)] text-black hover:text-white shadow-[var(--shadow)] focus:ring-black translate-y-[-2px] translate-x-[-2px] hover:translate-y-0 hover:translate-x-0 hover:shadow-none active:translate-y-1 active:translate-x-1",
    secondary:
      "bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] shadow-[var(--shadow-sm)] focus:ring-black hover:translate-y-0 hover:translate-x-0 hover:shadow-none active:translate-y-1 active:translate-x-1",
    danger:
      "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow)] focus:ring-black translate-y-[-2px] translate-x-[-2px] hover:translate-y-0 hover:translate-x-0 hover:shadow-none active:translate-y-1 active:translate-x-1",
    ghost:
      "bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] focus:ring-black border-transparent hover:border-black",
  };

  return (
    <Component
      className={`${base} ${variants[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", style, ...props }) => (
  <div
    className={`nb-card p-6 theme-transition ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);

// ─── Spinner ─────────────────────────────────────────────────────────────────
export const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]" />
);

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border-4 border-[var(--border)] shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto sm:mt-16 theme-transition animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b-4 border-[var(--border)] sticky top-0 z-10 bg-[var(--nb-yellow)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text)] w-8 h-8 rounded-full flex items-center justify-center text-xl leading-none hover:bg-[var(--surface-2)] transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar text-[var(--text)]">{children}</div>
      </div>
    </div>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastMessage { id: number; message: string; type: ToastType; }
interface ToastContextType { addToast: (message: string, type: ToastType) => void; }

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {ReactDOM.createPortal(
        toasts.map((toast) => <Toast key={toast.id} {...toast} />),
        document.getElementById("toast-container")!
      )}
    </ToastContext.Provider>
  );
};

const Toast: React.FC<ToastMessage> = ({ message, type }) => {
  const colors: Record<ToastType, string> = {
    success: "bg-[var(--nb-green)] text-black",
    error: "bg-[var(--accent)] text-white",
    info: "bg-[var(--nb-blue)] text-white",
  };
  return (
    <div className={`px-5 py-3 border-4 border-black shadow-[var(--shadow)] font-bold uppercase ${colors[type]} animate-slideIn`}>
      {message}
    </div>
  );
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  const textShadows = [
    "-1px -1px 0 var(--nb-yellow)",
    "-1px -1px 0 var(--nb-blue)",
    "-1px -1px 0 var(--nb-pink)",
    "-1px -1px 0 var(--nb-green)",
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pb-2">
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab;
        const shadow = textShadows[index % textShadows.length];

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 sm:px-5 sm:py-2.5 
              font-black uppercase tracking-wide
              text-sm sm:text-base border-4 border-black 
              transition-all duration-150
              ${isActive
                ? "bg-slate-200 translate-y-0 translate-x-0 shadow-none"
                : "bg-white shadow-[4px_4px_0_0_#000] translate-y-[-2px] translate-x-[-2px] hover:translate-y-0 hover:translate-x-0 hover:shadow-none"
              }
            `}
            style={{ textShadow: shadow }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

