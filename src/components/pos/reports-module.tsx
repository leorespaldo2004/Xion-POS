"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Download,
  FileText,
  Calendar,
  Building2,
  UserCircle,
  Truck,
} from "lucide-react"

export function ReportsModule() {
  const [dateRange, setDateRange] = useState("month")
  const [reportType, setReportType] = useState("")

  // Mock data for dashboard
  const dashboardStats = {
    totalSales: 15420.5,
    totalSalesBs: 570558.5,
    salesGrowth: 12.5,
    totalPurchases: 8950.0,
    totalPurchasesBs: 331150.0,
    purchasesChange: -3.2,
    inventoryValue: 45230.0,
    inventoryValueBs: 1673510.0,
    lowStockItems: 8,
    activeClients: 142,
    newClients: 15,
    totalDebt: 3240.5,
    totalSuppliers: 28,
    activeSuppliers: 24,
  }

  const topProducts = [
    { name: "Coca Cola 500ml", sales: 345, revenue: 517.5 },
    { name: "Harina Pan Maiz 1kg", sales: 298, revenue: 357.6 },
    { name: "Pan Bimbo Blanco", sales: 234, revenue: 819.0 },
    { name: "Lays Papas Clasicas", sales: 189, revenue: 396.9 },
    { name: "Leche Completa 1L", sales: 167, revenue: 300.6 },
  ]

  const reportCategories = [
    {
      id: "sales",
      title: "Reportes de Ventas",
      icon: ShoppingCart,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      reports: [
        { id: "sales_daily", name: "Ventas Diarias", description: "Resumen de ventas por día" },
        { id: "sales_monthly", name: "Ventas Mensuales", description: "Consolidado mensual de ventas" },
        { id: "sales_by_product", name: "Ventas por Producto", description: "Detalle de ventas por producto" },
        { id: "sales_by_category", name: "Ventas por Categoría", description: "Análisis por categoría" },
        { id: "sales_by_payment", name: "Ventas por Método de Pago", description: "Distribución por método de pago" },
      ],
    },
    {
      id: "purchases",
      title: "Reportes de Compras",
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      reports: [
        { id: "purchases_daily", name: "Compras Diarias", description: "Detalle de compras diarias" },
        { id: "purchases_monthly", name: "Compras Mensuales", description: "Consolidado mensual" },
        { id: "purchases_by_supplier", name: "Compras por Proveedor", description: "Análisis por proveedor" },
        { id: "purchases_by_category", name: "Compras por Categoría", description: "Distribución por categoría" },
      ],
    },
    {
      id: "inventory",
      title: "Reportes de Inventario",
      icon: Package,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      reports: [
        { id: "inventory_current", name: "Inventario Actual", description: "Estado actual del inventario" },
        { id: "inventory_low_stock", name: "Productos con Bajo Stock", description: "Alertas de stock mínimo" },
        { id: "inventory_movement", name: "Movimientos de Inventario", description: "Entradas y salidas" },
        { id: "inventory_valuation", name: "Valoración de Inventario", description: "Valor total del inventario" },
      ],
    },
    {
      id: "clients",
      title: "Reportes de Clientes",
      icon: UserCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      reports: [
        { id: "clients_list", name: "Lista de Clientes", description: "Directorio completo de clientes" },
        { id: "clients_debt", name: "Cuentas por Cobrar", description: "Deuda de clientes" },
        { id: "clients_purchases", name: "Historial de Compras por Cliente", description: "Análisis de compras" },
        { id: "clients_inactive", name: "Clientes Inactivos", description: "Clientes sin compras recientes" },
      ],
    },
    {
      id: "suppliers",
      title: "Reportes de Proveedores",
      icon: Building2,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      reports: [
        { id: "suppliers_list", name: "Lista de Proveedores", description: "Directorio completo" },
        { id: "suppliers_purchases", name: "Compras por Proveedor", description: "Análisis de compras" },
        { id: "suppliers_payment_terms", name: "Términos de Pago", description: "Condiciones de pago" },
        { id: "suppliers_performance", name: "Evaluación de Proveedores", description: "Desempeño de proveedores" },
      ],
    },
    {
      id: "users",
      title: "Reportes de Usuarios",
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      reports: [
        { id: "users_list", name: "Lista de Usuarios", description: "Usuarios del sistema" },
        { id: "users_activity", name: "Actividad de Usuarios", description: "Log de actividades" },
        { id: "users_sales", name: "Ventas por Usuario", description: "Desempeño de cajeros" },
        { id: "users_roles", name: "Usuarios por Rol", description: "Distribución de roles" },
      ],
    },
  ]

  const downloadReport = (reportId: string) => {
    alert(`Descargando reporte: ${reportId} en formato Excel`)
    // Here you would trigger the actual download
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background/50">
      <Tabs defaultValue="dashboard" className="h-full">
        <div className="border-b border-border bg-card/50 p-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="reports">Descargar Reportes</TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="flex-1 p-6">
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Dashboard de Reportes</h2>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-48 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mes</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sales & Purchases Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Ventas Totales
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    ${dashboardStats.totalSales.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bs {dashboardStats.totalSalesBs.toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+{dashboardStats.salesGrowth}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Compras Totales
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    ${dashboardStats.totalPurchases.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bs {dashboardStats.totalPurchasesBs.toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-semibold">{dashboardStats.purchasesChange}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Valor Inventario
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    ${dashboardStats.inventoryValue.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bs {dashboardStats.inventoryValueBs.toLocaleString()}
                  </p>
                  <p className="mt-3 text-sm text-amber-600 font-semibold">
                    {dashboardStats.lowStockItems} productos bajo stock
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Clientes Activos
                    </CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {dashboardStats.activeClients}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dashboardStats.newClients} nuevos este mes
                  </p>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Deuda: ${dashboardStats.totalDebt.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Products */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Top 5 Productos Más Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sales} unidades vendidas</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        ${product.revenue.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    Proveedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Proveedores:</span>
                      <span className="font-bold text-foreground">{dashboardStats.totalSuppliers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proveedores Activos:</span>
                      <span className="font-bold text-emerald-600">{dashboardStats.activeSuppliers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Resumen Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos:</span>
                      <span className="font-bold text-emerald-600">
                        ${dashboardStats.totalSales.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gastos:</span>
                      <span className="font-bold text-red-600">
                        ${dashboardStats.totalPurchases.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3">
                      <span className="font-semibold text-foreground">Utilidad:</span>
                      <span className="text-lg font-bold text-primary">
                        ${(dashboardStats.totalSales - dashboardStats.totalPurchases).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Reports Download Tab */}
        <TabsContent value="reports" className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Descargar Reportes</h2>
              <div className="flex items-center gap-3">
                <Label>Período:</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-48 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mes</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Año</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {reportCategories.map((category) => (
                <Card key={category.id} className="border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.bgColor}`}>
                        <category.icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.reports.map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-accent/30"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{report.name}</p>
                            <p className="text-xs text-muted-foreground">{report.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReport(report.id)}
                            className="gap-2 rounded-lg"
                          >
                            <Download className="h-4 w-4" />
                            Excel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
