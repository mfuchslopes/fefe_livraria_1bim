document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formLivro');
  const lista = document.getElementById('listaLivros');
  const selectGeneros = document.getElementById('generos');

  async function carregarGeneros() {
    const resp = await fetch('http://localhost:3000/api/generos');
    const generos = await resp.json();

    selectGeneros.innerHTML = '';
    generos.forEach(g => {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.nome;
      selectGeneros.appendChild(option);
    });
  }

  async function carregarLivros() {
    const resp = await fetch('http://localhost:3000/api/livros');
    const livros = await resp.json();

    lista.innerHTML = '';
    livros.forEach(livro => {
      const li = document.createElement('li');
      li.setAttribute('data-id', livro.id); 
      li.innerHTML = `
      <div class="livro-conteudo">
    <div style="display: flex; align-items: flex-start; gap: 1rem;">
      <img src="${livro.imagem}" alt="Capa" class="imagem">
      <div>
        <strong class="titulo">${livro.titulo}</strong><br>
        <span class="preco">R$ ${livro.preco.toFixed(2)}</span><br>
        <p class="descricao">${livro.descricao || ''}</p>
      </div>
    </div>
    <div class="botoes">
      <button data-id="${livro.id}" class="editar">Editar</button>
      <button data-id="${livro.id}" class="excluir">Excluir</button>
    </div>
  </div>
    `;
      lista.appendChild(li);
      console.log(livro.titulo, livro.preco, livro.imagem)
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = form.imagem;
    const file = fileInput.files[0];
    let imagemPath = '';

    if (file) {
      const formData = new FormData();
      formData.append('imagem', file);

      const resp = await fetch('http://localhost:3000/api/upload-imagem', {
        method: 'POST',
        body: formData
      });

      const data = await resp.json();
      imagemPath = data.caminho; // ../../../img/nome-do-arquivo.jpg
    }
    if (!imagemPath) {
      alert('Por favor, selecione uma imagem.');
      return;
    }

    const generosSelecionados = Array.from(selectGeneros.selectedOptions).map(opt => Number(opt.value));

    const dados = {
      titulo: form.titulo.value,
      preco: parseFloat(form.preco.value),
      descricao: form.descricao.value,
      imagem: imagemPath,
      generos: generosSelecionados
    };

    await fetch('http://localhost:3000/api/livros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    form.reset();
    carregarLivros();
  });

  lista.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  const id = li?.dataset.id;

  // Excluir
  if (e.target.classList.contains('excluir')) {
    await fetch(`http://localhost:3000/api/livros/${id}`, { method: 'DELETE' });
    carregarLivros();
    return;
  }

// Editar
if (e.target.classList.contains('editar')) {
  // Busca os dados atuais do livro e dos gêneros
  const resp = await fetch(`http://localhost:3000/api/livros/${id}`);
  const livro = await resp.json();

  const respGen = await fetch('http://localhost:3000/api/generos');
  const todosGeneros = await respGen.json();

  // Monta o select múltiplo com os gêneros já selecionados
  let selectHtml = `<select class="edit-generos" multiple>`;
  todosGeneros.forEach(g => {
    const selected = livro.generos && livro.generos.includes(g.id) ? 'selected' : '';
    selectHtml += `<option value="${g.id}" ${selected}>${g.nome}</option>`;
  });
  selectHtml += `</select><br>`;

  li.innerHTML = `
    <div class="campo">
    <label>Título:</label>
    <input type="text" class="edit-titulo" value="${livro.titulo}">
  </div>

  <div class="campo">
    <label>Preço:</label>
    <input type="number" step="0.01" class="edit-preco" value="${livro.preco}">
  </div>

  <div class="campo">
    <label>Descrição:</label>
    <textarea class="edit-descricao" rows="4">${livro.descricao || ''}</textarea>
  </div>

  <div class="campo">
    <label>Gêneros:</label>
    ${selectHtml}
  </div>

  <div class="campo">
    <label>Imagem nova:</label>
    <input type="file" class="edit-imagem-file" accept="image/*">
  </div>

  <div class="botoes-edicao">
    <button data-id="${id}" class="salvar">Salvar</button>
    <button data-id="${id}" class="cancelar">Cancelar</button>
  </div>
  `;
}

// Cancelar edição
if (e.target.classList.contains('cancelar')) {
  carregarLivros();
  return;
}

// Salvar edição
if (e.target.classList.contains('salvar')) {
  const editTitulo = li.querySelector('.edit-titulo').value;
  const editPreco = parseFloat(li.querySelector('.edit-preco').value);
  const editDescricao = li.querySelector('.edit-descricao').value;
  const editImagemFile = li.querySelector('.edit-imagem-file').files[0];
  const editGeneros = Array.from(li.querySelector('.edit-generos').selectedOptions).map(opt => Number(opt.value));

  let imagemPath = "";

  // Se o usuário selecionou um novo arquivo, faz upload
  if (editImagemFile) {
    const formData = new FormData();
    formData.append('imagem', editImagemFile);
    const resp = await fetch('http://localhost:3000/api/upload-imagem', {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    imagemPath = data.caminho;
  } else {
    // Se não selecionou, mantém a imagem atual
    const resp = await fetch(`http://localhost:3000/api/livros/${id}`);
    const livro = await resp.json();
    imagemPath = livro.imagem;
  }

  const dados = {
    titulo: editTitulo,
    preco: editPreco,
    descricao: editDescricao,
    imagem: imagemPath,
    generos: editGeneros
  };

  await fetch(`http://localhost:3000/api/livros/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  carregarLivros();
  return;
}
});
    carregarLivros();
    carregarGeneros(); 
});

document.getElementById('voltarBtn')?.addEventListener('click', () => {
  window.location.href = '/admin/index.html';
});
