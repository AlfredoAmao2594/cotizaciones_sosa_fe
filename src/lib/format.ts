import type { AxiosError } from "axios";
import type { Currency, DocTipo, QuotationStatus } from "../types";

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  EN_REVISION: "En revisión",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

export const STATUS_STYLE: Record<QuotationStatus, string> = {
  BORRADOR: "bg-slate-100 text-slate-700",
  ENVIADA: "bg-blue-100 text-blue-800",
  EN_REVISION: "bg-amber-100 text-amber-800",
  ACEPTADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-700",
  VENCIDA: "bg-zinc-200 text-zinc-700",
};

export const DOC_TIPO_LABEL: Record<DocTipo, string> = {
  SIN_CLASIFICAR: "Sin clasificar",
  ORDEN_COMPRA: "Orden de compra",
  ORDEN_SERVICIO: "Orden de servicio",
};

export function money(amount: number, moneda: Currency): string {
  const symbol = moneda === "USD" ? "US$" : "S/";
  return `${symbol} ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export function date(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Mensaje legible de un error del backend (ApiError) o genérico. */
export function errorMessage(error: unknown, fallback = "Ocurrió un error"): string {
  const data = (error as AxiosError<{ message?: string; details?: string[] }>)?.response?.data;
  if (data?.details?.length) return data.details.join(" · ");
  return data?.message || fallback;
}
