import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, X, Store } from "lucide-react"
import { useSystemStatus } from "@/hooks/queries/use-system"

// Helper para formatear números en Bolívares (Bs): 1.000.000,00
const formatBs = (num: number): string => {
  const parts = (num || 0).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
}

interface PreInvoiceModalProps {
  open: boolean
  onClose: () => void
  clientName: string
  clientIdentifier: string
  cart: any[]
  subtotal: number
  tax: number
  total: number
  totalBs: number
  exchangeRate: number
  wholesaleEnabled: boolean
  wholesaleMinQty: number
}

export function PreInvoiceModal({
  open,
  onClose,
  clientName,
  clientIdentifier,
  cart,
  subtotal,
  tax,
  total,
  totalBs,
  exchangeRate,
  wholesaleEnabled,
  wholesaleMinQty
}: PreInvoiceModalProps) {
  const { data: config } = useSystemStatus()

  // Determinar formato y ancho según configuración (58mm, 80mm o Carta/A4)
  const rawSize = (config?.ticket_size || "80mm").toLowerCase()
  const is58mm = rawSize.includes("58")
  const isA4 = rawSize.includes("a4") || rawSize.includes("carta")

  const paperWidthClass = isA4 ? "w-[650px]" : is58mm ? "w-[300px]" : "w-[380px]"
  const paperPrintWidth = isA4 ? "210mm" : is58mm ? "58mm" : "80mm"
  const showLogo = config?.print_logo !== false

  const getItemActivePrice = (item: any, quantity: number = 1): number => {
    if (wholesaleEnabled && quantity >= wholesaleMinQty && item.wholesale_price_usd > 0) {
      return item.wholesale_price_usd;
    }
    return item.price_usd;
  }

  const handlePrint = () => {
    const printArea = document.getElementById("pre-invoice-print-area")
    if (!printArea) {
      window.print()
      return
    }

    // Usar iframe aislado para evitar distorsiones de modales Radix UI / CSS fixed
    const printFrame = document.createElement("iframe")
    printFrame.style.position = "fixed"
    printFrame.style.right = "0"
    printFrame.style.bottom = "0"
    printFrame.style.width = "0"
    printFrame.style.height = "0"
    printFrame.style.border = "none"
    document.body.appendChild(printFrame)

    const frameDoc = printFrame.contentWindow?.document
    if (!frameDoc) return

    frameDoc.open()
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prefactura / Cotización</title>
          <style>
            @page {
              size: ${paperPrintWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'JetBrains Mono', Courier, monospace, sans-serif;
              width: ${paperPrintWidth};
              margin: 0 auto;
              padding: 4mm;
              background-color: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .border-b { border-bottom: 1px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-t-2 { border-top: 2px solid #000; }
            .border-dashed { border-style: dashed !important; }
            .border-dotted { border-style: dotted !important; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .flex-col { flex-direction: column; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .p-2 { padding: 8px; }
            .pb-1 { padding-bottom: 4px; }
            .pb-3 { padding-bottom: 12px; }
            .pt-1 { padding-top: 4px; }
            .pt-2 { padding-top: 8px; }
            .pt-3 { padding-top: 12px; }
            .text-xs { font-size: 11px; line-height: 14px; }
            .text-sm { font-size: 13px; line-height: 16px; }
            .text-base { font-size: 15px; line-height: 18px; }
            .text-xl { font-size: 18px; line-height: 22px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[9px\\] { font-size: 9px; }
            .w-24 { width: 96px; }
            .h-24 { height: 96px; }
            .w-full { width: 100%; }
            .object-contain { object-fit: contain; }
            .bg-zinc-50, .bg-zinc-100 { background-color: #f4f4f5 !important; }
            .border-zinc-300 { border-color: #d4d4d8 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            /* Ocultar iconos svg no deseados en impresion */
            svg { display: none; }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
      </html>
    `)
    frameDoc.close()

    setTimeout(() => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame)
        }
      }, 1000)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className={`max-w-[95vw] sm:${paperWidthClass} p-0 overflow-hidden shadow-2xl rounded-2xl border-2 border-border flex flex-col max-h-[90vh]`}>
        <DialogHeader className="p-3.5 bg-primary/10 border-b border-border shrink-0">
          <DialogTitle className="text-base font-black text-foreground flex items-center justify-between">
            <span>PRE-FACTURA</span>
            <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
              {isA4 ? "Carta / A4" : is58mm ? "58mm Térmico" : "80mm Térmico"} (NO FISCAL)
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Modal content - Vista previa fiel del ticket / prefactura */}
        <div className="flex-1 overflow-y-auto p-4 bg-white text-black dark:bg-white dark:text-black font-mono select-none" id="pre-invoice-print-area">
          <div className="text-center mb-4 border-b-2 border-dashed border-black pb-3">
            {showLogo && (
              <div className="flex justify-center mb-1">
                <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-black text-xs">
                  <Store className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
            <h2 className="text-xl font-black tracking-tight uppercase leading-none mb-1">{config?.store_name || "XION POS"}</h2>
            {config?.store_rif && <p className="text-[11px] font-bold">RIF: {config.store_rif}</p>}
            {config?.store_address && <p className="text-[10px] leading-tight opacity-90 my-0.5">{config.store_address}</p>}
            {config?.store_phone && <p className="text-[10px]">TELF: {config.store_phone}</p>}

            <div className="mt-2 pt-2 border-t border-dotted border-black/40">
              <p className="text-xs font-black uppercase tracking-wider">PRE-FACTURA / COTIZACIÓN</p>
              <p className="text-[10px] font-bold opacity-80 mt-0.5">Fecha: {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE')}</p>
            </div>
          </div>

          <div className="mb-3 p-2 bg-zinc-50 rounded border border-zinc-300 text-xs">
            <p className="truncate"><strong>Cliente:</strong> {clientName || 'Cliente Final'}</p>
            {clientIdentifier && <p className="truncate"><strong>CI/RIF:</strong> {clientIdentifier}</p>}
          </div>

          {/* Lista de productos sin scrolls internos (reflejo de papel continuo) */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-[11px] font-black border-b border-black pb-1 mb-1">
              <span className="flex-1">DESCRIPCIÓN</span>
              <span className="w-10 text-center">CANT</span>
              <span className="w-24 text-right">TOTAL</span>
            </div>
            {cart.map((item) => {
              const activePriceUsd = getItemActivePrice(item, item.cart_quantity)
              const activePriceBs = activePriceUsd * exchangeRate
              const lineTotalBs = activePriceBs * item.cart_quantity
              return (
                <div key={item.id} className="text-xs leading-tight border-b border-dotted border-zinc-200 pb-1">
                  <div className="flex justify-between items-start font-bold">
                    <span className="truncate flex-1">{item.cart_quantity} x {item.name}</span>
                    <span className="text-right font-black">Bs {formatBs(lineTotalBs)}</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    Bs {formatBs(activePriceBs)} x {item.cart_quantity}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totales en Bs */}
          <div className="border-t-2 border-dashed border-black pt-2 space-y-1 text-xs">
            {config?.enable_taxes !== false && tax > 0 && (
              <>
                <div className="flex justify-between font-bold">
                  <span>SUBTOTAL:</span>
                  <span>Bs {formatBs(subtotal * exchangeRate)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>IVA ({config?.tax_rate || 16}%):</span>
                  <span>Bs {formatBs(tax * exchangeRate)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-black font-black text-sm">
              <span>TOTAL:</span>
              <span>Bs {formatBs(totalBs)}</span>
            </div>

            <div className="text-right text-[10px] font-bold opacity-70 mt-1">
              Tasa Ref: Bs {formatBs(exchangeRate)}
            </div>
          </div>

          {/* Código QR Autenticador & Leyenda Térmica de Documento No Fiscal */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-black flex flex-col items-center gap-1.5 text-center">
            {(() => {
              const qrPayload = JSON.stringify({
                doc: "XION-POS-PREFACTURA",
                type: "NO_FISCAL",
                client: clientName || "Cliente Final",
                rif: clientIdentifier || "N/A",
                date: new Date().toISOString(),
                items: cart.map(i => ({ name: i.name, qty: i.cart_quantity, price: getItemActivePrice(i, i.cart_quantity) })),
                total_usd: total,
                total_bs: totalBs
              });
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrPayload)}`;

              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-white p-1 rounded border border-black">
                    <img src={qrUrl} alt="QR Autenticación Factura" className="w-24 h-24 object-contain" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tight">
                    CÓDIGO DE AUTENTICIDAD DE DOCUMENTO
                  </span>
                </div>
              );
            })()}

            <div className="mt-1 px-2 py-1 bg-zinc-100 rounded border border-black text-[9px] font-black text-black uppercase tracking-tight">
              *** DOCUMENTO NO FISCAL / SIN VALIDEZ TRIBUTARIA ***
            </div>
            {config?.ticket_message && (
              <p className="text-[9px] font-bold italic mt-1">{config.ticket_message}</p>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 bg-muted/30 border-t border-border flex gap-2 sm:justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5 font-bold">
            <X className="w-4 h-4" /> Cerrar
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 font-black">
            <Printer className="w-4 h-4" /> Imprimir Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
