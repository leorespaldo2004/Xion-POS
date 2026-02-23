"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Switch } from "@/components/ui/switch"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCircle,
  Shield,
  Users as UsersIcon,
  UserCog,
  Check,
  X,
} from "lucide-react"
import { useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "cashier" | "viewer"
  status: "active" | "inactive"
  lastLogin: string
  createdAt: string
  permissions: {
    sales: boolean
    inventory: boolean
    reports: boolean
    users: boolean
  }
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Ana García",
    email: "ana.garcia@empresa.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-01-20 14:30",
    createdAt: "2023-06-15",
    permissions: { sales: true, inventory: true, reports: true, users: true },
  },
  {
    id: "2",
    name: "Carlos Pérez",
    email: "carlos.perez@empresa.com",
    role: "manager",
    status: "active",
    lastLogin: "2024-01-20 10:15",
    createdAt: "2023-08-22",
    permissions: { sales: true, inventory: true, reports: true, users: false },
  },
  {
    id: "3",
    name: "María Rodríguez",
    email: "maria.rodriguez@empresa.com",
    role: "cashier",
    status: "active",
    lastLogin: "2024-01-20 09:00",
    createdAt: "2023-11-10",
    permissions: { sales: true, inventory: false, reports: false, users: false },
  },
  {
    id: "4",
    name: "Luis Martínez",
    email: "luis.martinez@empresa.com",
    role: "viewer",
    status: "inactive",
    lastLogin: "2024-01-15 16:45",
    createdAt: "2023-12-05",
    permissions: { sales: false, inventory: false, reports: true, users: false },
  },
]

const roleColors = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  cashier: "bg-emerald-100 text-emerald-700",
  viewer: "bg-gray-100 text-gray-700",
}

const roleLabels = {
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Cajero",
  viewer: "Visualizador",
}

export function UsersModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState(mockUsers)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "" as User["role"] | "",
    status: "active" as User["status"],
    permissions: {
      sales: false,
      inventory: false,
      reports: false,
      users: false,
    },
  })

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeUsers = users.filter((u) => u.status === "active").length
  const adminUsers = users.filter((u) => u.role === "admin").length

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: { ...user.permissions },
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: "",
        email: "",
        role: "",
        status: "active",
        permissions: {
          sales: false,
          inventory: false,
          reports: false,
          users: false,
        },
      })
    }
    setIsAddDialogOpen(true)
  }

  const handleSave = () => {
    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: formData.name,
                email: formData.email,
                role: formData.role as User["role"],
                status: formData.status,
                permissions: formData.permissions,
              }
            : u
        )
      )
    } else {
      const newUser: User = {
        id: (users.length + 1).toString(),
        name: formData.name,
        email: formData.email,
        role: formData.role as User["role"],
        status: formData.status,
        lastLogin: "Nunca",
        createdAt: new Date().toISOString().split("T")[0],
        permissions: formData.permissions,
      }
      setUsers([...users, newUser])
    }
    setIsAddDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id))
  }

  const handleToggleStatus = (id: string) => {
    setUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u
      )
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-background/50">
      {/* Header with stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{users.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-emerald-600">{activeUsers}</p>
              <Badge className="bg-emerald-100 text-emerald-700">Online</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-primary">{adminUsers}</p>
              <Badge className="bg-red-100 text-red-700">Admin</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">
              {users.length - activeUsers}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and actions */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-2 border-primary/30 bg-card pl-12 text-base focus:border-primary focus:ring-primary"
          />
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="h-12 gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Agregar Usuario
        </Button>
      </div>

      {/* Users table */}
      <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">Usuario</TableHead>
                <TableHead className="font-semibold text-foreground">Rol</TableHead>
                <TableHead className="font-semibold text-foreground">Estado</TableHead>
                <TableHead className="font-semibold text-foreground">Permisos</TableHead>
                <TableHead className="font-semibold text-foreground">
                  Último Acceso
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-border hover:bg-accent/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`font-medium ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === "active"}
                        onCheckedChange={() => handleToggleStatus(user.id)}
                      />
                      <span
                        className={`text-sm font-medium ${
                          user.status === "active"
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {user.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.permissions.sales && (
                        <Badge variant="outline" className="text-xs">
                          Ventas
                        </Badge>
                      )}
                      {user.permissions.inventory && (
                        <Badge variant="outline" className="text-xs">
                          Inventario
                        </Badge>
                      )}
                      {user.permissions.reports && (
                        <Badge variant="outline" className="text-xs">
                          Reportes
                        </Badge>
                      )}
                      {user.permissions.users && (
                        <Badge variant="outline" className="text-xs">
                          Usuarios
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {editingUser
                ? "Actualiza la información del usuario"
                : "Completa los datos del nuevo usuario"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                  Nombre Completo
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                  placeholder="Ej: Ana García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 rounded-lg border-primary/30 focus:border-primary focus:ring-primary"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold text-foreground">
                  Rol
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as User["role"] })
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg border-primary/30">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="cashier">Cajero</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-semibold text-foreground">
                  Estado
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as User["status"] })
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Permisos</Label>
              <Card className="border-border/50">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Ventas
                      </span>
                    </div>
                    <Switch
                      checked={formData.permissions.sales}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, sales: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Inventario
                      </span>
                    </div>
                    <Switch
                      checked={formData.permissions.inventory}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, inventory: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Reportes
                      </span>
                    </div>
                    <Switch
                      checked={formData.permissions.reports}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, reports: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Gestión de Usuarios
                      </span>
                    </div>
                    <Switch
                      checked={formData.permissions.users}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, users: checked },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
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
              {editingUser ? "Guardar Cambios" : "Agregar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
