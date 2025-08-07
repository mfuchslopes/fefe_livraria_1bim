const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer'); // ✅ Adicionado
const app = express();
const PORT = 3000;
const SECRET = 'segredo-super-seguro';

// Configura o destino e nome do arquivo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, './img'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

const db = new sqlite3.Database('./livraria.db');

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Rota para listar todos os livros
app.get('/api/livros', (req, res) => {
  const query = 'SELECT * FROM livros';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar livros:', err);
      res.status(500).json({ erro: 'Erro ao buscar livros' });
    } else {
      res.json(rows);
    }
  });
});

// Rota para listar todos os gêneros
app.get('/api/generos', (req, res) => {
  const query = 'SELECT * FROM generos';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar gêneros:', err);
      res.status(500).json({ erro: 'Erro ao buscar gêneros' });
    } else {
      res.json(rows);
    }
  });
});

// Rota para listar todas as relações livro-genero
app.get('/api/livroGenero', (req, res) => {
  const query = 'SELECT * FROM livroGenero';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar relações livro-gênero:', err);
      res.status(500).json({ erro: 'Erro ao buscar livroGenero' });
    } else {
      res.json(rows);
    }
  });
});

// Adicionar um novo livro
app.post('/api/livros', (req, res) => {
  const { titulo, preco, descricao, imagem, generos } = req.body;
  const insertLivro = 'INSERT INTO livros (titulo, preco, descricao, imagem) VALUES (?, ?, ?, ?)';

  db.run(insertLivro, [titulo, preco, descricao, imagem], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const idLivro = this.lastID;

    if (Array.isArray(generos)) {
      const insertRelacao = db.prepare('INSERT INTO livroGenero (id_livro, id_genero) VALUES (?, ?)');
      generos.forEach(id_genero => {
        insertRelacao.run(idLivro, id_genero);
      });
      insertRelacao.finalize();
    }

    res.status(201).json({ id: idLivro });
  });
});

// Deletar um livro
app.delete('/api/livros/:id', (req, res) => {
  const id = req.params.id;

  db.run('DELETE FROM livroGenero WHERE id_livro = ?', [id], function () {
    db.run('DELETE FROM livros WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: true });
    });
  });
});

// Editar um livro
app.put('/api/livros/:id', (req, res) => {
  const id = req.params.id;
  const { titulo, preco, descricao, imagem, generos } = req.body;

  const sql = 'UPDATE livros SET titulo = ?, preco = ?, descricao = ?, imagem = ? WHERE id = ?';
  db.run(sql, [titulo, preco, descricao, imagem, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.run('DELETE FROM livroGenero WHERE id_livro = ?', [id], function () {
      if (Array.isArray(generos)) {
        const insertRelacao = db.prepare('INSERT INTO livroGenero (id_livro, id_genero) VALUES (?, ?)');
        generos.forEach(id_genero => {
          insertRelacao.run(id, id_genero);
        });
        insertRelacao.finalize();
      }
      res.json({ updated: true });
    });
  });
});

// Buscar um livro por ID (incluindo gêneros)
app.get('/api/livros/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM livros WHERE id = ?', [id], (err, livro) => {
    if (err || !livro) return res.status(404).json({ erro: 'Livro não encontrado' });
    db.all('SELECT id_genero FROM livroGenero WHERE id_livro = ?', [id], (err2, generos) => {
      if (err2) return res.status(500).json({ erro: 'Erro ao buscar gêneros' });
      livro.generos = generos.map(g => g.id_genero);
      res.json(livro);
    });
  });
});

app.post('/api/upload-imagem', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  }
  // Caminho relativo que será salvo no banco
  const caminhoRelativo = `../../../img/${req.file.filename}`;
  res.json({ caminho: caminhoRelativo });
});

