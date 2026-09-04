import { createContext, useCallback, useContext, useRef, useState } from 'react';

const DialogContext = createContext(null);

// Substitui window.confirm() / window.alert() por uma janelinha própria da
// app — pequena, no estilo do design, sem o aviso feio do browser
// ("o-site.diz") a assustar quem usa a app.
export function DialogProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((mensagem, opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogo({
        tipo: 'confirm',
        mensagem,
        textoOk: opts.textoOk || 'Sim',
        textoCancelar: opts.textoCancelar || 'Cancelar',
        perigo: Boolean(opts.perigo),
      });
    });
  }, []);

  const avisar = useCallback((mensagem, opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogo({ tipo: 'alert', mensagem, textoOk: opts.textoOk || 'Ok' });
    });
  }, []);

  function fechar(resultado) {
    resolverRef.current?.(resultado);
    resolverRef.current = null;
    setDialogo(null);
  }

  return (
    <DialogContext.Provider value={{ confirmar, avisar }}>
      {children}
      {dialogo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => fechar(dialogo.tipo === 'confirm' ? false : undefined)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl bg-[var(--paper)] p-4 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13.5px] leading-relaxed text-[var(--ink)]">{dialogo.mensagem}</p>
            <div className="mt-4 flex gap-2">
              {dialogo.tipo === 'confirm' && (
                <button
                  onClick={() => fechar(false)}
                  className="flex-1 rounded-full border border-black/10 px-3 py-2 text-[13px] font-semibold text-[var(--ink-soft)] transition active:scale-[0.97]"
                >
                  {dialogo.textoCancelar}
                </button>
              )}
              <button
                onClick={() => fechar(dialogo.tipo === 'confirm' ? true : undefined)}
                className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold text-white transition active:scale-[0.97] ${dialogo.perigo ? 'bg-[var(--brick)]' : 'bg-[var(--mango)]'}`}
              >
                {dialogo.textoOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog deve ser usado dentro de <DialogProvider>');
  return ctx;
}
