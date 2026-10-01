/**
 * Helper universal para cópia para a área de transferência.
 * Funciona de forma resiliente tanto em ambientes seguros (HTTPS / localhost)
 * quanto em acessos diretos via IP (HTTP) onde navigator.clipboard é bloqueado.
 */
export async function copiarParaClipboard(texto: string): Promise<boolean> {
  if (!texto) return false;

  // 1. Tenta API moderna navigator.clipboard se estiver em contexto seguro
  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Falhou ou bloqueou permissão, tenta fallback
    }
  }

  // 2. Fallback resiliente via textarea temporário (funciona 100% em HTTP e mobile)
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, texto.length);

      const copiou = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copiou;
    } catch {
      return false;
    }
  }

  return false;
}
