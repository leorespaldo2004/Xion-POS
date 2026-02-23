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
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Upload,
  Download,
} from "lucide-react"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  identificationType: "CI" | "RIF" | "Pasaporte"
  identificationNumber: string
  creditLimit: number
  currentDebt: number
  isActive: boolean
}

const mockClients: Client[] = [
  {
    id: "1",
    name: "María González",
    email: "maria.gonzalez@email.com",
    phone: "+58 424-1234567",
    address: "Av. Principal, Caracas",
    identificationType: "CI",
    identificationNumber: "V-12345678",
    creditLimit: 500,
    currentDebt: 120,
    isActive: true,
  },
  {
    id: "2",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@empresa.com",
    phone: "+58 412-9876543",
    address: "Calle Comercio, Valencia",
    identificationType: "RIF",
    identificationNumber: "J-87654321-0",
    creditLimit: 1000,
    currentDebt: 450,
    isActive: true,
  },
  {
    id: "3",
    name: "Ana Pérez",
    email: "ana.perez@email.com",
    phone: "+58 426-5551234",
    address: "Urb. Los Robles, Maracay",
    identificationType: "CI",
    identificationNumber: "V-23456789",
    creditLimit: 300,
    currentDebt: 0,
    isActive: false,
  },
]

export function ClientsModule() {
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<Partial<Client>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    identificationType: "CI",
    identificationNumber: "",
    creditLimit: 0,
    currentDebt: 0,
    isActive: true,
  })

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.isActive).length
  const totalDebt = clients.reduce((sum, c) => sum + c.currentDebt, 0)

  const openDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData(client)
    } else {
      setEditingClient(null)
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        identificationType: "CI",
        identificationNumber: "",
        creditLimit: 0,
        currentDebt: 0,
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

    if (editingClient) {
      setClients(
        clients.map((client) =>
          client.id === editingClient.id
            ? { ...client, ...formData }
            : client
        )
      )
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: formData.name!,
        email: formData.email!,
        phone: formData.phone || "",
        address: formData.address || "",
        identificationType: formData.identificationType || "CI",
        identificationNumber: formData.identificationNumber!,
        creditLimit: formData.creditLimit || 0,
        currentDebt: formData.currentDebt || 0,
        isActive: formData.isActive ?? true,
      }
      setClients([...clients, newClient])
    }
    setShowDialog(false)
  }

  const toggleClientStatus = (id: string) => {
    setClients(
      clients.map((client) =>
        client.id === id ? { ...client, isActive: !client.isActive } : client
      )
    )
  }

  const deleteClient = (id: string) => {
    if (confirm("¿Está seguro de eliminar este cliente?")) {
      setClients(clients.filter((client) => client.id !== id))
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background/50">
      {/* Header Stats */}
      <div className="border-b border-border bg-card/50 p-6">
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{totalClients}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">
                {activeClients}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deuda Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                ${totalDebt.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nombre, email o identificación..."
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
              onClick={() => setShowDialog(true)}
              className="h-12 gap-2 rounded-xl bg-primary px-6 text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <UserPlus className="h-5 w-5" />
              Nuevo Cliente
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
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Identificación</TableHead>
                <TableHead className="text-right font-semibold">
                  Límite Crédito
                </TableHead>
                <TableHead className="text-right font-semibold">
                  Deuda Actual
                </TableHead>
                <TableHead className="text-center font-semibold">Estado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <UserCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.address}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {client.identificationType} {client.identificationNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${client.creditLimit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        client.currentDebt > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      ${client.currentDebt.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={client.isActive}
                      onCheckedChange={() => toggleClientStatus(client.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDialog(client)}
                        className="h-8 w-8 hover:bg-accent/50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteClient(client.id)}
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
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del cliente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
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
                  onValueChange={(value: "CI" | "RIF" | "Pasaporte") =>
                    setFormData({ ...formData, identificationType: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CI">Cédula de Identidad (CI)</SelectItem>
                    <SelectItem value="RIF">RIF</SelectItem>
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
                <Label htmlFor="creditLimit">Límite de Crédito ($)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditLimit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentDebt">Deuda Actual ($)</Label>
                <Input
                  id="currentDebt"
                  type="number"
                  step="0.01"
                  value={formData.currentDebt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentDebt: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-11 rounded-xl border-primary/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label>Cliente activo</Label>
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
              {editingClient ? "Actualizar" : "Crear"} Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
