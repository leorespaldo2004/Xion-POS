"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Minus,
  Plus,
  Receipt,
  Percent,
  Settings,
  CreditCard,
  User,
  Lock,
  Unlock,
  PauseCircle,
  Archive,
  Clock,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProducts, Product } from "@/hooks/queries/use-inventory"
import { useCreateSale, SaleCreateDTO } from "@/hooks/queries/use-sales"
import { useSystemStatus } from "@/hooks/queries/use-system"
import { useClients, Client } from "@/hooks/queries/use-clients"
import { PaymentModal } from "./payment-modal"
import { QuickClientModal } from "./quick-client-modal"
import { toast } from "sonner"

// Helper para formatear números al estilo local (1.000.000,00)
const formatLocalNumber = (num: number): string => {
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CartItem extends Product {
  cart_quantity: number
}

interface HoldSale {
  id: string
  name: string
  cart: CartItem[]
  clientIdentifier: string
  selectedClient: Client | null
  timestamp: Date
}

const categories = [
  { id: "todo", label: "Todo" },
  { id: "bebidas", label: "Bebidas" },
  { id: "snacks", label: "Snacks" },
  { id: "limpieza", label: "Limpieza" },
  { id: "comida", label: "Comida" },
  { id: "varios", label: "Varios" },
]

export function SalesModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("todo")
  const [cart, setCart] = useState<CartItem[]>([])
  const [ticketNumber, setTicketNumber] = useState(10492)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [clientIdentifier, setClientIdentifier] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showQuickClient, setShowQuickClient] = useState(false)
  const [heldSales, setHeldSales] = useState<HoldSale[]>([])
  const [showHoldModal, setShowHoldModal] = useState(false)
  
  const { data: config } = useSystemStatus()
  const { data: dbProducts = [] } = useProducts()
  const { data: clients = [] } = useClients()
  const createSale = useCreateSale()

  const handleClientSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && clientIdentifier.trim() !== "") {
      const term = clientIdentifier.trim().toLowerCase()
      const match = clients.find(c => c.identification_number.toLowerCase() === term)
      if (match) {
        setSelectedClient(match)
        toast.success(`Cliente verificado: ${match.name}`)
      } else {
        setShowQuickClient(true)
      }
    }
  }

  const handleHoldSale = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío.")
      return
    }
    
    const holdName = selectedClient ? `Venta de ${selectedClient.name}` : `Ticket en Espera #${ticketNumber}`
    const newHold: HoldSale = {
      id: crypto.randomUUID(),
      name: holdName,
      cart: [...cart],
      clientIdentifier,
      selectedClient,
      timestamp: new Date()
    }
    
    setHeldSales([...heldSales, newHold])
    
    // Clean current state
    setCart([])
    setClientIdentifier("")
    setSelectedClient(null)
    setTicketNumber(prev => prev + 1)
    
    toast.success("Venta pausada exitosamente.")
  }

  const handleResumeSale = (hold: HoldSale) => {
    if (cart.length > 0) {
      if (!confirm("Tienes productos en la venta actual. ¿Deseas reemplazarla? Se perderán los cambios en la pantalla.")) return
    }
    
    setCart(hold.cart)
    setClientIdentifier(hold.clientIdentifier)
    setSelectedClient(hold.selectedClient)
    setHeldSales(heldSales.filter(h => h.id !== hold.id))
    setShowHoldModal(false)
    toast.info(`Retomando: ${hold.name}`)
  }

  const handleDeleteHold = (id: string) => {
    setHeldSales(heldSales.filter(h => h.id !== id))
    toast.success("Venta en espera descartada.")
  }

  const enableTaxes = config?.enable_taxes ?? true
  const taxRatePercent = config?.tax_rate ?? 16.0
  const exchangeRate = config?.current_exchange_rate_bs || 36.5

  const filteredProducts = dbProducts.filter((product) => {
    const term = searchQuery.toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      (product.barcode || "").toLowerCase().includes(term) ||
      (product.tags || "").split(',').some(tag => tag.trim().toLowerCase().includes(term))
      
    // Active category logic can be expanded. For now, match tags with category.
    const matchesCategory = activeCategory === "todo" || (product.tags || "").toLowerCase().includes(activeCategory)
    
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, cart_quantity: item.cart_quantity + 1 } : item
        )
      )
    } else {
      setCart([...cart, { ...product, cart_quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.cart_quantity + delta
            return newQuantity > 0 ? { ...item, cart_quantity: newQuantity } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price_usd * item.cart_quantity, 0)
  const tax = enableTaxes ? subtotal * (taxRatePercent / 100) : 0
  const total = subtotal + tax
  const totalBs = total * exchangeRate

  const currentDate = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const currentTime = new Date().toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className="flex h-full gap-6 p-6 bg-background">
      {/* Left side - Products */}
      <div className="flex flex-1 flex-col gap-6">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto, código de barra o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 rounded-xl border-2 border-primary/30 bg-card pl-12 text-base focus:border-primary focus:ring-primary"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            F1
          </kbd>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative cursor-pointer border-2 border-border/60 bg-background overflow-hidden rounded-lg hover:shadow-md hover:border-primary/50 flex flex-col h-[142px] transition-all"
              >
                <div className="absolute top-1.5 left-1.5 z-10">
                  {product.product_type === "service" ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-black font-mono tracking-tighter bg-blue-600 text-white rounded shadow-sm border border-blue-500/50">
                      SERV
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] font-black font-mono tracking-tighter bg-foreground/90 text-background rounded shadow-sm border border-foreground/50">
                      {product.cached_stock_quantity}
                    </span>
                  )}
                </div>

                <div className="flex-1 bg-muted/20 w-full flex items-center justify-center relative border-b border-border/40">
                   <div className="text-4xl opacity-10 group-hover:scale-110 transition-transform duration-300">🛒</div>
                   <div className="absolute bottom-1.5 right-1.5 bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm border border-border/50">
                      ${formatLocalNumber(product.price_usd)}
                   </div>
                </div>

                <CardContent className="p-2.5 shrink-0 bg-card/30">
                   <h3 className="line-clamp-1 text-[11px] font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {product.name}
                   </h3>
                   <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/30">
                      <p className="text-[12px] font-black text-emerald-600 font-mono tracking-tight">
                         <span className="text-[8px] opacity-70 mr-0.5">BS</span>
                         {formatLocalNumber(product.price_usd * exchangeRate)}
                      </p>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Ticket/Cart */}
      <Card className="w-[420px] border-border/50 shadow-xl">
        <CardContent className="flex h-full flex-col gap-4 p-6">
          {/* Ticket header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Ticket #{ticketNumber}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowHoldModal(true)} className="h-9 relative border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 transition-colors shadow-none font-bold">
                  <PauseCircle className="h-4 w-4 mr-1.5" />
                  En Espera
                  {heldSales.length > 0 && (
                     <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-amber-500 hover:bg-amber-600 shadow-sm border-2 border-background animate-in zoom-in">
                       {heldSales.length}
                     </Badge>
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10" onClick={handleHoldSale} title="Aparcar Venta (Pausar)">
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Fecha: {currentDate} {currentTime}
            </p>
          </div>

          {/* Client info */}
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all outline-none focus-within:ring-2 focus-within:ring-primary/20 ${selectedClient ? 'bg-emerald-50/50 border-emerald-500/30' : 'border-border/50 bg-muted/30'}`}>
              {selectedClient ? <Lock className="h-4 w-4 text-emerald-600 shrink-0" /> : <User className="h-4 w-4 text-muted-foreground shrink-0" />}
              <Input
                placeholder="Cédula/RIF y presione Enter..."
                value={clientIdentifier}
                onChange={(e) => {
                   setClientIdentifier(e.target.value)
                   if(selectedClient) setSelectedClient(null)
                }}
                onKeyDown={handleClientSearch}
                readOnly={!!selectedClient}
                autoComplete="off"
                className={`h-8 border-0 bg-transparent px-2 text-sm focus-visible:ring-0 w-full ${selectedClient ? 'text-emerald-800 font-bold' : ''}`}
              />
              {selectedClient && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 shrink-0" onClick={() => { setSelectedClient(null); setClientIdentifier("") }}>
                  <Unlock className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${selectedClient ? 'max-h-12 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
               {selectedClient && (
                 <div className="px-2 pb-1 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-black text-emerald-700 leading-tight">
                        {selectedClient.name}
                      </p>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-emerald-600/70 mt-0.5">
                        {selectedClient.email || 'CLIENTE REGISTRADO'}
                      </p>
                    </div>
                    {selectedClient.current_debt > 0 && (
                      <Badge variant="destructive" className="text-[9px] font-bold">Deuda: ${formatLocalNumber(selectedClient.current_debt)}</Badge>
                    )}
                 </div>
               )}
            </div>
          </div>

          <Separator />

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-2 bg-background">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 opacity-30">
                <Receipt className="h-10 w-10" />
                <p className="text-[11px] font-bold text-center px-8 uppercase tracking-wide">
                  No hay productos en el carrito
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-1.5 px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b-2 border-border/40">
                  <div className="flex-1">Producto</div>
                  <div className="w-20 text-center shrink-0">Cant.</div>
                  <div className="w-16 text-right shrink-0">Total ($)</div>
                  <div className="w-6 shrink-0"></div>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col bg-card border-2 border-border/50 hover:border-primary/50 hover:shadow-sm rounded-md overflow-visible transition-colors"
                  >
                    <div className="flex items-center gap-2 p-1.5">
                      {/* Info Básica */}
                      <div className="flex-1 min-w-0 pr-1 select-none">
                        <h4 className="text-[11px] font-bold text-foreground leading-tight truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[9px] text-muted-foreground font-mono bg-muted/50 px-1 py-px rounded truncate">
                              {item.sku}
                           </span>
                           <span className="text-[9px] text-primary/70 font-medium whitespace-nowrap">${formatLocalNumber(item.price_usd)}/u</span>
                        </div>
                      </div>

                      {/* Cantidad Input Editable */}
                      <div className="flex items-center justify-center shrink-0 w-20">
                          <div className="flex w-full overflow-hidden rounded bg-muted/20 border-2 border-border/50 text-foreground transition-all hover:border-border/80 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-5 flex items-center justify-center hover:bg-muted font-bold transition-colors">
                               -
                            </button>
                            <Input 
                              type="text" 
                              value={item.cart_quantity === 0 ? "" : item.cart_quantity} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                                const parsedQty = isNaN(val) ? 0 : val;
                                setCart(cart.map(i => i.id === item.id ? { ...i, cart_quantity: parsedQty } : i))
                              }}
                              onBlur={() => setCart(c => c.filter(i => i.cart_quantity > 0))}
                              className="flex-1 text-center text-[11px] font-black font-mono border-x-2 border-y-0 border-border/50 p-0 h-6 bg-background rounded-none shadow-none focus-visible:ring-0 focus-visible:outline-none"
                            />
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-5 flex items-center justify-center hover:bg-muted font-bold transition-colors">
                               +
                            </button>
                          </div>
                      </div>

                      <div className="w-16 text-right shrink-0">
                        <p className="text-[12px] font-black text-foreground tracking-tight font-mono whitespace-nowrap">
                           ${formatLocalNumber(item.price_usd * item.cart_quantity)}
                        </p>
                      </div>

                      {/* Botón Borrar */}
                      <div className="w-6 flex justify-end shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-6 w-6 bg-transparent hover:bg-destructive hover:text-white rounded" onClick={() => setCart(c => c.filter(i => i.id !== item.id))}>
                           <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium">${formatLocalNumber(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{enableTaxes ? `IVA (${taxRatePercent}%)` : `IVA (Exento/No Aplicable)`}</span>
              <span className="font-medium">${formatLocalNumber(tax)}</span>
            </div>
            <Separator />
            <div className="flex items-start justify-between">
              <span className="text-base font-bold text-foreground mt-1">TOTAL</span>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-600 leading-none">
                  ${formatLocalNumber(total)}
                </p>
                <div className="mt-2 inline-flex flex-col items-end">
                   <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-0.5 opacity-70">Total en Bolívares</p>
                   <p className="text-lg font-black text-foreground bg-secondary/30 px-3 py-1 rounded-md border-2 border-border/10">
                    <span className="text-[10px] mr-1 opacity-60">Bs</span> 
                    {formatLocalNumber(totalBs)}
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl border-2 font-medium"
            >
              <Percent className="h-4 w-4" />
              F3 Descuento
            </Button>
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl border-2 font-medium"
            >
              <Settings className="h-4 w-4" />
              F10 Opciones
            </Button>
          </div>

          <Button
            disabled={cart.length === 0}
            onClick={() => setShowPaymentModal(true)}
            className="h-14 gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-lg"
          >
            <CreditCard className="h-5 w-5" />
            COBRAR
            <kbd className="ml-2 rounded bg-emerald-700 px-2 py-1 text-xs">F5</kbd>
          </Button>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={async (method: string) => {
          try {
            const payload: SaleCreateDTO = {
              client_id: selectedClient?.id,
              client_name: selectedClient ? selectedClient.name : "Cliente Final",
              subtotal_usd: subtotal,
              tax_amount_usd: tax,
              total_amount_usd: total,
              total_amount_bs: totalBs,
              exchange_rate: exchangeRate,
              payment_method: method,
              items: cart.map(i => ({
                 product_id: i.id,
                 product_name: i.name,
                 quantity: i.cart_quantity,
                 unit_price_usd: i.price_usd,
                 tax_amount_usd: enableTaxes ? i.price_usd * (taxRatePercent/100) * i.cart_quantity : 0,
                 total_price_usd: enableTaxes ? (i.price_usd * (1 + taxRatePercent/100)) * i.cart_quantity : i.price_usd * i.cart_quantity
              }))
            }
            
            await createSale.mutateAsync(payload)
            toast.success("Venta completada. Imprimiendo Ticket...")
            setShowPaymentModal(false)
            setCart([])
            setTicketNumber(prev => prev + 1)
            setClientIdentifier("")
            setSelectedClient(null)
          } catch (e: any) {
             toast.error(e.response?.data?.detail || "Error interno procesando la venta.")
          }
        }}
        totalAmount={total}
        totalAmountBs={totalBs}
      />

      <QuickClientModal 
         open={showQuickClient}
         onClose={() => setShowQuickClient(false)}
         initialIdNumber={clientIdentifier}
         onClientCreated={(newClient) => {
             setSelectedClient(newClient);
             setClientIdentifier(newClient.identification_number);
         }}
      />

      <Dialog open={showHoldModal} onOpenChange={setShowHoldModal}>
        <DialogContent className="max-w-[500px] p-0 overflow-hidden shadow-2xl rounded-2xl border-0">
           <DialogHeader className="p-5 bg-amber-500/10 border-b border-amber-500/20">
             <DialogTitle className="text-lg font-black text-amber-900 flex items-center gap-2">
               <PauseCircle className="h-5 w-5 text-amber-600" />
               Ventas en Espera ({heldSales.length})
             </DialogTitle>
           </DialogHeader>
           <div className="p-2 max-h-[400px] overflow-y-auto bg-muted/10">
             {heldSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 opacity-50 gap-2 text-muted-foreground">
                   <Archive className="w-12 h-12" />
                   <p className="text-sm font-semibold text-center">No hay ventas pausadas.</p>
                </div>
             ) : (
                <div className="space-y-2">
                  {heldSales.map(hold => {
                    const heldTotal = hold.cart.reduce((s, i) => s + (i.price_usd * i.cart_quantity), 0)
                    return (
                      <div key={hold.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-border/50 bg-background hover:border-amber-500/50 transition-colors group shadow-sm">
                         <div>
                            <p className="font-bold text-sm text-foreground">{hold.name}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium mt-1">
                               <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {hold.timestamp.toLocaleTimeString("es-VE", {hour: '2-digit', minute:'2-digit'})}</span>
                               <span>Items: {hold.cart.reduce((s, i) => s + i.cart_quantity, 0)}</span>
                               <span className="font-bold text-amber-600/80">${formatLocalNumber(heldTotal)}</span>
                            </div>
                         </div>
                         <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" className="h-8 shadow-none" onClick={() => handleResumeSale(hold)}>
                               Retomar
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteHold(hold.id)}>
                               <Trash2 className="w-4 h-4" />
                            </Button>
                         </div>
                      </div>
                    )
                  })}
                </div>
             )}
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
