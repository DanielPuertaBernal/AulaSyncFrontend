import Swal from 'sweetalert2';
import { comunidadApi } from '@/features/comunidad/comunidadApi';

const cachePersonasPorTipo = new Map();

function normalizarTexto(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalizar(valor = '') {
  const txt = String(valor || '').trim().toLowerCase();
  if (!txt) return 'N/D';
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

async function obtenerPersonas() {
  const key = 'all';
  if (cachePersonasPorTipo.has(key)) {
    return cachePersonasPorTipo.get(key);
  }
  const res = await comunidadApi.listar();
  const personas = Array.isArray(res?.data?.data?.personas) ? res.data.data.personas : [];
  cachePersonasPorTipo.set(key, personas);
  return personas;
}

export async function abrirBuscadorPersonaPorNombre({
  titulo = 'Buscar persona por nombre',
  tipo,
  placeholder = 'Escribe nombre o apellido',
}) {
  let personas = [];
  try {
    personas = await obtenerPersonas();
  } catch {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo cargar la comunidad',
      text: 'Intenta nuevamente en unos segundos.',
    });
    return null;
  }

  let selectedId = null;
  let resultadosFiltrados = [];

  const html = `
    <style>
      .persona-search-wrap { display: flex; flex-direction: column; gap: 10px; }
      .persona-search-input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
      .persona-search-meta { font-size: 12px; color: #64748b; text-align: left; }
      .persona-search-table-wrap { max-height: 340px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
      .persona-search-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
      .persona-search-table thead { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
      .persona-search-table th { padding: 10px; border-bottom: 1px solid #e5e7eb; }
      .persona-search-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
      .persona-row { cursor: pointer; }
      .persona-row:hover { background: #f8fafc; }
      .persona-row.is-selected { background: #e0f2fe; font-weight: 600; }
    </style>
    <div class="persona-search-wrap">
      <input id="persona-search-input" class="persona-search-input" placeholder="${escapeHtml(placeholder)}" />
      <div id="persona-search-meta" class="persona-search-meta">Escribe al menos 2 letras para ver sugerencias.</div>
      <div class="persona-search-table-wrap">
        <table class="persona-search-table">
          <thead>
            <tr>
              <th style="width: 36%;">Nombre completo</th>
              <th style="width: 28%;">Facultad</th>
              <th style="width: 16%;">Rol</th>
              <th style="width: 20%;">Documento</th>
            </tr>
          </thead>
          <tbody id="persona-search-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const seleccion = await Swal.fire({
    title: titulo,
    html,
    width: 920,
    confirmButtonText: 'Usar persona',
    cancelButtonText: 'Cancelar',
    showCancelButton: true,
    reverseButtons: true,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (!popup) return;

      const input = popup.querySelector('#persona-search-input');
      const body = popup.querySelector('#persona-search-body');
      const meta = popup.querySelector('#persona-search-meta');
      if (!input || !body || !meta) return;

      const renderRows = (term) => {
        const terminoNormalizado = normalizarTexto(term);
        if (terminoNormalizado.length < 2) {
          resultadosFiltrados = [];
          selectedId = null;
          body.innerHTML = '<tr><td colspan="4" style="padding: 12px; color: #64748b; text-align: center;">Escribe al menos 2 letras para buscar.</td></tr>';
          meta.textContent = 'Escribe al menos 2 letras para ver sugerencias.';
          return;
        }

        resultadosFiltrados = personas
          .filter((p) => normalizarTexto(p?.nombre).includes(terminoNormalizado))
          .slice(0, 25);

        if (tipo) {
          const tipoPreferido = normalizarTexto(tipo);
          resultadosFiltrados.sort((a, b) => {
            const aPref = normalizarTexto(a?.tipo) === tipoPreferido ? 0 : 1;
            const bPref = normalizarTexto(b?.tipo) === tipoPreferido ? 0 : 1;
            return aPref - bPref;
          });
        }

        if (!resultadosFiltrados.some((p) => String(p._id || p.numero_documento || p.id_carnet || p.nombre) === selectedId)) {
          selectedId = null;
        }

        if (resultadosFiltrados.length === 0) {
          body.innerHTML = '<tr><td colspan="4" style="padding: 12px; color: #64748b; text-align: center;">Sin resultados para ese nombre.</td></tr>';
          meta.textContent = 'No hay coincidencias. Intenta con otro apellido o nombre.';
          return;
        }

        body.innerHTML = resultadosFiltrados
          .map((persona) => {
            const rowId = String(persona._id || persona.numero_documento || persona.id_carnet || `${persona.nombre}-${persona.tipo || ''}`);
            const selectedClass = rowId === selectedId ? 'is-selected' : '';
            return `
              <tr class="persona-row ${selectedClass}" data-row-id="${escapeHtml(rowId)}">
                <td>${escapeHtml(persona.nombre || 'Sin nombre')}</td>
                <td>${escapeHtml(persona.facultad || 'N/D')}</td>
                <td>${escapeHtml(capitalizar(persona.tipo))}</td>
                <td>${escapeHtml(persona.numero_documento || 'N/D')}</td>
              </tr>
            `;
          })
          .join('');

        meta.textContent = `${resultadosFiltrados.length} resultado(s). Selecciona una fila.`;
      };

      input.addEventListener('input', (e) => {
        renderRows(e.target.value || '');
      });

      body.addEventListener('click', (e) => {
        const fila = e.target.closest('.persona-row');
        if (!fila) return;
        selectedId = fila.getAttribute('data-row-id');
        const filas = body.querySelectorAll('.persona-row');
        filas.forEach((f) => f.classList.remove('is-selected'));
        fila.classList.add('is-selected');
      });

      renderRows('');
      input.focus();
    },
    preConfirm: () => {
      if (!selectedId) {
        Swal.showValidationMessage('Selecciona una persona de la tabla.');
        return null;
      }
      const personaSeleccionada = resultadosFiltrados.find(
        (p) => String(p._id || p.numero_documento || p.id_carnet || p.nombre) === selectedId
      );
      if (!personaSeleccionada) {
        Swal.showValidationMessage('La selección ya no es válida. Vuelve a elegir una fila.');
        return null;
      }
      return personaSeleccionada;
    },
  });

  if (!seleccion.isConfirmed) return null;
  return seleccion.value || null;
}
