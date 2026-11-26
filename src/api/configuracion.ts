import { apiClient } from "./client";
import type { CondicionPago, CuentaBancaria, Currency, EmisorPerfil, Numeracion } from "../types";

const BASE = "/api/configuracion";

export async function getPerfil(): Promise<EmisorPerfil> {
  return (await apiClient.get<EmisorPerfil>(`${BASE}/perfil`)).data;
}

/** El RUC no se envía: no se puede cambiar desde la aplicación. */
export async function updatePerfil(input: Omit<EmisorPerfil, "ruc">): Promise<EmisorPerfil> {
  return (await apiClient.put<EmisorPerfil>(`${BASE}/perfil`, input)).data;
}

export interface BancoInput {
  banco: string;
  moneda: Currency;
  numeroCuenta: string;
  cci?: string;
}

export async function listBancos(): Promise<CuentaBancaria[]> {
  return (await apiClient.get<CuentaBancaria[]>(`${BASE}/bancos`)).data;
}

export async function createBanco(input: BancoInput): Promise<CuentaBancaria> {
  return (await apiClient.post<CuentaBancaria>(`${BASE}/bancos`, input)).data;
}

export async function updateBanco(id: string, input: BancoInput): Promise<CuentaBancaria> {
  return (await apiClient.put<CuentaBancaria>(`${BASE}/bancos/${id}`, input)).data;
}

export async function setBancoActivo(id: string, activa: boolean): Promise<CuentaBancaria> {
  return (await apiClient.patch<CuentaBancaria>(`${BASE}/bancos/${id}/activa`, { activa })).data;
}

export async function deleteBanco(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/bancos/${id}`);
}

export async function listCondicionesPago(): Promise<CondicionPago[]> {
  return (await apiClient.get<CondicionPago[]>(`${BASE}/condiciones-pago`)).data;
}

export async function createCondicionPago(nombre: string): Promise<CondicionPago> {
  return (await apiClient.post<CondicionPago>(`${BASE}/condiciones-pago`, { nombre })).data;
}

export async function updateCondicionPago(id: string, nombre: string): Promise<CondicionPago> {
  return (await apiClient.put<CondicionPago>(`${BASE}/condiciones-pago/${id}`, { nombre })).data;
}

export async function deleteCondicionPago(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/condiciones-pago/${id}`);
}

export async function getNumeracion(): Promise<Numeracion> {
  return (await apiClient.get<Numeracion>(`${BASE}/numeracion`)).data;
}

export async function updateNumeracion(serie: string, siguienteCorrelativo: number): Promise<Numeracion> {
  return (await apiClient.put<Numeracion>(`${BASE}/numeracion`, { serie, siguienteCorrelativo })).data;
}
