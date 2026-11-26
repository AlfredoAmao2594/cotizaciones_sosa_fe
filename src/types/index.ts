export type Currency = "PEN" | "USD";
export type QuotationStatus = "BORRADOR" | "ENVIADA" | "EN_REVISION" | "ACEPTADA" | "RECHAZADA" | "VENCIDA";

export interface Cliente {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: string | null;
  estadoSunat: string | null;
  condicionSunat: string | null;
  contactoNombre: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correoEnvio: string;
  correosAdicionales: string | null;
  notas: string | null;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ClienteRow {
  cliente: Cliente;
  cotizaciones: number;
}

export interface ClienteInput {
  ruc: string;
  razonSocial: string;
  contactoNombre?: string;
  telefono?: string;
  whatsapp?: string;
  correoEnvio: string;
  correosAdicionales?: string;
  notas?: string;
  direccion?: string;
}

export interface SunatData {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: string | null;
  estado: string | null;
  condicion: string | null;
}

export interface RucLookup {
  registrado: boolean;
  cliente: Cliente | null;
  sunat: SunatData | null;
  sunatDisponible: boolean;
}

export interface QuotationSummary {
  id: string;
  numero: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  total: number;
  moneda: Currency;
  estado: QuotationStatus;
  fechaEmision: string;
  vigenciaHasta: string;
  enviadaEn: string | null;
  diasDesdeEnvio: number | null;
  tieneOrdenServicio: boolean;
  rechazoSugerido: boolean;
}

export type DocTipo = "SIN_CLASIFICAR" | "ORDEN_COMPRA" | "ORDEN_SERVICIO";

export interface ServiceOrderDoc {
  id: string;
  nombreArchivo: string;
  contentType: string;
  tamano: number;
  remitente: string | null;
  origen: "CORREO" | "MANUAL";
  tipo: DocTipo;
  recibidoEn: string;
}

export interface HistoryEvent {
  id: string;
  tipo: string;
  detalle: string | null;
  actor: string;
  fecha: string;
}

export interface QuotationDetail {
  id: string;
  numero: string;
  cliente: Cliente;
  items: QuotationDetailItem[];
  subtotal: number;
  igv: number;
  total: number;
  moneda: Currency;
  estado: QuotationStatus;
  fechaEmision: string;
  vigenciaHasta: string;
  condiciones: string | null;
  validezDias: number;
  condicionPago: string;
  preciosIncluyenIgv: boolean;
  creadaPor: string;
  enviadaEn: string | null;
  respondidaEn: string | null;
  aceptadaEn: string | null;
  rechazoSugerido: boolean;
  ordenesServicio: ServiceOrderDoc[];
  historial: HistoryEvent[];
}

export interface SendResult {
  ok: boolean;
  error: string | null;
  destinatarios: string[];
}

export type AlertType =
  | "ORDEN_SERVICIO_RECIBIDA"
  | "RESPUESTA_CLIENTE"
  | "POSIBLE_RECHAZO"
  | "COINCIDENCIA_DUDOSA"
  | "ENVIO_FALLIDO"
  | "COTIZACION_VENCIDA";

export interface AlertItem {
  id: string;
  tipo: AlertType;
  mensaje: string;
  quotationId: string | null;
  quotationNumero: string | null;
  creadaEn: string;
  leida: boolean;
}

export interface DashboardSummary {
  porEstado: Record<QuotationStatus, number>;
  enviadasMes: number;
  aceptadasMes: number;
  montoAceptadoMes: Partial<Record<Currency, number>>;
  sinRespuesta: number;
  diasSinRespuesta: number;
}

export interface PollStatus {
  ok: boolean;
  mensaje: string;
  revisados: number;
  relacionados: number;
  fecha: string | null;
}

export interface QuotationDetailItem {
  descripcion: string;
  cantidad: number;
  unidad: string;
  codigo: string | null;
  /** Precio tal como se ingresó (con o sin IGV según preciosIncluyenIgv). */
  precioUnitario: number;
  /** Valor unitario sin IGV. */
  valorUnitario: number;
  base: number;
  igv: number;
  total: number;
}

// ---------- Configuraciones ----------

export interface EmisorPerfil {
  ruc: string;
  razonSocial: string;
  direccion: string | null;
  correo: string | null;
  celular: string | null;
}

export interface CuentaBancaria {
  id: string;
  banco: string;
  moneda: Currency;
  numeroCuenta: string;
  cci: string | null;
  activa: boolean;
}

export interface CondicionPago {
  id: string;
  nombre: string;
}

export interface Numeracion {
  serie: string;
  siguienteCorrelativo: number;
  /** Número que recibirá la próxima cotización, p. ej. 0026-2026. */
  siguienteNumero: string;
}
