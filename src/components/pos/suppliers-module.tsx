"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  Upload,
  Download,
} from "lucide-react"

interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  identificationType: "RIF" | "CI" | "Pasaporte"
  identificationNumber: string
  category: string
  paymentTerms: string
  notes: string
  isActive: boolean
}

const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "Distribuidora La Principal C.A.",
    email: "ventas@distribuidora.com",
    phone: "+58 212-1234567",
    address: "Zona Industrial, Caracas",
    identificationType: "RIF",
    identificationNumber: "J-30123456-7",
    category: "Bebidas",
    paymentTerms: "30 días",
    notes: "Proveedor principal de bebidas",
    isActive: true,
  },
  {
    id: "2",
    name: "Alimentos del Centro S.A.",
    email: "compras@alimentoscentro.com",
    phone: "+58 241-9876543",
    address: "Valencia, Estado Carabobo",
    identificationType: "RIF",
    identificationNumber: "J-40987654-3",
    category: "Alimentos",
    paymentTerms: "15 días",
    notes: "Productos frescos y enlatados",
    isActive: true,
  },
  {
    id: "3",
    name: "Snacks Mayorista",
    email: "info@snacksmayorista.com",
    phone: "+58 424-5551234",
    address: "Maracay, Estado Aragua",
    identificationType: "RIF",
    identificationNumber: "J-25555678-9",
    category: "Snacks",
    paymentTerms: "45 días",
    notes: "Distribuidor autorizado de marcas internacionales",
    isActive: false,
  },
]

const categories = [
  "Bebidas",
  "Alimentos",
  "Snacks",
  "Limpieza",
  "Varios",
]

export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    identificationType: "RIF",
    identificationNumber: "",
    category: "Bebidas",
    paymentTerms: "",
    notes: "",
    isActive: true,
  })

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSuppliers = suppliers.length
  const activeSuppliers = suppliers.filter((s) => s.isActive).length

  const openDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData(supplier)
    } else {
      setEditingSupplier(null)
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        identificationType: "RIF",
        identificationNumber: "",
        category: "Bebidas",
        paymentTerms: "",
        notes: "",
        isActive: true,
      })
    }
    setShowDialog(true)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.identificationNumber) {
      alert("Complete los campos requeridos")
      return
    }

    if (editingSupplier) {
      setSuppliers(
        suppliers.map((supplier) =>
          supplier.id === editingSupplier.id
            ? { ...supplier, ...formData }
            : supplier
        )
      )
    } else {
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        name: formData.name!,
        email: formData.email!,
        phone: formData.phone || "",
        address: formData.address || "",
        identificationType: formData.identificationType || "RIF",
        identificationNumber: formData.identificationNumber!,
        category: formData.category || "Bebidas",
        paymentTerms: formData.paymentTerms || "",
        notes: formData.notes || "",
        isActive: formData.isActive ?? true,
      }
      setSuppliers([...suppliers, newSupplier])
    }
    setShowDialog(false)
  }

  const toggleSupplierStatus = (id: string) => {
    setSuppliers(
      suppliers.map((supplier) =>
        supplier.id === id ? { ...supplier, isActive: !supplier.isActive } : supplier
      )
    )
  }

  const deleteSupplier = (id: string) => {
    if (confirm("¿Está seguro de eliminar este proveedor?")) {
      setSuppliers(suppliers.filter((supplier) => supplier.id !== id))
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background/50">
      {/* Header Stats */}
      <div className="border-b border-border bg-card/50 p-6">
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{totalSuppliers}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proveedores Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">
                {activeSuppliers}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedores por nombre, email, identificación o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 rounded-xl border-primary/30 pl-12"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-2 font-semibold"
              onClick={() => {
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
              onClick={() => openDialog()}
              className="h-12 gap-2 rounded-xl bg-primary px-6 text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <UserPlus className="h-5 w-5" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="border-border/50 shadow-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold">Proveedor</TableHead>
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Identificación</TableHead>
                <TableHead className="font-semibold">Categoría</TableHead>
                <TableHead className="font-semibold">Términos de Pago</TableHead>
                <TableHead className="text-center font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {supplier.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.address}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{supplier.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {supplier.identificationType} {supplier.identificationNumber}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary">
                      {supplier.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {supplier.paymentTerms}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={supplier.isActive}
                      onCheckedChange={() => toggleSupplierStatus(supplier.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDialog(supplier)}
                        className="h-8 w-8 hover:bg-accent/50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteSupplier(supplier.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del proveedor
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="idType">Tipo de Identificación *</Label>
                <Select
                  value={formData.identificationType}
                  onValueChange={(value: "RIF" | "CI" | "Pasaporte") =>
                    setFormData({ ...formData, identificationType: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RIF">RIF</SelectItem>
                    <SelectItem value="CI">Cédula de Identidad (CI)</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">Número de Identificación *</Label>
                <Input
                  id="idNumber"
                  value={formData.identificationNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      identificationNumber: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Términos de Pago</Label>
                <Input
                  id="paymentTerms"
                  placeholder="Ej: 30 días"
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentTerms: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Información adicional sobre el proveedor..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="min-h-[80px] rounded-xl border-primary/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label>Proveedor activo</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="rounded-xl bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              {editingSupplier ? "Actualizar" : "Crear"} Proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
