const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const SECRET = 'segredo-super-seguro'; // Troque por env seguro

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


function lerUsuarios() {
  const csv = fs.readFileSync(path.join(__dirname, '../csv/usuarios.csv'), 'utf8');
  return parse(csv, { columns: true });
}

function salvarUsuarios(usuarios) {
  const csv = stringify(usuarios, { header: true });
  fs.writeFileSync(path.join(__dirname, '../csv/usuarios.csv'), csv);
}

// Cadastro
app.post('/api/cadastro', (req, res) => {
  const { nome, email, cpf, cep, endereco, senha } = req.body;
  let usuarios = lerUsuarios();
  if (usuarios.find(u => u.email === email)) {
    return res.status(400).json({ erro: 'E-mail já cadastrado' });
  }
  const senha_hash = bcrypt.hashSync(senha, 10);
  const novo = {
    id: (usuarios.length + 1).toString(),
    nome, email, senha_hash, tipo: 'cliente', cpf, cep, endereco
  };
  usuarios.push(novo);
  salvarUsuarios(usuarios);
  res.json({ sucesso: true });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const usuarios = lerUsuarios();
  const user = usuarios.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  }
  const token = jwt.sign({ id: user.id, tipo: user.tipo }, SECRET, { expiresIn: '1d' });
  res.json({ token, tipo: user.tipo, id: user.id });
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

// Buscar dados do usuário por id
app.get('/api/usuario/:id', (req, res) => {
  const id = req.params.id;
  const usuarios = lerUsuarios();
  const user = usuarios.find(u => u.id === id);
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });
  // Não retorna hash da senha
  const { senha_hash, ...dados } = user;
  res.json(dados);
});

// Atualizar dados do usuário
app.put('/api/usuario', (req, res) => {
  const { id, nome, cpf, cep, endereco, senha } = req.body;
  let usuarios = lerUsuarios();
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Usuário não encontrado' });
  // Validações básicas (validação completa é feita no frontend)
  usuarios[idx].nome = nome;
  usuarios[idx].cpf = cpf;
  usuarios[idx].cep = cep;
  usuarios[idx].endereco = endereco;
  if (senha) {
    usuarios[idx].senha_hash = bcrypt.hashSync(senha, 10);
  }
  salvarUsuarios(usuarios);
  res.json({ sucesso: true });
});

const multer = require('multer');

// Configura o destino e nome do arquivo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../img'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

app.post('/api/upload-imagem', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  }
  // Caminho relativo que será salvo no banco
  const caminhoRelativo = `../../../img/${req.file.filename}`;
  res.json({ caminho: caminhoRelativo });
});

app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
