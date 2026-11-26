import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listAlerts, unreadAlertCount } from "../api/alerts";

const POLL_MS = 60_000;

/** Campana con contador de alertas no leídas; avisa con una notificación del navegador si el usuario la permitió. */
export function AlertBell({ dark = false }: { dark?: boolean }) {
  const { data: count = 0 } = useQuery({
    queryKey: ["alerts", "unread"],
    queryFn: unreadAlertCount,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = count;
    if (before === null || count <= before) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    listAlerts({ lectura: "NO_LEIDAS", page: 0, size: Math.min(count - before, 5) }).then(({ content: nuevas }) => {
      nuevas
        .forEach((a) => {
          const n = new Notification(
            a.tipo === "ORDEN_SERVICIO_RECIBIDA" ? "Cotización aceptada (OC / OS)" : a.tipo === "POSIBLE_RECHAZO" ? "Posible rechazo" : "Cotizaciones Sosa",
            { body: a.mensaje, tag: a.id },
          );
          n.onclick = () => {
            window.focus();
            if (a.quotationId) window.location.assign(`/casos/${a.quotationId}`);
          };
        });
    });
  }, [count]);

  return (
    <Link
      to="/alertas"
      aria-label={count > 0 ? `${count} alertas sin leer` : "Alertas"}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full ${
        dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6" aria-hidden>
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
