import Swal from 'sweetalert2';
import { toast } from 'sonner';

export function showSuccess(message) {
  toast.success(message);
}

export function showError(message) {
  toast.error(message);
}

export function showWarning(message) {
  toast.warning(message);
}

export function showConfirm(title, text) {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: 'hsl(226, 71%, 48%)',
    cancelButtonColor: 'hsl(220, 9%, 46%)',
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
  });
}
