import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { checkReplies, dashboardSummary, repliesStatus } from "../api/alerts";
import {
  downloadQuotationPdf,
  duplicateQuotation,
  rejectQuotation,
  searchQuotations,
  sendQuotation,
  type QuotationSort,
} from "../api/quotations";
import { Pagination } from "../components/Pagination";
import { RowActionsMenu } from "../components/RowActionsMenu";
import { SortHeader } from "../components/SortHeader";
import { StatusBadge } from "../components/StatusBadge";
import { saveBlob } from "../lib/download";
import { date, dateTime, errorMessage, money, STATUS_LABEL } from "../lib/format";
import { useDebounced, useResettablePage } from "../lib/useDebounced";
import type { Currency, QuotationStatus, QuotationSummary } from "../types";

const STATUSES: QuotationStatus[] = ["BORRADOR", "ENVIADA", "EN_REVISION", "ACEPTADA", "RECHAZADA", "VENCIDA"];

export function QuotationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  // Los filtros pueden llegar por URL (desde el dashboard o desde Clientes).
  const initialEstado = params.get("estado") as QuotationStatus | null;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [estado, setEstado] = useState<QuotationStatus | "">(initialEstado && STATUSES.includes(initialEstado) ? initialEstado : "");
  const [moneda, setMoneda] = useState<Currency | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sinRespuesta, setSinRespuesta] = useState(params.get("sinRespuesta") === "1");
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<QuotationSort>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const qDebounced = useDebounced(q.trim());
  const [page, setPage] = useResettablePage(`${qDebounced}|${estado}|${moneda}|${desde}|${hasta}|${sinRespuesta}|${size}`);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["quotations", qDebounced, estado, moneda, desde, hasta, sinRespuesta, page, size, sort, dir],
    queryFn: () => searchQuotations({
      q: qDebounced, estado: estado || undefined, moneda: moneda || undefined, desde, hasta, sinRespuesta,
      page, size, sort, dir,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const { data: lastPoll } = useQuery({ queryKey: ["replies-status"], queryFn: repliesStatus, refetchInterval: 60_000 });
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardSummary });
  const staleDays = summary?.diasSinRespuesta ?? 5;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };
  const fail = (fallback: string) => (err: unknown) => setMessage({ ok: false, text: errorMessage(err, fallback) });

  const check = useMutation({
    mutationFn: checkReplies,
    onSuccess: (status) => {
      queryClient.setQueryData(["replies-status"], status);
      refreshAll();
    },
  });
  const resend = useMutation({
    mutationFn: (r: QuotationSummary) => sendQuotation(r.id),
    onSuccess: (res, r) => {
      setMessage(res.ok ? { ok: true, text: `${r.numero} reenviada a ${res.destinatarios.join(", ")}` } : { ok: false, text: `No se pudo enviar ${r.numero}: ${res.error}` });
      refreshAll();
    },
    onError: fail("No se pudo enviar"),
  });
  const duplicate = useMutation({
    mutationFn: (r: QuotationSummary) => duplicateQuotation(r.id),
    onSuccess: (d) => {
      refreshAll();
      navigate(`/casos/${d.id}`);
    },
    onError: fail("No se pudo duplicar"),
  });
  const reject = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => rejectQuotation(id, motivo),
    onSuccess: (d) => {
      setMessage({ ok: true, text: `${d.numero} marcada como rechazada` });
      refreshAll();
    },
    onError: fail("No se pudo marcar como rechazada"),
  });

  async function downloadPdf(r: QuotationSummary) {
    try {
      saveBlob(await downloadQuotationPdf(r.id), `Cotizacion_${r.numero}.pdf`);
    } catch (err) {
      fail("No se pudo descargar el PDF")(err);
    }
  }

  function onSort(column: QuotationSort) {
    if (sort === column) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(column);
      setDir(column === "createdAt" || column === "fechaEmision" || column === "enviadaEn" || column === "total" ? "desc" : "asc");
    }
    setPage(0);
  }

  const hasFilters = !!(q || estado || moneda || desde || hasta || sinRespuesta);
  const rows = data?.content ?? [];
  const input = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm bg-white";
  const poll = check.data ?? lastPoll;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Cotizaciones</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => check.mutate()} disabled={check.isPending}
            className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-sm font-medium rounded-md px-4 py-2.5">
            {check.isPending ? "Revisando correo..." : "Revisar respuestas ahora"}
          </button>
          <Link to="/cotizaciones/nueva" className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-md px-4 py-2.5">
            + Nueva cotización
          </Link>
        </div>
      </div>

      {poll?.fecha && (
        <p className={`text-xs ${poll.ok ? "text-slate-500" : "text-amber-700"}`}>
          Última revisión de correo: {dateTime(poll.fecha)} — {poll.mensaje}
        </p>
      )}

      {message && (
        <p role="status" className={`text-sm rounded-md px-3 py-2 border ${message.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.text}
        </p>
      )}

      {/* Filtros (se aplican en el servidor) */}
      <section aria-label="Filtros" className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-2 items-end">
        <label className="block xl:col-span-3">
          <span className="block text-xs font-medium text-slate-600 mb-1">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="N°, RUC o razón social" className={input} />
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value as QuotationStatus | "")} className={input}>
            <option value="">Todos</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block xl:col-span-1">
          <span className="block text-xs font-medium text-slate-600 mb-1">Moneda</span>
          <select value={moneda} onChange={(e) => setMoneda(e.target.value as Currency | "")} className={input}>
            <option value="">Todas</option>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Emitida desde</span>
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className={input} />
        </label>
        <label className="block xl:col-span-2">
          <span className="block text-xs font-medium text-slate-600 mb-1">Emitida hasta</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={input} />
        </label>
        <div className="xl:col-span-2 flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-4 h-4" checked={sinRespuesta} onChange={(e) => setSinRespuesta(e.target.checked)} />
            Sin respuesta (seguimiento)
          </label>
          <button type="button" disabled={!hasFilters}
            onClick={() => { setQ(""); setEstado(""); setMoneda(""); setDesde(""); setHasta(""); setSinRespuesta(false); setParams({}, { replace: true }); }}
            className="border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-sm rounded-md px-3 py-2">
            Limpiar filtros
          </button>
        </div>
      </section>

      {isError && <p className="text-sm text-red-700">{errorMessage(error, "No se pudieron cargar las cotizaciones")}</p>}

      <div className={`bg-white border border-slate-200 rounded-xl transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Cotizaciones</caption>
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <SortHeader label="N°" column="numero" sort={sort} dir={dir} onSort={onSort} />
                <SortHeader label="Cliente" column="cliente" sort={sort} dir={dir} onSort={onSort} />
                <SortHeader label="Emisión" column="fechaEmision" sort={sort} dir={dir} onSort={onSort} />
                <SortHeader label="Enviada" column="enviadaEn" sort={sort} dir={dir} onSort={onSort} />
                <SortHeader label="Total" column="total" sort={sort} dir={dir} onSort={onSort} align="right" />
                <SortHeader label="Estado" column="estado" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-2 font-medium text-center" title="Orden de compra / servicio">OC / OS</th>
                <th className="px-2 py-2 font-medium text-center w-16 sticky right-0 bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    {hasFilters ? "Ninguna cotización coincide con los filtros." : "Aún no hay cotizaciones. Crea la primera con “Nueva cotización”."}
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const cerrada = r.estado === "VENCIDA" || r.estado === "RECHAZADA";
                const final = cerrada || r.estado === "ACEPTADA";
                return (
                  <tr key={r.id} className="group border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link to={`/casos/${r.id}`} className="text-blue-700 hover:underline font-medium">{r.numero}</Link>
                    </td>
                    <td className="px-4 py-2.5 min-w-48">
                      <span className="block">{r.clienteRazonSocial}</span>
                      <span className="block text-xs text-slate-500">RUC {r.clienteRuc}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {date(r.fechaEmision)}
                      <span className="block text-xs text-slate-500">Vence {date(r.vigenciaHasta)}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.enviadaEn ? (
                        <>
                          {date(r.enviadaEn.slice(0, 10))}
                          <span className={`block text-xs ${r.estado === "ENVIADA" && (r.diasDesdeEnvio ?? 0) >= staleDays ? "text-amber-700 font-medium" : "text-slate-500"}`}>
                            hace {r.diasDesdeEnvio} d
                          </span>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right tabular-nums">{money(r.total, r.moneda)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge estado={r.estado} />
                      {r.rechazoSugerido && !final && <span className="block mt-1 text-xs font-medium text-red-700">Posible rechazo</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.tieneOrdenServicio ? <span className="text-green-700 font-semibold" title="Orden de compra / servicio recibida">✓</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]">
                      <RowActionsMenu
                        label={`Acciones para ${r.numero}`}
                        actions={[
                          { label: "Ver caso", onSelect: () => navigate(`/casos/${r.id}`) },
                          { label: "Descargar PDF", onSelect: () => downloadPdf(r) },
                          {
                            label: r.enviadaEn ? "Reenviar por correo" : "Enviar por correo",
                            disabled: cerrada,
                            onSelect: () => window.confirm(`¿${r.enviadaEn ? "Reenviar" : "Enviar"} ${r.numero} al correo de ${r.clienteRazonSocial}?`) && resend.mutate(r),
                          },
                          { label: "Duplicar", onSelect: () => duplicate.mutate(r) },
                          {
                            label: "Marcar rechazada",
                            danger: true,
                            disabled: final,
                            onSelect: () => {
                              const motivo = window.prompt(`Motivo del rechazo de ${r.numero} (opcional):`, "");
                              if (motivo !== null) reject.mutate({ id: r.id, motivo });
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && <Pagination data={data} size={size} onPage={setPage} onSize={setSize} />}
      </div>
    </div>
  );
}
