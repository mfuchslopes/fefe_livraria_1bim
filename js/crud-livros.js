// crud-livros.js

document.getElementById('form-livro').addEventListener('submit', async function(e) {
  e.preventDefault();
  const titulo = document.getElementById('titulo').value;
  const autor = document.getElementById('autor').value;
  const preco = document.getElementById('preco').value;
  const genero = document.getElementById('genero').value;
  const descricao = document.getElementById('descricao').value;
  const imagem = document.getElementById('imagem').value;
  const resp = await fetch('/api/livros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, autor, preco, genero, descricao, imagem })
  });
  const data = await resp.json();
  const msg = document.getElementById('mensagem-livro');
  if (resp.ok) {
    msg.textContent = 'Livro cadastrado com sucesso!';
    this.reset();
  } else {
    msg.textContent = data.erro || 'Erro ao cadastrar livro';
  }
});
