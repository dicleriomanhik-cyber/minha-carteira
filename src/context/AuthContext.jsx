import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = a carregar, null = sem sessão
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const carregarPerfil = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    setLoadingProfile(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error) setProfile(data);
    setLoadingProfile(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) carregarPerfil(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) carregarPerfil(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [carregarPerfil]);

  const cadastrar = useCallback(async ({ nome, whatsapp, email, senha }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, whatsapp } },
    });
    return { data, error };
  }, []);

  const entrar = useCallback(async ({ email, senha }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return { data, error };
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const atualizarPerfil = useCallback(async (campos) => {
    if (!session?.user) return { error: 'Sem sessão' };
    const { data, error } = await supabase.from('profiles').update(campos).eq('id', session.user.id).select().single();
    if (!error) setProfile(data);
    return { data, error };
  }, [session]);

  const excluirConta = useCallback(async () => {
    // Apagar a conta em si exige a service_role key (não deve viver no frontend).
    // Por segurança, aqui apagamos os dados do perfil e terminamos a sessão;
    // a remoção definitiva da conta de autenticação fica para uma Edge Function.
    const { error } = await supabase.rpc('excluir_minha_conta').catch(() => ({ error: { message: 'not_configured' } }));
    await supabase.auth.signOut();
    return { error };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loadingProfile,
    autenticado: !!session,
    carregando: session === undefined,
    cadastrar,
    entrar,
    sair,
    atualizarPerfil,
    excluirConta,
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
