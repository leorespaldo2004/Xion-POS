"use client"

import { cn } from "@/lib/utils"
import {
  BarChart3,
  Monitor,
  Package,
  ShoppingCart,
  Truck,
  Users,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Building2,
  HelpCircle,
  Settings,
  Palette,
  CreditCard,
  ShieldCheck, // Icono para auditoría
  FileText,
} from "lucide-react"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Vite Injected Version
declare const __APP_VERSION__: string;

interface DashboardSidebarProps {
  activeItem: string
  onItemClick: (label: string) => void
  currentUser?: any
}

export function DashboardSidebar({ activeItem, onItemClick, currentUser }: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVentasOpen, setIsVentasOpen] = useState(
    activeItem === "Ventas" || activeItem === "Notas de Entrega"
  )
  const [isComprasOpen, setIsComprasOpen] = useState(
    activeItem === "Compras" || activeItem === "Historial de Compras"
  )

  useEffect(() => {
    if (activeItem === "Ventas" || activeItem === "Notas de Entrega") {
      setIsVentasOpen(true)
    }
    if (activeItem === "Compras" || activeItem === "Historial de Compras") {
      setIsComprasOpen(true)
    }
  }, [activeItem])

  const isAuthorized = currentUser?.role === "admin" || currentUser?.role === "manager";

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: ShoppingCart, label: "Ventas" },
    { icon: Truck, label: "Compras" },
    { icon: Package, label: "Inventario" },
    { icon: Users, label: "Usuarios" },
    { icon: UserCircle, label: "Clientes" },
    { icon: Building2, label: "Proveedores" },
    { icon: CreditCard, label: "Métodos de Pago" },
    { icon: BarChart3, label: "Reportes" },
    ...(isAuthorized ? [{ icon: ShieldCheck, label: "Auditoría" }] : []),
  ]


  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-card border-r border-border text-card-foreground transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">POS</span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-2 px-3 py-6 overflow-y-auto">
        {navItems.map((item) => {
          if (item.label === "Ventas") {
            const isParentActive = activeItem === "Ventas" || activeItem === "Notas de Entrega"

            if (isCollapsed) {
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 w-full justify-center",
                        isParentActive
                          ? "bg-primary text-white shadow-md font-semibold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                      title="Ventas"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
                    <DropdownMenuItem onClick={() => onItemClick("Ventas")} className="cursor-pointer">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      <span>Realizar Ventas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onItemClick("Notas de Entrega")} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Historial (Notas de Entrega)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            return (
              <div key={item.label} className="flex flex-col gap-1">
                <button
                  onClick={() => setIsVentasOpen(!isVentasOpen)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-3 transition-all duration-200 w-full text-left",
                    isParentActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Ventas</span>
                  </div>
                  {isVentasOpen ? (
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                  )}
                </button>

                {isVentasOpen && (
                  <div className="ml-4 flex flex-col gap-1 border-l-2 border-primary/20 pl-3 py-1">
                    <button
                      onClick={() => onItemClick("Ventas")}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all duration-200 text-left",
                        activeItem === "Ventas"
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                      <span>Realizar Ventas</span>
                    </button>
                    <button
                      onClick={() => onItemClick("Notas de Entrega")}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all duration-200 text-left",
                        activeItem === "Notas de Entrega"
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span>Historial</span>
                    </button>
                  </div>
                )}
              </div>
            )
          }

          if (item.label === "Compras") {
            const isParentActive = activeItem === "Compras" || activeItem === "Historial de Compras"

            if (isCollapsed) {
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 w-full justify-center",
                        isParentActive
                          ? "bg-primary text-white shadow-md font-semibold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                      title="Compras"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56 ml-2">
                    <DropdownMenuItem onClick={() => onItemClick("Compras")} className="cursor-pointer">
                      <Truck className="mr-2 h-4 w-4" />
                      <span>Realizar Compras</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onItemClick("Historial de Compras")} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Historial de Compras</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            return (
              <div key={item.label} className="flex flex-col gap-1">
                <button
                  onClick={() => setIsComprasOpen(!isComprasOpen)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-3 transition-all duration-200 w-full text-left",
                    isParentActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Compras</span>
                  </div>
                  {isComprasOpen ? (
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                  )}
                </button>

                {isComprasOpen && (
                  <div className="ml-4 flex flex-col gap-1 border-l-2 border-primary/20 pl-3 py-1">
                    <button
                      onClick={() => onItemClick("Compras")}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all duration-200 text-left",
                        activeItem === "Compras"
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <Truck className="h-4 w-4 flex-shrink-0" />
                      <span>Realizar Compras</span>
                    </button>
                    <button
                      onClick={() => onItemClick("Historial de Compras")}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all duration-200 text-left",
                        activeItem === "Historial de Compras"
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span>Historial</span>
                    </button>
                  </div>
                )}
              </div>
            )
          }

          const isActive = activeItem === item.label
          return (
            <button
              key={item.label}
              onClick={() => onItemClick(item.label)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200",
                isActive
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-4">
        {!isCollapsed && (
          <p className="text-xs text-sidebar-foreground/50">v{__APP_VERSION__}</p>
        )}
      </div>
    </aside>
  )
}
