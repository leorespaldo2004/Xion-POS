// filepath: src/components/shared/security-approval-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Camera,
  RefreshCw,
  Wallet,
  Lock,
  RotateCcw,
  DollarSign,
  Tag,
  Trash2,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { localApiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Html5QrcodeScanner } from "html5-qrcode";

export type CriticalAction =
  | 'VOID_SALE'
  | 'RETURN_SALE'
  | 'PRICE_OVERRIDE'
  | 'DRAWER_OPEN'
  | 'CANCEL_ITEM'
  | 'OPEN_CAJA'
  | 'CLOSE_CAJA'
  | 'LARGE_SALE'
  | 'SHRINKAGE_REGISTRATION'
  | 'GENERIC_OVERRIDE';

export interface SecurityApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproved: (supervisorName?: string) => void;
  requiredRole?: string;
  actionTitle?: string;
  actionDescription?: string;
  actionRequired?: CriticalAction;
  entityId?: string | number;
}

const ACTION_CONFIGS: Record<
  CriticalAction,
  { title: string; defaultDesc: string; icon: React.ElementType; badgeColor: string }
> = {
  OPEN_CAJA: {
    title: "Autorizar Apertura de Caja",
    defaultDesc: "Se requiere supervisión para abrir el turno con el saldo inicial especificado.",
    icon: Wallet,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  CLOSE_CAJA: {
    title: "Autorizar Cierre / Arqueo de Caja",
    defaultDesc: "Se requiere supervisión para consolidar y cerrar la sesión de caja actual.",
    icon: Lock,
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  VOID_SALE: {
    title: "Autorizar Anulación de Venta",
    defaultDesc: "Se requiere supervisión para anular la venta y restituir el saldo.",
    icon: RotateCcw,
    badgeColor: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  RETURN_SALE: {
    title: "Autorizar Devolución de Venta",
    defaultDesc: "Se requiere supervisión para procesar la devolución de productos e inventario.",
    icon: RotateCcw,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  LARGE_SALE: {
    title: "Autorizar Venta de Gran Monto",
    defaultDesc: "Esta transacción excede el umbral estándar y requiere aprobación de supervisor.",
    icon: DollarSign,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  PRICE_OVERRIDE: {
    title: "Autorizar Modificación de Precio / Descuento",
    defaultDesc: "Se requiere supervisión para aplicar un descuento manual o ajuste de precio.",
    icon: Tag,
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  DRAWER_OPEN: {
    title: "Autorizar Apertura de Gaveta de Dinero",
    defaultDesc: "Apertura manual de la gaveta fuera de una venta.",
    icon: KeyRound,
    badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  CANCEL_ITEM: {
    title: "Autorizar Cancelación de Ítem",
    defaultDesc: "Se requiere supervisión para eliminar este producto del carrito.",
    icon: Trash2,
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  SHRINKAGE_REGISTRATION: {
    title: "Autorizar Registro de Merma de Inventario",
    defaultDesc: "Se requiere supervisión para descontar productos por mermas o pérdidas.",
    icon: AlertTriangle,
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  GENERIC_OVERRIDE: {
    title: "Autorización de Evento Crítico",
    defaultDesc: "Esta operación requiere autenticación de un supervisor autorizado.",
    icon: ShieldCheck,
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
};

export function SecurityApprovalModal({
  isOpen,
  onClose,
  onApproved,
  requiredRole = "manager",
  actionTitle,
  actionDescription,
  actionRequired = "GENERIC_OVERRIDE",
  entityId = "SYSTEM",
}: SecurityApprovalModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [formattedValue, setFormattedValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const config = ACTION_CONFIGS[actionRequired] || ACTION_CONFIGS.GENERIC_OVERRIDE;
  const HeaderIcon = config.icon;
  const displayTitle = actionTitle || config.title;
  const displayDescription = actionDescription || config.defaultDesc;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCodeValue("");
      setFormattedValue("");
      setCameraOpen(false);
    }
  }, [isOpen]);

  // Escucha de escáner USB HID de código de barras / QR de respuesta rápida
  useEffect(() => {
    if (!isOpen) return;

    let keyBuffer = "";
    let lastKeyTime = Date.now();
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      if (now - lastKeyTime > 50) {
        keyBuffer = "";
      }

      lastKeyTime = now;

      if (e.key === "Enter") {
        if (keyBuffer.length > 0) {
          verifyAccess(keyBuffer);
          keyBuffer = "";
          e.preventDefault();
        }
        return;
      }

      if (e.key.length === 1) {
        keyBuffer += e.key;
      }

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        keyBuffer = "";
      }, 60);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  // Escáner QR vía Cámara Web (html5-qrcode)
  useEffect(() => {
    if (!cameraOpen || !isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error("Error clearing scanner on stop", err));
        scannerRef.current = null;
      }
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 200, height: 200 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        scanner
          .clear()
          .then(() => {
            scannerRef.current = null;
            setCameraOpen(false);
            verifyAccess(decodedText);
          })
          .catch((err) => {
            console.error("Error clearing scanner on success", err);
            setCameraOpen(false);
            verifyAccess(decodedText);
          });
      },
      () => {
        // Error silencioso por frame
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error("Error cleaning up scanner", err));
        scannerRef.current = null;
      }
    };
  }, [cameraOpen, isOpen]);

  const verifyAccess = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      let isPin = false;
      let cleanCode = code.trim();

      // Parsear JSON si proviene de un carnet QR de supervisor
      if (cleanCode.startsWith("{") && cleanCode.endsWith("}")) {
        try {
          const parsed = JSON.parse(cleanCode);
          if (parsed.app === "xion_pos" && parsed.type === "SUPERVISOR_KEY") {
            cleanCode = parsed.code;
          }
        } catch (e) {}
      }

      // Si tiene 4 dígitos numéricos, tratar como PIN heredado
      if (cleanCode.length === 4 && /^\d+$/.test(cleanCode)) {
        isPin = true;
      }

      if (isPin) {
        const response = await localApiClient.post("/users/verify-access", {
          pin: cleanCode,
          required_role: requiredRole,
        });

        toast.success(`Autorizado por ${response.data.username || "Supervisor"}`);
        onApproved(response.data.username || "Supervisor");
        onClose();
      } else {
        // Verificación estándar por código alfanumérico Crockford de 10 caracteres
        const response = await localApiClient.post("/supervisor-auth/verify", {
          code: cleanCode,
          actionRequired: actionRequired,
          entityId: entityId,
        });

        if (response.data.valid) {
          toast.success(`Autorizado por ${response.data.supervisor.name}`);
          onApproved(response.data.supervisor.name);
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Código de autorización inválido o expirado";
      setError(detail);
      setCodeValue("");
      setFormattedValue("");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/-/g, "");

    const VALID_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ2345678901";
    const cleaned = rawVal
      .split("")
      .filter((c) => VALID_CHARSET.includes(c))
      .join("")
      .substring(0, 10);

    setCodeValue(cleaned);

    let formatted = cleaned;
    if (!/^\d+$/.test(cleaned)) {
      if (cleaned.length > 4 && cleaned.length <= 8) {
        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
      } else if (cleaned.length > 8) {
        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
      }
    }
    setFormattedValue(formatted);

    if (cleaned.length === 10) {
      verifyAccess(cleaned);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (codeValue.length === 4 || codeValue.length === 10) {
        verifyAccess(codeValue);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="max-w-md shadow-2xl border-primary/20 bg-card">
        <DialogHeader className="space-y-3 pb-2 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <HeaderIcon className="h-8 w-8 text-primary animate-pulse" />
          </div>

          <div className="space-y-1">
            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${config.badgeColor}`}>
              Evento Crítico Requerido
            </Badge>
            <DialogTitle className="text-xl font-bold text-foreground">
              {displayTitle}
            </DialogTitle>
          </div>

          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {displayDescription}
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-5 py-2">
          {/* Lector de Cámara Web */}
          {cameraOpen && (
            <div className="w-full flex flex-col items-center space-y-2">
              <div className="w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 shadow-inner bg-slate-950 relative">
                <div id="qr-reader" className="w-full h-full"></div>
              </div>
              <span className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1">
                <QrCode className="h-3 w-3" /> Coloque el QR frente a la cámara
              </span>
            </div>
          )}

          {/* Entrada Manual de Código o PIN */}
          {!cameraOpen && (
            <div className="space-y-3 flex flex-col items-center w-full">
              <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                Escanee QR, Ingrese Código (10 caracteres) o PIN (4 dígitos)
              </Label>

              <Input
                type="text"
                placeholder="K7X9-M2W4-PQ"
                value={formattedValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="h-14 font-mono text-center text-xl font-bold uppercase tracking-widest border-2 rounded-2xl focus-visible:ring-primary/20 bg-background"
                autoFocus
              />
            </div>
          )}

          <div className="w-full flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-40">
            <div className="h-px flex-1 bg-border"></div>
            O
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {/* Botón Escáner Cámara */}
          <div className="w-full">
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={() => setCameraOpen(!cameraOpen)}
              className="w-full h-11 flex items-center justify-center gap-2 border-border/80 rounded-xl"
            >
              <Camera className="h-4 w-4" />
              {cameraOpen ? "Cancelar Escaneo por Cámara" : "Escanear Credencial QR con Cámara"}
            </Button>
          </div>

          {/* Estado de validación */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              Validando credencial de supervisor...
            </div>
          )}

          {error && (
            <div className="w-full flex items-center gap-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 text-xs font-medium border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
