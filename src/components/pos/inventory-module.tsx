"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Search, Plus, Edit, Trash2, Tag, Box, Layers, DollarSign, Info, ListChecks, ShoppingBag } from "lucide-react"

import { localApiClient } from "@/lib/api-client"
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
} from "@/hooks/queries/use-inventory"
import { useSystemStatus } from "@/hooks/queries/use-system"
import { toast } from "sonner"

// Esquema Zod de validación alineado con Backend
const productSchema = z.object({
  sku: z.string().min(3, "El SKU debe tener al menos 3 caracteres"),
  name: z.string().min(2, "El nombre es obligatorio"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  cost_usd: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  price_usd: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  min_stock_alert: z.coerce.number().min(0, "No puede ser negativo"),
  product_type: z.enum(["physical", "service", "virtual"]),
  tax_type: z.enum(["none", "vat", "islr"]),
  unit_measure: z.string().min(1, "Obligatorio (ej: UND)"),
  combo_items: z.array(z.object({
    product_id: z.string().min(1, "Debe seleccionar un producto"),
    quantity: z.coerce.number().min(0.001, "Mínimo 0.001")
  })).optional().default([]),
})

type ProductFormValues = z.infer<typeof productSchema>

export function InventoryModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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
      (product.barcode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.tags || "").split(',').some(tag => tag.trim().toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      tags: "",
      cost_usd: 0,
      price_usd: 0,
      min_stock_alert: 5,
      product_type: "physical",
      tax_type: "none",
      unit_measure: "UND",
      combo_items: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "combo_items"
  })

  const watchProductType = form.watch("product_type")
  const watchComboItems = form.watch("combo_items")
  const watchCost = form.watch("cost_usd") || 0
  const watchPrice = form.watch("price_usd") || 0
  
  const isVirtual = watchProductType === "virtual"
  const isService = watchProductType === "service"
  const profitMargin = watchPrice > 0 ? ((watchPrice - watchCost) / watchPrice) * 100 : 0

  // Cálculo automático de costo para combos en el formulario
  useEffect(() => {
    if (isVirtual && watchComboItems && watchComboItems.length > 0) {
      const calculatedCost = watchComboItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id)
        return sum + (product ? product.cost_usd * item.quantity : 0)
      }, 0)
      form.setValue("cost_usd", Number(calculatedCost.toFixed(2)))
    }
  }, [watchComboItems, isVirtual, products, form])

  // Cálculo de stock proyectado para combos (referencia visual)
  const projectedComboStock = isVirtual && watchComboItems && watchComboItems.length > 0
    ? Math.floor(Math.min(...watchComboItems.map(item => {
        const product = products.find(p => p.id === item.product_id)
        if (!product || item.quantity <= 0) return 0
        return product.cached_stock_quantity / item.quantity
      })))
    : 0

  const handleOpenDialog = async (product?: Product) => {
    form.reset()
    if (product) {
      setEditingProduct(product)
      form.setValue("name", product.name)
      form.setValue("sku", product.sku)
      form.setValue("barcode", product.barcode || "")
      form.setValue("description", product.description || "")
      form.setValue("tags", product.tags || "")
      form.setValue("cost_usd", product.cost_usd)
      form.setValue("price_usd", product.price_usd)
      form.setValue("min_stock_alert", product.min_stock_alert)
      form.setValue("product_type", product.product_type)
      form.setValue("tax_type", product.tax_type)
      form.setValue("unit_measure", product.unit_measure)
      
      if (product.product_type === "virtual") {
        try {
          const { data } = await localApiClient.get<{ child_id: string; quantity_required: number }[]>(`/inventory/products/${product.id}/components`)
          form.setValue("combo_items", data.map(d => ({ product_id: d.child_id, quantity: d.quantity_required })))
        } catch {
          form.setValue("combo_items", [])
        }
      } else {
        form.setValue("combo_items", [])
      }
    } else {
      setEditingProduct(null)
      form.reset({
        name: "",
        sku: "",
        barcode: "",
        description: "",
        tags: "",
        cost_usd: 0,
        price_usd: 0,
        min_stock_alert: 5,
        product_type: "physical",
        tax_type: "none",
        unit_measure: "UND",
        combo_items: []
      })
    }
    setIsAddDialogOpen(true)
  }

  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (isVirtual && data.combo_items && data.combo_items.length === 0) {
        toast.error("Un combo debe tener al menos 1 producto")
        return
      }

      if (editingProduct) {
        const { combo_items, ...updatePayload } = data
        if (updatePayload.product_type === "service") {
            updatePayload.min_stock_alert = 0
            updatePayload.cost_usd = 0 
        }
        await updateMutation.mutateAsync({ id: editingProduct.id, data: updatePayload })
        
        if (isVirtual && combo_items) {
          const normalized = combo_items.map((c) => ({ child_id: c.product_id, quantity_required: c.quantity }))
          await localApiClient.put(`/inventory/products/${editingProduct.id}/components`, normalized)
        }
        toast.success("Producto modificado correctamente")
      } else {
        const payload = {
            ...data,
            combo_items: isVirtual ? data.combo_items : undefined,
            min_stock_alert: isService ? 0 : data.min_stock_alert,
            cost_usd: isService ? 0 : data.cost_usd
        }
        await createMutation.mutateAsync(payload)
        toast.success("Producto creado exitosamente")
      }
      setIsAddDialogOpen(false)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al procesar el producto")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success("Producto eliminado")
      } catch (e) {
        toast.error("Error al eliminar producto")
      }
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-background/50">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Box className="w-5 h-5 text-primary" /> Total Productos</CardTitle></CardHeader>
          <CardContent><div className="flex items-baseline gap-2"><p className="text-3xl font-bold">{products.length}</p><Badge className="bg-emerald-100/50 text-emerald-700">Activos</Badge></div></CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500"/> Valor Costo</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">${products.reduce((sum, p) => sum + p.cost_usd * p.cached_stock_quantity, 0).toFixed(2)}</p><p className="text-sm text-muted-foreground">Bs {(products.reduce((sum, p) => sum + p.cost_usd * p.cached_stock_quantity, 0) * exchangeRate).toFixed(2)}</p></CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-amber-500"/> Stock Bajo</CardTitle></CardHeader>
          <CardContent><div className="flex items-baseline gap-2"><p className="text-3xl font-bold">{products.filter((p) => p.cached_stock_quantity <= p.min_stock_alert && p.product_type !== 'service').length}</p><Badge className="bg-amber-100/50 text-amber-700">En alerta</Badge></div></CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, SKU, etiquetas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 rounded-xl border-border bg-card pr-4 pl-12 text-base shadow-sm focus-visible:ring-primary/20" />
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-12 gap-2 rounded-xl font-semibold shadow-md"><Plus className="h-5 w-5" /> Registrar Producto</Button>
      </div>

      <Card className="flex-1 overflow-hidden border-border/50 shadow-md">
        <div className="overflow-x-auto h-[calc(100vh-320px)] relative">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-md z-10">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Costo / Precio (USD)</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isLowStock = product.cached_stock_quantity <= product.min_stock_alert && product.product_type !== "service"
                return (
                  <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.barcode && <Badge variant="ghost" className="text-[10px] h-4 px-1 flex items-center gap-1 opacity-70"><Tag className="h-2 w-2" /> {product.barcode}</Badge>}
                        {product.tags && product.tags.split(',').map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] h-4 px-1">{tag.trim()}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={product.product_type === 'virtual' ? "bg-purple-100/30 text-purple-700 border-purple-200" : product.product_type === 'service' ? "bg-blue-100/30 text-blue-700 border-blue-200" : "bg-slate-100/50 text-slate-700"}>
                        {product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.product_type !== 'service' && <div className="text-xs text-muted-foreground">C: ${product.cost_usd.toFixed(2)}</div>}
                      <div className="font-bold text-primary">V: ${product.price_usd.toFixed(2)}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {product.product_type === "service" ? <span className="text-xs text-muted-foreground">∞ Ilimitado</span> : <Badge className={isLowStock ? "bg-red-100 hover:bg-red-100 text-red-700 shadow-none border-red-200" : "bg-emerald-100 hover:bg-emerald-100 text-emerald-700 shadow-none border-emerald-200"}>{product.cached_stock_quantity} {product.unit_measure}</Badge>}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)} className="hover:bg-primary/10 hover:text-primary"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 shadow-2xl rounded-2xl border-0">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                {editingProduct ? <Edit className="h-5 w-5"/> : <ShoppingBag className="h-5 w-5"/>}
              </span>
              {editingProduct ? "Edición de Producto" : "Registro de nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
              
              {/* Bloque 1: Identificación Básica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2 mb-4">
                  <Info className="h-4 w-4" />
                  <h3>Identificación y Etiquetas</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="sku" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Ref *</FormLabel>
                      <FormControl><Input placeholder="EJ-001" disabled={!!editingProduct} {...field} className="bg-muted/30" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="barcode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Barras</FormLabel>
                      <FormControl><Input placeholder="Escanear..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl><Input placeholder="Ej. Coca Cola 2L" {...field} className="text-lg font-medium" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tags" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etiquetas (Separadas por coma)</FormLabel>
                    <FormControl><Input placeholder="Bebidas, Oferta, Verano..." {...field} /></FormControl>
                    <FormDescription>Ayudan a filtrar productos rápidamente.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl><Textarea placeholder="Detalles adicionales..." className="h-20 resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Bloque 2: Clasificación y Medida (Una debajo de otra) */}
              <div className="bg-muted/20 p-5 rounded-2xl border border-border space-y-4">
                <div className="flex items-center gap-2 text-foreground/80 font-bold border-b pb-2 mb-2">
                  <ListChecks className="h-4 w-4" />
                  <h3>Categorización</h3>
                </div>
                
                <FormField control={form.control} name="product_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clasificación del Producto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingProduct}>
                      <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="physical">📦 Físico (Maneja Inventario)</SelectItem>
                        <SelectItem value="service">🛠️ Servicio (Disponibilidad Infinita)</SelectItem>
                        <SelectItem value="virtual">🍔 Combo / Receta (Agrupación)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tax_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Régimen Fiscal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Exento</SelectItem>
                          <SelectItem value="vat">IVA (16%)</SelectItem>
                          <SelectItem value="islr">ISLR</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unit_measure" render={({ field }) => (
                    <FormItem>
                      <FormLabel>U. Medida</FormLabel>
                      <FormControl><Input placeholder="UND, KG, LT" {...field} className="bg-background" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Bloque 5: Configuración de Combo (Si es Virtual) */}
              {isVirtual && (
                <div className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 space-y-6">
                  <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                    <h3 className="font-bold text-purple-700">Contenido del Combo</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: "", quantity: 1 })} className="border-purple-300 text-purple-700 hover:bg-purple-100">
                      <Plus className="h-4 w-4 mr-1" /> Añadir Producto
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start bg-background p-2 rounded-lg border border-purple-100 shadow-sm animate-in zoom-in-95 duration-200">
                        <FormField control={form.control} name={`combo_items.${index}.product_id`} render={({ field: selectField }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={selectField.onChange} value={selectField.value}>
                              <FormControl><SelectTrigger className="border-0 shadow-none focus:ring-0"><SelectValue placeholder="Producto..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {products.filter(p => p.id !== editingProduct?.id && p.product_type !== 'virtual').map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground text-[10px] ml-1">({p.unit_measure})</span></SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`combo_items.${index}.quantity`} render={({ field: inputField }) => (
                          <FormItem className="w-16">
                            <FormControl><Input type="number" step="0.001" {...inputField} className="border-0 shadow-none focus:ring-0 text-center p-0" /></FormControl>
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque 3: Precios y Margen (Destacado) */}
              <div className="bg-secondary/30 p-5 rounded-2xl border-2 border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <h3>Costos y Precios</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cost_usd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input type="number" step="0.01" {...field} className="pl-7 bg-background" disabled={isService || isVirtual} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="price_usd" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">Precio Venta ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                          <Input type="number" step="0.01" {...field} className="pl-7 font-bold border-primary/30 focus-visible:ring-primary/40 bg-background" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {!isService && (
                  <div className="flex justify-between items-center bg-background/50 p-2 rounded-lg border border-dashed text-sm">
                    <span className="text-muted-foreground">Margen Bruto Estimado:</span>
                    <span className={`font-bold ${profitMargin > 30 ? 'text-emerald-600' : profitMargin > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Bloque 4: Stock / Inventario (Una debajo de otra) */}
              {!isService && (
                <div className="p-5 rounded-2xl border border-border space-y-4">
                  <div className="flex items-center gap-2 text-foreground/80 font-bold border-b pb-2">
                    <Layers className="h-4 w-4" />
                    <h3>Control de Stock</h3>
                  </div>
                  
                  <FormField control={form.control} name="min_stock_alert" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerta de Umbral Mínimo</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormDescription>Avisar cuando queden pocas existencias.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {(editingProduct || isVirtual) && (
                    <div className="p-4 bg-muted/50 rounded-xl flex items-center justify-between border">
                      <div className="text-sm font-medium opacity-70 uppercase tracking-wider">
                        {isVirtual ? "STOCK PROYECTADO" : "STOCK ACTUAL"}
                      </div>
                      <Badge className="text-xl bg-background font-mono px-4 py-1 border-primary/20">
                        {isVirtual ? projectedComboStock : editingProduct?.cached_stock_quantity} {form.watch("unit_measure")}
                      </Badge>
                    </div>
                  )}
                </div>
              )}


              <DialogFooter className="pt-4 sticky bottom-0 z-10 bg-background pb-2 mt-4 gap-2">
                <Button type="button" variant="ghost" className="px-6 h-12 rounded-xl" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20 font-bold text-lg">
                  {editingProduct ? "Actualizar Inventario" : "Registrar Producto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
