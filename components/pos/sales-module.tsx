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
} from "lucide-react"
import { useState } from "react"
import { PaymentModal } from "./payment-modal"

interface Product {
  id: string
  name: string
  price: number
  priceBs: number
  stock: number
  image?: string
  category: string
  badge?: "promo" | "low"
}

interface CartItem extends Product {
  quantity: number
}

const mockProducts: Product[] = [
  { id: "1", name: "Coca Cola 500ml Original", price: 1.5, priceBs: 54.75, stock: 45, category: "bebidas", badge: undefined },
  { id: "2", name: "Harina Pan Maiz Blanca 1kg", price: 1.2, priceBs: 43.8, stock: 120, category: "comida" },
  { id: "3", name: "Lays Papas Clasicas 150g", price: 2.1, priceBs: 76.65, stock: 89, category: "snacks", badge: "promo" },
  { id: "4", name: "Pan Bimbo Blanco Rebanado", price: 3.5, priceBs: 127.75, stock: 12, category: "comida", badge: "low" },
  { id: "5", name: "Leche Completa 1L", price: 1.8, priceBs: 65.7, stock: 22, category: "bebidas" },
  { id: "6", name: "Chocolate Savoy de Leche", price: 0.9, priceBs: 32.85, stock: 85, category: "snacks" },
  { id: "7", name: "Arroz Mary 1kg", price: 1.1, priceBs: 40.15, stock: 156, category: "comida" },
  { id: "8", name: "Papel Higiénico Scott 4un", price: 3.2, priceBs: 116.8, stock: 34, category: "limpieza" },
]

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
  const [ticketNumber] = useState(10492)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "todo" || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.quantity + delta
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax
  const totalBs = total * 36.5

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

        {/* Category tabs */}
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              variant={activeCategory === category.id ? "default" : "outline"}
              className={`rounded-xl px-6 py-2 font-medium ${
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border-2 hover:bg-accent/50"
              }`}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => addToCart(product)}
              >
                <div className="relative aspect-square bg-gradient-to-br from-muted to-accent/20">
                  {product.badge && (
                    <Badge
                      className={`absolute right-2 top-2 ${
                        product.badge === "promo"
                          ? "bg-amber-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {product.badge === "promo" ? "Promo" : "Low"}
                    </Badge>
                  )}
                  <Badge className="absolute left-2 top-2 bg-foreground/90 text-background">
                    Stock: {product.stock}
                  </Badge>
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
                    🛒
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-2 line-clamp-2 font-semibold text-foreground">
                    {product.name}
                  </h3>
                  <p className="text-2xl font-bold text-primary">
                    ${product.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bs {product.priceBs.toFixed(2)}
                  </p>
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
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Receipt className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Fecha: {currentDate} {currentTime}
            </p>
          </div>

          {/* Client info */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="RIF / CI / Pasaporte"
              className="h-8 border-0 bg-transparent px-2 text-sm focus-visible:ring-0"
            />
          </div>

          <Separator />

          {/* Products header */}
          <div className="grid grid-cols-[1fr_60px_80px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Producto</div>
            <div className="text-center">Cant.</div>
            <div className="text-right">Total</div>
          </div>

          {/* Cart items */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Receipt className="h-12 w-12 opacity-20" />
                <p className="text-sm">No hay productos en el carrito</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_60px_80px] gap-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.price.toFixed(2)} / un
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (16%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground">TOTAL</span>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600">
                  ${total.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Bs {totalBs.toFixed(2)}</p>
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
        onConfirm={() => {
          setShowPaymentModal(false)
          setCart([])
          // Here you would process the sale
        }}
        totalAmount={total}
        totalAmountBs={totalBs}
      />
    </div>
  )
}
