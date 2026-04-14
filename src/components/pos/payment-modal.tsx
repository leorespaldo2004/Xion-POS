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
  Wallet,
  Building,
} from "lucide-react"
import { useState } from "react"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (method: string) => void
  totalAmount: number
  totalAmountBs: number
  totalAmountBs: number
  exchangeRate: number
  paymentMethods: any[]
}

const IconMap: Record<string, React.ElementType> = {
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Wallet,
  Building
}

export function PaymentModal({
  open,
  onClose,
  onConfirm,
  totalAmount,
  totalAmountBs,
  exchangeRate,
  paymentMethods = []
}: PaymentModalProps) {
  const [payments, setPayments] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const handlePaymentChange = (methodId: string, value: string) => {
    setPayments((prev) => ({
      ...prev,
      [methodId]: value,
    }))
  }

  const isBsMethod = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId)
    return method ? method.currency === "VES" : false
  }

  const calculateTotal = () => {
    return Object.entries(payments).reduce((sum, [methodId, value]) => {
      const amount = parseFloat(value) || 0
      // Convert Bs to USD if it's a Bs payment method
      if (isBsMethod(methodId)) {
        return sum + amount / exchangeRate
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
    setFocusedInput(null)
  }

  const handleCompletePayment = () => {
    if (!focusedInput) return
    
    // Calculate how much we need in USD by excluding the currently focused input
    const paidWithoutFocused = Object.entries(payments).reduce((sum, [methodId, value]) => {
      if (methodId === focusedInput) return sum
      const amount = parseFloat(value) || 0
      return sum + (isBsMethod(methodId) ? amount / exchangeRate : amount)
    }, 0)

    const remainingToFillUSD = totalAmount - paidWithoutFocused
    if (remainingToFillUSD <= 0) return

    const valueToSet = isBsMethod(focusedInput)
      ? remainingToFillUSD * exchangeRate
      : remainingToFillUSD

    setPayments(prev => ({
      ...prev,
      [focusedInput]: valueToSet.toFixed(2)
    }))
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
            {paymentMethods.map((method) => {
              const IconComponent = IconMap[method.icon] || CreditCard
              return (
              <div key={method.id} className="space-y-2">
                <Label
                  htmlFor={method.id}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <IconComponent className={`h-4 w-4 ${method.color || 'text-primary'}`} />
                  {method.label}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {isBsMethod(method.id) ? "Bs" : "$"}
                  </span>
                  <Input
                    id={method.id}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={payments[method.id] || ""}
                    onChange={(e) => handlePaymentChange(method.id, e.target.value)}
                    onFocus={() => setFocusedInput(method.id)}
                    className={`h-12 rounded-xl border-primary/30 pl-10 text-right font-mono text-lg focus:border-primary focus:ring-primary ${focusedInput === method.id ? 'ring-2 ring-primary border-primary' : ''}`}
                  />
                </div>
              </div>
            )})}
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
            onClick={handleCompletePayment}
            disabled={!focusedInput || totalAmount <= 0}
            className="border-2 border-primary/50 text-primary hover:bg-primary/10"
          >
            Completar
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
