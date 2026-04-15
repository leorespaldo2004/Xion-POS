---
trigger: manual
---

## 1. Filosofía Central: "La Caja es Dolarizada y Nunca Se Detiene"

**Regla de Oro:** Atomicidad Local, Consistencia Eventual y Persistencia en Moneda Dura ($).

- **Concepto Financiero (The Anchor Currency):**
    - **Base de Datos:** Todos los precios, costos, inventarios y reportes históricos se almacenan nativamente en **USD ($)**.
    - **Interfaz de Venta (UI):** Visualización dual obligatoria.
        - *Formato Visual Estricto:* Las cifras se muestran con separador de miles por punto y decimales por coma, seguido del símbolo.
        - *Ejemplo:* `1.000.000,56 $` / `56.400,00 Bs`.
    - **Tasa de Cambio (El "Heartbeat" Financiero):**
        - La tasa de cambio es una configuración manual.
        - *Override Local:* En caso de emergencia (o subida repentina), el Administrador local puede forzar una tasa manual que tiene prioridad sobre la nube hasta el siguiente cierre.
    - **Histórico Inmutable:** Cada venta guarda tres valores: `total_usd`, `tasa_cambio_momento` y `total_moneda_local`. Esto permite auditar exactamente cuántos Bolívares/Pesos entraron a la caja en ese segundo específico, aunque la tasa cambie 10 minutos después.
- **Sincronización (Background Task):**
    - No bloqueamos al cajero esperando respuesta del servidor. La venta se confirma en milisegundos localmente.
    - Un hilo secundario de Python (`Httpx`) gestiona la subida en segundo plano.
    - **Multitarea:** Se pueden realizar varias ventas a la vez (Pestañas/Hold), permitiendo atender a un segundo cliente mientras el primero busca su billetera.

## 2. Lógica por Módulos (Procesos)

### 1. Inventario (El Cerebro Híbrido)

**Innovación:** Gestión de Stock Distribuido y Multidimensional.

- **Concepto:** El sistema gestiona **Magnitudes Convertibles**. El inventario es un fluido para productos a granel y bloques sólidos para unitarios.
- **Lógica Local:**
    - **Motor de Conversión Atómica:** El inventario se almacena en SQLite en su **Unidad Base** (mínima indivisible).
        - *Ejemplo:* Entrada de "1 Caja de 12 Cervezas" = SQLite suma `+12`. Entrada de "1 Saco Harina (50kg)" = SQLite suma `+50000` (Gramos).
    - **Descuento en Tiempo Real:** Fórmula: `Stock_Final = Stock_Actual - (Cantidad_Venta * Factor_Conversión_UOM)`.
        - *Caso:* Vender 0.5 kg de Jamón descuenta 500g.
        - *Caso:* Vender 2 Six-Packs descuenta 12 botellas.
    - **Validación de Decimales:** Bloqueo lógico para categorías "Discretas". No permite vender `1,5 Televisores`.
- **Regla de Seguridad:**
    - **Continuidad:** Permite ventas hasta llegar a 0 (o stock negativo configurado) en modo offline.
    - **Bloqueo Crítico:** Sin internet, se bloquean transferencias entre almacenes y redefiniciones de unidades (factores de conversión) para proteger la integridad histórica.
- **Lógica Nube:**
    - **Consolidación:** Normaliza unidades de todas las sucursales a la Unidad Base.
    - **Catálogo Maestro:** La nube es la única autorizada para crear nuevas Unidades de Medida globales y propagarlas vía Alembic.
- **Tipos de Ventas (Clasificación):**
    1. **Físico Unitario:** Conversión lineal (Caja -> Unidad).
    2. **Físico Granel (Peso/Volumen):** Input directo de balanza (Serial) o manual (`0,450 kg`). Soporta unidades custom ("Puñado", "Rodaja").
    3. **Compuesto (Combos):** *The Bottleneck Logic*. `Disponible_Combos = Min(Stock_A, Stock_B, Stock_C)`. Vender un combo descuenta los ítems individuales.
    4. **Servicios (Intangibles):** Stock infinito/agenda. Venta por tiempo o evento.

### 2. Ventas (El Motor de Ingresos)

**Innovación:** Facturación Resiliente y UX de Alta Velocidad.

- **Flujo de Negocio:**
    - **Apertura:** Validación Token (PyJWT). Si es válido (dentro de 72h), abre offline.
    - **Transacción:** Guardado en SQLite (`status: pending_sync`).
    - **Comprobantes:** Generación de "Nota de Entrega" personalizada o Factura Fiscal.
