import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function showSuccess(message) {
  Toast.fire({ icon: 'success', title: message });
}

export function showError(message) {
  Toast.fire({ icon: 'error', title: message });
}

export function showWarning(message) {
  Toast.fire({ icon: 'warning', title: message });
}

export function showConfirm(title, text) {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
  });
}
