export default function MensagemErro({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--brick-soft)', color: 'var(--brick)' }} role="alert">
      {children}
    </div>
  );
}
