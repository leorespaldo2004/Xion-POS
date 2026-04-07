"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { useState } from "react"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (method: string) => void
  totalAmount: number
  totalAmountBs: number
}

interface PaymentMethod {
  id: string
  label: string
  icon: React.ElementType
  color: string
}

const paymentMethods: PaymentMethod[] = [
  { id: "efectivo-usd", label: "Efectivo USD", icon: DollarSign, color: "text-green-600" },
  { id: "efectivo-bs", label: "Efectivo Bs", icon: Banknote, color: "text-blue-600" },
  { id: "debito", label: "Débito", icon: CreditCard, color: "text-purple-600" },
  { id: "credito", label: "Crédito", icon: CreditCard, color: "text-orange-600" },
  { id: "transferencia", label: "Transferencia", icon: Smartphone, color: "text-cyan-600" },
  { id: "pago-movil", label: "Pago Móvil", icon: QrCode, color: "text-pink-600" },
]

export function PaymentModal({
  open,
  onClose,
  onConfirm,
  totalAmount,
  totalAmountBs,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<Record<string, string>>({})

  const handlePaymentChange = (methodId: string, value: string) => {
    setPayments((prev) => ({
      ...prev,
      [methodId]: value,
    }))
  }

  const calculateTotal = () => {
    return Object.entries(payments).reduce((sum, [methodId, value]) => {
      const amount = parseFloat(value) || 0
      // Convert Bs to USD if it's a Bs payment method
      if (methodId === "efectivo-bs") {
        return sum + amount / 36.5
      }
      return sum + amount
    }, 0)
  }

  const totalPaid = calculateTotal()
  const remaining = totalAmount - totalPaid
  const isComplete = Math.abs(remaining) < 0.01
  const hasOverpayment = remaining < -0.01

  const clearPayments = () => {
    setPayments({})
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Totalizador de Pagos
          </DialogTitle>
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Total a Pagar:</span>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                ${totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Bs {totalAmountBs.toFixed(2)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Payment methods grid */}
        <div className="max-h-[50vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-card/50 p-6">
          <div className="grid grid-cols-2 gap-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="space-y-2">
                <Label
                  htmlFor={method.id}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <method.icon className={`h-4 w-4 ${method.color}`} />
                  {method.label}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {method.id === "efectivo-bs" ? "Bs" : "$"}
                  </span>
                  <Input
                    id={method.id}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={payments[method.id] || ""}
                    onChange={(e) => handlePaymentChange(method.id, e.target.value)}
                    className="h-12 rounded-xl border-primary/30 pl-10 text-right font-mono text-lg focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Pagado:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              ${totalPaid.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Restante:</span>
            <span
              className={`font-mono text-lg font-bold ${
                isComplete
                  ? "text-emerald-600"
                  : hasOverpayment
                    ? "text-orange-600"
                    : "text-red-600"
              }`}
            >
              ${Math.abs(remaining).toFixed(2)}
            </span>
          </div>

          {/* Status indicator */}
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              isComplete
                ? "bg-emerald-50 border border-emerald-200"
                : hasOverpayment
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Pago completo. Listo para procesar.
                </span>
              </>
            ) : hasOverpayment ? (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-semibold text-orange-700">
                  Sobrepago de ${Math.abs(remaining).toFixed(2)}. Debe dar cambio.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-700">
                  Faltan ${Math.abs(remaining).toFixed(2)} por pagar.
                </span>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3 pt-4">
          <Button
            variant="outline"
            onClick={clearPayments}
            className="border-2 hover:bg-accent/50"
          >
            Limpiar
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-2 hover:bg-accent/50"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const primaryMethod = Object.keys(payments).length > 0 ? Object.keys(payments)[0] : "cash"
              const mapped = primaryMethod.includes("efectivo") ? "cash" : primaryMethod.includes("debito") || primaryMethod.includes("credito") ? "card" : primaryMethod.includes("transferencia") ? "transfer" : "mobile_pay"
              onConfirm(Object.keys(payments).length > 1 ? "mixed" : mapped)
            }}
            disabled={!isComplete && !hasOverpayment}
            className="bg-emerald-600 px-8 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Procesar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
