"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  CircleHelp,
  Settings,
  LogOut,
  User,
  Wifi,
  Wrench,
} from "lucide-react"

interface DashboardHeaderProps {
  title: string
  exchangeRate: number
  onLogout: () => void
}

export function DashboardHeader({ title, exchangeRate, onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">Bienvenido de vuelta</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2">
          <span className="text-sm font-medium text-foreground">Tasa:</span>
          <span className="font-mono text-lg font-bold text-primary">
            {exchangeRate.toFixed(2)} Bs
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
          <Wifi className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">Conectado</span>
        </div>

        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-accent/50">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="sr-only">Notificaciones</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg transition-all hover:bg-accent/50 px-2 py-1">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                  CA
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Perfil de usuario</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Mi Cuenta</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wrench className="mr-2 h-4 w-4" />
              <span>Configuraciones</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleHelp className="mr-2 h-4 w-4" />
              <span>Ayuda y Soporte</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-accent/50">
              <Settings className="h-5 w-5 text-foreground" />
              <span className="sr-only">Configuracion general</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Wrench className="mr-2 h-4 w-4" />
              <span>Preferencias del Sistema</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Gestión de Usuarios</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CircleHelp className="mr-2 h-4 w-4" />
              <span>Centro de Ayuda</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
