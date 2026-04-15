# filepath: local_backend/api/utils/pdf_generator.py
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch

def generate_closing_report_pdf(session_data: dict, output_path: str):
    """
    Genera un reporte de cierre de caja en PDF usando reportlab.
    """
    # Asegurar que el directorio existe
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
