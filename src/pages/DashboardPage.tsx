import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { checkReplies, dashboardSummary, repliesStatus } from "../api/alerts";
import { searchQuotations } from "../api/quotations";
import { StatusBadge } from "../components/StatusBadge";
import { date, dateTime, errorMessage, money, STATUS_LABEL } from "../lib/format";
import type { QuotationStatus } from "../types";

const ORDER: QuotationStatus[] = ["BORRADOR", "ENVIADA", "EN_REVISION", "ACEPTADA", "RECHAZADA", "VENCIDA"];
const RECENT = 6;

const CARD_ACCENT: Record<QuotationStatus, string> = {
  BORRADOR: "border-slate-300",
  ENVIADA: "border-blue-500",
  EN_REVISION: "border-amber-500",
  ACEPTADA: "border-green-600",
  RECHAZADA: "border-red-500",
  VENCIDA: "border-zinc-400",
};

export function DashboardPage() {
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardSummary, refetchInterval: 60_000 });
  const { data: recent, isLoading } = useQuery({
    queryKey: ["quotations", "recent"],
    queryFn: () => searchQuotations({ page: 0, size: RECENT, sort: "createdAt", dir: "desc" }),
    refetchInterval: 60_000,
  });

  const queryClient = useQueryClient();
  const { data: lastPoll } = useQuery({ queryKey: ["replies-status"], queryFn: repliesStatus, refetchInterval: 60_000 });
  // Revisa el correo en ese momento (además de la revisión automática cada 5 minutos).
  const check = useMutation({
    mutationFn: checkReplies,
    onSuccess: (status) => {
      queryClient.setQueryData(["replies-status"], status);
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
  const poll = check.data ?? lastPoll;

  const total = summary ? Object.values(summary.porEstado).reduce((a, b) => a + b, 0) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <button onClick={() => check.mutate()} disabled={check.isPending}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2.5">
            {check.isPending ? "Revisando correo..." : "Revisar respuestas ahora"}
          </button>
        </div>
        {check.isError ? (
          <p role="status" className="text-xs text-red-700">{errorMessage(check.error, "No se pudo revisar el correo")}</p>
        ) : poll?.fecha ? (
          <p role="status" className={`text-xs ${poll.ok ? "text-slate-500" : "text-amber-700"}`}>
            Última revisión de correo: {dateTime(poll.fecha)} — {poll.mensaje}
          </p>
        ) : null}
      </div>

      {/* Cuadros por estado: llevan a Cotizaciones con ese filtro */}
      <section aria-label="Cotizaciones por estado" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ORDER.map((s) => (
          <Link key={s} to={`/cotizaciones?estado=${s}`}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${CARD_ACCENT[s]} p-3 hover:bg-slate-50`}>
            <span className="block text-2xl font-semibold tabular-nums">{summary?.porEstado[s] ?? "–"}</span>
            <span className="block text-xs text-slate-600">{STATUS_LABEL[s]}</span>
          </Link>
        ))}
      </section>

      {/* Indicadores */}
      {summary && (
        <section aria-label="Indicadores" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Cotizaciones registradas</p>
            <p className="text-lg font-semibold">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Aceptadas este mes</p>
            <p className="text-lg font-semibold">
              {summary.aceptadasMes} de {summary.enviadasMes} enviadas
              {summary.enviadasMes > 0 && (
                <span className="text-sm font-normal text-slate-500"> ({Math.round((summary.aceptadasMes / summary.enviadasMes) * 100)}%)</span>
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Monto aceptado este mes</p>
            <p className="text-lg font-semibold">
              {Object.keys(summary.montoAceptadoMes).length === 0
                ? "—"
                : Object.entries(summary.montoAceptadoMes).map(([m, v]) => money(v ?? 0, m as "PEN" | "USD")).join(" · ")}
            </p>
          </div>
          <Link to="/cotizaciones?sinRespuesta=1"
            className={`rounded-xl border p-4 hover:brightness-95 ${summary.sinRespuesta > 0 ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"}`}>
            <p className="text-xs text-slate-500">Enviadas sin respuesta hace {summary.diasSinRespuesta}+ días</p>
            <p className="text-lg font-semibold">{summary.sinRespuesta}</p>
          </Link>
        </section>
      )}

      {/* Cuadro de últimas cotizaciones */}
      <section aria-labelledby="recientes" className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <h2 id="recientes" className="text-sm font-semibold">Últimas cotizaciones</h2>
          <Link to="/cotizaciones" className="text-sm text-blue-700 font-medium py-1">Ver todas →</Link>
        </div>
        {isLoading && <p className="px-4 py-6 text-sm text-slate-500">Cargando...</p>}
        {recent && recent.content.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Aún no hay cotizaciones. Créalas desde el menú Cotizaciones.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {recent?.content.map((r) => (
            <li key={r.id}>
              <Link to={`/casos/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
                <span className="font-medium text-blue-700 w-32">{r.numero}</span>
                <span className="flex-1 min-w-40 truncate">{r.clienteRazonSocial}</span>
                <span className="text-sm text-slate-500 w-24">{date(r.fechaEmision)}</span>
                <span className="tabular-nums font-medium w-32 text-right">{money(r.total, r.moneda)}</span>
                <span className="w-28 text-right"><StatusBadge estado={r.estado} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
