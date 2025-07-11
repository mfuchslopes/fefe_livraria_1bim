// criarBancoCorrigido.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos CSV
const livrosCSV = path.join(__dirname, '../csv/livros.csv');
const generosCSV = path.join(__dirname, '../csv/generos.csv');
const livroGeneroCSV = path.join(__dirname, '../csv/livroGenero.csv');

// Cria banco
const db = new sqlite3.Database('./livraria.db');

function lerCSV(caminho) {
  const conteudo = fs.readFileSync(caminho, 'utf-8');
  const linhas = conteudo.trim().split('\n');
  const [cabecalho, ...dados] = linhas;
  return dados.map(linha => linha.trim().split(';'));
}

db.serialize(() => {
  // Apaga se já existirem
  db.run("DROP TABLE IF EXISTS livros");
  db.run("DROP TABLE IF EXISTS generos");
  db.run("DROP TABLE IF EXISTS livroGenero");
  db.run("DROP TABLE IF EXISTS usuarios");
  db.run("DROP TABLE IF EXISTS carrinho");

  // Criação das tabelas
  db.run(`CREATE TABLE livros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    preco REAL,
    descricao TEXT,
    imagem TEXT
  )`);

  db.run(`CREATE TABLE generos (
    id INTEGER PRIMARY KEY,
    nome TEXT,
    descricao TEXT,
    imagem TEXT,
    slug TEXT
  )`);

  db.run(`CREATE TABLE livroGenero (
    id_livro INTEGER,
    id_genero INTEGER,
    FOREIGN KEY (id_livro) REFERENCES livros(id),
    FOREIGN KEY (id_genero) REFERENCES generos(id)
  )`);

  db.run(`CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cpf TEXT,
    email TEXT,
    senha_hash TEXT,
    cep TEXT,
    tipo TEXT
  )`);

  db.run(`CREATE TABLE carrinho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario TEXT,
    id_livro INTEGER,
    quantidade INTEGER,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(email),
    FOREIGN KEY (id_livro) REFERENCES livros(id)
  )`);

  // Insere livros (sem forçar o ID)
  const livros = lerCSV(livrosCSV);
  for (const [, titulo, preco, descricao, imagem] of livros) {
    db.run(
      "INSERT INTO livros (titulo, preco, descricao, imagem) VALUES (?, ?, ?, ?)",
      [titulo, parseFloat(preco), descricao, imagem],
      err => {
        if (err) console.error("Erro ao inserir livro:", err.message);
      }
    );
  }

  // Insere gêneros
  const generos = lerCSV(generosCSV);
  for (const linha of generos) {
    if (linha.length < 5) continue;
    const [id, nome, descricao, imagem, slug] = linha;
    db.run(
      "INSERT INTO generos (id, nome, descricao, imagem, slug) VALUES (?, ?, ?, ?, ?)",
      [id, nome, descricao, imagem, slug],
      err => {
        if (err) console.error("Erro ao inserir gênero:", err.message);
      }
    );
  }

  // Insere livroGenero
  const relacoes = lerCSV(livroGeneroCSV);
  for (const [id_livro, id_genero] of relacoes) {
    db.run(
      "INSERT INTO livroGenero (id_livro, id_genero) VALUES (?, ?)",
      [id_livro, id_genero],
      err => {
        if (err) console.error("Erro ao inserir relação livro-genero:", err.message);
      }
    );
  }

  console.log('✅ Banco criado e populado com sucesso!');
});
