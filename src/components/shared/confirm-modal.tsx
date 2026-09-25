// filepath: src/components/shared/confirm-modal.tsx
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, HelpCircle, Info, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmVariant = "warning" | "danger" | "info" | "question";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const VARIANT_CONFIGS: Record<
  ConfirmVariant,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    confirmBtnClass: string;
  }
> = {
  question: {
    icon: HelpCircle,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    confirmBtnClass: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    confirmBtnClass: "bg-amber-500 hover:bg-amber-600 text-white font-bold",
  },
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    confirmBtnClass: "bg-red-600 hover:bg-red-700 text-white font-bold",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    confirmBtnClass: "bg-blue-600 hover:bg-blue-700 text-white font-bold",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Estás seguro de realizar esta acción?",
  description = "Esta acción no se puede deshacer. Por favor, confirma si deseas continuar.",
  confirmText = "Sí, continuar",
  cancelText = "No, cancelar",
  variant = "question",
  isLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.question;
  const IconComponent = config.icon;
  const loadingState = isLoading || internalLoading;

  const handleConfirmClick = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl space-y-4">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.iconBg}`}>
            <IconComponent className={`h-8 w-8 ${config.iconColor} animate-pulse`} />
          </div>

          <AlertDialogTitle className="text-xl font-bold text-foreground">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loadingState}
            className="w-full sm:w-1/2 h-11 border-border rounded-xl text-xs font-semibold"
          >
            {cancelText}
          </AlertDialogCancel>

          <Button
            onClick={handleConfirmClick}
            disabled={loadingState}
            className={`w-full sm:w-1/2 h-11 rounded-xl text-xs ${config.confirmBtnClass}`}
          >
            {loadingState ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Procesando...
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