// 🔹 Rota para obter carrinho de um usuário
app.get('/api/carrinho/:id_usuario', (req, res) => {
  const id = req.params.id_usuario;
  const sql = `
    SELECT livros.id, livros.titulo, livros.preco, carrinho.quantidade
    FROM carrinho
    JOIN livros ON carrinho.id_livro = livros.id
    WHERE carrinho.id_usuario = ?
  `;
  db.all(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// 🔹 Adiciona item ao carrinho
app.post('/api/carrinho', (req, res) => {
  const { id_usuario, id_livro, quantidade } = req.body;

  db.get(`SELECT * FROM carrinho WHERE id_usuario = ? AND id_livro = ?`, [id_usuario, id_livro], (err, row) => {
    if (row) {
      db.run(`UPDATE carrinho SET quantidade = quantidade + ? WHERE id_usuario = ? AND id_livro = ?`,
        [quantidade, id_usuario, id_livro], function (err2) {
          if (err2) return res.status(500).json({ erro: err2.message });
          res.json({ sucesso: true });
        });
    } else {
      db.run(`INSERT INTO carrinho (id_usuario, id_livro, quantidade) VALUES (?, ?, ?)`,
        [id_usuario, id_livro, quantidade], function (err2) {
          if (err2) return res.status(500).json({ erro: err2.message });
          res.json({ sucesso: true });
        });
    }
  });
});

app.delete('/api/carrinho', (req, res) => {
  const { id_usuario, titulo, removerApenasUm } = req.body;
  if (!id_usuario || !titulo) {
    return res.status(400).json({ erro: 'id_usuario ou título não fornecido' });
  }
  db.get('SELECT id FROM livros WHERE titulo = ?', [titulo], (err, livro) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar livro' });
    if (!livro) return res.status(404).json({ erro: 'Livro não encontrado' });
    const idLivro = livro.id;
    db.get(
      'SELECT quantidade FROM carrinho WHERE id_usuario = ? AND id_livro = ?',
      [id_usuario, idLivro],
      (err, row) => {
        if (err) return res.status(500).json({ erro: 'Erro ao acessar o carrinho' });
        if (!row) return res.status(404).json({ erro: 'Livro não está no carrinho' });
        if (removerApenasUm && row.quantidade > 1) {
          db.run(
            'UPDATE carrinho SET quantidade = quantidade - 1 WHERE id_usuario = ? AND id_livro = ?',
            [id_usuario, idLivro],
            function (err) {
              if (err) return res.status(500).json({ erro: 'Erro ao atualizar o carrinho' });
              // Retorna o carrinho atualizado
              db.all(`SELECT livros.id, livros.titulo, livros.preco, carrinho.quantidade FROM carrinho JOIN livros ON carrinho.id_livro = livros.id WHERE carrinho.id_usuario = ?`, [id_usuario], (err2, rows) => {
                if (err2) return res.status(500).json({ erro: 'Erro ao buscar carrinho atualizado' });
                return res.status(200).json(rows);
              });
            }
          );
        } else {
          db.run(
            'DELETE FROM carrinho WHERE id_usuario = ? AND id_livro = ?',
            [id_usuario, idLivro],
            function (err) {
              if (err) return res.status(500).json({ erro: 'Erro ao remover item do carrinho' });
              // Retorna o carrinho atualizado
              db.all(`SELECT livros.id, livros.titulo, livros.preco, carrinho.quantidade FROM carrinho JOIN livros ON carrinho.id_livro = livros.id WHERE carrinho.id_usuario = ?`, [id_usuario], (err2, rows) => {
                if (err2) return res.status(500).json({ erro: 'Erro ao buscar carrinho atualizado' });
                return res.status(200).json(rows);
              });
            }
          );
        }
      }
    );
  });
});

// 🔹 Limpa carrinho
app.delete('/api/carrinho/:id_usuario', (req, res) => {
  const id = req.params.id_usuario;
  db.run(`DELETE FROM carrinho WHERE id_usuario = ?`, [id], (err) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ sucesso: true });
  });
});

app.get('/api/usuarios', (req, res) => {
  db.all('SELECT id, nome, email, tipo, cpf, cep FROM usuarios', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.get('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, nome, email, tipo, cpf, cep FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (!row) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(row);
  });
});

