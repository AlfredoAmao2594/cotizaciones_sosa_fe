import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  classifyServiceOrder,
  confirmServiceOrder,
  discardServiceOrder,
  dismissRejection,
  downloadQuotationPdf,
  downloadServiceOrder,
  duplicateQuotation,
  getQuotation,
  recordShared,
  rejectQuotation,
  sendQuotation,
  uploadServiceOrder,
  whatsappLink,
} from "../api/quotations";
import { StatusBadge } from "../components/StatusBadge";
import { openBlob, saveBlob } from "../lib/download";
import { date, dateTime, DOC_TIPO_LABEL, errorMessage, money } from "../lib/format";
import type { DocTipo, QuotationDetail, SendResult } from "../types";

const DOC_TIPOS: DocTipo[] = ["SIN_CLASIFICAR", "ORDEN_COMPRA", "ORDEN_SERVICIO"];

const EVENT_LABEL: Record<string, string> = {
  CREADA: "Cotización creada",
  DUPLICADA: "Creada como copia",
  ENVIADA_CORREO: "Enviada por correo",
  REENVIADA: "Reenviada por correo",
  ENVIO_FALLIDO: "Envío fallido",
  COMPARTIDA_WHATSAPP: "Compartida por WhatsApp",
  RESPUESTA_RECIBIDA: "Respuesta del cliente",
  ORDEN_SERVICIO_RECIBIDA: "Aceptada: orden de compra / servicio recibida",
  ORDEN_SERVICIO_REGISTRADA: "Orden de compra / servicio registrada manualmente",
  ORDEN_SERVICIO_DESCARTADA: "Documento descartado",
  DOCUMENTO_CLASIFICADO: "Tipo de documento asignado",
  ESTADO_CAMBIADO: "Cambio de estado",
  VENCIDA: "Cotización vencida",
};

const EVENT_DOT: Record<string, string> = {
  ORDEN_SERVICIO_RECIBIDA: "bg-green-600",
  ORDEN_SERVICIO_REGISTRADA: "bg-green-600",
  ENVIO_FALLIDO: "bg-red-600",
  RESPUESTA_RECIBIDA: "bg-amber-500",
  VENCIDA: "bg-zinc-400",
};

const canShareFiles = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.canShare === "function" &&
  navigator.canShare({ files: [new File([""], "c.pdf", { type: "application/pdf" })] });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Progress({ q }: { q: QuotationDetail }) {
  const steps = [
    { label: "Creada", at: q.fechaEmision ? `${date(q.fechaEmision)}` : null, done: true },
    { label: "Enviada", at: q.enviadaEn ? dateTime(q.enviadaEn) : null, done: !!q.enviadaEn },
    { label: "Respondida", at: q.respondidaEn ? dateTime(q.respondidaEn) : null, done: !!q.respondidaEn },
    { label: "Aceptada (OC / OS)", at: q.aceptadaEn ? dateTime(q.aceptadaEn) : null, done: q.estado === "ACEPTADA" },
  ];
  return (
    <ol className="grid grid-cols-4 gap-1">
      {steps.map((s, i) => (
        <li key={s.label} className="text-center">
          <div className={`h-1.5 rounded-full ${s.done ? (i === 3 ? "bg-green-600" : "bg-blue-600") : "bg-slate-200"}`} />
          <p className={`mt-1.5 text-xs font-medium ${s.done ? "text-slate-800" : "text-slate-400"}`}>{s.label}</p>
          {s.at && <p className="text-[11px] text-slate-500">{s.at}</p>}
        </li>
      ))}
    </ol>
  );
}

