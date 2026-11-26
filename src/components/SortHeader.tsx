/** Encabezado de columna ordenable (el orden lo aplica el backend). */
export function SortHeader<T extends string>({
  label,
  column,
  sort,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  column: T;
  sort: T;
  dir: "asc" | "desc";
  onSort: (column: T) => void;
  align?: "left" | "right";
}) {
  const active = sort === column;
  return (
    <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1 hover:text-slate-900">
        {label}
        <span aria-hidden className={active ? "text-blue-700" : "text-slate-300"}>{active && dir === "desc" ? "▼" : "▲"}</span>
      </button>
    </th>
  );
}
