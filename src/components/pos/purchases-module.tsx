"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  PackageSearch,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  FileText,
  Building2,
  Box,
  LayoutGrid,
  List
} from "lucide-react"

import { ProductImage } from "./product-image"
import { ProductGridList } from "./product-grid-list"
import { Separator } from "@/components/ui/separator"

import { useProducts, Product } from "@/hooks/queries/use-inventory"
import { useSuppliers, Supplier } from "@/hooks/queries/use-suppliers"
import { useCreatePurchase } from "@/hooks/queries/use-purchases"
import { useSystemStatus } from "@/hooks/queries/use-system"
import { toast } from "sonner"
import { GenericSelector } from "@/components/shared/generic-selector"
import { cn } from "@/lib/utils"

// Helper para parsear números locales (Ej: "1.000.500,50" -> 1000500.5)
const parseLocalFloat = (val: string): number => {
  if (!val) return 0;
  const cleanStr = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(cleanStr) || 0;
}

// Helper para blindar la vista local de números
const formatLocalNumber = (num: number): string => {
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PurchaseItem extends Product {
  quantity: number
  lotsInput: string
  costInputUSD: string // String crudo sin formatear agresivo para permitir escritura fluida
  costInputBS: string
  internalCostUSD: number // Número matemático real
}

export function PurchasesModule() {
  const [searchTerm, setSearchTerm] = useState("")
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [supplierName, setSupplierName] = useState("")

  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem("purchases_view_preference")
    if (saved === "list" || saved === "cards") {
      setViewMode(saved)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode)
    localStorage.setItem("purchases_view_preference", mode)
  }

  const { data: dbProducts = [], isLoading: isLoadingProducts } = useProducts()
  const { data: dbSuppliers = [], isLoading: isLoadingSuppliers } = useSuppliers()
  const { data: config } = useSystemStatus()
  const createPurchase = useCreatePurchase()

  const exchangeRate = config?.current_exchange_rate_bs || 36.5

  // Lista de proveedores con la opción genérica incluida por defecto
  const suppliers = [
    {
      id: "generic-1",
      name: "Proveedor Genérico Externo",
      category: "GENÉRICO",
      identification_type: "RIF",
      identification_number: "00000000",
      phone: "000-0000000",
      is_active: true,
      is_synced: false,
      email: ""
    } as Supplier,
    ...dbSuppliers
  ]

  // En Compras/Recepción solo se muestran y procesan productos físicos reales.
  const physicalProducts = dbProducts.filter(p => p.product_type === "physical")

  const filteredProducts = physicalProducts.filter((product) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      (product.barcode || "").toLowerCase().includes(term) ||
      (product.tags || "").split(',').some(tag => tag.trim().toLowerCase().includes(term))

    return matchesSearch
  })

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const exactSkuOrBarcode = filteredProducts.find(
        (p) => p.sku.toLowerCase() === term || (p.barcode || "").toLowerCase() === term
      )
      if (exactSkuOrBarcode) {
        addToPurchase(exactSkuOrBarcode)
        toast.success(`Producto cargado: ${exactSkuOrBarcode.name}`)
        setSearchTerm("")
      } else if (filteredProducts.length === 1) {
        addToPurchase(filteredProducts[0])
        toast.success(`Producto cargado: ${filteredProducts[0].name}`)
        setSearchTerm("")
      }
    }
  }

  const addToPurchase = (product: Product) => {
    const defaultQty = product.package_quantity || 1;
    const existingItem = purchaseItems.find((item) => item.id === product.id)
    if (existingItem) {
      setPurchaseItems(
        purchaseItems.map((item) => {
          if (item.id === product.id) {
            const newQty = item.quantity + defaultQty;
            return { ...item, quantity: newQty, lotsInput: (newQty / defaultQty).toString() }
          }
          return item
        }
        )
      )
    } else {
      setPurchaseItems([...purchaseItems, {
        ...product,
        quantity: defaultQty,
        lotsInput: "1",
        costInputUSD: formatLocalNumber(product.cost_usd),
        costInputBS: formatLocalNumber(product.cost_usd * exchangeRate),
        internalCostUSD: product.cost_usd
      }])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setPurchaseItems(
      purchaseItems
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            const pq = item.package_quantity || 1;
            return { ...item, quantity: newQty, lotsInput: Number((newQty / pq).toFixed(2)).toString() }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const updateLots = (id: string, value: string) => {
    setPurchaseItems(
      purchaseItems.map(item => {
        if (item.id === id) {
          const pq = item.package_quantity || 1;
          const numericLots = parseFloat(value) || 0;
          return {
            ...item,
            lotsInput: value, // Mantener string para que pueda escribir decimal exacto si quiere
            quantity: Math.max(0, Math.floor(numericLots * pq))
          }
        }
        return item;
      })
    )
  }

  const updateCostUSD = (id: string, value: string) => {
    const numericUSD = parseLocalFloat(value)
    const numericBS = numericUSD * exchangeRate

    setPurchaseItems(
      purchaseItems.map(item =>
        item.id === id ? {
          ...item,
          costInputUSD: value, // Permite escritura alocada (e.g "1.000,")
          costInputBS: formatLocalNumber(numericBS), // Autocalcula estricto el otro campo
          internalCostUSD: numericUSD
        } : item
      )
    )
  }

  const updateCostBS = (id: string, value: string) => {
    const numericBS = parseLocalFloat(value)
    const numericUSD = numericBS / exchangeRate

    setPurchaseItems(
      purchaseItems.map(item =>
        item.id === id ? {
          ...item,
          costInputBS: value, // Permite escritura fluida sin saltos restrictivos
          costInputUSD: formatLocalNumber(numericUSD),
          internalCostUSD: numericUSD
        } : item
      )
    )
  }

  const handleBlur = (id: string, field: "USD" | "BS") => {
    // Cuando el usuario sale del input, re-formateamos la celda para que quede limpia.
    setPurchaseItems(items => items.map(item => {
      if (item.id === id) {
        if (field === "USD") {
          return { ...item, costInputUSD: formatLocalNumber(item.internalCostUSD) }
        } else {
          return { ...item, costInputBS: formatLocalNumber(item.internalCostUSD * exchangeRate) }
        }
      }
      return item;
    }))
  }

  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter((item) => item.id !== id))
  }

  const subtotal = purchaseItems.reduce(
    (sum, item) => sum + item.internalCostUSD * item.quantity,
    0
  )
  const totalBs = subtotal * exchangeRate

  const handleRegisterPurchase = async () => {
    if (purchaseItems.length === 0) {
      toast.error("Agregue al menos un producto a la orden")
      return
    }
    if (!supplierName.trim()) {
      toast.error("Seleccione o ingrese un proveedor válido")
      return
    }

    try {
      await createPurchase.mutateAsync({
        supplier_name: supplierName,
        total_amount_usd: subtotal,
        total_amount_bs: totalBs,
        items: purchaseItems.map(item => ({
          product_id: item.id!,
          quantity: item.quantity,
          unit_cost_usd: item.internalCostUSD,
          total_cost_usd: item.internalCostUSD * item.quantity
        }))
      })

      toast.success("Compra procesada y costos actualizados exitosamente.")
      setPurchaseItems([])
      setSupplierName("")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al procesar recepción de inventario")
    }
  }

  return (
    <div className="flex-1 flex gap-4 p-3 overflow-hidden bg-background">
      {/* Panel Izquierdo - Catálogo Estandarizado */}
      <div className="flex flex-1 flex-col gap-3 min-w-0">

        {/* Barra de búsqueda estandarizada y toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground font-bold" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto, código de barra o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-12 rounded-xl border-2 border-border bg-card pl-12 text-base font-bold text-foreground focus:border-primary focus:ring-primary shadow-sm"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-muted border border-border px-2 py-1 text-xs font-black text-foreground">
              F1
            </kbd>
          </div>
          <div className="flex bg-muted rounded-xl p-1 border-2 border-border">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={() => toggleViewMode("cards")}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={() => toggleViewMode("list")}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Grilla de Productos */}
        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-full opacity-50">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <Box className="w-8 h-8 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground tracking-wide">Sincronizando maestro...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-semibold tracking-wide">Búsqueda sin resultados</p>
            </div>
          ) : (
            <ProductGridList
              products={filteredProducts}
              viewMode={viewMode}
              exchangeRate={exchangeRate}
              priceMode="cost"
              onProductClick={(product) => addToPurchase(product)}
              renderListActions={() => (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10 rounded-full pointer-events-none">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            />
          )}
        </div>
      </div>

      {/* Panel Derecho - Recepción Detallada estilo Ticket */}
      <Card className="w-[640px] lg:w-[820px] xl:w-[520px] border-2 border-border shadow-xl flex flex-col shrink-0">
        <CardContent className="flex h-full flex-col p-2.5 gap-1.5">
          {/* Cabecera Entrada de Lote */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex flex-col">
              <h2 className="text-base font-black text-foreground leading-none flex items-center gap-1.5 uppercase">
                <ShoppingBag className="h-4 w-4 text-primary" /> Entrada de Lote
              </h2>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Ref: {new Date().toLocaleDateString("es-VE").replace(/\//g, '')}
              </p>
            </div>
          </div>

          {/* Selector de Proveedor */}
          <div className="flex flex-col gap-1">
            <GenericSelector
              title="Seleccionar Proveedor"
              description="Directorio Maestro de Proveedores de Xion POS"
              placeholder="Buscar por nombre, RIF o categoría..."
              items={suppliers}
              isLoading={isLoadingSuppliers}
              selectedValue={supplierName}
              onSelect={(s) => setSupplierName(s.name)}
              getItemValue={(s) => s.name}
              emptyMessage="No se encontró el proveedor."
              trigger={
                <div className="flex items-center gap-2 rounded-lg border-2 border-border bg-muted/40 px-2 py-0.5 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary cursor-pointer hover:border-primary transition-colors">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={cn(
                    "h-7 text-xs font-bold flex items-center flex-1 truncate",
                    supplierName ? "text-foreground font-black" : "text-muted-foreground"
                  )}>
                    {supplierName || "Seleccionar Proveedor u Origen..."}
                  </span>
                </div>
              }
              renderItem={(s) => (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm tracking-tight text-foreground">{s.name}</span>
                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-4">{s.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground font-mono text-[10px]">
                    <span>{s.identification_type}: {s.identification_number}</span>
                    <span className="opacity-50">•</span>
                    <span>{s.phone}</span>
                  </div>
                </div>
              )}
            />
          </div>

          <Separator className="bg-border h-[2px]" />

          {/* Contenedor principal de ítems */}
          <div className="flex-1 overflow-y-auto p-1 bg-background border-2 border-border rounded-md min-h-0 flex flex-col">
            {purchaseItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 opacity-40">
                <FileText className="h-10 w-10 text-foreground" />
                <p className="text-xs font-black text-center px-8 uppercase tracking-wide text-foreground">
                  Pulse en los ítems para construir el lote
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex gap-1.5 px-2 py-1 text-[0.65rem] font-black text-foreground uppercase tracking-widest border-b-2 border-border bg-muted/30">
                  <div className="flex-1">Producto</div>
                  <div className="w-10 text-center shrink-0">Lotes</div>
                  <div className="w-14 text-center shrink-0">Cant.</div>
                  <div className="w-22 text-right shrink-0">USD ($)</div>
                  <div className="w-24 text-right shrink-0">BS (Bs)</div>
                  <div className="w-16 text-right shrink-0">Total</div>
                  <div className="w-6 shrink-0"></div>
                </div>

                <div className="overflow-y-auto flex-1 space-y-1.5 p-1">
                  {purchaseItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col bg-card border-2 border-border hover:border-primary hover:shadow-md rounded-md overflow-visible transition-all"
                    >
                      <div className="flex items-center gap-1.5 p-1.5">
                        {/* Info Básica */}
                        <div className="flex-1 min-w-0 pr-1 select-none">
                          <h4 className="text-xs font-black text-foreground leading-tight truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[0.65rem] font-bold text-muted-foreground font-mono bg-muted/80 px-1 py-px rounded truncate">
                              {item.sku}
                            </span>
                            <span className="text-[0.65rem] font-bold text-primary whitespace-nowrap">Ant: ${item.cost_usd.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Lotes Input */}
                        <div className="flex items-center justify-center shrink-0 w-10 pr-0.5">
                          <div className="relative flex items-center w-full">
                            <span className="absolute left-0.5 text-[8px] text-muted-foreground font-black pointer-events-none">Lx</span>
                            <Input
                              type="text"
                              value={item.lotsInput}
                              onChange={(e) => updateLots(item.id!, e.target.value)}
                              className="w-full text-center text-xs font-black font-mono pl-3 pr-0.5 py-0 h-6 bg-muted/30 border-2 border-border rounded focus-visible:ring-0 focus-visible:border-primary transition-all"
                            />
                          </div>
                        </div>

                        {/* Cantidad Input Editable */}
                        <div className="flex items-center justify-center shrink-0 w-14">
                          <div className="flex w-full overflow-hidden rounded bg-muted/30 border-2 border-border text-foreground transition-all hover:border-primary/80 focus-within:border-primary">
                            <button onClick={() => updateQuantity(item.id!, -1)} className="w-4 flex items-center justify-center hover:bg-primary/20 font-black text-xs transition-colors">
                              -
                            </button>
                            <Input
                              type="text"
                              value={item.quantity === 0 ? "" : item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                                const parsedQty = isNaN(val) ? 0 : val;
                                setPurchaseItems(purchaseItems.map(i => i.id === item.id ? {
                                  ...i,
                                  quantity: parsedQty,
                                  lotsInput: Number((parsedQty / (i.package_quantity || 1)).toFixed(2)).toString()
                                } : i))
                              }}
                              onBlur={() => setPurchaseItems(items => items.filter(i => i.quantity > 0))}
                              className="flex-1 text-center text-xs font-black font-mono border-x-2 border-y-0 border-border p-0 h-6 bg-background rounded-none shadow-none focus-visible:ring-0 focus-visible:outline-none"
                            />
                            <button onClick={() => updateQuantity(item.id!, 1)} className="w-4 flex items-center justify-center hover:bg-primary/20 font-black text-xs transition-colors">
                              +
                            </button>
                          </div>
                        </div>

                        {/* Modificar Costo USD (Ampliado a w-22) */}
                        <div className="w-22 shrink-0 px-0.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-1.5 text-[9px] text-muted-foreground font-black pointer-events-none">$</span>
                            <Input
                              type="text"
                              value={item.costInputUSD || ""}
                              onChange={(e) => updateCostUSD(item.id!, e.target.value)}
                              onBlur={() => handleBlur(item.id!, "USD")}
                              className="h-6 text-xs font-black font-mono text-right pl-4 pr-1 py-0 rounded bg-background border-2 border-border shadow-none focus-visible:ring-0 focus-visible:border-primary transition-all"
                            />
                          </div>
                        </div>

                        {/* Modificar Costo BS (Ampliado a w-24) */}
                        <div className="w-29 shrink-0 px-0.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-1 text-[8px] text-emerald-600 font-black pointer-events-none">Bs</span>
                            <Input
                              type="text"
                              value={item.costInputBS || ""}
                              onChange={(e) => updateCostBS(item.id!, e.target.value)}
                              onBlur={() => handleBlur(item.id!, "BS")}
                              className="h-6 text-xs font-black font-mono text-right pl-4.5 pr-1 py-0 rounded bg-emerald-50/50 border-2 border-emerald-200 shadow-none focus-visible:ring-0 focus-visible:border-emerald-400 transition-all text-emerald-950"
                            />
                          </div>
                        </div>

                        {/* Total por item */}
                        <div className="w-16 text-right shrink-0">
                          <p className="text-xs font-black text-foreground tracking-tight font-mono whitespace-nowrap">
                            ${formatLocalNumber(item.internalCostUSD * item.quantity)}
                          </p>
                        </div>

                        {/* Botón Borrar */}
                        <div className="w-6 flex justify-end shrink-0">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:bg-destructive hover:text-white rounded transition-colors" onClick={() => removeItem(item.id!)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-border h-[2px]" />

          {/* Totales estilo Sales Module */}
          <div className="space-y-0.5 py-0.5">
            <div className="flex justify-between text-xs text-muted-foreground font-black">
              <span>INVERSIÓN LOTE</span>
              <span>${formatLocalNumber(subtotal)}</span>
            </div>
            <div className="flex items-end justify-between pt-0.5">
              <div className="flex flex-col">
                <span className="text-[0.7rem] font-black text-foreground tracking-tighter leading-none">TOTAL USD</span>
                <p className="text-xl font-black text-primary leading-none mt-0.5">
                  ${formatLocalNumber(subtotal)}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[0.65rem] font-black text-muted-foreground tracking-tighter opacity-80 mb-0.5">MONEDA LOCAL</p>
                <p className="text-sm font-black text-primary-foreground bg-primary px-2.5 py-0.5 rounded shadow-sm border-0">
                  <span className="text-[0.65rem] mr-1 opacity-90">BS</span>
                  {formatLocalNumber(totalBs)}
                </p>
              </div>
            </div>
          </div>

          {/* Botón de Acción Principal estilo Sales Module */}
          <Button
            disabled={purchaseItems.length === 0 || !supplierName.trim() || createPurchase.isPending}
            onClick={handleRegisterPurchase}
            className="w-full h-11 font-black text-sm uppercase rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 mt-1"
          >
            {createPurchase.isPending ? "Validando Transacción..." : "Liquidar Recepción de Ingreso"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
