// Cria o link do WhatsApp com a mensagem já escrita.
// Sem número, abre o WhatsApp para a pessoa escolher o contacto.
export function linkWhatsApp(telefone, texto) {
  let d = (telefone || '').replace(/\D/g, '');
  if (d.length === 9) d = '258' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
