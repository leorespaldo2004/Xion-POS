// filepath: src/components/pos/apertura-modal.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecurityApprovalModal } from "@/components/shared/security-approval-modal"
import { useOpenSession } from "@/hooks/queries/use-cash-register"
import { useUsers } from "@/hooks/queries/use-users"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"

interface AperturaModalProps {
  open: boolean
  onClose: () => void
}

export function AperturaModal({ open, onClose }: AperturaModalProps) {
  const [openingBalance, setOpeningBalance] = useState("0")
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  const { data: users, isLoading: loadingUsers } = useUsers()
  const openMutation = useOpenSession()

  const handleInitiateOpen = () => {
    const userId = users && users.length > 0 ? users[0].id : null
    if (!userId) {
      toast.error("No hay usuarios registrados para abrir la caja.")
      return
    }
    setShowSecurityModal(true)
  }

  const handleApprovedAndOpen = async (supervisorName?: string) => {
    const userId = users && users.length > 0 ? users[0].id : null
    if (!userId) return

    try {
      await openMutation.mutateAsync({
        user_id: userId,
        opening_balance_usd: parseFloat(openingBalance) || 0,
      })
      toast.success(`Caja abierta correctamente (Autorizado por ${supervisorName || "Supervisor"})`)
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Error interno al abrir caja")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Apertura de Caja</DialogTitle>
            <DialogDescription>
              Ingresa el monto inicial (Fondo de Caja) para comenzar el turno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="balance" className="text-base font-semibold">
                Monto Inicial (USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                  $
                </span>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-8 text-lg font-mono"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleInitiateOpen()}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este monto se sumará al total esperado al final del turno. Requiere validación QR/PIN de supervisor.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={openMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleInitiateOpen}
              disabled={openMutation.isPending || loadingUsers}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 font-bold gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {openMutation.isPending ? "Abriendo..." : "Abrir Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecurityApprovalModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onApproved={handleApprovedAndOpen}
        requiredRole="manager"
        actionRequired="OPEN_CAJA"
        actionDescription={`Autorizar apertura de caja con fondo inicial de $${parseFloat(openingBalance || "0").toFixed(2)} USD.`}
      />
    </>
  )
}
