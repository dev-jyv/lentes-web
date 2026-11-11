// Interruptor de los textos legales (/terminos y /privacidad). Mientras sea false son un borrador:
// llevan aviso de "no vigente" y noindex, no se enlazan desde ningún lugar y el registro no muestra la
// casilla de marketing (se envía marketing_opt_in = false). Cambiarlo a true es una decisión del
// negocio tras el visto bueno de un abogado; nadie debe cambiarlo como parte de otra tarea.
export const LEGAL_REVIEWED: boolean = false;
