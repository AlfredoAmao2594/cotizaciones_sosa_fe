import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet } from "react-router-dom";
import { unreadAlertCount } from "../api/alerts";
import { useAuth } from "../context/AuthContext";
import { AlertBell } from "./AlertBell";

/** Íconos de línea (24×24) dibujados con el color del texto. */
function Icon({ children, className = "w-5 h-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: <path d="M4 4h6v8H4zM14 4h6v5h-6zM14 13h6v7h-6zM4 16h6v4H4z" />,
  cotizaciones: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" />,
  clientes: (
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  alertas: <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />,
  salir: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: ICONS.dashboard, end: true },
  { to: "/cotizaciones", label: "Cotizaciones", icon: ICONS.cotizaciones },
  { to: "/clientes", label: "Clientes", icon: ICONS.clientes },
];
const configItem: NavItem = { to: "/configuracion", label: "Configuraciones", icon: ICONS.configuracion };
const sideItems: NavItem[] = [...navItems, { to: "/alertas", label: "Alertas", icon: ICONS.alertas }, configItem];
const mobileItems: NavItem[] = [...navItems, { ...configItem, label: "Ajustes" }];

const STORAGE_KEY = "menu-contraido";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Nombre de la opción al pasar el mouse o enfocar con teclado cuando el menú está contraído. */
function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-md bg-slate-800 text-white text-xs font-medium px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
      {text}
    </span>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // Misma consulta (y caché) que la campana de alertas.
  const { data: unread = 0 } = useQuery({ queryKey: ["alerts", "unread"], queryFn: unreadAlertCount, refetchInterval: 60_000 });

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
  }

  const itemClass = (isActive: boolean) =>
    `group relative flex items-center gap-3 py-3 text-sm border-l-4 ${collapsed ? "justify-center px-0" : "px-4"} ${
      isActive ? "bg-slate-800 border-blue-500 font-medium text-white" : "border-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`hidden md:flex md:flex-col shrink-0 bg-slate-900 text-slate-100 sticky top-0 h-screen z-20 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className={`flex items-center border-b border-slate-800 h-14 ${collapsed ? "justify-center" : "gap-1 pl-2 pr-1"}`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="inline-flex items-center justify-center w-10 h-10 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Icon>
              <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 3v18" />
              {collapsed ? <path d="M13 9l3 3-3 3" /> : <path d="M16 9l-3 3 3 3" />}
            </Icon>
          </button>
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 truncate font-semibold">Cotizaciones Sosa</span>
              <AlertBell dark />
            </>
          )}
        </div>

        <nav aria-label="Menú principal" className="flex flex-col flex-1 py-2">
          {sideItems.map((item) => {
            // Contraído no se muestra la campana: el contador pasa al ícono de Alertas.
            const badge = collapsed && item.to === "/alertas" && unread > 0;
            const label = badge ? `${item.label} (${unread} sin leer)` : item.label;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) => itemClass(isActive)}
              >
                <span className="relative">
                  <Icon>{item.icon}</Icon>
                  {badge && (
                    <span className="absolute -top-2 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                {collapsed ? <Tooltip text={label} /> : <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          aria-label={collapsed ? "Cerrar sesión" : undefined}
          className={`group relative flex items-center gap-3 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white border-t border-slate-800 ${
            collapsed ? "justify-center" : "px-5"
          }`}
        >
          <Icon>{ICONS.salir}</Icon>
          {collapsed ? <Tooltip text="Cerrar sesión" /> : <span>Cerrar sesión</span>}
        </button>
      </aside>

      <header className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-slate-900 text-white pl-4 pr-2 h-12">
        <span className="font-semibold">Cotizaciones Sosa</span>
        <div className="flex items-center">
          <AlertBell dark />
          <button onClick={logout} className="text-sm text-slate-300 px-2 py-2">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0 bg-slate-50 p-4 pb-24 md:p-8">
        <Outlet />
      </main>

      <nav aria-label="Menú principal" className="md:hidden fixed bottom-0 inset-x-0 z-10 grid grid-cols-4 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs border-t-2 -mt-px ${
                isActive ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-slate-500"
              }`
            }
          >
            <Icon>{item.icon}</Icon>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
