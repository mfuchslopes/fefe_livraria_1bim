const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const db = new sqlite3.Database('./livraria.db');
const csvPath = path.join(__dirname, '../csv/usuarios.csv');
const csv = fs.readFileSync(csvPath, 'utf8');
const usuarios = parse(csv, { columns: true });

db.serialize(() => {
  db.run('DELETE FROM usuarios'); // Limpa a tabela antes de importar
  usuarios.forEach(u => {
    db.run(
      `INSERT INTO usuarios (nome, cpf, email, senha, cep, tipo) VALUES (?, ?, ?, ?, ?, ?)`,
      [u.nome, u.cpf, u.email, u.senha_hash, u.cep, u.tipo],
      err => {
        if (err) console.error('Erro ao importar usuário:', err.message);
      }
    );
  });
  console.log('Usuários importados do CSV para o banco!');
});