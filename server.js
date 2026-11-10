const express = require('express');
const session = require('express-session');
const multer = require('multer');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '1234',
  database: process.env.DB_NAME || 'saepvision',
  charset: 'utf8mb4',
});

const PUBLIC = path.join(__dirname, 'public');
const EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(PUBLIC, 'uploads'),
    filename: (req, file, cb) => cb(null, 'foto_' + Date.now() + path.extname(file.originalname).toLowerCase()),
  }),
  fileFilter: (req, file, cb) => {
    const ok = EXTS.includes(path.extname(file.originalname).toLowerCase());
    if (!ok) req.formatoInvalido = true;
    cb(null, ok);
  },
});

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: 'saepvision-secret', resave: false, saveUninitialized: false }));
app.use(express.static(PUBLIC));

const exigeLogin = (req, res, next) =>
  req.session.usuario ? next() : res.status(401).json({ erro: 'Não autenticado' });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ erro: 'Erro interno' }); });

app.get('/api/sessao', (req, res) => res.json({ usuario: req.session.usuario || null }));

app.post('/api/login', wrap(async (req, res) => {
  const email = (req.body.email || '').trim(), senha = req.body.senha || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !senha) return res.status(422).json({ erro: 'Dados inválidos' });
  const [r] = await db.query('SELECT id_usuario,nome,imagem_usuario,tipo FROM tb_usuario WHERE email=? AND senha=?', [email, senha]);
  if (!r.length) return res.status(401).json({ erro: 'Usuário não encontrado ou senha incorreta' });
  req.session.usuario = { id: r[0].id_usuario, nome: r[0].nome, imagem: r[0].imagem_usuario, tipo: r[0].tipo };
  res.json({ usuario: req.session.usuario });
}));

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/publicacoes', wrap(async (req, res) => {
  const uid = req.session.usuario ? req.session.usuario.id : 0;
  let where = '', params = [uid, uid];
  if ('minhas' in req.query) {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autenticado' });
    where = 'WHERE p.id_usuario = ?'; params.push(uid);
  } else if ((req.query.fotografo || '').trim() !== '') {
    const nome = req.query.fotografo.trim().replace(/^@/, '');
    const [f] = await db.query("SELECT id_usuario FROM tb_usuario WHERE nome=? AND tipo='fotografo'", [nome]);
    if (!f.length) return res.status(404).json({ erro: 'Fotógrafo não encontrado' });
    where = 'WHERE p.id_usuario = ?'; params.push(f[0].id_usuario);
  }
  const [rows] = await db.query(
    `SELECT p.id_publicacao id, p.titulo_imagem titulo, p.local_foto 'local', p.url_fotografia url, u.nome fotografo,
      (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_publicacao=p.id_publicacao) curtidas,
      (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_publicacao=p.id_publicacao AND c.id_usuario=?) curtiu
     FROM tb_publicacao p JOIN tb_usuario u ON u.id_usuario=p.id_usuario ${where} ORDER BY p.id_publicacao`,
    [uid, ...params.slice(2)]
  );
  res.json({ publicacoes: rows.map(r => ({ ...r, curtidas: Number(r.curtidas), curtiu: Number(r.curtiu) > 0 })) });
}));

app.post('/api/curtir', exigeLogin, wrap(async (req, res) => {
  const uid = req.session.usuario.id, id = parseInt(req.body.id) || 0;
  const [ex] = await db.query('SELECT id_curtida FROM tb_curtida WHERE id_usuario=? AND id_publicacao=?', [uid, id]);
  let curtiu;
  if (ex.length) {
    await db.query('DELETE FROM tb_curtida WHERE id_usuario=? AND id_publicacao=?', [uid, id]);
    curtiu = false;
  } else {
    try { await db.query('INSERT INTO tb_curtida (id_usuario,id_publicacao) VALUES (?,?)', [uid, id]); }
    catch (e) { return res.status(422).json({ erro: 'Publicação inválida' }); }
    curtiu = true;
  }
  const [c] = await db.query('SELECT COUNT(*) n FROM tb_curtida WHERE id_publicacao=?', [id]);
  res.json({ curtiu, curtidas: Number(c[0].n) });
}));

app.get('/api/perfil', exigeLogin, wrap(async (req, res) => {
  const uid = req.session.usuario.id;
  const [a] = await db.query('SELECT COUNT(*) n FROM tb_publicacao WHERE id_usuario=?', [uid]);
  const [b] = await db.query('SELECT COUNT(*) n FROM tb_curtida c JOIN tb_publicacao p ON p.id_publicacao=c.id_publicacao WHERE p.id_usuario=?', [uid]);
  res.json({ publicacoes: Number(a[0].n), likes: Number(b[0].n) });
}));

app.post('/api/cadastrar', exigeLogin, upload.single('imagem'), wrap(async (req, res) => {
  const u = req.session.usuario;
  const apaga = () => req.file && fs.unlink(req.file.path, () => {});
  if (u.tipo !== 'fotografo') { apaga(); return res.status(403).json({ erro: 'Apenas fotógrafos' }); }
  const titulo = (req.body.titulo || '').trim(), local = (req.body.local || '').trim();
  const erros = {};
  if (!titulo) erros.titulo = 'Informe o título da imagem';
  if (!local) erros.local = 'Informe o local onde foi tirada';
  if (req.formatoInvalido) erros.imagem = 'Formato inválido (JPG, JPEG, PNG, GIF ou WEBP)';
  else if (!req.file) erros.imagem = 'Selecione uma imagem';
  if (Object.keys(erros).length) { apaga(); return res.status(422).json({ erros }); }
  await db.query('INSERT INTO tb_publicacao (titulo_imagem,local_foto,id_usuario,url_fotografia) VALUES (?,?,?,?)',
    [titulo, local, u.id, 'uploads/' + req.file.filename]);
  res.json({ ok: true });
}));

app.post('/api/excluir', exigeLogin, wrap(async (req, res) => {
  const uid = req.session.usuario.id, id = parseInt(req.body.id) || 0;
  const [p] = await db.query('SELECT url_fotografia FROM tb_publicacao WHERE id_publicacao=? AND id_usuario=?', [id, uid]);
  if (!p.length) return res.status(404).json({ erro: 'Publicação não encontrada' });
  await db.query('DELETE FROM tb_publicacao WHERE id_publicacao=?', [id]);
  if (p[0].url_fotografia.startsWith('uploads/')) fs.unlink(path.join(PUBLIC, p[0].url_fotografia), () => {});
  res.json({ ok: true });
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SAEPVision rodando em http://localhost:' + PORT));
