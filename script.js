/* ==========================================================================
   LÓGICA JAVASCRIPT — INTERAÇÕES, DOAÇÕES E CONTAS DE USUÁRIO
   --------------------------------------------------------------------------
   Este script gerencia a renderização de componentes dinâmicos, filtragem de 
   projetos e a simulação de persistência de dados localmente (LocalStorage).
   ========================================================================== */

// DADOS DAS AÇÕES SOCIAIS DINÂMICAS
const acoes = [
  { icon: '🥘', titulo: 'Campanha do Alimento', categoria: 'alimento', texto: 'Arrecadação e distribuição de cestas básicas estruturadas para mitigar a insegurança alimentar crônica.' },
  { icon: '📚', titulo: 'Educação que Transforma', categoria: 'educacao', texto: 'Aulas complementares de alfabetização, reforço lógico e oficinas de criatividade para jovens.' },
  { icon: '🧥', titulo: 'Varal Solidário', categoria: 'acolhimento', texto: 'Distribuição assistida de cobertores, agasalhos e insumos de higiene pessoal em áreas periféricas.' },
  { icon: '🤝', titulo: 'Rede de Voluntários', categoria: 'acolhimento', texto: 'Capacitação civil e mobilização estratégica de pessoas para apoio a asilos e abrigos locais.' },
  { icon: '🎒', titulo: 'Mochila de Esperança', categoria: 'educacao', texto: 'Distribuição de kits escolares para estudantes iniciarem o ano letivo com dignidade e material adequado.' },
  { icon: '🏠', titulo: 'Acolhimento Familiar', categoria: 'acolhimento', texto: 'Assistência social direta e triagem institucional emergencial para famílias desalojadas.' }
];

function renderAcoes(lista = acoes) {
  const grid = document.getElementById('acoesGrid');
  if (!grid) return;
  grid.innerHTML = lista.map(acao => `
    <div class="box-card">
      <div class="acao-icon">${acao.icon}</div>
      <h3>${acao.titulo}</h3>
      <p style="color: var(--texto-mutado); font-size: 0.92rem;">${acao.texto}</p>
    </div>
  `).join('');
}

function filtrarAcoes(categoria, botao) {
  document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
  botao.classList.add('active');
  renderAcoes(categoria === 'todos' ? acoes : acoes.filter(a => a.categoria === categoria));
}

// LÓGICA DO SISTEMA DE ARRECADAÇÃO E PERSISTÊNCIA (LOCALSTORAGE)
function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getDoacoes() {
  return JSON.parse(localStorage.getItem('doacoesONG_APS') || '[]');
}

function salvarDoacoes(doacoes) {
  localStorage.setItem('doacoesONG_APS', JSON.stringify(doacoes));
}

function selecionarValor(valor, botao) {
  const input = document.getElementById('doacao-valor');
  if (input) input.value = valor;
  document.querySelectorAll('.valor-btn').forEach(btn => btn.classList.remove('active'));
  botao.classList.add('active');
}

function toggleOutroCampo() {
  const tipo = document.getElementById('doacao-tipo')?.value;
  const campo = document.getElementById('outroCampo');
  if (campo) campo.style.display = tipo === 'Outro' ? 'block' : 'none';
}

function registrarDoacao(event) {
  event.preventDefault();

  // Doação só é permitida com conta logada
  const usuario = getUsuarioLogado();
  if (!usuario) {
    atualizarAcessoDoacao();
    return;
  }

  const valor = parseFloat(document.getElementById('doacao-valor').value);
  let tipo = document.getElementById('doacao-tipo').value;
  const outro = document.getElementById('doacao-outro')?.value.trim();
  const msg = document.getElementById('doacao-msg').value.trim();

  if (!(valor > 0)) return;
  if (tipo === 'Outro' && outro) tipo = `Outro: ${outro}`;

  const doacoes = getDoacoes();
  doacoes.unshift({
    nome: usuario.nome,
    email: usuario.email,
    valor, tipo, msg,
    usuarioEmail: usuario.email,
    data: new Date().toLocaleDateString('pt-BR')
  });
  salvarDoacoes(doacoes);
  renderDoacoes();

  event.target.reset();
  toggleOutroCampo();
  document.querySelectorAll('.valor-btn').forEach(btn => btn.classList.remove('active'));
  preencherDadosUsuario();
  mostrarAgradecimento(usuario.nome, valor, tipo);
}

