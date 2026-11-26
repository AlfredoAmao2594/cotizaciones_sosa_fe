import { apiClient } from "./client";
import type { Cliente, ClienteInput, ClienteRow, Page, RucLookup } from "../types";

export type ClienteSort = "razonSocial" | "ruc" | "correoEnvio" | "createdAt";

export interface ClienteQuery {
  q?: string;
  ruc?: string;
  correo?: string;
  page: number;
  size: number;
  sort: ClienteSort;
  dir: "asc" | "desc";
}

/** Búsqueda, filtros, orden y paginación se resuelven en el backend. */
export async function listClientes(query: ClienteQuery): Promise<Page<ClienteRow>> {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== undefined));
  const { data } = await apiClient.get<Page<ClienteRow>>("/api/clientes", { params });
  return data;
}

export async function lookupRuc(ruc: string): Promise<RucLookup> {
  const { data } = await apiClient.get<RucLookup>(`/api/clientes/ruc/${ruc}`);
  return data;
}

export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const { data } = await apiClient.post<Cliente>("/api/clientes", input);
  return data;
}

export async function updateCliente(id: string, input: ClienteInput): Promise<Cliente> {
  const { data } = await apiClient.put<Cliente>(`/api/clientes/${id}`, input);
  return data;
}

export async function refreshClienteSunat(id: string): Promise<Cliente> {
  const { data } = await apiClient.post<Cliente>(`/api/clientes/${id}/refresh-sunat`);
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  await apiClient.delete(`/api/clientes/${id}`);
}
