"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Printer, MoreVertical, XCircle, FileText, LayoutGrid, List, RotateCcw } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useDeliveryNotes, useCancelDeliveryNote } from "@/hooks/queries/use-delivery-notes"
import { ReturnsModule } from "./returns-module"
import { cn } from "@/lib/utils"

const formatLocalNumber = (num: number): string => {
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DeliveryNotesModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"cards" | "list">("list")
  const [showReturnsModal, setShowReturnsModal] = useState(false)
  const [selectedNoteForReturn, setSelectedNoteForReturn] = useState<any | null>(null)

  const { data: notes = [], isLoading } = useDeliveryNotes()
  const cancelNote = useCancelDeliveryNote()

  useEffect(() => {
    const saved = localStorage.getItem("delivery_notes_view_preference")
    if (saved === "list" || saved === "cards") {
      setViewMode(saved)
    }
  }, [])

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode)
    localStorage.setItem("delivery_notes_view_preference", mode)
  }

  const filteredNotes = notes.filter((note) => {
    const term = searchQuery.toLowerCase()
    return (
      note.client_name.toLowerCase().includes(term) ||
      note.document_number.toString().includes(term) ||
      note.document_type.toLowerCase().includes(term)
    )
  })

  const handlePrint = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    window.open(`http://127.0.0.1:8000/api/v1/delivery-notes/${id}/pdf`, "_blank")
  }

  const handleCancel = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm("¿Está seguro de que desea anular este documento? Si es Nota de Entrega, el inventario será reversado.")) {
      return
    }
    try {
      await cancelNote.mutateAsync(id)
      toast.success("Documento anulado con éxito.")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al anular el documento.")
    }
  }

  const handleOpenReturn = (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (note.status === "ANULADA") {
      toast.error("No se puede procesar devolución de un documento anulado.")
      return
    }
    setSelectedNoteForReturn(note)
    setShowReturnsModal(true)
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-background/50">
      <Card className="h-full border-border/50 shadow-xl flex flex-col">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Notas de Entrega y Prefacturas
            </CardTitle>
            <p className="text-sm text-muted-foreground">Historial de documentos no fiscales emitidos y gestión de devoluciones.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, número o tipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-2"
              />
            </div>

            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={cn("px-2.5 shadow-none", viewMode === "list" && "bg-background shadow-sm")}
                onClick={() => toggleViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                className={cn("px-2.5 shadow-none", viewMode === "cards" && "bg-background shadow-sm")}
                onClick={() => toggleViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Cargando documentos...</p>
            </div>
          ) : viewMode === "cards" ? (
            filteredNotes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground py-8">
                No se encontraron documentos.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    onClick={(e) => handleOpenReturn(note, e)}
                    className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md"
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <span className="font-mono font-bold text-base text-foreground">
                          #{String(note.document_number).padStart(6, '0')}
                        </span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(note.created_at).toLocaleString("es-VE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={note.document_type === "PREFACTURA" ? "secondary" : "default"}>
                          {note.document_type}
                        </Badge>
                        <Badge variant={note.status === "EMITIDA" ? "outline" : "destructive"} className="font-bold">
                          {note.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-2 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Cliente</p>
                        <p className="text-sm font-medium text-foreground truncate">{note.client_name}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Bs</p>
                          <p className="text-xs font-semibold text-muted-foreground">Bs {formatLocalNumber(note.total_amount_bs)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total USD</p>
                          <p className="text-lg font-black text-emerald-600">${formatLocalNumber(note.total_amount_usd)}</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                        <Button variant="outline" size="sm" onClick={(e) => handlePrint(note.id, e)} className="gap-1.5 h-8 text-xs">
                          <Printer className="h-3.5 w-3.5 text-primary" />
                          Imprimir PDF
                        </Button>
                        {note.status !== "ANULADA" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleOpenReturn(note, e)}
                            className="gap-1.5 h-8 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Devolución
                          </Button>
                        )}
                        {note.status !== "ANULADA" && (
                          <Button variant="ghost" size="sm" onClick={(e) => handleCancel(note.id, e)} className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10">
                            <XCircle className="h-3.5 w-3.5" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total USD</TableHead>
                  <TableHead className="text-right">Total Bs</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron documentos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => (
                    <TableRow
                      key={note.id}
                      onClick={(e) => handleOpenReturn(note, e)}
                      className="cursor-pointer hover:bg-accent/40"
                    >
                      <TableCell className="font-mono font-bold">
                        {String(note.document_number).padStart(6, '0')}
                      </TableCell>
                      <TableCell>
                        {new Date(note.created_at).toLocaleString("es-VE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{note.client_name}</TableCell>
                      <TableCell>
                        <Badge variant={note.document_type === "PREFACTURA" ? "secondary" : "default"}>
                          {note.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${formatLocalNumber(note.total_amount_usd)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        Bs {formatLocalNumber(note.total_amount_bs)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={note.status === "EMITIDA" ? "outline" : "destructive"}
                          className="font-bold"
                        >
                          {note.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handlePrint(note.id, e)}>
                              <Printer className="mr-2 h-4 w-4 text-primary" />
                              <span>Ver / Imprimir PDF</span>
                            </DropdownMenuItem>
                            {note.status !== "ANULADA" && (
                              <DropdownMenuItem onClick={(e) => handleOpenReturn(note, e)}>
                                <RotateCcw className="mr-2 h-4 w-4 text-amber-600" />
                                <span>Procesar Devolución</span>
                              </DropdownMenuItem>
                            )}
                            {note.status !== "ANULADA" && (
                              <DropdownMenuItem
                                onClick={(e) => handleCancel(note.id, e)}
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                <span>Anular</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReturnsModule
        isOpen={showReturnsModal}
        onClose={() => {
          setShowReturnsModal(false)
          setSelectedNoteForReturn(null)
        }}
        preselectedSaleId={selectedNoteForReturn?.id}
        selectedNoteData={selectedNoteForReturn || undefined}
      />
    </div>
  )
}

