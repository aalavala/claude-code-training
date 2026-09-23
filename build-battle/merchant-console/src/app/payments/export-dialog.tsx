"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS, ExportColumn } from "@/lib/csv"
import { PaymentFilters } from "@/data/types"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Date",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "filtered" | "all"

export function ExportDialog({
  query,
  status,
}: {
  query: string
  status: PaymentFilters["status"]
}) {
  const [selectedColumns, setSelectedColumns] = useState<ExportColumn[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ])
  const [scope, setScope] = useState<Scope>("filtered")
  const [rowCount, setRowCount] = useState<number | null>(null)

  useEffect(() => {
    let ignore = false
    setRowCount(null)
    const countParams = scope === "all" ? "" : query
    // Reuses the same query builder GET /api/payments already exposes and
    // reads only `.total` off its { rows, total, page, pageCount, pageSize }
    // response — no pageSize param, so this accepts the default page of rows.
    fetch(`/api/payments?${countParams}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setRowCount(data.total)
      })
      .catch(() => {
        if (!ignore) setRowCount(null)
      })
    return () => {
      ignore = true
    }
  }, [scope, query])

  const toggleColumn = (column: ExportColumn) => {
    setSelectedColumns((current) =>
      current.includes(column)
        ? current.filter((c) => c !== column)
        : [...current, column],
    )
  }

  const exportHref = () => {
    const params = new URLSearchParams(query)
    params.set("scope", scope)
    params.set(
      "columns",
      EXPORT_COLUMNS.filter((column) => selectedColumns.includes(column)).join(","),
    )
    return `/api/payments/export?${params.toString()}`
  }

  const canDownload = selectedColumns.length > 0

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose which columns to include and how much of the table to
            export.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 space-y-2">
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                    className="size-4 rounded border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === "filtered"}
                  onChange={() => setScope("filtered")}
                  className="size-4 border-gray-300 text-blue-600 dark:border-gray-700"
                />
                Current filter
                {status && status !== "all" ? ` (${status})` : ""}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="size-4 border-gray-300 text-blue-600 dark:border-gray-700"
                />
                All payments
              </label>
            </div>
          </fieldset>

          <p className="text-sm text-gray-500">
            {rowCount === null ? "Counting rows…" : `${rowCount.toLocaleString()} payments will be exported.`}
          </p>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          <Button variant="primary" disabled={!canDownload} asChild={canDownload}>
            {canDownload ? (
              <a href={exportHref()}>Download</a>
            ) : (
              <span>Download</span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
