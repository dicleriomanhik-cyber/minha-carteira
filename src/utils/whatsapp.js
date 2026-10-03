// Prepara o link do WhatsApp (wa.me) com a mensagem já escrita.
// Aceita números de Moçambique escritos de várias formas: "84 123 4567", "+258 84 123 4567", "00258841234567".
export function normalizarTelefone(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('8')) d = '258' + d; // número local de Moçambique
  return d;
}

export function linkWhatsApp(telefone, mensagem = '') {
  const numero = normalizarTelefone(telefone);
  const texto = encodeURIComponent(mensagem);
  // Sem número guardado: abre o WhatsApp para escolher o contacto, com a mensagem pronta.
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
