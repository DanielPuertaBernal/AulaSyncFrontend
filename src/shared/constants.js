export const ROLES = {
  ADMIN: 'admin_programacion',
  AUX: 'auxiliar_programacion',
};

export const API_BASE = '/api';
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
  SIMULAR: 'nfc:simulate',
  SET_MODO: 'nfc:set_modo',
};

export const UBICACIONES = {
  OFICINA: 'oficina_centro_servicios_docentes',
  PORTERIA_SUPERIOR: 'porteria_superior',
};

export const UBICACIONES_LABEL = {
  [UBICACIONES.OFICINA]: 'Oficina Centro de Servicios Docentes',
  [UBICACIONES.PORTERIA_SUPERIOR]: 'Portería Superior',
};
