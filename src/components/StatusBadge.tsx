import type { QuotationStatus } from "../types";
import { STATUS_LABEL, STATUS_STYLE } from "../lib/format";

export function StatusBadge({ estado }: { estado: QuotationStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[estado]}`}>
      {STATUS_LABEL[estado]}
    </span>
  );
}
