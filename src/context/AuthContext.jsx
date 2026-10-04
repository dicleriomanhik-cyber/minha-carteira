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

  const cadastrar = useCallback(async ({ nome, whatsapp, email, senha, termosVersao }) => {
    // A aceitação dos Termos fica guardada nos dados da conta (sem alterar o SQL).
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, whatsapp, termos_versao: termosVersao, termos_aceites_em: new Date().toISOString() } },
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

  // Excluir a conta: fica marcada para ser apagada daqui a 7 dias e a pessoa pode recuperá-la
  // se voltar a entrar nesse prazo. A foto é apagada logo, porque os ficheiros do Storage
  // só se apagam pela API da app e não pelo SQL da limpeza diária.
  const excluirConta = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return { error: { message: 'sem_sessao' } };
    try {
      const { error } = await supabase.rpc('pedir_exclusao_conta');
      if (error) return { error };
    } catch (e) {
      return { error: { message: 'not_configured' } };
    }
    try {
      const { data: ficheiros } = await supabase.storage.from('avatars').list(userId);
      if (ficheiros?.length) {
        await supabase.storage.from('avatars').remove(ficheiros.map((f) => `${userId}/${f.name}`));
      }
      await supabase.from('profiles').update({ foto_url: null }).eq('id', userId);
    } catch {
      /* se a foto não sair agora, a conta continua marcada para apagar */
    }
    await supabase.auth.signOut();
    return { error: null };
  }, [session]);

  const cancelarExclusao = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('cancelar_exclusao_conta');
      if (error) return { error };
    } catch (e) {
      return { error: { message: 'not_configured' } };
    }
    await carregarPerfil(session?.user?.id);
    return { error: null };
  }, [session, carregarPerfil]);

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
    cancelarExclusao,
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
