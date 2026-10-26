// Marcadores de html/template de Go. Las plantillas se exportan con estos textos tal cual y el backend
// (lentes-api/internal/email) los rellena al enviar. Todo dato del usuario pasa por el escape contextual de html/template.
export const v = (name: string) => `{{.${name}}}`;
export const raw = (directive: string) => `{{${directive}}}`;
