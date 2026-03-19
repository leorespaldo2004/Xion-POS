"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, AlertTriangle, TrendingUp } from "lucide-react"

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
} from "@/hooks/queries/use-inventory"
import { useSystemStatus } from "@/hooks/queries/use-system"

export function InventoryModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price_usd: "",
    cost_usd: "",
    cached_stock_quantity: "",
    min_stock_alert: "",
    product_type: "physical",
    unit_measure: "UND",
  })

  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: systemStatus, isLoading: loadingSystem } = useSystemStatus()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const exchangeRate = systemStatus?.current_exchange_rate_bs || 1

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockProducts = products.filter((p) => p.cached_stock_quantity <= p.min_stock_alert)
  const totalValueUsd = products.reduce((sum, p) => sum + p.cost_usd * p.cached_stock_quantity, 0)

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        sku: product.sku,
        price_usd: product.price_usd.toString(),
        cost_usd: product.cost_usd.toString(),
        cached_stock_quantity: product.cached_stock_quantity.toString(),
        min_stock_alert: product.min_stock_alert.toString(),
        product_type: product.product_type,
        unit_measure: product.unit_measure,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: "",
        sku: "",
        price_usd: "",
        cost_usd: "",
        cached_stock_quantity: "",
        min_stock_alert: "",
        product_type: "physical",
        unit_measure: "UND",
      })
    }
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      name: formData.name,
      sku: formData.sku,
      price_usd: parseFloat(formData.price_usd) || 0,
      cost_usd: parseFloat(formData.cost_usd) || 0,
      cached_stock_quantity: parseFloat(formData.cached_stock_quantity) || 0,
      min_stock_alert: parseFloat(formData.min_stock_alert) || 0,
      product_type: formData.product_type,
      unit_measure: formData.unit_measure,
    }
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setIsAddDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm("�Est�s seguro de eliminar este producto?")) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-background/50">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Total Productos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{products.length}</p>
              <Badge className="bg-emerald-100 text-emerald-700"><TrendingUp className="mr-1 h-3 w-3" /> Activos</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Valor Total (Costo)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalValueUsd.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Bs {(totalValueUsd * exchangeRate).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Stock Bajo</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{lowStockProducts.length}</p>
              <Badge className="bg-amber-100 text-amber-700"><AlertTriangle className="mr-1 h-3 w-3" /> Alerta</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 rounded-xl border-2 border-primary/30 bg-card pl-12" />
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Agregar Producto</Button>
      </div>

      <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isLowStock = product.cached_stock_quantity <= product.min_stock_alert
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right"><div className="space-y-0.5"><p className="font-bold">${product.price_usd.toFixed(2)}</p><p className="text-xs text-muted-foreground">Bs {(product.price_usd * exchangeRate).toFixed(2)}</p></div></TableCell>
                    <TableCell className="text-center"><Badge className={`font-semibold ${isLowStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{product.cached_stock_quantity}</Badge></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl shadow-2xl">
          <DialogHeader><DialogTitle>{editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} /></div>
            <div className="space-y-2"><Label>Precio USD</Label><Input type="number" value={formData.price_usd} onChange={(e) => setFormData({ ...formData, price_usd: e.target.value })} /></div>
            <div className="space-y-2"><Label>Costo USD</Label><Input type="number" value={formData.cost_usd} onChange={(e) => setFormData({ ...formData, cost_usd: e.target.value })} /></div>
            <div className="space-y-2"><Label>Stock</Label><Input type="number" value={formData.cached_stock_quantity} onChange={(e) => setFormData({ ...formData, cached_stock_quantity: e.target.value })} /></div>
            <div className="space-y-2"><Label>Alerta</Label><Input type="number" value={formData.min_stock_alert} onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={createMutation.isLoading || updateMutation.isLoading}>{editingProduct ? "Guardar" : "Crear"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
