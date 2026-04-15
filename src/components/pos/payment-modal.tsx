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
import { SecurityApprovalModal } from "@/components/shared/security-approval-modal"
import type { SalePaymentDTO } from "@/hooks/queries/use-sales"

// Mapa de iconos disponibles para los métodos dinámicos
const IconMap: Record<string, React.ElementType> = {
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Wallet,
  Building,
}

/** Método de pago tal como llega del SystemConfig.payment_methods_json */
export interface DynamicPaymentMethod {
  id: string
  label: string
  currency: "USD" | "VES"
  icon?: string
  color?: string
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  /** Callback con la lista de pagos validados — contrato multi-pago */
  onConfirm: (payments: SalePaymentDTO[]) => void
  totalAmount: number
  totalAmountBs: number
  exchangeRate: number
  paymentMethods: DynamicPaymentMethod[]
}

export function PaymentModal({
  open,
  onClose,
  onConfirm,
  totalAmount,
  totalAmountBs,
  exchangeRate,
  paymentMethods = [],
}: PaymentModalProps) {
  // Mapa methodId → valor digitado por el cajero (en la moneda del método)
  const [payments, setPayments] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  // -----------------------------------------------------------------------
  // Helpers de cálculo
  // -----------------------------------------------------------------------

  const getMethod = (id: string): DynamicPaymentMethod | undefined =>
    paymentMethods.find((m) => m.id === id)

  const isBsMethod = (methodId: string): boolean =>
    getMethod(methodId)?.currency === "VES"

  /** Convierte el monto ingresado a USD, respetando la moneda del método */
  const toUSD = (methodId: string, raw: string): number => {
    const amount = parseFloat(raw) || 0
    return isBsMethod(methodId) ? amount / exchangeRate : amount
  }

  /** Total pagado en USD sumando todos los métodos */
  const calculateTotalPaidUSD = (): number =>
    Object.entries(payments).reduce(
      (sum, [id, val]) => sum + toUSD(id, val),
      0
    )

  const totalPaid = calculateTotalPaidUSD()
  const remaining = totalAmount - totalPaid
  const isComplete = Math.abs(remaining) < 0.01
  const hasOverpayment = remaining < -0.01

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handlePaymentChange = (methodId: string, value: string) => {
    setPayments((prev) => ({ ...prev, [methodId]: value }))
  }

  const clearPayments = () => {
    setPayments({})
    setFocusedInput(null)
  }

  /**
   * "Completar": rellena el método enfocado con el monto exacto
   * para cerrar la diferencia en USD.
   */
  const handleCompletePayment = () => {
    if (!focusedInput) return
    const paidWithoutFocused = Object.entries(payments).reduce(
      (sum, [id, val]) => (id === focusedInput ? sum : sum + toUSD(id, val)),
      0
    )
    const remainingUSD = totalAmount - paidWithoutFocused
    if (remainingUSD <= 0) return

    const valueToSet = isBsMethod(focusedInput)
      ? remainingUSD * exchangeRate
      : remainingUSD

    setPayments((prev) => ({ ...prev, [focusedInput]: valueToSet.toFixed(2) }))
  }

  const handleProcessSale = () => {
    if (totalAmount > 500) {
      setShowSecurityModal(true)
      return
    }
    executeConfirm()
  }

  /**
   * Construye la lista de SalePaymentDTO con snapshots de los métodos y
   * la envía al padre para que haga el POST a la API.
   */
  const executeConfirm = () => {
    const salePayments: SalePaymentDTO[] = Object.entries(payments)
      .filter(([, val]) => (parseFloat(val) || 0) > 0)
      .map(([methodId, val]) => {
        const method = getMethod(methodId)
        const amountTendered = parseFloat(val) || 0
        const amountUSD = toUSD(methodId, val)
        return {
          payment_method_id: methodId,
          // Snapshot inmutable del nombre del método
          payment_method_label: method?.label ?? methodId,
          currency: (method?.currency ?? "USD") as "USD" | "VES",
          amount_tendered: amountTendered,
          amount_usd: amountUSD,
        }
      })

    onConfirm(salePayments)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

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

        {/* Grilla de métodos de pago dinámicos */}
        <div className="max-h-[50vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-card/50 p-6">
          {paymentMethods.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No hay métodos de pago configurados. Ve a{" "}
              <strong>Configuraciones → Formas de Pago</strong> para añadirlos.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map((method) => {
                const IconComponent = IconMap[method.icon ?? ""] ?? CreditCard
                return (
                  <div key={method.id} className="space-y-2">
                    <Label
                      htmlFor={method.id}
                      className="flex items-center gap-2 text-sm font-semibold text-foreground"
                    >
                      <IconComponent className={`h-4 w-4 ${method.color ?? "text-primary"}`} />
                      {method.label}
                      <Badge
                        variant="outline"
                        className="ml-auto text-[9px] px-1 py-0"
                      >
                        {method.currency}
                      </Badge>
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
                        value={payments[method.id] ?? ""}
                        onChange={(e) => handlePaymentChange(method.id, e.target.value)}
                        onFocus={() => setFocusedInput(method.id)}
                        className={`h-12 rounded-xl border-primary/30 pl-10 text-right font-mono text-lg focus:border-primary focus:ring-primary ${
                          focusedInput === method.id
                            ? "ring-2 ring-primary border-primary"
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Resumen */}
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

          {/* Indicador de estado */}
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
                  Sobrepago de ${Math.abs(remaining).toFixed(2)}. Debe dar vuelto.
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
            onClick={handleProcessSale}
            disabled={!isComplete && !hasOverpayment}
            className="bg-emerald-600 px-8 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Procesar Venta
          </Button>
        </DialogFooter>
      </DialogContent>

      <SecurityApprovalModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onApproved={() => executeConfirm()}
        requiredRole="manager"
        actionDescription={`La venta por monto elevado ($${totalAmount.toFixed(2)}) requiere autorización de un supervisor.`}
      />
    </Dialog>
  )
}
