import React, { useEffect, useState } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onRemove, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/30',
          border: 'border-green-200 dark:border-green-800',
          icon: <Check size={18} className="text-green-600 dark:text-green-400" />,
          iconBg: 'bg-green-100 dark:bg-green-800/50',
          text: 'text-green-800 dark:text-green-200',
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/30',
          border: 'border-red-200 dark:border-red-800',
          icon: <X size={18} className="text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-100 dark:bg-red-800/50',
          text: 'text-red-800 dark:text-red-200',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/30',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400" />,
          iconBg: 'bg-yellow-100 dark:bg-yellow-800/50',
          text: 'text-yellow-800 dark:text-yellow-200',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          icon: <Info size={18} className="text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-blue-100 dark:bg-blue-800/50',
          text: 'text-blue-800 dark:text-blue-200',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles.bg} ${styles.border} transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className={`p-1.5 rounded-full ${styles.iconBg}`}>
        {styles.icon}
      </div>
      <p className={`text-sm font-medium ${styles.text} flex-1`}>{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

// Toast context and hook for easy usage
interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
