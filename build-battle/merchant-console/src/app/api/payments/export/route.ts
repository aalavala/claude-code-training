import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { exportFilename, parseExportColumns, toCsv } from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * Honors the active filters and reuses the query builder. Ops chooses the
 * column set and the scope (current filter vs. all payments) — NWP-101.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = parseFilters(params)
  const scope = params.get("scope") === "all" ? "all" : "filtered"
  const columns = parseExportColumns(params.get("columns"))

  if (columns.length === 0) {
    return NextResponse.json(
      { message: "Select at least one column to export." },
      { status: 400 },
    )
  }

  const rows = sortPayments(
    scope === "all" ? filterPayments({}) : filterPayments(filters),
    filters.sort,
    filters.direction,
  )

  // Only stamp a scope token once a request actually opts into it (the export
  // dialog always sends `scope`) — a bare, pre-dialog request keeps today's
  // plain filename.
  const scopeToken = params.has("scope")
    ? scope === "all"
      ? "all"
      : filters.status !== "all"
        ? filters.status
        : "filtered"
    : undefined

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(new Date(), scopeToken)}"`,
    },
  })
}
