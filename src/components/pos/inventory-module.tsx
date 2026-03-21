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
import { Textarea } from "@/components/ui/textarea"
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
import { Search, Plus, Edit, Trash2, AlertTriangle, Layers, Tag } from "lucide-react"

import { localApiClient } from "@/lib/api-client"
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
  ProductType,
  TaxType,
} from "@/hooks/queries/use-inventory"
import { useSystemStatus } from "@/hooks/queries/use-system"

const initialFormState = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  cost_usd: "0.00",
  price_usd: "0.00",
  min_stock_alert: "5",
  product_type: "physical" as ProductType,
  tax_type: "none" as TaxType,
  unit_measure: "UND",
}

export function InventoryModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [comboComponents, setComboComponents] = useState<Array<{ child_id: string; quantity_required: string }>>([])
  const [formData, setFormData] = useState(initialFormState)

  const { data: products = [] } = useProducts()
  const { data: systemStatus } = useSystemStatus()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const exchangeRate = systemStatus?.current_exchange_rate_bs || 1

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const loadComboComponents = async (comboId: string) => {
    try {
      const { data } = await localApiClient.get<{ child_id: string; quantity_required: number }[]>(`/inventory/products/${comboId}/components`)
      setComboComponents(data.map((c) => ({ child_id: c.child_id, quantity_required: c.quantity_required.toString() })))
    } catch {
      setComboComponents([])
    }
  }

  const handleOpenDialog = async (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        description: product.description || "",
        cost_usd: product.cost_usd.toString(),
        price_usd: product.price_usd.toString(),
        min_stock_alert: product.min_stock_alert.toString(),
        product_type: product.product_type,
        tax_type: product.tax_type,
        unit_measure: product.unit_measure,
      })
      if (product.product_type === "virtual") {
        await loadComboComponents(product.id)
      } else {
        setComboComponents([])
      }
    } else {
      setEditingProduct(null)
      setComboComponents([])
      setFormData(initialFormState)
    }
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || undefined,
      description: formData.description || undefined,
      cost_usd: parseFloat(formData.cost_usd) || 0,
      price_usd: parseFloat(formData.price_usd) || 0,
      min_stock_alert: formData.product_type === "service" ? 0 : parseFloat(formData.min_stock_alert) || 0,
      product_type: formData.product_type,
      tax_type: formData.tax_type,
      unit_measure: formData.unit_measure,
    }

    let savedProduct: Product
    if (editingProduct) {
      savedProduct = await updateMutation.mutateAsync({ id: editingProduct.id, data: payload })
    } else {
      savedProduct = await createMutation.mutateAsync(payload)
    }

    if (savedProduct.product_type === "virtual") {
      const normalized = comboComponents
        .filter((c) => c.child_id)
        .map((c) => ({ child_id: c.child_id, quantity_required: parseFloat(c.quantity_required) || 1 }))
      await localApiClient.put(`/inventory/products/${savedProduct.id}/components`, normalized)
    }

    setIsAddDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const isService = formData.product_type === "service"

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-background/50">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Total Productos</CardTitle></CardHeader>
          <CardContent><div className="flex items-baseline gap-2"><p className="text-3xl font-bold">{products.length}</p><Badge className="bg-emerald-100 text-emerald-700">Activos</Badge></div></CardContent>
        </Card>
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Valor Total (Costo)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">${products.reduce((sum, p) => sum + p.cost_usd * p.cached_stock_quantity, 0).toFixed(2)}</p><p className="text-sm text-muted-foreground">Bs {(products.reduce((sum, p) => sum + p.cost_usd * p.cached_stock_quantity, 0) * exchangeRate).toFixed(2)}</p></CardContent>
        </Card>
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2"><CardTitle>Stock Bajo</CardTitle></CardHeader>
          <CardContent><div className="flex items-baseline gap-2"><p className="text-3xl font-bold">{products.filter((p) => p.cached_stock_quantity <= p.min_stock_alert).length}</p><Badge className="bg-amber-100 text-amber-700">Alerta</Badge></div></CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, SKU o código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 rounded-xl border-2 pl-12" />
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-12 gap-2 rounded-xl font-semibold"><Plus className="h-4 w-4" /> Nuevo Producto</Button>
      </div>

      <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Costo / Precio</TableHead>
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
                    <TableCell><div className="font-medium">{product.name}</div>{product.barcode && <div className="text-xs text-muted-foreground mt-1"><Tag className="mr-1 h-3 w-3" />{product.barcode}</div>}</TableCell>
                    <TableCell><Badge className="bg-slate-100 text-slate-700 uppercase text-xs">{product.product_type}</Badge></TableCell>
                    <TableCell className="text-right"><div className="text-xs text-muted-foreground">C: ${product.cost_usd.toFixed(2)}</div><div className="font-bold text-primary">V: ${product.price_usd.toFixed(2)}</div></TableCell>
                    <TableCell className="text-center">{product.product_type === "service" ? <span className="text-xs text-muted-foreground italic">N/A</span> : <Badge className={isLowStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>{product.cached_stock_quantity} {product.unit_measure}</Badge>}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl shadow-2xl">
          <DialogHeader><DialogTitle>{editingProduct ? "Editar Producto" : "Registrar Producto"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="space-y-4 col-span-2 border-r pr-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU *</Label><Input value={formData.sku} disabled={!!editingProduct} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} /></div>
                <div className="space-y-2"><Label>Código de Barras</Label><Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Nombre *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-20" /></div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Tipo de Producto</Label><Select value={formData.product_type} onValueChange={(val: ProductType) => setFormData({ ...formData, product_type: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Físico</SelectItem><SelectItem value="service">Servicio</SelectItem><SelectItem value="virtual">Combo</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Tipo de Impuesto</Label><Select value={formData.tax_type} onValueChange={(val: TaxType) => setFormData({ ...formData, tax_type: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin impuesto</SelectItem><SelectItem value="vat">VAT</SelectItem><SelectItem value="islr">ISLR</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-2"><div className="space-y-2"><Label>Costo</Label><Input type="number" step="0.01" value={formData.cost_usd} onChange={(e) => setFormData({ ...formData, cost_usd: e.target.value })} disabled={formData.product_type === "service" || formData.product_type === "virtual"} /></div><div className="space-y-2"><Label>Precio</Label><Input type="number" step="0.01" value={formData.price_usd} onChange={(e) => setFormData({ ...formData, price_usd: e.target.value })} /></div></div>
              {!isService && <div className="space-y-2"><Label>Alerta de Stock</Label><Input type="number" value={formData.min_stock_alert} onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })} /></div>}
              {editingProduct && !isService && <div className="p-3 bg-muted rounded-lg border border-border"><Label className="text-muted-foreground text-xs uppercase">Stock actual</Label><div className="text-2xl font-semibold mt-1">{editingProduct.cached_stock_quantity} {editingProduct.unit_measure}</div></div>}

              {formData.product_type === "virtual" && (
                <div className="space-y-2 mt-3 border-t pt-3">
                  <Label>Componentes del Combo</Label>
                  {comboComponents.map((component, idx) => (
                    <div key={`${component.child_id}-${idx}`} className="flex gap-2 items-center">
                      <select className="flex-1 rounded-md border border-input p-2" value={component.child_id} onChange={(e) => {
                        const next = [...comboComponents];
                        next[idx].child_id = e.target.value;
                        setComboComponents(next);
                      }}>
                        <option value="">Seleccionar producto</option>
                        {products.filter((p) => p.id !== editingProduct?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <Input className="w-24" type="number" step="0.01" value={component.quantity_required} onChange={(e) => {
                        const next = [...comboComponents];
                        next[idx].quantity_required = e.target.value;
                        setComboComponents(next);
                      }} />
                      <Button variant="ghost" size="icon" onClick={() => setComboComponents(comboComponents.filter((_, i) => i !== idx))}>x</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setComboComponents([...comboComponents, { child_id: "", quantity_required: "1" }])}>Agregar componente</Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{editingProduct ? "Guardar" : "Crear"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
