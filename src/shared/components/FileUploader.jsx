import { useRef } from 'react';

/**
 * Componente para subir archivos Excel
 * Equivale a la funcionalidad de importación de Python
 */
export default function FileUploader({ onFile, accept = '.xlsx,.xls', label = 'Subir archivo Excel', loading = false }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) {
      onFile(file);
      e.target.value = ''; // reset para permitir mismo archivo
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        disabled={loading}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-60 text-sm font-medium"
      >
        {loading ? '⏳ Importando...' : `📂 ${label}`}
      </button>
    </div>
  );
}
