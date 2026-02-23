"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  FileText,
} from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  category: string
  costPrice: number
  stock: number
  image: string
}

interface PurchaseItem extends Product {
  quantity: number
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Coca Cola 500ml",
    sku: "BEB-001",
    category: "Bebidas",
    costPrice: 0.8,
    stock: 45,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
  {
    id: "2",
    name: "Harina Pan Maíz Blanca 1kg",
    sku: "HAR-001",
    category: "Snacks",
    costPrice: 0.7,
    stock: 120,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
  {
    id: "3",
    name: "Lays Papas Clásicas 150g",
    sku: "SNK-001",
    category: "Snacks",
    costPrice: 1.2,
    stock: 85,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
  {
    id: "4",
    name: "Pan Bimbo Blanco Rebanado",
    sku: "PAN-001",
    category: "Comida",
    costPrice: 2.0,
    stock: 35,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
  {
    id: "5",
    name: "Leche Completa 1L",
    sku: "LEC-001",
    category: "Bebidas",
    costPrice: 1.1,
    stock: 22,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
  {
    id: "6",
    name: "Chocolate Savoy de Leche",
    sku: "CHO-001",
    category: "Varios",
    costPrice: 0.5,
    stock: 85,
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SZZAM2gCDtex5d93pvlJOQNl11mdrK.png",
  },
]

const categories = ["Todo", "Bebidas", "Snacks", "Comida", "Varios"]

export function PurchasesModule() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todo")
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [supplierName, setSupplierName] = useState("")
  const exchangeRate = 37.0

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === "Todo" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToPurchase = (product: Product) => {
    const existingItem = purchaseItems.find((item) => item.id === product.id)
    if (existingItem) {
      setPurchaseItems(
        purchaseItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setPurchaseItems([...purchaseItems, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setPurchaseItems(
      purchaseItems
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter((item) => item.id !== id))
  }

  const subtotal = purchaseItems.reduce(
    (sum, item) => sum + item.costPrice * item.quantity,
    0
  )
  const totalBs = subtotal * exchangeRate

  const handleRegisterPurchase = () => {
    if (purchaseItems.length === 0) {
      alert("Agregue productos a la compra")
      return
    }
    if (!supplierName.trim()) {
      alert("Ingrese el nombre del proveedor")
      return
    }
    alert(`Compra registrada exitosamente\nProveedor: ${supplierName}\nTotal: $${subtotal.toFixed(2)}`)
    setPurchaseItems([])
    setSupplierName("")
  }

  return (
    <div className="flex h-full overflow-hidden bg-background/50">
      {/* Left Panel - Products */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
        {/* Search Bar */}
        <div className="border-b border-border bg-card/50 p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto, código de barra o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 rounded-xl border-primary/30 pl-12 text-base focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-3 border-b border-border bg-card/30 px-6 py-4">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? "default" : "outline"}
              className={`rounded-xl ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border-border/50 bg-transparent hover:bg-accent/50"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer border-border/50 shadow-md transition-all hover:border-primary/50 hover:shadow-lg"
                onClick={() => addToPurchase(product)}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-muted to-accent">
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-16 w-16 text-primary/30" />
                    </div>
                    <Badge className="absolute right-2 top-2 bg-foreground/80 text-background">
                      Stock: {product.stock}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-foreground">
                      ${product.costPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bs {(product.costPrice * exchangeRate).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Purchase Order */}
      <div className="flex w-[420px] flex-col bg-card/80">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Orden de Compra
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <Input
            placeholder="Nombre del proveedor..."
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="h-12 rounded-xl border-primary/30"
          />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-auto p-6">
          {purchaseItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No hay productos en la orden
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Producto
                </span>
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Total
                </span>
              </div>

              {purchaseItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      ${item.costPrice.toFixed(2)} / un
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-base font-bold text-foreground">
                      ${(item.costPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Totals */}
        <div className="space-y-4 border-t border-border bg-card p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">
                ${subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-lg font-bold text-foreground">TOTAL</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ${subtotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bs {totalBs.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRegisterPurchase}
            disabled={purchaseItems.length === 0 || !supplierName.trim()}
            className="h-14 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            Registrar Compra
          </Button>
        </div>
      </div>
    </div>
  )
}
