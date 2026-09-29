import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  /** Serialised active filters, without `page`, to preserve across navigation. */
  query?: string;
};

function pageHref(query: string, page: number): string {
  const params = new URLSearchParams(query);
  params.set("page", String(page));
  return `/dashboard?${params.toString()}`;
}

const baseStyles =
  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";

function pageLinkStyles(active: boolean): string {
  return active
    ? `${baseStyles} border-indigo-400/40 bg-indigo-500/15 text-indigo-200`
    : `${baseStyles} border-slate-700 text-slate-300 hover:bg-slate-800`;
}

const disabledStyles = `${baseStyles} cursor-not-allowed border-slate-800 text-slate-600`;

/** Page numbers to show, collapsing long runs into a single gap marker. */
function pageItems(current: number, total: number): (number | "gap")[] {
  const wanted = new Set<number>([1, total]);

  for (let page = current - 1; page <= current + 1; page++) {
    if (page >= 1 && page <= total) wanted.add(page);
  }

  const sorted = Array.from(wanted).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) items.push("gap");
    items.push(page);
  });

  return items;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  perPage,
  query = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, totalItems);

  return (
    <nav
      aria-label="Expense list pagination"
      className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <p className="text-xs font-semibold text-slate-400">
        Showing {first}–{last} of {totalItems}{" "}
        {totalItems === 1 ? "entry" : "entries"}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={pageHref(query, page - 1)}
            scroll={false}
            rel="prev"
            className={pageLinkStyles(false)}
          >
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledStyles}>
            Previous
          </span>
        )}

        {pageItems(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1.5 text-sm text-slate-600"
            >
              …
            </span>
          ) : item === page ? (
            <span
              key={item}
              aria-current="page"
              className={pageLinkStyles(true)}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={pageHref(query, item)}
              scroll={false}
              className={pageLinkStyles(false)}
            >
              {item}
            </Link>
          )
        )}

        {page < totalPages ? (
          <Link
            href={pageHref(query, page + 1)}
            scroll={false}
            rel="next"
            className={pageLinkStyles(false)}
          >
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledStyles}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
