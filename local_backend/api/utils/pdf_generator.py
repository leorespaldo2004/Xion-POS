# filepath: local_backend/api/utils/pdf_generator.py
import os
import io
import json
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader

def format_bs(amount: float) -> str:
    """Formatea un número al formato venezolano: 1.000.000,00"""
    val = amount or 0.0
    return f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def generate_closing_report_pdf(session_data: dict, output_path: str):
    """
    Genera un reporte de cierre de caja en PDF usando reportlab.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    # Margenes y Titulo
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 1 * inch, "REPORTE DE CIERRE DE CAJA")
    
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 1.25 * inch, "XION POS - SISTEMA INMUTABLE")
    
    # Info de la Sesion
    y = height - 1.75 * inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1 * inch, y, "Información de la Sesión")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(1 * inch, y, f"Cajero: {session_data.get('user_name')}")
    c.drawString(4 * inch, y, f"Estado: {session_data.get('status', '').upper()}")
    y -= 15
    c.drawString(1 * inch, y, f"Apertura: {session_data.get('opening_time')}")
    c.drawString(4 * inch, y, f"Cierre: {session_data.get('closing_time')}")
    
    y -= 30
    c.line(1 * inch, y, 7.5 * inch, y)
    y -= 20
    
    # Totales
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1 * inch, y, "Resumen Financiero (USD)")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(1 * inch, y, "Fondo de Apertura:")
    c.drawRightString(7.5 * inch, y, f"$ {session_data.get('opening_balance_usd', 0.0):.2f}")
    y -= 15
    c.drawString(1 * inch, y, "Ventas Totales (Neto):")
    total_sales = session_data.get('total_sales_usd', 0.0)
    c.drawRightString(7.5 * inch, y, f"$ {total_sales:.2f}")
    y -= 15
    c.drawString(1 * inch, y, "Impuestos Totales:")
    c.drawRightString(7.5 * inch, y, f"$ {session_data.get('total_tax_usd', 0.0):.2f}")
    y -= 20
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1 * inch, y, "TOTAL ESPERADO EN CAJA (Ventas + Fondo):")
    expected = session_data.get('opening_balance_usd', 0.0) + total_sales
    c.drawRightString(7.5 * inch, y, f"$ {expected:.2f}")
    y -= 15
    c.drawString(1 * inch, y, "TOTAL CONTADO (CIERRE):")
    c.drawRightString(7.5 * inch, y, f"$ {session_data.get('closing_balance_usd', 0.0):.2f}")
    
    diff = session_data.get('closing_balance_usd', 0.0) - expected
    y -= 20
    if abs(diff) > 0.001:
        c.setFillColor(colors.red if diff < 0 else colors.green)
        c.drawString(1 * inch, y, f"DIFERENCIA: {'Faltante' if diff < 0 else 'Sobrante'}")
        c.drawRightString(7.5 * inch, y, f"$ {diff:.2f}")
        c.setFillColor(colors.black)
    else:
        c.drawString(1 * inch, y, "DIFERENCIA:")
        c.drawRightString(7.5 * inch, y, "$ 0.00 (Equilibrado)")
    
    y -= 40
    c.line(1 * inch, y, 7.5 * inch, y)
    y -= 20
    
    # Desglose de Pagos
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1 * inch, y, "Desglose por Método de Pago")
    y -= 20
    c.setFont("Helvetica", 10)
    payments = session_data.get('payments_summary', {})
    if not payments:
        c.drawString(1.2 * inch, y, "No se registraron pagos.")
        y -= 15
    else:
        for method, amount in payments.items():
            c.drawString(1.2 * inch, y, f"- {method}:")
            c.drawRightString(7.5 * inch, y, f"$ {amount:.2f}")
            y -= 15
            if y < 1 * inch:
                c.showPage()
                y = height - 1 * inch

    # Pie de pagina
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(width / 2, 0.5 * inch, f"Reporte generado automáticamente el {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    c.save()
    return output_path

def generate_delivery_note_pdf(note_data: dict, items: list, output_path: str, format_type: str = "80mm"):
    """
    Genera un PDF unificado para Nota de Entrega, Factura o Prefactura.
    Formato e información 100% idénticos en backend y frontend.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    msg_lines = [m for m in note_data.get("ticket_message", "").split("\n") if m.strip()] if note_data.get("ticket_message") else []
    extra_msg_height = len(msg_lines) * 10

    extra_header = 0
    if note_data.get("store_address"): extra_header += 10
    if note_data.get("store_phone"): extra_header += 10
    if note_data.get("client_identifier"): extra_header += 10

    # Dimensiones dinámicas por formato (optimizado para evitar espacio blanco final)
    if format_type == "58mm":
        width = 164
        height = 260 + extra_header + (len(items) * 19) + extra_msg_height
    elif format_type == "80mm":
        width = 226
        height = 285 + extra_header + (len(items) * 19) + extra_msg_height
    else: # A4 / Carta
        width, height = letter

    c = canvas.Canvas(output_path, pagesize=(width, height))
    
    # Payload QR de autenticación
    qr_payload = json.dumps({
        "doc": note_data.get("document_type", "NOTA_ENTREGA"),
        "nro": note_data.get("document_number", "000"),
        "rif": note_data.get("store_rif", "J-0000000"),
        "client": note_data.get("client_name", "Consumidor Final"),
        "date": note_data.get("date", ""),
        "total_usd": note_data.get("total_amount_usd", 0.0),
        "total_bs": note_data.get("total_amount_bs", 0.0)
    }, ensure_ascii=False)

    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(qr_payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    qr_image = ImageReader(img_buffer)

    rate = note_data.get("exchange_rate") or (note_data.get("total_amount_bs", 0.0) / note_data.get("total_amount_usd", 1.0) if note_data.get("total_amount_usd", 0.0) > 0 else 1.0)
    subtotal_usd = note_data.get("subtotal_usd") if note_data.get("subtotal_usd") is not None else note_data.get("total_amount_usd", 0.0)
    tax_usd = note_data.get("tax_amount_usd") if note_data.get("tax_amount_usd") is not None else 0.0
    tax_rate = note_data.get("tax_rate", 16)

    if format_type in ["58mm", "80mm"]:
        margin = 10
        font_title = 12 if format_type == "80mm" else 10
        font_normal = 8 if format_type == "80mm" else 7
        font_small = 7 if format_type == "80mm" else 6
        
        y = height - margin - 12
        
        # Cabecera Tienda
        c.setFont("Helvetica-Bold", font_title)
        c.drawCentredString(width / 2, y, note_data.get("store_name", "MI TIENDA POS").upper())
        y -= 12
        
        c.setFont("Helvetica", font_small)
        c.drawCentredString(width / 2, y, f"RIF: {note_data.get('store_rif', 'J-12345678-9')}")
        y -= 10
        if note_data.get("store_address"):
            c.drawCentredString(width / 2, y, note_data.get("store_address")[:32])
            y -= 10
        if note_data.get("store_phone"):
            c.drawCentredString(width / 2, y, f"TELF: {note_data.get('store_phone')}")
            y -= 10
        
        # Aviso y Título Documento
        c.setFont("Helvetica-Bold", font_normal)
        c.drawCentredString(width / 2, y, "DOCUMENTO NO FISCAL")
        y -= 12
        
        doc_type_str = note_data.get('document_type', 'PREFACTURA / COTIZACIÓN')
        c.setFont("Helvetica-Bold", font_normal)
        c.drawCentredString(width / 2, y, f"{doc_type_str} Nro: {note_data.get('document_number', '000')}")
        y -= 12
        
        c.line(margin, y, width - margin, y)
        y -= 12
        
        # Datos del cliente y fecha
        c.setFont("Helvetica", font_normal)
        c.drawString(margin, y, f"Cliente: {note_data.get('client_name', 'Cliente Final')}")
        y -= 10
        if note_data.get("client_identifier"):
            c.drawString(margin, y, f"CI/RIF: {note_data.get('client_identifier')}")
            y -= 10
        c.drawString(margin, y, f"Fecha: {note_data.get('date', '')}")
        y -= 12
        
        c.line(margin, y, width - margin, y)
        y -= 12
        
        # Cabecera de Ítems
        c.setFont("Helvetica-Bold", font_small)
        c.drawString(margin, y, "CANT | DESCRIPCION | TOTAL")
        y -= 10
        
        # Lista de Productos
        c.setFont("Helvetica", font_small)
        for item in items:
            p_name = item.get("product_name", "")
            desc = p_name[:24] if len(p_name) > 24 else p_name
            raw_qty = item.get("quantity", 0)
            qty_str = f"{int(raw_qty)}" if isinstance(raw_qty, (int, float)) and raw_qty == int(raw_qty) else f"{raw_qty}"
            
            unit_usd = item.get("unit_price_usd", 0.0)
            unit_bs = unit_usd * rate
            total_usd = item.get("total_price_usd", 0.0)
            total_bs_item = total_usd * rate
            
            c.setFont("Helvetica-Bold", font_small)
            c.drawString(margin, y, f"{qty_str} x {desc}")
            c.drawRightString(width - margin, y, f"Bs {format_bs(total_bs_item)}")
            y -= 9
            c.setFont("Helvetica", font_small - 1)
            c.drawString(margin + 5, y, f"Bs {format_bs(unit_bs)} x {qty_str}")
            y -= 10
            
        y -= 2
        c.line(margin, y, width - margin, y)
        y -= 12
        
        # Bloque de Totales
        subtotal_bs = subtotal_usd * rate
        tax_bs = tax_usd * rate
        total_bs = note_data.get("total_amount_bs") if note_data.get("total_amount_bs") is not None else (note_data.get("total_amount_usd", 0.0) * rate)
        enable_taxes = note_data.get("enable_taxes", True)
        show_tax = enable_taxes and tax_bs > 0

        c.setFont("Helvetica", font_small)
        if show_tax:
            c.drawString(margin, y, "SUBTOTAL:")
            c.drawRightString(width - margin, y, f"Bs {format_bs(subtotal_bs)}")
            y -= 10
            
            c.drawString(margin, y, f"IVA ({tax_rate}%):")
            c.drawRightString(width - margin, y, f"Bs {format_bs(tax_bs)}")
            y -= 12
        
        c.setFont("Helvetica-Bold", font_normal)
        c.drawString(margin, y, "TOTAL:")
        c.drawRightString(width - margin, y, f"Bs {format_bs(total_bs)}")
        y -= 10
        
        c.setFont("Helvetica-Oblique", font_small)
        c.drawRightString(width - margin, y, f"Tasa Ref: Bs {format_bs(rate)}")
        y -= 12
        
        c.line(margin, y, width - margin, y)
        y -= 12
        
        # Código QR y Leyendas de Autenticidad
        qr_size = 70 if format_type == "80mm" else 55
        y -= (qr_size + 8)
        c.drawImage(qr_image, (width - qr_size) / 2, y, width=qr_size, height=qr_size)
        y -= 10
        c.setFont("Helvetica-Bold", font_small - 1)
        c.drawCentredString(width / 2, y, "CÓDIGO DE AUTENTICIDAD DE DOCUMENTO")
        y -= 10
        c.drawCentredString(width / 2, y, "*** DOCUMENTO NO FISCAL / SIN VALIDEZ TRIBUTARIA ***")
        
        if note_data.get("ticket_message"):
            y -= 10
            msg = note_data.get("ticket_message")
            for msg_line in msg.split("\n"):
                if msg_line.strip():
                    c.setFont("Helvetica-Oblique", font_small - 1)
                    c.drawCentredString(width / 2, y, msg_line.strip())
                    y -= 9
        
    else:
        # A4 / Carta layout unificado
        c.setFont("Helvetica-Bold", 16)
        doc_type_str = note_data.get('document_type', 'PREFACTURA / COTIZACIÓN')
        c.drawCentredString(width / 2, height - 1 * inch, f"{doc_type_str} (NO FISCAL)")
        
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 1.25 * inch, "DOCUMENTO NO FISCAL - VÁLIDO COMO NOTA DE ENTREGA / PRE-FACTURA")
        
        y = height - 1.8 * inch
        c.drawString(1 * inch, y, f"Cliente: {note_data.get('client_name', 'Consumidor Final')}")
        c.drawRightString(width - 1 * inch, y, f"Nro: {note_data.get('document_number', '000')}")
        y -= 15
        if note_data.get("client_identifier"):
            c.drawString(1 * inch, y, f"CI/RIF: {note_data.get('client_identifier')}")
            y -= 15
        c.drawString(1 * inch, y, f"Fecha: {note_data.get('date', '')}")
        y -= 20
        
        c.line(1 * inch, y, width - 1 * inch, y)
        y -= 20
        
        # Items Header A4
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1 * inch, y, "DESCRIPCIÓN")
        c.drawString(4 * inch, y, "CANT")
        c.drawString(5 * inch, y, "PRECIO UNIT (Bs)")
        c.drawRightString(width - 1 * inch, y, "TOTAL (Bs)")
        y -= 18
        
        c.setFont("Helvetica", 9)
        for item in items:
            unit_usd = item.get("unit_price_usd", 0.0)
            unit_bs = unit_usd * rate
            total_usd = item.get("total_price_usd", 0.0)
            total_bs_item = total_usd * rate
            
            c.drawString(1 * inch, y, item.get("product_name", ""))
            c.drawString(4 * inch, y, str(item.get("quantity", 0)))
            c.drawString(5 * inch, y, f"Bs {format_bs(unit_bs)}")
            c.drawRightString(width - 1 * inch, y, f"Bs {format_bs(total_bs_item)}")
            y -= 18
            
            if y < 2.5 * inch:
                c.showPage()
                y = height - 1 * inch
                
        c.line(1 * inch, y, width - 1 * inch, y)
        y -= 20
        
        # Totales A4
        subtotal_bs = subtotal_usd * rate
        tax_bs = tax_usd * rate
        total_bs = note_data.get("total_amount_bs") if note_data.get("total_amount_bs") is not None else (note_data.get("total_amount_usd", 0.0) * rate)
        enable_taxes = note_data.get("enable_taxes", True)
        show_tax = enable_taxes and tax_bs > 0

        c.setFont("Helvetica", 10)
        if show_tax:
            c.drawString(4.5 * inch, y, "SUBTOTAL:")
            c.drawRightString(width - 1 * inch, y, f"Bs {format_bs(subtotal_bs)}")
            y -= 15
            c.drawString(4.5 * inch, y, f"IVA ({tax_rate}%):")
            c.drawRightString(width - 1 * inch, y, f"Bs {format_bs(tax_bs)}")
            y -= 18
            
        c.setFont("Helvetica-Bold", 11)
        c.drawString(4.5 * inch, y, "TOTAL:")
        c.drawRightString(width - 1 * inch, y, f"Bs {format_bs(total_bs)}")
        y -= 15
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(4.5 * inch, y, f"Tasa Ref: Bs {format_bs(rate)}")

        # Dibujar QR en A4
        qr_size = 80
        y -= (qr_size + 20)
        if y < 1 * inch:
            c.showPage()
            y = height - 1.5 * inch
        c.drawImage(qr_image, (width - qr_size) / 2, y, width=qr_size, height=qr_size)
        y -= 12
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(width / 2, y, "CÓDIGO DE AUTENTICIDAD DE DOCUMENTO")

    c.save()
    return output_path



