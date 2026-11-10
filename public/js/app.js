const $ = id => document.getElementById(id);
let usuario = null, buscaAtual = '', view = 'galeria';

async function api(url, opts) {
  const r = await fetch('api/' + url.replace('.php', ''), opts);
  let d = {}; try { d = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, d };
}
const form = o => new URLSearchParams(o);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- sessão / cabeçalho ---------- */
function atualizaCabecalho() {
  if (usuario) {
    $('foto-usuario').src = 'imagens_usuarios/' + usuario.imagem;
    $('nome-usuario').textContent = usuario.nome;
    $('btn-perfil').disabled = usuario.tipo !== 'fotografo';
    $('btn-login').hidden = true;
  } else {
    $('foto-usuario').src = 'imagens_usuarios/saepVision.jpeg';
    $('nome-usuario').textContent = '@SAEPVision';
    $('btn-perfil').disabled = true;
    $('btn-login').hidden = false;
  }
}

/* ---------- galeria ---------- */
function card(p, comLixeira) {
  const acao = comLixeira
    ? `<button class="excluir" data-id="${p.id}" aria-label="Excluir"><i class="ico lixeira" style="--i:url(icones/lixeira.svg)"></i></button>`
    : `<button class="curtir ${p.curtiu ? 'ativo' : ''}" data-id="${p.id}"><i class="ico" style="--i:url(icones/coracao.svg)"></i><span>${p.curtidas}</span></button>`;
  return `<article class="card"><div class="img"><img class="foto" src="${esc(p.url)}" alt="${esc(p.titulo)}">
    <div class="tooltip">Foto tirada por: @${esc(p.fotografo)}<br>Local: ${esc(p.local)}</div></div>
    <div class="info"><span>${esc(p.titulo)}</span>${acao}</div></article>`;
}

async function carregaGaleria() {
  const q = buscaAtual ? '?fotografo=' + encodeURIComponent(buscaAtual) : '';
  const { d } = await api('publicacoes.php' + q);
  if (d.erro) { $('busca-erro').textContent = d.erro; return; }
  $('busca-erro').textContent = '';
  $('galeria').innerHTML = d.publicacoes.length ? d.publicacoes.map(p => card(p)).join('') : '<p class="vazio">Nenhuma publicação.</p>';
}

async function carregaMinhas() {
  const { d } = await api('publicacoes.php?minhas=1');
  $('lista-minhas').innerHTML = (d.publicacoes || []).map(p => card(p, true)).join('');
}

function mostra(v) {
  view = v;
  $('view-galeria').hidden = v !== 'galeria';
  $('view-registro').hidden = v !== 'registro';
  v === 'galeria' ? carregaGaleria() : carregaMinhas();
}

/* ---------- login ---------- */
const abreLogin = () => { $('modal').hidden = false; $('email').focus(); };
const fechaLogin = () => { $('modal').hidden = true; $('form-login').reset(); ['e-email','e-senha','e-login'].forEach(i => $(i).textContent = ''); };
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

$('btn-login').onclick = abreLogin;
$('login-x').onclick = $('login-cancelar').onclick = fechaLogin;

$('form-login').onsubmit = async e => {
  e.preventDefault();
  const email = $('email').value.trim(), senha = $('senha').value;
  $('e-email').textContent = emailOk(email) ? '' : 'E-mail inválido ou vazio';
  $('e-senha').textContent = senha ? '' : 'A senha é obrigatória';
  $('e-login').textContent = '';
  if (!emailOk(email) || !senha) return;
  const { ok, d } = await api('login.php', { method: 'POST', body: form({ email, senha }) });
  if (!ok) { $('e-login').textContent = d.erro || 'Usuário não encontrado ou senha incorreta'; return; }
  usuario = d.usuario; fechaLogin(); atualizaCabecalho(); mostra('galeria');
};

