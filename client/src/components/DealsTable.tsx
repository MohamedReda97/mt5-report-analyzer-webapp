import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParsedReport } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DealsTableProps {
  reports: ParsedReport[];
  tabId: string;
}

type Deal = Record<string, any>;

export default function DealsTable({ reports, tabId }: DealsTableProps) {
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Filter out rows without Symbol values and memoize the result
  const filteredDeals = useMemo(() => {
    if (reports.length === 0 || activeReportIndex >= reports.length) {
      return [];
    }

    const deals = reports[activeReportIndex].deals || [];
    return deals.filter(deal => deal.Symbol && deal.Symbol.trim() !== '');
  }, [reports, activeReportIndex]);

  // We'll define this after table initialization
  let filteredProfit = 0;

  // Define columns
  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: "Time",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Time</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Time}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Deal",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Deal</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Deal}</div>,
        enableSorting: true,
        enableFiltering: true,
        sortingFn: (rowA, rowB) => {
          const valueA = Number(rowA.original.Deal) || 0;
          const valueB = Number(rowB.original.Deal) || 0;
          return valueA - valueB;
        },
      },
      {
        accessorKey: "Symbol",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Symbol</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Symbol}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Type",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Type</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Type}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Direction",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Direction</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Direction}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Volume",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Volume</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Volume}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Price",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Price</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Price}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Profit",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Profit</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const value = parseFloat(row.original.Profit) || 0;
          return (
            <div className={value < 0 ? 'text-destructive font-medium' : value > 0 ? 'text-green-500 font-medium' : ''}>
              {row.original.Profit}
            </div>
          );
        },
        enableSorting: true,
        enableFiltering: true,
      },
      {
        accessorKey: "Balance",
        header: ({ column }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              <span>Balance</span>
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-1 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div>{row.original.Balance}</div>,
        enableSorting: true,
        enableFiltering: true,
      },
    ],
    []
  );

  // Create table instance
  const table = useReactTable({
    data: filteredDeals,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Calculate filtered profit sum
  filteredProfit = useMemo(() => {
    return table.getFilteredRowModel().rows.reduce((sum, row) => {
      const profit = parseFloat(row.original.Profit) || 0;
      return sum + profit;
    }, 0);
  }, [table.getFilteredRowModel().rows]);

  if (reports.length === 0) {
    return (
      <Card className="p-4 bg-card shadow-lg border border-border">
        <p className="text-center text-muted-foreground">No report data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card shadow-lg border border-border">
      {/* Report tabs */}
      <div className="flex mb-4 overflow-x-auto gap-2">
        {reports.map((report, index) => (
          <Button
            key={report.fileName}
            variant={activeReportIndex === index ? "default" : "outline"}
            className="whitespace-nowrap"
            onClick={() => setActiveReportIndex(index)}
          >
            {report.fileName.replace('.html', '')}
          </Button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Search all columns..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm bg-background text-foreground"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-secondary/80">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-foreground font-semibold py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) total.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Profit Sum */}
      {filteredProfit !== 0 && (
        <div className="mt-2 text-right pr-4 font-medium">
          Filtered Profit Sum: <span className={filteredProfit >= 0 ? 'text-green-500' : 'text-destructive'}>
            {filteredProfit.toFixed(2)}
          </span>
        </div>
      )}
    </Card>
  );
}
