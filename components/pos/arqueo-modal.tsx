"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ArqueoModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

const systemAmounts = [
  { method: "Efectivo", systemAmount: 1250.0 },
  { method: "Tarjeta", systemAmount: 890.5 },
  { method: "Transferencia", systemAmount: 450.0 },
  { method: "Pago Movil", systemAmount: 320.75 },
]

export function ArqueoModal({ open, onClose, onConfirm }: ArqueoModalProps) {
  const [realAmounts, setRealAmounts] = useState<Record<string, string>>({})

  const handleAmountChange = (method: string, value: string) => {
    setRealAmounts((prev) => ({ ...prev, [method]: value }))
  }

  const getDifference = (systemAmount: number, realValue: string) => {
    const real = parseFloat(realValue) || 0
    return real - systemAmount
  }

  const totalSystem = systemAmounts.reduce((acc, item) => acc + item.systemAmount, 0)
  const totalReal = systemAmounts.reduce(
    (acc, item) => acc + (parseFloat(realAmounts[item.method] || "0") || 0),
    0
  )
  const totalDifference = totalReal - totalSystem

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Arqueo de Caja
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Ingresa el dinero real contado para cada método de pago y compara con el sistema
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border bg-card/50 p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-foreground">Método de Pago</TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Sistema ($)
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  Real ($)
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemAmounts.map((item) => {
                const diff = getDifference(item.systemAmount, realAmounts[item.method] || "")
                return (
                  <TableRow key={item.method} className="border-border hover:bg-accent/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {item.method}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground font-medium">
                      ${item.systemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={realAmounts[item.method] || ""}
                        onChange={(e) => handleAmountChange(item.method, e.target.value)}
                        className="ml-auto h-10 w-36 text-right font-mono border-primary/30 focus:border-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {realAmounts[item.method] ? (
                        <Badge
                          className={`px-3 py-1.5 text-sm font-semibold ${
                            diff === 0
                              ? "bg-emerald-100 text-emerald-700"
                              : diff > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {diff >= 0 ? "+" : ""}
                          {diff.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Totals row */}
              <TableRow className="border-t-2 border-primary/30 bg-primary/5 font-bold hover:bg-primary/10 transition-colors">
                <TableCell className="font-bold text-foreground text-base">TOTAL</TableCell>
                <TableCell className="text-right font-mono text-foreground text-base">
                  ${totalSystem.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono text-foreground text-base">
                  ${totalReal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={`px-3 py-1.5 text-sm font-bold ${
                      totalDifference === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : totalDifference > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {totalDifference >= 0 ? "+" : ""}
                    {totalDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border text-foreground hover:bg-accent/50"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8"
          >
            Confirmar Cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
