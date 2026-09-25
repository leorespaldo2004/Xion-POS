// filepath: src/components/pos/arqueo-modal.tsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SecurityApprovalModal } from "@/components/shared/security-approval-modal"
import { useSessionSummary, useCloseSession } from "@/hooks/queries/use-cash-register"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"

interface ArqueoModalProps {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
}

export function ArqueoModal({ open, onClose, onConfirm }: ArqueoModalProps) {
  const [realAmounts, setRealAmounts] = useState<Record<string, string>>({})
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  const { data: summary } = useSessionSummary()
  const closeMutation = useCloseSession()

  const currentSystemAmounts = summary?.payments
    ? Object.entries(summary.payments).map(([method, amount]) => ({
        method,
        systemAmount: amount as number,
      }))
    : []

  const handleAmountChange = (method: string, value: string) => {
    setRealAmounts((prev) => ({ ...prev, [method]: value }))
  }

  const getDifference = (systemAmount: number, realValue: string) => {
    const real = parseFloat(realValue) || 0
    return real - systemAmount
  }

  const totalSystem = currentSystemAmounts.reduce((acc, item) => acc + item.systemAmount, 0)
  const totalReal = currentSystemAmounts.reduce(
    (acc, item) => acc + (parseFloat(realAmounts[item.method] || "0") || 0),
    0
  )
  const totalDifference = totalReal - totalSystem

  const handleInitiateClose = () => {
    setShowSecurityModal(true)
  }

  const handleApprovedAndClose = async (supervisorName?: string) => {
    try {
      await closeMutation.mutateAsync({
        closing_balance_usd: totalReal,
      })
      toast.success(`Cierre de caja autorizado por ${supervisorName || "Supervisor"}`)
      if (onConfirm) onConfirm()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Error al cerrar la sesión de caja")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Arqueo de Caja & Cierre de Turno
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Ingresa el dinero real contado para cada método de pago y compara con el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border bg-card/50 p-6">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Método de Pago</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    Sistema ($)
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    Real ($)
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSystemAmounts.length > 0 ? (
                  currentSystemAmounts.map((item) => {
                    const diff = getDifference(item.systemAmount, realAmounts[item.method] || "")
                    return (
                      <TableRow key={item.method} className="border-border hover:bg-accent/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {item.method}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground font-medium">
                          ${item.systemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={realAmounts[item.method] || ""}
                            onChange={(e) => handleAmountChange(item.method, e.target.value)}
                            className="ml-auto h-10 w-36 text-right font-mono border-primary/30 focus:border-primary focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {realAmounts[item.method] ? (
                            <Badge
                              className={`px-3 py-1.5 text-sm font-black shadow-sm ${
                                diff === 0
                                  ? "bg-primary text-primary-foreground border-0"
                                  : diff > 0
                                    ? "bg-amber-500 text-amber-950 border-0"
                                    : "bg-destructive text-destructive-foreground border-0"
                              }`}
                            >
                              {diff >= 0 ? "+" : ""}
                              {diff.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">--</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay movimientos registrados en esta sesión.
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="border-t-2 border-primary/30 bg-primary/5 font-bold hover:bg-primary/10 transition-colors">
                  <TableCell className="font-bold text-foreground text-base">TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-foreground text-base">
                    ${totalSystem.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground text-base">
                    ${totalReal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={`px-3 py-1.5 text-sm font-black shadow-md ${
                        totalDifference === 0
                          ? "bg-primary text-primary-foreground border-0"
                          : totalDifference > 0
                            ? "bg-amber-500 text-amber-950 border-0"
                            : "bg-destructive text-destructive-foreground border-0"
                      }`}
                    >
                      {totalDifference >= 0 ? "+" : ""}
                      {totalDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={closeMutation.isPending}
              className="border-border text-foreground hover:bg-accent/50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInitiateClose}
              disabled={closeMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 min-w-[140px] gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {closeMutation.isPending ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecurityApprovalModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onApproved={handleApprovedAndClose}
        requiredRole="manager"
        actionRequired="CLOSE_CAJA"
        actionDescription={`Autorizar cierre de turno con dinero real contado de $${totalReal.toFixed(2)} USD (Diferencia: $${totalDifference.toFixed(2)} USD).`}
      />
    </>
  )
}