// MODAL DE AGRADECIMENTO (centralizado, fecha com botão, clique fora ou Esc)
function mostrarAgradecimento(nome, valor, tipo) {
  fecharAgradecimento();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalAgradecimento';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
      <button type="button" class="modal-x" aria-label="Fechar">×</button>
      <div class="modal-icone">🤍</div>
      <h3 id="modalTitulo">Muito obrigado, ${escapeHtml(nome.split(' ')[0])}!</h3>
      <p>Sua doação de <strong>${formatarMoeda(valor)}</strong> para <strong>${escapeHtml(tipo)}</strong> foi registrada com sucesso. Pessoas como você tornam o nosso trabalho possível.</p>
      <button type="button" class="btn-primary btn-full modal-fechar">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-aberto');

  overlay.addEventListener('click', e => { if (e.target === overlay) fecharAgradecimento(); });
  overlay.querySelector('.modal-x').addEventListener('click', fecharAgradecimento);
  overlay.querySelector('.modal-fechar').addEventListener('click', fecharAgradecimento);
  overlay.querySelector('.modal-fechar').focus();
  document.addEventListener('keydown', fecharComEsc);
}

function fecharComEsc(e) { if (e.key === 'Escape') fecharAgradecimento(); }

function fecharAgradecimento() {
  document.getElementById('modalAgradecimento')?.remove();
  document.body.classList.remove('modal-aberto');
  document.removeEventListener('keydown', fecharComEsc);
}

function renderDoacoes() {
  const lista = document.getElementById('listaDoacoes');
  const total = document.getElementById('totalDoado');
  if (!lista || !total) return;

  // Histórico só existe para quem está logado, e mostra apenas as doações da própria conta
  const usuario = getUsuarioLogado();
  const doacoes = usuario ? getDoacoes().filter(d => d.usuarioEmail === usuario.email) : [];
  const soma = doacoes.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  total.textContent = `Total Acumulado: ${formatarMoeda(soma)}`;

  if (doacoes.length === 0) {
    lista.innerHTML = '<p style="color: var(--texto-mutado); text-align: center; padding: 20px;">Nenhuma doação registrada ainda.</p>';
    return;
  }

  lista.innerHTML = doacoes.map(d => `
    <div class="doacao-item">
      <div>
        <strong>${escapeHtml(d.tipo)}</strong>
        <span style="font-size: 0.85rem; color: var(--texto-mutado);">${d.data}</span>
      </div>
      <div class="doacao-valor">${formatarMoeda(d.valor)}</div>
    </div>
  `).join('');
}

function enviarContato(event) {
  event.preventDefault();
  alert('Formulário acadêmico enviado com sucesso! Obrigado pelo contato.');
  event.target.reset();
}

// INICIALIZADOR SELETIVO POR PÁGINA
document.addEventListener('DOMContentLoaded', () => {
  // Configuração para acoes.html
  if (document.getElementById('acoesGrid')) {
    renderAcoes();
    document.querySelectorAll('.filter-tab').forEach(botao => {
      botao.addEventListener('click', () => filtrarAcoes(botao.dataset.categoria, botao));
    });
  }

  // Configuração para doar.html
  if (document.getElementById('doacaoForm')) {
    renderDoacoes();
    toggleOutroCampo();
    document.getElementById('doacaoForm').addEventListener('submit', registrarDoacao);
    document.getElementById('doacao-tipo')?.addEventListener('change', toggleOutroCampo);
    document.querySelectorAll('.valor-btn').forEach(botao => {
      botao.addEventListener('click', () => selecionarValor(Number(botao.dataset.valor), botao));
    });
  }

  // Configuração para contato.html
  if (document.getElementById('contatoForm')) {
    document.getElementById('contatoForm').addEventListener('submit', enviarContato);
  }
});

/* ==========================================================================
   CONTAS DE USUÁRIO (CADASTRO / LOGIN)
   --------------------------------------------------------------------------
   ATENÇÃO: simulação 100% no navegador (localStorage), adequada para o projeto
   acadêmico. Em um site real, cadastro e login precisam de um servidor
   (back-end) com banco de dados e senhas protegidas com hash seguro (bcrypt/argon2).
   ========================================================================== */

function escapeHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getUsuarios() {
  try { return JSON.parse(localStorage.getItem('usuariosONG_APS') || '[]'); } catch { return []; }
}

function salvarUsuarios(lista) {
  localStorage.setItem('usuariosONG_APS', JSON.stringify(lista));
}

function getUsuarioLogado() {
  try { return JSON.parse(localStorage.getItem('sessaoONG_APS') || 'null'); } catch { return null; }
}

async function hashSenha(senha) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(senha))); // alternativa simples (apenas demonstração)
}

