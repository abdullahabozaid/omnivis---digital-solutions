import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getConfirmButtonStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'primary':
        return 'bg-gold-500 hover:bg-gold-600 text-white';
    }
  };

  const getIconStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'primary':
        return 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full ${getIconStyle()}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">{title}</h2>
              <button
                onClick={onCancel}
                className="text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-muted mt-2">
              {message}
              {itemName && (
                <span className="font-semibold text-gray-800 dark:text-dark-text"> "{itemName}"</span>
              )}
              ?
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-muted/70 mt-2">This action cannot be undone.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm font-semibold text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover hover:border-gray-300 dark:hover:border-gold-800 active:scale-[0.98] transition-all duration-150"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150 ${getConfirmButtonStyle()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
