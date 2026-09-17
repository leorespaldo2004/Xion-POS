# filepath: local_backend/tests/api/test_pdf_generator.py
import os
import pytest
from local_backend.api.utils.pdf_generator import generate_delivery_note_pdf

def test_generate_delivery_note_pdf(tmp_path):
    output_pdf = os.path.join(tmp_path, "test_ticket.pdf")
    
    note_data = {
        "store_name": "MI TIENDA POS",
        "store_rif": "J-12345678-9",
        "store_address": "Av. Principal 123",
        "store_phone": "0414-1234567",
        "ticket_message": "¡Gracias por su preferencia!",
        "tax_rate": 16,
        "document_type": "PREFACTURA / COTIZACIÓN",
        "document_number": "000101",
        "client_name": "Leonard Fernandez",
        "client_identifier": "31343408",
        "date": "14/09/2026 16:30",
        "subtotal_usd": 10.0,
        "tax_amount_usd": 1.6,
        "total_amount_usd": 11.6,
        "total_amount_bs": 9280.0,
        "exchange_rate": 800.0
    }
    
    items = [
        {
            "product_name": "Coca Cola 2L",
            "quantity": 2,
            "unit_price_usd": 2.0,
            "total_price_usd": 4.0
        },
        {
            "product_name": "Arroz Mary 1 Kg",
            "quantity": 1,
            "unit_price_usd": 1.0,
            "total_price_usd": 1.0
        }
    ]
    
    result_path = generate_delivery_note_pdf(note_data, items, output_pdf, "80mm")
    
    assert os.path.exists(result_path)
    assert os.path.getsize(result_path) > 0
