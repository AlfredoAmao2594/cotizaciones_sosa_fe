import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { listAlerts, markAlertRead, markAlertUnread, markAllAlertsRead, unreadAlertCount, type AlertLectura } from "../api/alerts";
import { Pagination } from "../components/Pagination";
import { RowActionsMenu } from "../components/RowActionsMenu";
import { dateTime, errorMessage } from "../lib/format";
import { useDebounced, useResettablePage } from "../lib/useDebounced";
import type { AlertItem, AlertType } from "../types";

const TYPE_INFO: Record<AlertType, { label: string; style: string }> = {
  ORDEN_SERVICIO_RECIBIDA: { label: "Aceptada (OC / OS)", style: "bg-green-100 text-green-800" },
  POSIBLE_RECHAZO: { label: "Posible rechazo", style: "bg-red-100 text-red-700" },
  RESPUESTA_CLIENTE: { label: "Respuesta del cliente", style: "bg-amber-100 text-amber-800" },
  COINCIDENCIA_DUDOSA: { label: "Por confirmar", style: "bg-amber-100 text-amber-800" },
  ENVIO_FALLIDO: { label: "Envío fallido", style: "bg-red-100 text-red-700" },
  COTIZACION_VENCIDA: { label: "Vencida", style: "bg-zinc-200 text-zinc-700" },
};

export function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<AlertType | "">("");
  const [lectura, setLectura] = useState<AlertLectura>("TODAS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [size, setSize] = useState(10);
  const [permission, setPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const qDebounced = useDebounced(q.trim());
  const [page, setPage] = useResettablePage(`${qDebounced}|${tipo}|${lectura}|${desde}|${hasta}|${size}`);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["alerts", "list", qDebounced, tipo, lectura, desde, hasta, page, size],
    queryFn: () => listAlerts({ q: qDebounced, tipo: tipo || undefined, lectura, desde, hasta, page, size }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const { data: unread = 0 } = useQuery({ queryKey: ["alerts", "unread"], queryFn: unreadAlertCount });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["alerts"] });
  const readAll = useMutation({ mutationFn: markAllAlertsRead, onSuccess: invalidate });
  const toggleRead = useMutation({
    mutationFn: (a: AlertItem) => (a.leida ? markAlertUnread(a.id) : markAlertRead(a.id)),
    onSuccess: invalidate,
  });

  async function openCase(a: AlertItem) {
    if (!a.leida) {
      await markAlertRead(a.id);
      invalidate();
    }
    if (a.quotationId) navigate(`/casos/${a.quotationId}`);
  }

  const hasFilters = !!(q || tipo || lectura !== "TODAS" || desde || hasta);
  const rows = data?.content ?? [];
  const input = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm bg-white";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Alertas {unread > 0 && <span className="ml-1 align-middle text-sm font-medium bg-red-600 text-white rounded-full px-2 py-0.5">{unread} sin leer</span>}
        </h1>
        <button onClick={() => readAll.mutate()} disabled={unread === 0 || readAll.isPending}
          className="border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-sm font-medium rounded-md px-4 py-2.5">
          Marcar todas como leídas
        </button>
      </div>

      {permission === "default" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-blue-900">Recibe un aviso en esta computadora o teléfono cuando un cliente acepte una cotización.</p>
          <button onClick={async () => setPermission(await Notification.requestPermission())}
            className="bg-blue-700 text-white text-sm font-medium rounded-md px-4 py-2.5">Activar notificaciones</button>
        </div>
      )}

      {/* Filtros (se aplican en el servidor) */}
      <section aria-label="Filtros" className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-2 items-end">
        <label className="block xl:col-span-3">
          <span className="block text-xs font-medium text-slate-600 mb-1">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mensaje o N° de cotización" className={input} />
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as AlertType | "")} className={input}>
            <option value="">Todos</option>
            {(Object.keys(TYPE_INFO) as AlertType[]).map((t) => <option key={t} value={t}>{TYPE_INFO[t].label}</option>)}
          </select>
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Estado</span>
          <select value={lectura} onChange={(e) => setLectura(e.target.value as AlertLectura)} className={input}>
            <option value="TODAS">Todas</option>
            <option value="NO_LEIDAS">No leídas</option>
            <option value="LEIDAS">Leídas</option>
          </select>
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Desde</span>
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className={input} />
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Hasta</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={input} />
        </label>
        <button type="button" disabled={!hasFilters}
          onClick={() => { setQ(""); setTipo(""); setLectura("TODAS"); setDesde(""); setHasta(""); }}
          className="xl:col-span-1 border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-sm rounded-md px-3 py-2.5">
          Limpiar
        </button>
      </section>

      {isError && <p className="text-sm text-red-700">{errorMessage(error, "No se pudieron cargar las alertas")}</p>}

      <div className={`bg-white border border-slate-200 rounded-xl transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Alertas</caption>
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium w-24">Estado</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Mensaje</th>
                <th className="px-4 py-2 font-medium">Cotización</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium text-center w-16 sticky right-0 bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {hasFilters ? "Ninguna alerta coincide con los filtros." : "No hay alertas."}
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id} className={`group border-t border-slate-100 hover:bg-slate-50 align-top ${a.leida ? "" : "bg-blue-50/40"}`}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {a.leida ? (
                      <span className="text-slate-500">Leída</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-blue-800">
                        <span className="w-2 h-2 rounded-full bg-blue-600" aria-hidden /> Nueva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${TYPE_INFO[a.tipo].style}`}>{TYPE_INFO[a.tipo].label}</span>
                  </td>
                  <td className={`px-4 py-2.5 min-w-64 ${a.leida ? "text-slate-700" : "text-slate-900 font-medium"}`}>{a.mensaje}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {a.quotationId ? (
                      <Link to={`/casos/${a.quotationId}`} onClick={() => !a.leida && markAlertRead(a.id).then(invalidate)}
                        className="text-blue-700 hover:underline font-medium">
                        {a.quotationNumero}
                      </Link>
                    ) : a.quotationNumero ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{dateTime(a.creadaEn)}</td>
                  <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">
                    <RowActionsMenu
                      label={`Acciones para la alerta ${a.quotationNumero ?? ""}`.trim()}
                      actions={[
                        { label: "Abrir caso", onSelect: () => openCase(a), disabled: !a.quotationId },
                        { label: a.leida ? "Marcar como no leída" : "Marcar como leída", onSelect: () => toggleRead.mutate(a) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination data={data} size={size} onPage={setPage} onSize={setSize} />}
      </div>
    </div>
  );
}
