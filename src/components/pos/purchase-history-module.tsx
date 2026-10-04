"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  FileText,
  LayoutGrid,
  List,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Wallet,
  DollarSign,
  Building2,
  Calendar,
  PackageCheck
} from "lucide-react"
import { toast } from "sonner"
import { usePurchases, usePurchaseDetail, usePayPurchase, Purchase } from "@/hooks/queries/use-purchases"
import { useSystemStatus } from "@/hooks/queries/use-system"
import { cn } from "@/lib/utils"

const formatLocalNumber = (num: number): string => {
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PurchaseHistoryModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"cards" | "list">("list")
  
  // Modales
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payPurchaseItem, setPayPurchaseItem] = useState<Purchase | null>(null)
  
  // Estado formulario de abono
  const [payAmountInput, setPayAmountInput] = useState("")
  const [payNotesInput, setPayNotesInput] = useState("")

  const { data: purchases = [], isLoading } = usePurchases()
  const { data: purchaseDetail, isLoading: isLoadingDetail } = usePurchaseDetail(selectedPurchaseId)
  const payMutation = usePayPurchase()
  const { data: config } = useSystemStatus()
  const exchangeRate = config?.current_exchange_rate_bs || 36.5

  useEffect(() => {
    const saved = localStorage.getItem("purchases_history_view_preference")
    if (saved === "list" || saved === "cards") {
      setViewMode(saved)
    }
  }, [])

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode)
    localStorage.setItem("purchases_history_view_preference", mode)
  }

  // Filtrado de compras
  const filteredPurchases = purchases.filter((item) => {
    const term = searchQuery.toLowerCase()
    const matchesSearch =
      item.supplier_name.toLowerCase().includes(term) ||
      (item.invoice_number && item.invoice_number.toLowerCase().includes(term)) ||
      item.id.toLowerCase().includes(term)

    if (!matchesSearch) return false

    if (statusFilter === "paid") return item.payment_status === "paid"
    if (statusFilter === "pending") return item.payment_status === "pending"
    if (statusFilter === "partial") return item.payment_status === "partial"
    if (statusFilter === "credit") return item.payment_type === "credit"

    return true
  })

  // Estadísticas rápidas
  const totalPurchasesUSD = purchases.reduce((acc, curr) => acc + (curr.total_amount_usd || 0), 0)
  const totalPendingUSD = purchases.reduce((acc, curr) => acc + (curr.pending_amount_usd || 0), 0)
  const activeCreditCount = purchases.filter((p) => (p.pending_amount_usd || 0) > 0.001).length

  const handleOpenDetail = (id: string) => {
    setSelectedPurchaseId(id)
    setShowDetailModal(true)
  }

  const handleOpenPayModal = (purchase: Purchase) => {
    setPayPurchaseItem(purchase)
    setPayAmountInput(purchase.pending_amount_usd.toString())
    setPayNotesInput("")
    setShowPayModal(true)
  }

  const handleProcessPayment = async () => {
    if (!payPurchaseItem) return
    const amount = parseFloat(payAmountInput)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingrese un monto válido mayor a 0.")
      return
    }
    if (amount > payPurchaseItem.pending_amount_usd + 0.01) {
      toast.error("El monto ingresado excede el saldo pendiente.")
      return
    }

    try {
      await payMutation.mutateAsync({
        purchaseId: payPurchaseItem.id,
        amount_usd: amount,
        notes: payNotesInput,
        exchange_rate: exchangeRate,
      })
      toast.success("Abono registrado exitosamente.")
      setShowPayModal(false)
      setPayPurchaseItem(null)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al registrar el abono.")
    }
  }

  const getStatusBadge = (status: string, pendingUsd: number) => {
    if (status === "paid" || pendingUsd <= 0.001) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" /> Pagada
        </Badge>
      )
    }
    if (status === "partial") {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 font-semibold">
          <Clock className="h-3.5 w-3.5" /> Parcial
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
        <AlertCircle className="h-3.5 w-3.5" /> Pendiente
      </Badge>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-background/50 space-y-6">
      {/* Header y Resumen */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Historial de Compras y Cuentas por Pagar
            </h1>
            <p className="text-sm text-muted-foreground">
              Consulta las compras registradas, verifica su estado y gestiona abonos a crédito.
            </p>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Compras</p>
                <h3 className="text-2xl font-bold text-foreground font-mono mt-1">
                  ${formatLocalNumber(totalPurchasesUSD)}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Bs. {formatLocalNumber(totalPurchasesUSD * exchangeRate)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase">Saldo Pendiente por Pagar</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  ${formatLocalNumber(totalPendingUSD)}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Bs. {formatLocalNumber(totalPendingUSD * exchangeRate)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Wallet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Créditos Activos</p>
                <h3 className="text-2xl font-bold text-foreground font-mono mt-1">
                  {activeCreditCount} <span className="text-sm font-normal text-muted-foreground">compras</span>
                </h3>
                <p className="text-xs text-muted-foreground">Por abonar o liquidar</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <CreditCard className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contenedor Principal */}
      <Card className="border-border/50 shadow-xl flex flex-col">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Buscador */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor o factura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>

            {/* Controles de Filtros y Modo Vista */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-background/80">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las compras</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="partial">Parciales</SelectItem>
                  <SelectItem value="credit">A Crédito</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border border-border bg-background p-1 gap-1">
                <Button
                  variant={viewMode === "cards" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleViewMode("cards")}
                  title="Vista de Tarjetas"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleViewMode("list")}
                  title="Vista de Lista"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-auto">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Cargando historial de compras...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <PackageCheck className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold text-lg">No se encontraron compras</p>
              <p className="text-sm">Prueba ajustando los términos de búsqueda o filtros.</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="rounded-md border border-border/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead>Factura / N°</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total ($)</TableHead>
                    <TableHead className="text-right">Pagado ($)</TableHead>
                    <TableHead className="text-right">Pendiente ($)</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((item) => (
                    <TableRow key={item.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono font-bold text-primary">
                        {item.invoice_number || item.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("es-VE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {item.supplier_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.payment_type === "credit" ? "Crédito" : "Contado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${formatLocalNumber(item.total_amount_usd)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${formatLocalNumber(item.paid_amount_usd || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        ${formatLocalNumber(item.pending_amount_usd || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.payment_status, item.pending_amount_usd)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(item.id)}
                          className="h-8 px-2 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detalle
                        </Button>
                        {item.pending_amount_usd > 0.001 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenPayModal(item)}
                            className="h-8 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <Banknote className="h-3.5 w-3.5" /> Abonar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPurchases.map((item) => (
                <Card key={item.id} className="border-border/60 hover:border-primary/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-primary">
                        {item.invoice_number || item.id.slice(0, 8)}
                      </span>
                      {getStatusBadge(item.payment_status, item.pending_amount_usd)}
                    </div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {item.supplier_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(item.created_at).toLocaleString("es-VE")}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-3">
                    <div className="bg-secondary/40 rounded-lg p-3 space-y-1 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Compra:</span>
                        <span className="font-bold text-foreground">${formatLocalNumber(item.total_amount_usd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monto Pagado:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">${formatLocalNumber(item.paid_amount_usd || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-1 font-bold">
                        <span className="text-amber-500">Saldo Pendiente:</span>
                        <span className="text-amber-600 dark:text-amber-400">${formatLocalNumber(item.pending_amount_usd || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(item.id)}
                        className="text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalle
                      </Button>
                      {item.pending_amount_usd > 0.001 && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPayModal(item)}
                          className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <Banknote className="h-3.5 w-3.5" /> Abonar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle de Compra */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalle de Compra
            </DialogTitle>
            <DialogDescription>
              {purchaseDetail?.invoice_number ? `Factura N°: ${purchaseDetail.invoice_number}` : `ID: ${purchaseDetail?.id}`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail || !purchaseDetail ? (
            <div className="py-8 text-center text-muted-foreground">Cargando detalles de la compra...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-secondary/30 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">Proveedor:</span>
                  <span className="font-bold text-foreground text-sm">{purchaseDetail.supplier_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tipo de Pago:</span>
                  <span className="font-semibold text-foreground uppercase">{purchaseDetail.payment_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tasa de Cambio:</span>
                  <span className="font-mono text-foreground">{purchaseDetail.exchange_rate} Bs/$</span>
                </div>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Costo U. ($)</TableHead>
                      <TableHead className="text-right">Total ($)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseDetail.items?.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-semibold">{it.product_name}</div>
                          {it.product_sku && <div className="text-xs text-muted-foreground font-mono">{it.product_sku}</div>}
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono">{it.quantity}</TableCell>
                        <TableCell className="text-right font-mono">${formatLocalNumber(it.unit_cost_usd)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">${formatLocalNumber(it.total_cost_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end space-y-1 font-mono text-sm pt-2">
                <div className="flex justify-between w-48 text-muted-foreground">
                  <span>Total USD:</span>
                  <span className="font-bold text-foreground">${formatLocalNumber(purchaseDetail.total_amount_usd)}</span>
                </div>
                <div className="flex justify-between w-48 text-emerald-600 dark:text-emerald-400">
                  <span>Pagado USD:</span>
                  <span className="font-bold">${formatLocalNumber(purchaseDetail.paid_amount_usd || 0)}</span>
                </div>
                <div className="flex justify-between w-48 text-amber-500 font-bold border-t border-border pt-1">
                  <span>Pendiente USD:</span>
                  <span>${formatLocalNumber(purchaseDetail.pending_amount_usd || 0)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pago / Abono a Crédito */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
              Registrar Abono a Compra
            </DialogTitle>
            <DialogDescription>
              {payPurchaseItem?.supplier_name} - Factura: {payPurchaseItem?.invoice_number || payPurchaseItem?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {payPurchaseItem && (
            <div className="space-y-4 py-2">
              <div className="bg-secondary/40 p-3 rounded-lg space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de la Compra:</span>
                  <span>${formatLocalNumber(payPurchaseItem.total_amount_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ya Pagado:</span>
                  <span className="text-emerald-600 font-bold">${formatLocalNumber(payPurchaseItem.paid_amount_usd || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-bold text-sm">
                  <span className="text-amber-500">Saldo Pendiente Actual:</span>
                  <span className="text-amber-500">${formatLocalNumber(payPurchaseItem.pending_amount_usd)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Monto a Abonar ($ USD)</label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary font-semibold"
                    onClick={() => setPayAmountInput(payPurchaseItem.pending_amount_usd.toString())}
                  >
                    Pagar Saldo Completo
                  </Button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payPurchaseItem.pending_amount_usd}
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="font-mono text-lg font-bold"
                />
                {parseFloat(payAmountInput) > 0 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Equivalente: Bs. {formatLocalNumber(parseFloat(payAmountInput) * exchangeRate)} (Tasa: {exchangeRate})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Notas / Referencia del Pago</label>
                <Input
                  placeholder="Ej: Transferencia Banco X #123456"
                  value={payNotesInput}
                  onChange={(e) => setPayNotesInput(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={payMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {payMutation.isPending ? "Procesando..." : "Confirmar Abono"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
