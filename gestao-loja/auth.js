// ============================================================================
// auth.js - Módulo de Autenticação com Supabase Auth (Design System Lux Store)
// Segurança: Senhas NUNCA são salvas em memória, localStorage, tabelas ou logs.
// UX/UI: Alternância fluida entre Entrar e Criar Conta com feedback instantâneo.
// ============================================================================

import { supabase } from './supabaseClient.js';

/**
 * Traduz os códigos de erro oficiais do Supabase Auth para mensagens claras em português.
 * Atende aos requisitos: invalid_credentials, email_not_confirmed, user_already_exists,
 * weak_password e over_email_send_rate_limit.
 */
export function traduzirErroAuth(error) {
  if (!error) return '';
  const code = String(error.code || '').toLowerCase().trim();

  switch (code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada para confirmar o cadastro.';
    case 'user_already_exists':
      return 'Já existe um usuário cadastrado com este e-mail.';
    case 'weak_password':
      return 'A senha fornecida é muito fraca. Escolha uma senha mais forte (mínimo de 6 caracteres).';
    case 'over_email_send_rate_limit':
      return 'Limite de envio de e-mails atingido. Por favor, aguarde alguns instantes antes de tentar novamente.';
    default:
      if (error.message && error.message.toLowerCase().includes('invalid login credentials')) {
        return 'E-mail ou senha incorretos.';
      }
      return `Erro na autenticação (${code || 'desconhecido'}): ${error.message || 'Falha ao processar solicitação.'}`;
  }
}

/**
 * Realiza o login utilizando email e senha.
 */
export async function fazerLogin(email, senha, onFeedback) {
  if (!supabase) return;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    onFeedback('error', traduzirErroAuth(error));
  } else {
    onFeedback('success', `Bem-vindo de volta, ${data.user?.email || 'lojista'}!`);
  }
}

/**
 * Cria uma nova conta com email e senha.
 */
export async function criarConta(email, senha, onFeedback) {
  if (!supabase) return;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha
  });

  if (error) {
    onFeedback('error', traduzirErroAuth(error));
  } else {
    if (data.session) {
      onFeedback('success', 'Conta criada e conectada com sucesso!');
    } else {
      onFeedback('success', 'Conta criada com sucesso! Se a confirmação de e-mail estiver ativada, verifique sua caixa de entrada antes de entrar.');
    }
  }
}

/**
 * Encerra a sessão do usuário atual.
 */
export async function fazerLogout(onFeedback) {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    onFeedback('error', traduzirErroAuth(error));
  } else {
    onFeedback('success', 'Sessão encerrada com sucesso.');
  }
}

/**
 * Inicializa a interface de autenticação, o alternador de abas e registra o ouvinte onAuthStateChange.
 */
export function setupAuth({ onLogin, onLogout, onFeedback }) {
  if (!supabase) {
    onFeedback('error', 'Cliente Supabase não inicializado. Verifique a configuração.');
    return;
  }

  const authSection = document.getElementById('auth-section');
  const lojaContent = document.getElementById('loja-content');
  const userInfoBar = document.getElementById('user-info-bar');
  const userEmailDisplay = document.getElementById('user-email-display');
  const formAuth = document.getElementById('form-auth');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const btnLogin = document.getElementById('btn-login');
  const btnCadastrar = document.getElementById('btn-cadastrar');
  const btnLogout = document.getElementById('btn-logout');

  // Alternador de Abas UX (Entrar vs Criar Conta)
  const btnTabLogin = document.getElementById('btn-tab-login');
  const btnTabSignup = document.getElementById('btn-tab-signup');
  const authSubtitle = document.getElementById('auth-subtitle');
  const authSwitchLabel = document.getElementById('auth-switch-label');
  const authSwitchLink = document.getElementById('auth-switch-link');

  let modoAtual = 'login'; // 'login' | 'signup'

  function alternarModo(modo) {
    modoAtual = modo;
    if (modo === 'login') {
      if (btnTabLogin) btnTabLogin.classList.add('active');
      if (btnTabSignup) btnTabSignup.classList.remove('active');
      if (btnLogin) btnLogin.style.display = 'block';
      if (btnCadastrar) btnCadastrar.style.display = 'none';
      if (authSubtitle) authSubtitle.textContent = 'Entre com sua conta para gerenciar seu catálogo e pedidos.';
      if (authSwitchLabel) authSwitchLabel.textContent = 'Ainda não possui uma conta?';
      if (authSwitchLink) authSwitchLink.textContent = 'Cadastre-se agora';
    } else {
      if (btnTabLogin) btnTabLogin.classList.remove('active');
      if (btnTabSignup) btnTabSignup.classList.add('active');
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnCadastrar) btnCadastrar.style.display = 'block';
      if (authSubtitle) authSubtitle.textContent = 'Crie sua conta exclusiva de lojista para começar.';
      if (authSwitchLabel) authSwitchLabel.textContent = 'Já possui uma conta cadastrada?';
      if (authSwitchLink) authSwitchLink.textContent = 'Faça login aqui';
    }
  }

  if (btnTabLogin) btnTabLogin.addEventListener('click', () => alternarModo('login'));
  if (btnTabSignup) btnTabSignup.addEventListener('click', () => alternarModo('signup'));
  if (authSwitchLink) {
    authSwitchLink.addEventListener('click', (e) => {
      e.preventDefault();
      alternarModo(modoAtual === 'login' ? 'signup' : 'login');
    });
  }

  // Submit do formulário -> Submete conforme o modo selecionado
  if (formAuth) {
    formAuth.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const senha = passwordInput.value;

      // Limpeza imediata do campo de senha da memória do input
      passwordInput.value = '';

      if (!email || !senha) {
        onFeedback('error', 'Por favor, informe e-mail e senha.');
        return;
      }

      if (modoAtual === 'signup') {
        await criarConta(email, senha, onFeedback);
      } else {
        await fazerLogin(email, senha, onFeedback);
      }
    });
  }

  // Clique direto no botão Criar Conta (se acionado diretamente)
  if (btnCadastrar) {
    btnCadastrar.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const senha = passwordInput.value;
      passwordInput.value = '';

      if (!email || !senha) {
        onFeedback('error', 'Preencha e-mail e senha para criar uma nova conta.');
        return;
      }

      await criarConta(email, senha, onFeedback);
    });
  }

  // Clique em "Sair"
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fazerLogout(onFeedback);
    });
  }

  // Ouvinte reativo do Supabase Auth
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      // 1. Oculta tela de login e exibe a loja
      if (authSection) authSection.style.display = 'none';
      if (lojaContent) lojaContent.style.display = 'block';

      // 2. Mostra barra superior com o e-mail seguro via textContent
      if (userInfoBar) userInfoBar.style.display = 'flex';
      if (userEmailDisplay) userEmailDisplay.textContent = session.user.email || '';

      // 3. Executa a carga das coleções pertencentes a esse dono
      if (typeof onLogin === 'function') {
        onLogin(session.user);
      }
    } else {
      // 1. Exibe tela de login e oculta loja
      if (authSection) authSection.style.display = 'block';
      if (lojaContent) lojaContent.style.display = 'none';

      // 2. Oculta barra com e-mail
      if (userInfoBar) userInfoBar.style.display = 'none';
      if (userEmailDisplay) userEmailDisplay.textContent = '';

      // 3. Limpa todas as tabelas na tela e os caches em memória
      if (typeof onLogout === 'function') {
        onLogout();
      }
    }
  });
}