function mostrarMsg(id, texto, ok = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = 'auth-msg' + (texto ? (ok ? ' ok' : ' erro') : '');
}

async function cadastrarUsuario(event) {
  event.preventDefault();
  const nome = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim().toLowerCase();
  const senha = document.getElementById('cad-senha').value;
  const senha2 = document.getElementById('cad-senha2').value;

  if (senha.length < 6) return mostrarMsg('cadastroMsg', 'A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== senha2) return mostrarMsg('cadastroMsg', 'As senhas não conferem.');

  const usuarios = getUsuarios();
  if (usuarios.some(u => u.email === email)) return mostrarMsg('cadastroMsg', 'Este e-mail já está cadastrado. Tente entrar.');

  usuarios.push({ nome, email, senhaHash: await hashSenha(senha), criadoEm: new Date().toISOString() });
  salvarUsuarios(usuarios);
  localStorage.setItem('sessaoONG_APS', JSON.stringify({ nome, email }));
  window.location.href = 'doar.html';
}

async function entrarUsuario(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;

  const usuario = getUsuarios().find(u => u.email === email);
  if (!usuario || usuario.senhaHash !== await hashSenha(senha)) {
    return mostrarMsg('loginMsg', 'E-mail ou senha incorretos.');
  }
  localStorage.setItem('sessaoONG_APS', JSON.stringify({ nome: usuario.nome, email: usuario.email }));
  window.location.href = 'doar.html';
}

function sairUsuario() {
  localStorage.removeItem('sessaoONG_APS');
  window.location.href = 'index.html';
}

function trocarAbaAuth(aba) {
  document.getElementById('loginForm').style.display = aba === 'login' ? 'block' : 'none';
  document.getElementById('cadastroForm').style.display = aba === 'cadastro' ? 'block' : 'none';
  document.querySelectorAll('[data-auth]').forEach(b => b.classList.toggle('active', b.dataset.auth === aba));
  mostrarMsg('loginMsg', ''); mostrarMsg('cadastroMsg', '');
}

// Botão "Entrar" da barra de navegação vira "Olá, Nome" quando há sessão
function atualizarNavAuth() {
  const link = document.getElementById('navAuth');
  const usuario = getUsuarioLogado();
  if (!link) return;
  if (usuario) {
    link.textContent = '👤 ' + usuario.nome.split(' ')[0];
    link.title = 'Minha conta';
  }
}

// Pré-preenche (e trava) nome/e-mail com os dados da conta logada
function preencherDadosUsuario() {
  const usuario = getUsuarioLogado();
  if (!usuario) return;
  const nome = document.getElementById('doacao-nome');
  const email = document.getElementById('doacao-email');
  if (nome) { nome.value = usuario.nome; nome.readOnly = true; }
  if (email) { email.value = usuario.email; email.readOnly = true; }
}

// Sem login: esconde formulário e histórico e mostra o convite para entrar
function atualizarAcessoDoacao() {
  const logado = !!getUsuarioLogado();
  const mostrar = (id, visivel, tipo = 'block') => {
    const el = document.getElementById(id);
    if (el) el.style.display = visivel ? tipo : 'none';
  };
  mostrar('doacaoForm', logado);
  mostrar('tituloFormDoacao', logado);
  mostrar('gateLogin', !logado);
  mostrar('historicoBox', logado);
  if (logado) preencherDadosUsuario();
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarNavAuth();

  // doar.html
  if (document.getElementById('doacaoForm')) atualizarAcessoDoacao();

  // login.html
  if (document.getElementById('loginForm')) {
    const usuario = getUsuarioLogado();
    if (usuario) {
      document.getElementById('loginForm').style.display = 'none';
      document.querySelector('.auth-tabs').style.display = 'none';
      document.getElementById('authLogado').style.display = 'block';
      document.getElementById('authNomeLogado').textContent = 'Olá, ' + usuario.nome + '!';
      document.getElementById('authEmailLogado').textContent = usuario.email;
      document.getElementById('btnSair').addEventListener('click', sairUsuario);
    } else {
      document.getElementById('loginForm').addEventListener('submit', entrarUsuario);
      document.getElementById('cadastroForm').addEventListener('submit', cadastrarUsuario);
      document.querySelectorAll('[data-auth]').forEach(b => b.addEventListener('click', () => trocarAbaAuth(b.dataset.auth)));
      document.querySelectorAll('[data-auth-link]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); trocarAbaAuth(a.dataset.authLink); }));
      if (location.hash === '#cadastro') trocarAbaAuth('cadastro');
    }
  }
});
