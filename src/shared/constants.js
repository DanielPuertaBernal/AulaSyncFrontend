export const ROLES = {
  ADMIN: 'admin_programacion',
  AUX: 'auxiliar_programacion',
};

export const NFC_NAMESPACE = '/nfc';

export const NFC_MODOS = {
  AUTO: 'auto',
  IDENTIFICACION: 'identificacion',
};

export const NFC_EVENTOS = {
  STATUS: 'nfc:status',
  ERROR: 'nfc:error',
  LECTURA: 'nfc:lectura',
  RESULTADO: 'nfc:resultado',
  CARNET_LEIDO: 'nfc:carnet_leido',
  START: 'nfc:start',
  STOP: 'nfc:stop',
  // Intención NFC
  REGISTRAR_INTENCION: 'nfc:registrar_intencion',
  CANCELAR_INTENCION: 'nfc:cancelar_intencion',
  RENOVAR_INTENCION: 'nfc:renovar_intencion',
  INTENCION_CONFIRMADA: 'nfc:intencion_confirmada',
  EN_COLA: 'nfc:en_cola',
  POSICION_COLA: 'nfc:posicion_cola',
  LECTOR_LIBRE: 'nfc:lector_libre',
  INTENCION_REEMPLAZADA: 'nfc:intencion_reemplazada',
  INTENCION_EXPIRADA: 'nfc:intencion_expirada',
};

export const UBICACIONES = {
  OFICINA: 'oficina_centro_servicios_docentes',
  PORTERIA_SUPERIOR: 'porteria_superior',
};

export const UBICACIONES_LABEL = {
  [UBICACIONES.OFICINA]: 'Oficina Centro de Servicios Docentes',
  [UBICACIONES.PORTERIA_SUPERIOR]: 'Portería Superior',
};
