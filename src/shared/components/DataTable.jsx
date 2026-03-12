import { useState } from 'react';

function normalizeSearchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tabla reutilizable con búsqueda, paginación y exportación a Excel
 * Equivale a tabla_component.py + paginacion_component.py + buscador_component.py
 */
export default function DataTable({
  columns,       // [{ key, label, render? }]
  data = [],
  pageSize = 20,
  searchable = true,
  exportable = false,
  exportFileName = 'datos',
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const searchRaw = search.toLowerCase();
  const searchNormalized = normalizeSearchValue(search);

  // Filtrado
  const filtered = searchable
    ? data.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? '').toLowerCase().includes(searchRaw)
          || normalizeSearchValue(row[col.key]).includes(searchNormalized)
        )
      )
    : data;

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  async function handleExport() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          {searchable && (
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={handleSearch}
              className="border rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">{filtered.length} registros</span>
            {exportable && (
              <button
                onClick={handleExport}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
              >
                <i className="fa-solid fa-file-export mr-1" />Exportar Excel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="table-header whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="table-row">
                  {columns.map((col) => (
                    <td key={col.key} className={`table-cell ${col.className || 'whitespace-nowrap'}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            ‹ Anterior
          </button>
          <span className="text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}
