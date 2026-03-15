"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Store,
  DollarSign,
  Printer,
  FileText,
  Keyboard,
  Receipt,
  Save,
  Upload,
} from "lucide-react"
import { useState } from "react"

export function SettingsModule() {
  const [storeName, setStoreName] = useState("Mi Tienda POS")
  const [storeRIF, setStoreRIF] = useState("J-12345678-9")
  const [storeAddress, setStoreAddress] = useState("")
  const [storePhone, setStorePhone] = useState("")
  const [exchangeRate, setExchangeRate] = useState("37.00")
  const [taxRate, setTaxRate] = useState("16")
  const [wholesaleEnabled, setWholesaleEnabled] = useState(true)
  const [wholesaleMinQty, setWholesaleMinQty] = useState("10")
  const [autoPrint, setAutoPrint] = useState(true)
  const [printLogo, setPrintLogo] = useState(true)

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto bg-background/50 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Configuraciones</h1>
        <p className="text-muted-foreground">
          Configura los detalles de tu tienda y opciones del sistema
        </p>
      </div>

      {/* Store Information */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Información de la Tienda</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-name" className="text-sm font-semibold text-foreground">
                Nombre de la Tienda
              </Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-rif" className="text-sm font-semibold text-foreground">
                RIF
              </Label>
              <Input
                id="store-rif"
                value={storeRIF}
                onChange={(e) => setStoreRIF(e.target.value)}
                placeholder="J-12345678-9"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-address" className="text-sm font-semibold text-foreground">
              Dirección
            </Label>
            <Textarea
              id="store-address"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Calle principal, edificio, ciudad, estado"
              className="min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-phone" className="text-sm font-semibold text-foreground">
                Teléfono
              </Label>
              <Input
                id="store-phone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="+58 412-1234567"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Logo de la Tienda</Label>
              <Button variant="outline" className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Subir Logo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency & Pricing */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Moneda y Precios</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="exchange-rate" className="text-sm font-semibold text-foreground">
                Tasa de Cambio (Bs/$)
              </Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-rate" className="text-sm font-semibold text-foreground">
                IVA (%)
              </Label>
              <Input
                id="tax-rate"
                type="number"
                step="1"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Moneda Principal</Label>
              <Select defaultValue="usd">
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="bs">Bolívares (Bs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Wholesale settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Precio Mayorista
                </Label>
                <p className="text-xs text-muted-foreground">
                  Activa precios especiales para compras al mayor
                </p>
              </div>
              <Switch checked={wholesaleEnabled} onCheckedChange={setWholesaleEnabled} />
            </div>

            {wholesaleEnabled && (
              <div className="space-y-2">
                <Label htmlFor="wholesale-min" className="text-sm font-semibold text-foreground">
                  Cantidad Mínima para Precio Mayorista
                </Label>
                <Input
                  id="wholesale-min"
                  type="number"
                  value={wholesaleMinQty}
                  onChange={(e) => setWholesaleMinQty(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt & Printing */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Tickets y Facturación</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-foreground">
                Imprimir Automáticamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Imprime el ticket después de cada venta
              </p>
            </div>
            <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-foreground">
                Incluir Logo en Tickets
              </Label>
              <p className="text-xs text-muted-foreground">
                Muestra el logo de la tienda en los tickets impresos
              </p>
            </div>
            <Switch checked={printLogo} onCheckedChange={setPrintLogo} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Tamaño del Ticket
            </Label>
            <Select defaultValue="80mm">
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm (Recomendado)</SelectItem>
                <SelectItem value="a4">A4 (Carta)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Mensaje del Ticket
            </Label>
            <Textarea
              placeholder="Gracias por su compra. ¡Vuelva pronto!"
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Atajos de Teclado</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <span className="text-sm text-foreground">Buscar producto</span>
              <kbd className="rounded bg-foreground px-2 py-1 font-mono text-xs font-semibold text-background">
                F1
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <span className="text-sm text-foreground">Aplicar descuento</span>
              <kbd className="rounded bg-foreground px-2 py-1 font-mono text-xs font-semibold text-background">
                F3
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <span className="text-sm text-foreground">Cobrar</span>
              <kbd className="rounded bg-foreground px-2 py-1 font-mono text-xs font-semibold text-background">
                F5
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <span className="text-sm text-foreground">Opciones</span>
              <kbd className="rounded bg-foreground px-2 py-1 font-mono text-xs font-semibold text-background">
                F10
              </kbd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Personaliza los atajos de teclado según tus preferencias
          </p>
        </CardContent>
      </Card>

      {/* Reports & Backup */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Reportes y Respaldos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Frecuencia de Reportes Automáticos
            </Label>
            <Select defaultValue="daily">
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Desactivado</SelectItem>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Respaldo Automático de Datos
            </Label>
            <Select defaultValue="weekly">
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Desactivado</SelectItem>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <FileText className="h-4 w-4" />
              Generar Reporte
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Upload className="h-4 w-4" />
              Respaldar Ahora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" className="h-12 px-6">
          Cancelar
        </Button>
        <Button className="h-12 gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" />
          Guardar Configuraciones
        </Button>
      </div>
    </div>
  )
}
