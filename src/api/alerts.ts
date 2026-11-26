import { apiClient } from "./client";
import type { AlertItem, AlertType, DashboardSummary, Page, PollStatus } from "../types";

export type AlertLectura = "TODAS" | "NO_LEIDAS" | "LEIDAS";

export interface AlertQuery {
  tipo?: AlertType;
  lectura?: AlertLectura;
  q?: string;
  desde?: string;
  hasta?: string;
  page: number;
  size: number;
}

/** Filtros y paginación se resuelven en el backend. */
export async function listAlerts(query: AlertQuery): Promise<Page<AlertItem>> {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== undefined));
  const { data } = await apiClient.get<Page<AlertItem>>("/api/alerts", { params });
  return data;
}

export async function unreadAlertCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/api/alerts/unread-count");
  return data.count;
}

export async function markAlertRead(id: string): Promise<void> {
  await apiClient.post(`/api/alerts/${id}/read`);
}

export async function markAlertUnread(id: string): Promise<void> {
  await apiClient.delete(`/api/alerts/${id}/read`);
}

export async function markAllAlertsRead(): Promise<void> {
  await apiClient.post("/api/alerts/read-all");
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/api/dashboard/summary");
  return data;
}

export async function checkReplies(): Promise<PollStatus> {
  const { data } = await apiClient.post<PollStatus>("/api/replies/check");
  return data;
}

export async function repliesStatus(): Promise<PollStatus> {
  const { data } = await apiClient.get<PollStatus>("/api/replies/status");
  return data;
}