export function CaseDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const initialSend = (location.state as { envio?: SendResult | null } | null)?.envio ?? null;

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    initialSend
      ? initialSend.ok
        ? { ok: true, text: `Cotización enviada a ${initialSend.destinatarios.join(", ")}` }
        : { ok: false, text: `Se guardó, pero el correo no salió: ${initialSend.error}. Usa "Reenviar".` }
      : null,
  );
  const [destinatarios, setDestinatarios] = useState("");
  const [telefono, setTelefono] = useState("");
  const [waLink, setWaLink] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<DocTipo>("SIN_CLASIFICAR");

  const { data: q, isLoading, error } = useQuery({ queryKey: ["quotation", id], queryFn: () => getQuotation(id) });

  const refresh = (detail?: QuotationDetail) => {
    if (detail) queryClient.setQueryData(["quotation", id], detail);
    else queryClient.invalidateQueries({ queryKey: ["quotation", id] });
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };
  const onError = (fallback: string) => (err: unknown) => setNotice({ ok: false, text: errorMessage(err, fallback) });

  const send = useMutation({
    mutationFn: () => sendQuotation(id, destinatarios.split(/[,;\s]+/).filter(Boolean)),
    onSuccess: (r) => {
      setNotice(r.ok ? { ok: true, text: `Enviada a ${r.destinatarios.join(", ")}` } : { ok: false, text: `No se pudo enviar: ${r.error}` });
      refresh();
    },
    onError: onError("No se pudo enviar"),
  });
  const wa = useMutation({
    mutationFn: () => whatsappLink(id, telefono),
    onSuccess: (link) => {
      setWaLink(link);
      refresh();
    },
    onError: onError("No se pudo generar el enlace de WhatsApp"),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadServiceOrder(id, file, uploadTipo),
    onSuccess: (d) => {
      setNotice({ ok: true, text: "Documento registrado. La cotización quedó aceptada." });
      refresh(d);
    },
    onError: onError("No se pudo subir el archivo"),
  });
  const classify = useMutation({
    mutationFn: ({ docId, tipo }: { docId: string; tipo: DocTipo }) => classifyServiceOrder(id, docId, tipo),
    onSuccess: (d) => refresh(d),
    onError: onError("No se pudo cambiar el tipo de documento"),
  });
  const dismiss = useMutation({
    mutationFn: () => dismissRejection(id),
    onSuccess: (d) => refresh(d),
    onError: onError("No se pudo descartar la sugerencia"),
  });
  const confirmRejection = useMutation({
    mutationFn: () => rejectQuotation(id, "El cliente indicó que no acepta la cotización"),
    onSuccess: (d) => {
      setNotice({ ok: true, text: "Cotización marcada como rechazada." });
      refresh(d);
    },
    onError: onError("No se pudo marcar como rechazada"),
  });
  const confirm = useMutation({
    mutationFn: () => confirmServiceOrder(id),
    onSuccess: (d) => refresh(d),
    onError: onError("No se pudo confirmar"),
  });
  const discard = useMutation({
    mutationFn: (docId: string) => discardServiceOrder(id, docId),
    onSuccess: (d) => refresh(d),
    onError: onError("No se pudo descartar"),
  });
  const reject = useMutation({
    mutationFn: () => rejectQuotation(id, motivo),
    onSuccess: (d) => {
      setShowReject(false);
      refresh(d);
    },
    onError: onError("No se pudo marcar como rechazada"),
  });
  const duplicate = useMutation({
    mutationFn: () => duplicateQuotation(id),
    onSuccess: (d) => {
      refresh();
      navigate(`/casos/${d.id}`);
    },
    onError: onError("No se pudo duplicar"),
  });

  async function share() {
    if (!q) return;
    try {
      const blob = await downloadQuotationPdf(q.id);
      await navigator.share({ files: [new File([blob], `Cotizacion_${q.numero}.pdf`, { type: "application/pdf" })], title: `Cotización N° ${q.numero}` });
      await recordShared(q.id);
      refresh();
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") setNotice({ ok: false, text: "No se pudo compartir el PDF" });
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (error || !q) return <p className="text-sm text-red-600">{errorMessage(error, "No se encontró la cotización")}</p>;

  const cerrada = q.estado === "VENCIDA" || q.estado === "RECHAZADA";
  const porConfirmar = q.estado === "EN_REVISION" && q.ordenesServicio.length > 0;
  const lastReply = q.historial
    .find((e) => e.tipo === "RESPUESTA_RECIBIDA" && e.detalle?.startsWith("Posible rechazo"))
    ?.detalle?.replace(/^Posible rechazo — de [^:]+: /, "");
  const btn = "text-sm font-medium rounded-md px-4 py-2.5 disabled:opacity-60";

  return (
    <div className="max-w-4xl space-y-5">
      <Link to="/cotizaciones" className="inline-block text-sm text-blue-700 py-2">← Cotizaciones</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
            {q.numero} <StatusBadge estado={q.estado} />
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {q.cliente.razonSocial} · RUC {q.cliente.ruc}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{money(q.total, q.moneda)}</p>
          <p className="text-xs text-slate-500">Válida hasta {date(q.vigenciaHasta)}</p>
        </div>
      </div>

      {notice && (
        <p role="status" className={`text-sm rounded-md px-3 py-2 border ${notice.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {notice.text}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <Progress q={q} />
      </div>

      {q.rechazoSugerido && !["ACEPTADA", "RECHAZADA", "VENCIDA"].includes(q.estado) && (
        <div role="alert" className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-900">Posible rechazo del cliente</p>
            <p className="text-sm text-red-900">
              La respuesta del cliente parece indicar que no acepta la cotización. Revisa el mensaje en el historial y confirma.
            </p>
            {lastReply && <p className="text-sm text-red-800 mt-2 italic whitespace-pre-line">“{lastReply}”</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => confirmRejection.mutate()} disabled={confirmRejection.isPending} className={`${btn} bg-red-600 hover:bg-red-700 text-white`}>
              Confirmar rechazo
            </button>
            <button onClick={() => dismiss.mutate()} disabled={dismiss.isPending} className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
              No es un rechazo
            </button>
          </div>
        </div>
      )}

      {porConfirmar && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-900">
            Llegó un adjunto de un remitente no registrado. Revísalo y confirma si es la orden de compra / servicio.
          </p>
          <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className={`${btn} bg-green-700 text-white`}>
            Confirmar aceptación
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <Section title="Cliente">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Correo de envío</dt><dd className="break-all">{q.cliente.correoEnvio}</dd></div>
              <div><dt className="text-xs text-slate-500">WhatsApp</dt><dd>{q.cliente.whatsapp ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Contacto</dt><dd>{q.cliente.contactoNombre ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Creada por</dt><dd>{q.creadaPor}</dd></div>
            </dl>
          </Section>

          <Section title="Detalle">
            <dl className="grid grid-cols-3 gap-2 text-sm mb-3 bg-slate-50 rounded-md p-2">
              <div><dt className="text-xs text-slate-500">Validez</dt><dd>{q.validezDias} {q.validezDias === 1 ? "día" : "días"}</dd></div>
              <div><dt className="text-xs text-slate-500">Condición de pago</dt><dd>{q.condicionPago}</dd></div>
              <div><dt className="text-xs text-slate-500">Moneda</dt><dd>{q.moneda === "PEN" ? "Soles" : "Dólares"}</dd></div>
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Descripción</th>
                    <th className="py-1 px-2 font-medium text-right">Cant.</th>
                    <th className="py-1 px-2 font-medium">Unidad</th>
                    <th className="py-1 px-2 font-medium text-right whitespace-nowrap">V. unit.</th>
                    <th className="py-1 px-2 font-medium text-right">IGV</th>
                    <th className="py-1 pl-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {q.items.map((it, i) => (
                    <tr key={i} className="border-t border-slate-100 align-top">
                      <td className="py-1.5 pr-2 min-w-48">
                        <span className="whitespace-pre-line">{it.descripcion}</span>
                        {it.codigo && <span className="block text-xs text-slate-500">Código {it.codigo}</span>}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{it.cantidad}</td>
                      <td className="py-1.5 px-2">{it.unidad}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap tabular-nums">{money(it.valorUnitario, q.moneda)}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap tabular-nums">{money(it.igv, q.moneda)}</td>
                      <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">{money(it.total, q.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-3 ml-auto max-w-xs text-sm space-y-1">
              <div className="flex justify-between gap-4"><dt>Monto del servicio (sin IGV)</dt><dd className="tabular-nums">{money(q.subtotal, q.moneda)}</dd></div>
              <div className="flex justify-between gap-4"><dt>IGV (18%)</dt><dd className="tabular-nums">{money(q.igv, q.moneda)}</dd></div>
              <div className="flex justify-between gap-4 font-semibold"><dt>Total con IGV</dt><dd className="tabular-nums">{money(q.total, q.moneda)}</dd></div>
            </dl>
            {q.condiciones && <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">Observaciones: {q.condiciones}</p>}
          </Section>

          <Section title="Documentos">
            <ul className="divide-y divide-slate-100 text-sm">
              <li className="flex items-center justify-between gap-2 py-2">
                <span>Cotización {q.numero}.pdf</span>
                <span className="flex gap-3">
                  <button className="text-blue-700 py-2" onClick={async () => openBlob(await downloadQuotationPdf(q.id))}>Ver</button>
                  <button className="text-blue-700 py-2" onClick={async () => saveBlob(await downloadQuotationPdf(q.id), `Cotizacion_${q.numero}.pdf`)}>Descargar</button>
                </span>
              </li>
            </ul>
          </Section>

          <Section title={`Documentos del cliente (orden de compra / servicio)${q.ordenesServicio.length ? ` · ${q.ordenesServicio.length}` : ""}`}>
            {q.ordenesServicio.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay documentos. Llegarán solos cuando el cliente responda el correo adjuntando su orden de compra o de servicio.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {q.ordenesServicio.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-medium break-all">{d.nombreArchivo}</span>
                      <span className="block text-xs text-slate-500">
                        {d.origen === "CORREO" ? `Por correo de ${d.remitente}` : `Subido por ${d.remitente}`} · {dateTime(d.recibidoEn)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      <select
                        value={d.tipo}
                        aria-label={`Tipo de documento de ${d.nombreArchivo}`}
                        disabled={classify.isPending}
                        onChange={(e) => classify.mutate({ docId: d.id, tipo: e.target.value as DocTipo })}
                        className={`border rounded-md px-2 py-1.5 text-sm bg-white ${d.tipo === "SIN_CLASIFICAR" ? "border-amber-400 text-amber-800" : "border-slate-300"}`}
                      >
                        {DOC_TIPOS.map((t) => <option key={t} value={t}>{DOC_TIPO_LABEL[t]}</option>)}
                      </select>
                      <button className="text-blue-700 py-2" onClick={async () => saveBlob(await downloadServiceOrder(q.id, d.id), d.nombreArchivo)}>Descargar</button>
                      <button className="text-red-700 py-2" disabled={discard.isPending}
                        onClick={() => window.confirm(`¿"${d.nombreArchivo}" no es una orden de compra / servicio? Se quitará del caso.`) && discard.mutate(d.id)}>
                        Quitar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Section title="Acciones">
            <div className="space-y-4">
              {!cerrada && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {q.enviadaEn ? "Reenviar por correo" : "Enviar por correo"}
                  </label>
                  <input value={destinatarios} onChange={(e) => setDestinatarios(e.target.value)} placeholder={q.cliente.correoEnvio}
                    aria-label="Destinatarios" className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm mb-2" />
                  <button onClick={() => send.mutate()} disabled={send.isPending} className={`${btn} w-full bg-blue-700 hover:bg-blue-800 text-white`}>
                    {send.isPending ? "Enviando..." : q.enviadaEn ? "Reenviar" : "Enviar"}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder={q.cliente.whatsapp ?? "Número"} type="tel"
                  aria-label="Número de WhatsApp" className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm mb-2" />
                <div className="flex flex-col gap-2">
                  <button onClick={() => wa.mutate()} disabled={wa.isPending} className={`${btn} bg-green-600 hover:bg-green-700 text-white`}>
                    Generar enlace de WhatsApp
                  </button>
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="text-center text-sm text-green-700 font-medium py-1">Abrir WhatsApp →</a>
                  )}
                  {canShareFiles() && (
                    <button onClick={share} className={`${btn} border border-green-600 text-green-700`}>Compartir PDF desde el teléfono</button>
                  )}
                </div>
              </div>

              {q.estado !== "BORRADOR" && (
                <div>
                  <input ref={fileInput} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload.mutate(f);
                      e.target.value = "";
                    }} />
                  <label className="block text-xs font-medium text-slate-600 mb-1">Registrar orden de compra / servicio</label>
                  <select value={uploadTipo} onChange={(e) => setUploadTipo(e.target.value as DocTipo)} aria-label="Tipo del documento a subir"
                    className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm bg-white mb-2">
                    {DOC_TIPOS.map((t) => <option key={t} value={t}>{DOC_TIPO_LABEL[t]}</option>)}
                  </select>
                  <button onClick={() => fileInput.current?.click()} disabled={upload.isPending} className={`${btn} w-full border border-slate-300 hover:bg-slate-50`}>
                    {upload.isPending ? "Subiendo..." : "Subir archivo"}
                  </button>
                  <p className="text-xs text-slate-500 mt-1">Si el cliente la envió por WhatsApp o desde otro correo. Al subirla, la cotización queda aceptada.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => duplicate.mutate()} disabled={duplicate.isPending} className={`${btn} border border-slate-300 hover:bg-slate-50`}>Duplicar</button>
                {!["ACEPTADA", "RECHAZADA", "VENCIDA"].includes(q.estado) && (
                  <button onClick={() => setShowReject((v) => !v)} className={`${btn} border border-red-300 text-red-700 hover:bg-red-50`}>Marcar rechazada</button>
                )}
              </div>
              {showReject && (
                <div className="space-y-2">
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo del rechazo"
                    className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
                  <button onClick={() => reject.mutate()} disabled={reject.isPending} className={`${btn} w-full bg-red-600 text-white`}>Confirmar rechazo</button>
                </div>
              )}
            </div>
          </Section>

          <Section title="Historial">
            <ol className="space-y-3">
              {q.historial.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${EVENT_DOT[e.tipo] ?? "bg-blue-500"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{EVENT_LABEL[e.tipo] ?? e.tipo}</p>
                    {e.detalle && <p className="text-sm text-slate-600 whitespace-pre-line break-words">{e.detalle}</p>}
                    <p className="text-xs text-slate-500">{dateTime(e.fecha)} · {e.actor}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}