- **Atajos de Teclado (Indispensables para Cajeros):**
    - `F1`: Ayuda / Buscar Producto (Buscador Global).
    - `F2`: Cambiar Cantidad del ítem seleccionado.
    - `F3`: Descuento (requiere autorización).
    - `F4`: Cambiar Cliente.
    - `F5` / `Barra Espaciadora`: **COBRAR / Pagar** (Ir a pantalla de pago).
    - `F10`: Opciones de Cajón (Abrir cajón sin venta, Arqueo).
    - `ESC`: Cancelar / Atrás.
    - `+` /  (Teclado Numérico): Aumentar/Disminuir cantidad rápida.
    - (Teclado Numérico): Foco en campo de código de barras.
- **Compatibilidad de Hardware (I/O):**
    - **Lectores 2D:** Input como "Teclado HID". Interceptado por Python para agregar al carrito al instante.
    - **Impresión Térmica (ESC/POS):** Motor directo Python (sin diálogos OS).
    - **Impresoras Fiscales:** Patrón Adaptador (ThermalPrinter -> FiscalPrinterVE/PA).
- **Flujo de Pago Multi-Moneda:**
    - **Split Tender:** Pago mixto ($50 Efectivo + Resto en Pago Móvil).
    - **Vuelto Inteligente:** Sugiere la moneda más conveniente disponible en caja.
    - **Impuestos (IVA/IGTF):** Configurable por producto. Se calcula sobre la base USD convertida al momento.
- **Protección:** SQLCipher evita inyección SQL local para alterar precios.

### 3. Compras (El Abastecimiento)

**Innovación:** Recepción Inteligente.

- **Lógica:**
    - **Recepción Local:** Actualiza stock disponible inmediatamente (SQLite), sin esperar a la nube.
    - **Valorización:** Ingreso en USD. Si la factura es en moneda local, solicita tasa del día para convertir y guardar el Costo Base en USD.
    - **QR de Lote:** Genera etiquetas QR internas ("Lote #123") para compras grandes, facilitando auditorías futuras sin papeles.
    - **Schema Dinámico:** Alembic baja migraciones (ej. nuevo campo "Lote") y actualiza SQLite al inicio sin reinstalar.

### 4. Clientes (El Activo Protegido)

**Innovación:** Privacidad "Zero-Knowledge" (casi) y Crédito Dolarizado.

- **Seguridad:** Datos cifrados en reposo (SQLCipher). Seguro ante robo de hardware.
- **Búsqueda Offline:** Por DNI/Nombre en BD local.
- **Crédito:**
    - Límite de crédito descargado al inicio del día.
    - **Cuentas por Cobrar:** Deuda fijada en **USD**. El pago diferido se realiza a la tasa del día del pago (protección contra devaluación).

### 5. Configuración y Personalización (El Cerebro Administrativo)

**Innovación:** Sistema Camaleónico.

- **Global (Sync):** Fiscalidad (IVA, Símbolo Moneda), Datos Legales (RIF/NIT, Logo).
- **Local (UX):** Temas (Dark/Light, Color de Marca).
- **Plantillas:** Editor de "Nota de Entrega" (Mostrar/Ocultar precios, mensajes pie de página).
- **Reglas:** Configuración de descuentos automáticos (ej. 5% por docena).

### 6. Seguridad y Auditoría (QR Workflow)

**Innovación:** Trazabilidad Digital Física.

- **QR Apertura/Cierre:** Ticket térmico con QR encriptado que contiene el resumen financiero del turno. El dueño lo escanea con su App Admin para auditar sin estar presente.
- **QR de Supervisor:** Autorización de descuentos o anulaciones escaneando el QR del carnet del supervisor (sin escribir contraseñas frente al cliente).

### 7. Usuarios (Control de Acceso)

**Innovación:** Autenticación Hardware.

- **Fingerprinting:** `node-machine-id` vincula usuario+PC. Evita copias no autorizadas.
- **Roles:** Definidos en Nube, cacheados Localmente. Revocación efectiva en la siguiente sincronización (minutos).

### 8. Proveedores registro simple.

Registro simple de datos de Proveedores.

### 9. Reportes (Inteligencia Dual)

- **Tácticos (Local):** Python + SQLite. Cierre de caja, Cuadre Efectivo, Ventas del día. Rápidos y Offline.
- **Estratégicos (Nube):** Postgres. Rentabilidad, Mapas de Calor, Comparativas.
- **Dashboards:** Web en tiempo real para el dueño.

## 3. El Modelo de Suscripción (SaaS) y Ciclo de Vida

- **Instalación:** FastAPI Local genera huella digital.
- **Activación:** Nube valida (Suscripción + Machine ID).
- **Token de Vida (72h):**
    - JWT guardado en `Keytar` (OS Keychain).
    - Renovación silenciosa con internet.
- **Kill Switch:** Si no hay pago, la nube niega renovación. Al expirar las 72h offline, el sistema entra en bloqueo ("Renueva tu suscripción").