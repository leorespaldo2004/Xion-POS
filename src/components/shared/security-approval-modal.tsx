import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { AlertCircle, Contact, ShieldCheck, KeyRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"

interface SecurityApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onApproved: () => void
  requiredRole?: string
  actionDescription?: string
}

export function SecurityApprovalModal({
  isOpen,
  onClose,
  onApproved,
  requiredRole = "manager",
  actionDescription = "Esta acción requiere autorización."
}: SecurityApprovalModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pinValue, setPinValue] = useState("")

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setPinValue("")
    }
  }, [isOpen])

  // Escuchar por lecturas de QR (teclado rápido)
  useEffect(() => {
    if (!isOpen) return

    let keys = ""
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas si estamos escribiendo en un input formal (aunque el PIN no debería solapar)
      if (e.key === "Enter") {
        if (keys.startsWith("AUTH-XION-")) {
          verifyAccess({ qr_token: keys })
        }
        keys = ""
        return
      }

      keys += e.key

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        keys = ""
      }, 50) // 50ms timeout as scanner is very fast
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timeout)
    }
  }, [isOpen, requiredRole])

  const verifyAccess = async (payload: { pin?: string; qr_token?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/verify-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          required_role: requiredRole,
        }),
      })

      if (response.ok) {
        onApproved()
        onClose()
      } else {
        const data = await response.json()
        setError(data.detail || "Credenciales inválidas o permisos insuficientes")
        setPinValue("")
      }
    } catch (err) {
      setError("Error de conexión con el servidor")
      setPinValue("")
    } finally {
      setLoading(false)
    }
  }

  const handlePinComplete = (value: string) => {
    setPinValue(value)
    verifyAccess({ pin: value })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md shadow-2xl border-primary/20">
        <DialogHeader className="space-y-3 pb-2 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Autorización Requerida
          </DialogTitle>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {actionDescription}
          </p>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-8 py-6">
          <div className="space-y-4 flex flex-col items-center w-full">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <KeyRound className="h-4 w-4" />
              Ingrese PIN numérico
            </Label>
            
            <InputOTP 
              maxLength={4} 
              value={pinValue}
              onChange={setPinValue}
              onComplete={handlePinComplete}
              disabled={loading}
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-14 h-14 text-2xl border-2 rounded-xl" />
                <InputOTPSlot index={1} className="w-14 h-14 text-2xl border-2 rounded-xl" />
                <InputOTPSlot index={2} className="w-14 h-14 text-2xl border-2 rounded-xl" />
                <InputOTPSlot index={3} className="w-14 h-14 text-2xl border-2 rounded-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="w-full flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-widest font-semibold opacity-50">
            <div className="h-px flex-1 bg-border"></div>
            O
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-accent/50 flex items-center justify-center border border-border">
              <Contact className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Escanee su credencial QR
            </p>
          </div>

          {error && (
            <div className="w-full flex items-center gap-2 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm font-medium border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
