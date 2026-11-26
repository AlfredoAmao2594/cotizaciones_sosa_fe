import { apiClient } from "./client";
import type { ClienteInput, Currency, DocTipo, Page, QuotationDetail, QuotationStatus, QuotationSummary, SendResult } from "../types";

export interface QuotationItemPayload {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  unidad?: string;
  codigo?: string;
}

export interface CreateQuotationPayload {
  ruc: string;
  nuevoCliente?: ClienteInput;
  moneda: Currency;
  vigenciaHasta?: string;
  validezDias?: number;
  condicionPago?: string;
  preciosIncluyenIgv?: boolean;
  condiciones?: string;
  items: QuotationItemPayload[];
  enviar: boolean;
}

export async function createQuotation(
  payload: CreateQuotationPayload,
): Promise<{ cotizacion: QuotationDetail; envio: SendResult | null }> {
  const { data } = await apiClient.post("/api/quotations", payload);
  return data;
}

export type QuotationSort = "createdAt" | "numero" | "fechaEmision" | "total" | "estado" | "enviadaEn" | "cliente";

export interface QuotationQuery {
  estado?: QuotationStatus;
  q?: string;
  desde?: string;
  hasta?: string;
  moneda?: Currency;
  sinRespuesta?: boolean;
  page: number;
  size: number;
  sort?: QuotationSort;
  dir?: "asc" | "desc";
}

/** Filtros, orden y paginación se resuelven en el backend. */
export async function searchQuotations(query: QuotationQuery): Promise<Page<QuotationSummary>> {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== undefined && v !== false));
  const { data } = await apiClient.get<Page<QuotationSummary>>("/api/quotations", { params });
  return data;
}

export async function getQuotation(id: string): Promise<QuotationDetail> {
  const { data } = await apiClient.get<QuotationDetail>(`/api/quotations/${id}`);
  return data;
}

export async function sendQuotation(id: string, destinatarios?: string[]): Promise<SendResult> {
  const { data } = await apiClient.post<SendResult>(`/api/quotations/${id}/send`, { destinatarios: destinatarios ?? [] });
  return data;
}

export async function whatsappLink(id: string, telefono?: string): Promise<string> {
  const { data } = await apiClient.post<{ link: string }>(`/api/quotations/${id}/whatsapp`, { telefono: telefono || null });
  return data.link;
}

export async function recordShared(id: string): Promise<void> {
  await apiClient.post(`/api/quotations/${id}/shared`);
}

export async function duplicateQuotation(id: string): Promise<QuotationDetail> {
  const { data } = await apiClient.post<QuotationDetail>(`/api/quotations/${id}/duplicate`);
  return data;
}

export async function rejectQuotation(id: string, motivo?: string): Promise<QuotationDetail> {
  const { data } = await apiClient.post<QuotationDetail>(`/api/quotations/${id}/reject`, { motivo: motivo || null });
  return data;
}

export async function downloadQuotationPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/api/quotations/${id}/pdf`, { responseType: "blob" });
  return data;
}

export async function uploadServiceOrder(id: string, file: File, tipo: DocTipo): Promise<QuotationDetail> {
  const form = new FormData();
  form.append("file", file);
  form.append("tipo", tipo);
  const { data } = await apiClient.post<QuotationDetail>(`/api/quotations/${id}/service-orders`, form);
  return data;
}

export async function classifyServiceOrder(id: string, docId: string, tipo: DocTipo): Promise<QuotationDetail> {
  const { data } = await apiClient.patch<QuotationDetail>(`/api/quotations/${id}/service-orders/${docId}`, { tipo });
  return data;
}

export async function dismissRejection(id: string): Promise<QuotationDetail> {
  const { data } = await apiClient.post<QuotationDetail>(`/api/quotations/${id}/dismiss-rejection`);
  return data;
}

export async function confirmServiceOrder(id: string): Promise<QuotationDetail> {
  const { data } = await apiClient.post<QuotationDetail>(`/api/quotations/${id}/service-orders/confirm`);
  return data;
}

export async function discardServiceOrder(id: string, docId: string): Promise<QuotationDetail> {
  const { data } = await apiClient.delete<QuotationDetail>(`/api/quotations/${id}/service-orders/${docId}`);
  return data;
}

export async function downloadServiceOrder(id: string, docId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/api/quotations/${id}/service-orders/${docId}`, { responseType: "blob" });
  return data;
}
