import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        ({ type, title, message, duration = 4000 }: Omit<Toast, "id">) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newToast: Toast = { id, type, title, message, duration };

            setToasts((prev) => [...prev, newToast]);

            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        },
        [removeToast]
    );

    const success = useCallback((title: string, message?: string) => {
        showToast({ type: "success", title, message });
    }, [showToast]);

    const error = useCallback((title: string, message?: string) => {
        showToast({ type: "error", title, message });
    }, [showToast]);

    const info = useCallback((title: string, message?: string) => {
        showToast({ type: "info", title, message });
    }, [showToast]);

    const warning = useCallback((title: string, message?: string) => {
        showToast({ type: "warning", title, message });
    }, [showToast]);

    return (
        <ToastContext.Provider
            value={{
                toasts,
                showToast,
                removeToast,
                success,
                error,
                info,
                warning
            }}
        >
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => {
                    const icons = {
                        success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
                        error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
                        info: <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />,
                        warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    };

                    const borderColors = {
                        success: "border-emerald-200 bg-white/95 shadow-emerald-100",
                        error: "border-rose-200 bg-white/95 shadow-rose-100",
                        info: "border-indigo-200 bg-white/95 shadow-indigo-100",
                        warning: "border-amber-200 bg-white/95 shadow-amber-100"
                    };

                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${borderColors[toast.type]}`}
                        >
                            {icons[toast.type]}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
                                {toast.message && (
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
