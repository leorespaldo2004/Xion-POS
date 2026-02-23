"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Upload,
  Download,
} from "lucide-react"
import { useState } from "react"

interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  priceBs: number
  stock: number
  minStock: number
  supplier: string
  lastUpdated: string
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Coca Cola 500ml Original",
    sku: "BEB-001",
    category: "Bebidas",
    price: 1.5,
    priceBs: 54.75,
    stock: 45,
    minStock: 20,
    supplier: "Distribuidora Polar",
    lastUpdated: "2024-01-15",
  },
  {
    id: "2",
    name: "Harina Pan Maiz Blanca 1kg",
    sku: "COM-002",
    category: "Comida",
    price: 1.2,
    priceBs: 43.8,
    stock: 120,
    minStock: 50,
    supplier: "Alimentos Polar",
    lastUpdated: "2024-01-14",
  },
  {
    id: "3",
    name: "Lays Papas Clasicas 150g",
    sku: "SNK-003",
    category: "Snacks",
    price: 2.1,
    priceBs: 76.65,
    stock: 89,
    minStock: 30,
    supplier: "PepsiCo",
    lastUpdated: "2024-01-13",
  },
  {
    id: "4",
    name: "Pan Bimbo Blanco Rebanado",
    sku: "COM-004",
    category: "Comida",
    price: 3.5,
    priceBs: 127.75,
    stock: 12,
    minStock: 15,
    supplier: "Bimbo de Venezuela",
    lastUpdated: "2024-01-12",
  },
]

export function InventoryModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState(mockProducts)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    minStock: "",
    supplier: "",
  })

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock)
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        supplier: product.supplier,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: "",
        sku: "",
        category: "",
        price: "",
        stock: "",
        minStock: "",
        supplier: "",
      })
    }
    setIsAddDialogOpen(true)
  }

  const handleSave = () => {
    if (editingProduct) {
      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                price: parseFloat(formData.price),
                priceBs: parseFloat(formData.price) * 36.5,
                stock: parseInt(formData.stock),
                minStock: parseInt(formData.minStock),
                supplier: formData.supplier,
                lastUpdated: new Date().toISOString().split("T")[0],
              }
            : p
        )
      )
    } else {
      const newProduct: Product = {
        id: (products.length + 1).toString(),
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price),
        priceBs: parseFloat(formData.price) * 36.5,
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        supplier: formData.supplier,
        lastUpdated: new Date().toISOString().split("T")[0],
      }
      setProducts([...products, newProduct])
    }
    setIsAddDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-background/50">
      {/* Header with stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{products.length}</p>
              <Badge className="bg-emerald-100 text-emerald-700">
                <TrendingUp className="mr-1 h-3 w-3" />
                Activos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              ${totalValue.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Bs {(totalValue * 36.5).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-amber-600">
                {lowStockProducts.length}
              </p>
              <Badge className="bg-amber-100 text-amber-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Alerta
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {new Set(products.map((p) => p.category)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and actions */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-2 border-primary/30 bg-card pl-12 text-base focus:border-primary focus:ring-primary"
          />
        </div>
        <Button
          variant="outline"
          className="h-12 gap-2 rounded-xl border-2 px-6 font-medium"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-2 font-semibold"
              onClick={() => {
                // Download template
                alert("Descargando plantilla Excel...")
              }}
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-2 font-semibold"
              onClick={() => {
                // Trigger file input
                const input = document.createElement("input")
                input.type = "file"
                input.accept = ".xlsx,.xls,.csv"
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    alert(`Importando archivo: ${file.name}`)
                  }
                }
                input.click()
              }}
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button
              onClick={() => setShowDialog(true)}
              className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Plus className="h-4 w-4" />
              Agregar Producto
            </Button>
          </div>
      </div>

      {/* Products table */}
      <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">SKU</TableHead>
                <TableHead className="font-semibold text-foreground">Producto</TableHead>
                <TableHead className="font-semibold text-foreground">Categoría</TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Precio
                </TableHead>
                <TableHead className="text-center font-semibold text-foreground">
                  Stock
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Proveedor
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.minStock
                return (
                  <TableRow
                    key={product.id}
                    className="border-border hover:bg-accent/30 transition-colors"
                  >
                    <TableCell className="font-mono font-medium text-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-accent text-xl">
                          📦
                        </div>
                        <span className="font-medium text-foreground">
                          {product.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">
                          ${product.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bs {product.priceBs.toFixed(2)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`font-semibold ${
                          isLowStock
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.supplier}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {editingProduct
                ? "Actualiza la información del producto"
                : "Completa los datos del nuevo producto"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                Nombre del Producto
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="Ej: Coca Cola 500ml"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="text-sm font-semibold text-foreground">
                SKU / Código
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="BEB-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-foreground">
                Categoría
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-10 rounded-lg border-primary/30">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bebidas">Bebidas</SelectItem>
                  <SelectItem value="Comida">Comida</SelectItem>
                  <SelectItem value="Snacks">Snacks</SelectItem>
                  <SelectItem value="Limpieza">Limpieza</SelectItem>
                  <SelectItem value="Varios">Varios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold text-foreground">
                Precio (USD)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="text-sm font-semibold text-foreground">
                Stock Actual
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock" className="text-sm font-semibold text-foreground">
                Stock Mínimo
              </Label>
              <Input
                id="minStock"
                type="number"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="0"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="supplier" className="text-sm font-semibold text-foreground">
                Proveedor
              </Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="border-2 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl bg-primary px-8 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {editingProduct ? "Guardar Cambios" : "Agregar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