app.post('/api/usuarios', (req, res) => {
  const { nome, cpf, email, cep, senha, tipo } = req.body;
  const tipoFinal = tipo ? tipo : 'cliente'; // Se não vier, define como cliente
  const senha_hash = bcrypt.hashSync(senha, 10);
  db.run('INSERT INTO usuarios (nome, cpf, email, cep, tipo, senha_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, cpf, email, cep, tipoFinal, senha_hash],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ sucesso: true });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nome, cpf, email, cep, senha, tipo } = req.body;

  db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, user) => {
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });

    // Verifica se o email já existe para outro usuário
    db.get('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id], (err2, usuarioExistente) => {
      if (usuarioExistente) {
        return res.status(400).json({ erro: 'Email já cadastrado por outro usuário.' });
      }

      const senha_hash = senha ? bcrypt.hashSync(senha, 10) : user.senha_hash;

      db.run(
        'UPDATE usuarios SET nome = ?, cpf = ?, email = ?, cep = ?, tipo = ?, senha_hash = ? WHERE id = ?',
        [nome, cpf, email, cep, tipo || user.tipo, senha_hash, id],
        function (err3) {
          if (err3) return res.status(500).json({ erro: err3.message });
          res.json({ sucesso: true });
        }
      );
    });
  });
});

app.delete('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM usuarios WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ sucesso: true });
  });
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (err || !usuario) return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    if (!bcrypt.compareSync(senha, usuario.senha_hash)) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }
    // Retorna apenas dados essenciais
    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    });
  });
});

// Armazena códigos temporários (em memória)
const codigosRecuperacao = {};

// Gera código e salva para o email
app.post('/api/usuarios/solicitarCodigo', (req, res) => {
  const { email } = req.body;
  db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    codigosRecuperacao[email] = codigo;
    // Aqui você enviaria por email, mas vamos retornar para o front
    res.json({ codigo });
  });
});

// Troca a senha se o código estiver correto
app.post('/api/usuarios/recuperarSenha', (req, res) => {
  const { email, codigo, senha } = req.body;
  db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    if (codigosRecuperacao[email] !== codigo) {
      return res.status(400).json({ erro: 'Código incorreto' });
    }
    const senha_hash = bcrypt.hashSync(senha, 10);
    db.run('UPDATE usuarios SET senha_hash = ? WHERE email = ?', [senha_hash, email], function (err2) {
      if (err2) return res.status(500).json({ erro: err2.message });
      // Remove o código após uso
      delete codigosRecuperacao[email];
      res.json({ sucesso: true });
    });
  });
});

// CRUD de gêneros

// Criar gênero
app.post('/api/generos', (req, res) => {
  const { nome, descricao, imagem, slug } = req.body;
  if (!nome || !slug) return res.status(400).json({ erro: 'Nome e slug obrigatórios' });
  db.run('INSERT INTO generos (nome, descricao, imagem, slug) VALUES (?, ?, ?, ?)', [nome, descricao, imagem, slug], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.status(201).json({ id: this.lastID, nome, descricao, imagem, slug });
  });
});

// Buscar gênero por ID
app.get('/api/generos/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM generos WHERE id = ?', [id], (err, row) => {
    if (!row) return res.status(404).json({ erro: 'Gênero não encontrado' });
    res.json(row);
  });
});

// Editar gênero
app.put('/api/generos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, descricao, imagem, slug } = req.body;
  if (!nome || !slug) return res.status(400).json({ erro: 'Nome e slug obrigatórios' });
  db.run('UPDATE generos SET nome = ?, descricao = ?, imagem = ?, slug = ? WHERE id = ?', [nome, descricao, imagem, slug, id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ atualizado: true });
  });
});

// Excluir gênero
app.delete('/api/generos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM livroGenero WHERE id_genero = ?', [id], function () {
    db.run('DELETE FROM generos WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ excluido: true });
    });
  });
});

app.use(express.static(path.join(__dirname, '..')));

// Serve arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(__dirname));

// Rota padrão para abrir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});