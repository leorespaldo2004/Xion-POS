// filepath: src/components/pos/returns-module.tsx
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SecurityApprovalModal } from "@/components/shared/security-approval-modal";
import { useSales, Sale } from "@/hooks/queries/use-sales";
import { useSaleReturnableItems, useCreateReturn, ReturnableItem, SaleReturn } from "@/hooks/queries/use-returns";
import {
  RotateCcw,
  Search,
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ShieldCheck,
  PackageX,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ReturnsModuleProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSaleId?: string;
  selectedNoteData?: {
    id: string;
    client_name?: string;
    total_amount_usd?: number;
    exchange_rate?: number;
  };
}

export function ReturnsModule({ isOpen, onClose, preselectedSaleId, selectedNoteData }: ReturnsModuleProps) {
  // Estado local del módulo
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<SaleReturn | null>(null);

  // Queries & Mutations
  const { data: sales = [] } = useSales();
  const { data: returnableItems = [], isLoading: loadingItems } = useSaleReturnableItems(
    selectedSale?.id || preselectedSaleId || selectedNoteData?.id
  );
  const createReturnMutation = useCreateReturn();

  useEffect(() => {
    if (isOpen) {
      const targetId = preselectedSaleId || selectedNoteData?.id;
      if (targetId) {
        const match = sales.find((s) => s.id === targetId);
        if (match) {
          setSelectedSale(match);
        } else {
          setSelectedSale({
            id: targetId,
            client_name: selectedNoteData?.client_name || "Cliente Final",
            total_amount_usd: selectedNoteData?.total_amount_usd || 0,
            total_amount_bs: (selectedNoteData?.total_amount_usd || 0) * (selectedNoteData?.exchange_rate || 36.5),
            exchange_rate: selectedNoteData?.exchange_rate || 36.5,
            status: "completed",
            created_at: new Date().toISOString(),
          });
        }
      }
    } else {
      setSelectedSale(null);
      setCompletedReturn(null);
      setReturnQuantities({});
      setReason("");
    }
  }, [isOpen, preselectedSaleId, selectedNoteData, sales]);

  // Cambio de cantidad a devolver por producto
  const handleQuantityChange = (itemId: string, maxQty: number, val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) {
      setReturnQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      return;
    }
    const clamped = Math.min(parsed, maxQty);
    setReturnQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  // Selección rápida de todo el ítem
  const handleSelectAllItem = (item: ReturnableItem) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [item.sale_item_id]: prev[item.sale_item_id] === item.remaining_quantity ? 0 : item.remaining_quantity,
    }));
  };

  // Totales calculados en tiempo real
  const refundTotals = useMemo(() => {
    if (!returnableItems || returnableItems.length === 0) {
      return { subtotalUsd: 0, taxUsd: 0, totalUsd: 0, totalBs: 0 };
    }

    let subtotalUsd = 0;
    let taxUsd = 0;

    returnableItems.forEach((item) => {
      const qty = returnQuantities[item.sale_item_id] || 0;
      if (qty > 0) {
        const itemSubtotal = item.unit_price_usd * qty;
        const taxPerUnit = item.original_quantity > 0 ? item.tax_amount_usd / item.original_quantity : 0;
        const itemTax = taxPerUnit * qty;
        subtotalUsd += itemSubtotal;
        taxUsd += itemTax;
      }
    });

    const totalUsd = subtotalUsd + taxUsd;
    const rate = selectedSale?.exchange_rate || 36.5;
    const totalBs = totalUsd * rate;

    return {
      subtotalUsd,
      taxUsd,
      totalUsd,
      totalBs,
    };
  }, [returnableItems, returnQuantities, selectedSale]);

  const hasItemsToReturn = useMemo(() => {
    return Object.values(returnQuantities).some((qty) => qty > 0);
  }, [returnQuantities]);

  // Manejar click en "Procesar Devolución" -> Abre modal de supervisor
  const handleInitiateReturn = () => {
    if (!selectedSale) return;
    if (!hasItemsToReturn) {
      toast.error("Seleccione al menos un producto y una cantidad a devolver");
      return;
    }
    if (!reason.trim()) {
      toast.error("Ingrese el motivo de la devolución");
      return;
    }
    setShowApprovalModal(true);
  };

  // Cuando el supervisor aprueba en SecurityApprovalModal
  const handleSupervisorApproved = async (supervisorName?: string) => {
    if (!selectedSale) return;

    const itemsToSubmit = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, qty]) => {
        const item = returnableItems.find((i) => i.sale_item_id === saleItemId);
        return {
          sale_item_id: saleItemId,
          product_id: item?.product_id || "",
          quantity: qty,
        };
      });

    try {
      const result = await createReturnMutation.mutateAsync({
        sale_id: selectedSale.id,
        reason: reason.trim(),
        supervisor_id: supervisorName || "SUPERVISOR",
        items: itemsToSubmit,
      });

      setCompletedReturn(result);
      toast.success("Devolución procesada correctamente");
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Error al procesar la devolución";
      toast.error(detail);
    }
  };

  // Reset para procesar otra devolución
  const handleReset = () => {
    setSelectedSale(null);
    setReturnQuantities({});
    setReason("");
    setCompletedReturn(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-primary/20 shadow-2xl">
          {/* Header */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  Devolución & Nota de Crédito
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Procese devolución de productos con reposición de inventario
                </p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* PASO: Devolución Completada (Comprobante) */}
            {completedReturn ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-foreground">¡Devolución Procesada con Éxito!</h3>
                  <p className="text-xs text-muted-foreground">
                    El stock fue restituido al inventario y se registró la nota de crédito.
                  </p>
                </div>

                {/* Resumen del ticket de devolución */}
                <div className="w-full max-w-md p-6 rounded-2xl bg-muted/40 border border-border text-left space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground pb-3 border-b border-border">
                    <span>Comprobante #: <strong className="text-foreground">{completedReturn.id}</strong></span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      PROCESADA
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venta Origen:</span>
                      <span className="font-mono font-medium">{completedReturn.sale_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motivo:</span>
                      <span className="font-medium text-foreground">{completedReturn.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{new Date(completedReturn.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Tabla de Ítems devueltos */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Ítems Devueltos:</span>
                    {completedReturn.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs py-1">
                        <span>{it.quantity}x {it.product_name}</span>
                        <span className="font-mono font-semibold">${it.total_price_usd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="pt-3 border-t border-border space-y-1 text-right">
                    <div className="text-lg font-bold text-primary">
                      Total Reembolsado: ${completedReturn.total_amount_usd.toFixed(2)} USD
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bs. {completedReturn.total_amount_bs.toFixed(2)} (Tasa: {completedReturn.exchange_rate} Bs/$)
                    </div>
                  </div>
                </div>

                {/* Acciones del Comprobante */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => window.print()} className="gap-2">
                    <Printer className="h-4 w-4" /> Imprimir Comprobante
                  </Button>
                  <Button onClick={onClose} className="gap-2">
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : !selectedSale ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                Cargando datos del documento...
              </div>
            ) : (
              /* Selección de Ítems a Devolver */
              <div className="space-y-6">
                {/* Cabecera de la Venta Seleccionada */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Venta Seleccionada:</span>
                    <h4 className="text-base font-bold text-foreground font-mono">{selectedSale.id}</h4>
                    <p className="text-xs text-muted-foreground">Cliente: {selectedSale.client_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Monto Total Original:</span>
                    <div className="text-lg font-bold text-primary">${selectedSale.total_amount_usd.toFixed(2)} USD</div>
                    <div className="text-xs text-muted-foreground">Tasa: {selectedSale.exchange_rate} Bs/$</div>
                  </div>
                </div>

                {/* Tabla de Productos Devolvibles */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Productos de la Venta
                  </h4>

                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      Cargando ítems de la venta...
                    </div>
                  ) : returnableItems.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs">
                      Esta venta no contiene productos disponibles para devolución.
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden bg-background">
                      <div className="divide-y divide-border">
                        {returnableItems.map((item) => {
                          const currentQty = returnQuantities[item.sale_item_id] || 0;
                          const isFullyReturned = item.remaining_quantity <= 0;

                          return (
                            <div
                              key={item.sale_item_id}
                              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                                isFullyReturned ? "opacity-50 bg-muted/20" : currentQty > 0 ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                  {item.product_name}
                                  {isFullyReturned && (
                                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                                      DEVUELTO COMPLETO
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex gap-4">
                                  <span>Precio Unit: <strong>${item.unit_price_usd.toFixed(2)}</strong></span>
                                  <span>Vendido: <strong>{item.original_quantity}</strong></span>
                                  <span>Ya Devuelto: <strong>{item.already_returned_quantity}</strong></span>
                                  <span>Disponible: <strong className="text-primary">{item.remaining_quantity}</strong></span>
                                </div>
                              </div>

                              {/* Controles de Selección de Cantidad */}
                              {!isFullyReturned && (
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectAllItem(item)}
                                    className="text-xs h-9 px-3 border-border"
                                  >
                                    {currentQty === item.remaining_quantity ? "Desmarcar" : "Devolver Todo"}
                                  </Button>

                                  <div className="flex items-center gap-1">
                                    <Label className="text-xs text-muted-foreground">Cant:</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={item.remaining_quantity}
                                      step={1}
                                      value={currentQty === 0 ? "" : currentQty}
                                      onChange={(e) => handleQuantityChange(item.sale_item_id, item.remaining_quantity, e.target.value)}
                                      className="w-20 h-9 text-center font-bold text-sm border-border bg-background"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Motivo de la devolución */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Motivo de la Devolución <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ej. Producto defectuoso, cambio de talla, error en cobro..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-10 text-sm border-border bg-background"
                  />
                </div>

                {/* Tarjeta de Resumen de Reembolso */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal a Reembolsar:</span>
                    <span className="font-semibold">${refundTotals.subtotalUsd.toFixed(2)} USD</span>
                  </div>
                  {refundTotals.taxUsd > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Impuestos Reembolsados:</span>
                      <span className="font-semibold">${refundTotals.taxUsd.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">Monto Total a Devolver</span>
                      <span className="text-xs text-muted-foreground">Bs. {refundTotals.totalBs.toFixed(2)}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      ${refundTotals.totalUsd.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Botón de Acción Principal */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={onClose} className="h-11 border-border">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleInitiateReturn}
                    disabled={!hasItemsToReturn || !reason.trim() || createReturnMutation.isPending}
                    className="h-11 px-6 font-bold gap-2 shadow-lg shadow-primary/20"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Procesar Devolución
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Autorización del Supervisor */}
      <SecurityApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApproved={handleSupervisorApproved}
        requiredRole="manager"
        actionDescription={`Autorización requerida para procesar devolución por $${refundTotals.totalUsd.toFixed(2)} USD.`}
        actionRequired="VOID_SALE"
        entityId={selectedSale?.id || "RETURN"}
      />
    </>
  );
}