/* ---------- ações da galeria ---------- */
document.addEventListener('click', async e => {
  const c = e.target.closest('.curtir');
  if (c) {
    if (!usuario) return abreLogin();
    const { ok, d } = await api('curtir.php', { method: 'POST', body: form({ id: c.dataset.id }) });
    if (ok) { c.classList.toggle('ativo', d.curtiu); c.querySelector('span').textContent = d.curtidas; }
  }
  const x = e.target.closest('.excluir');
  if (x && confirm('Excluir esta publicação?')) {
    await api('excluir.php', { method: 'POST', body: form({ id: x.dataset.id }) });
    carregaMinhas();
  }
});

/* ---------- busca ---------- */
$('busca').addEventListener('focus', () => { if (!usuario) { $('busca').blur(); abreLogin(); } });
$('busca').addEventListener('keydown', e => { if (e.key === 'Enter') pesquisa(); });
$('btn-busca').onclick = () => usuario ? pesquisa() : abreLogin();
function pesquisa() {
  const v = $('busca').value.trim().replace(/^@/, '');
  if (v && !/^[a-zA-Z0-9_]+$/.test(v)) { $('busca-erro').textContent = 'Formato inválido (exemplo: fotografo1)'; return; }
  buscaAtual = v; carregaGaleria();
}

/* ---------- menu lateral ---------- */
$('btn-perfil').onclick = async () => {
  if (!usuario) return abreLogin();
  const { d } = await api('perfil.php');
  $('menu-foto').src = 'imagens_usuarios/' + usuario.imagem;
  $('menu-nome').textContent = '@' + usuario.nome;
  $('menu-likes').textContent = d.likes; $('menu-pubs').textContent = d.publicacoes;
  $('menu').hidden = false;
};
$('menu-fechar').onclick = () => $('menu').hidden = true;
$('btn-minhas').onclick = () => { $('menu').hidden = true; mostra('registro'); };
$('btn-logout').onclick = async () => { await api('logout.php'); location.href = 'index.html'; };
$('logo').onclick = () => { buscaAtual = ''; $('busca').value = ''; mostra('galeria'); };
$('logo').style.cursor = 'pointer';

/* ---------- cadastro de fotografia ---------- */
$('imagem').onchange = () => $('nome-arquivo').textContent = $('imagem').files[0]?.name || 'Nenhum arquivo escolhido';
$('form-foto').onsubmit = async e => {
  e.preventDefault();
  const titulo = $('titulo').value.trim(), local = $('local').value.trim(), f = $('imagem').files[0];
  const erros = {};
  if (!titulo) erros.titulo = 'Informe o título da imagem';
  if (!local) erros.local = 'Informe o local onde foi tirada';
  if (!f) erros.imagem = 'Selecione uma imagem';
  else if (!/\.(jpe?g|png|gif|webp)$/i.test(f.name)) erros.imagem = 'Formato inválido (JPG, JPEG, PNG, GIF ou WEBP)';
  ['titulo','local','imagem'].forEach(k => $('e-' + k).textContent = erros[k] || '');
  if (Object.keys(erros).length) return;
  const fd = new FormData(); fd.append('titulo', titulo); fd.append('local', local); fd.append('imagem', f);
  const { ok, d } = await api('cadastrar.php', { method: 'POST', body: fd });
  if (!ok) { ['titulo','local','imagem'].forEach(k => $('e-' + k).textContent = (d.erros || {})[k] || ''); return; }
  $('form-foto').reset(); $('nome-arquivo').textContent = 'Nenhum arquivo escolhido';
  carregaMinhas();
};

/* ---------- atualização automática (curtidas em tempo real) ---------- */
setInterval(() => {
  if (view !== 'galeria' || !$('modal').hidden) return;
  api('publicacoes.php' + (buscaAtual ? '?fotografo=' + encodeURIComponent(buscaAtual) : '')).then(({ d }) => {
    (d.publicacoes || []).forEach(p => {
      const b = document.querySelector(`#galeria .curtir[data-id="${p.id}"]`);
      if (b) { b.querySelector('span').textContent = p.curtidas; b.classList.toggle('ativo', p.curtiu); }
    });
  });
}, 5000);

/* ---------- init ---------- */
(async () => {
  usuario = (await api('sessao.php')).d.usuario || null;
  atualizaCabecalho(); mostra('galeria');
})();
