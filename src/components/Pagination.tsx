import type { Page } from "../types";

const PAGE_SIZES = [10, 20, 50];

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = [...new Set([0, total - 1, current - 1, current, current + 1])]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination<T>({
  data,
  size,
  onPage,
  onSize,
}: {
  data: Page<T>;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  if (data.totalElements === 0) return null;
  const from = data.page * data.size + 1;
  const to = data.page * data.size + data.content.length;

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <div className="flex items-center gap-3 text-slate-600">
        <span>
          Mostrando <strong className="text-slate-900">{from}–{to}</strong> de <strong className="text-slate-900">{data.totalElements}</strong>
        </span>
        <label className="inline-flex items-center gap-1">
          <span className="sr-only sm:not-sr-only">Filas:</span>
          <select value={size} onChange={(e) => onSize(Number(e.target.value))} aria-label="Filas por página"
            className="border border-slate-300 rounded-md px-2 py-1.5 bg-white">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => onPage(data.page - 1)} disabled={data.page === 0}
          className="px-3 py-2 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50">Anterior</button>
        {pageNumbers(data.page, data.totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-slate-400">…</span>
          ) : (
            <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === data.page ? "page" : undefined}
              className={`min-w-10 px-3 py-2 rounded-md border ${p === data.page ? "bg-blue-700 border-blue-700 text-white" : "border-slate-300 hover:bg-slate-50"}`}>
              {p + 1}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPage(data.page + 1)} disabled={data.page + 1 >= data.totalPages}
          className="px-3 py-2 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50">Siguiente</button>
      </div>
    </nav>
  );
}
