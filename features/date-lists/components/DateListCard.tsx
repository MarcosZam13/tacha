import Link from "next/link";
import { DATE_LIST_STATUS_LABEL } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { formatEventDate } from "../utils/eventDate";
import { toDateListPath } from "../utils/toDateListPath";

interface DateListCardProps {
  list: DateList;
}

/** Una sublista en la agenda: nombre, fecha y estado (CA-02). Lleva a su detalle. */
export const DateListCard = ({ list }: DateListCardProps): React.JSX.Element => (
  <li>
    <Link
      href={toDateListPath(list.id)}
      className="flex items-center justify-between gap-3 rounded-tacha-card border border-tacha-border bg-tacha-surface px-4 py-3 transition-colors hover:bg-tacha-chipbg/40"
    >
      <span className="min-w-0">
        <span className="block break-words font-body text-sm font-medium text-tacha-text">{list.name}</span>
        <span className="block font-body text-xs text-tacha-textsec">{formatEventDate(list.eventDate)}</span>
      </span>
      <span className="shrink-0 rounded-tacha-badge bg-tacha-chipbg px-2 py-1 font-body text-xs text-tacha-teal">
        {DATE_LIST_STATUS_LABEL[list.status]}
      </span>
    </Link>
  </li>
);
