document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formGenero');
  const lista = document.getElementById('listaGeneros');

  async function carregarGeneros() {
    const resp = await fetch('http://localhost:3000/api/generos');
    const generos = await resp.json();
    lista.innerHTML = '';
    generos.forEach(genero => {
        const li = document.createElement('li');
        li.setAttribute('data-id', genero.id);

        li.innerHTML = `
            <div class="livro-conteudo">
            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                <img src="${genero.imagem}" alt="Imagem do gênero" class="imagem">
                <div>
                <strong class="titulo">${genero.nome}</strong><br>
                <span class="slug">${genero.slug}</span><br>
                <p class="descricao">${genero.descricao || ''}</p>
                </div>
            </div>
            <div class="botoes">
                <button data-id="${genero.id}" class="editar">Editar</button>
                <button data-id="${genero.id}" class="excluir">Excluir</button>
            </div>
            </div>
        `;
        lista.appendChild(li);
    });

  }

   form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.id.value;
        const nome = form.nome.value.trim();
        const descricao = form.descricao.value.trim();
        const slug = form.slug.value.trim();
        const fileInput = form.imagem;
        const file = fileInput.files[0];
        let imagemPath = "";

        if (!nome || !slug) {
        alert('Preencha o nome e o slug.');
        return;
        }

        if (file) {
        const formData = new FormData();
        formData.append('imagem', file);
        const resp = await fetch('http://localhost:3000/api/upload-imagem', {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        imagemPath = data.caminho;
        } else if (id) {
        // Se está editando e não mudou a imagem, mantém a atual
        const resp = await fetch(`http://localhost:3000/api/generos/${id}`);
        const genero = await resp.json();
        imagemPath = genero.imagem;
        }

        const dados = { nome, descricao, imagem: imagemPath, slug };

        if (id) {
        await fetch(`http://localhost:3000/api/generos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        } else {
        await fetch('http://localhost:3000/api/generos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        }
        form.reset();
        carregarGeneros();
    });

    lista.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        const id = li?.dataset.id;

        // Excluir
        if (e.target.classList.contains('excluir')) {
        if (confirm('Deseja realmente excluir este gênero?')) {
            await fetch(`http://localhost:3000/api/generos/${id}`, { method: 'DELETE' });
            carregarGeneros();
        }
        return;
        }

        // Editar
        if (e.target.classList.contains('editar')) {
        const resp = await fetch(`http://localhost:3000/api/generos/${id}`);
        const genero = await resp.json();
        form.id.value = genero.id;
        form.nome.value = genero.nome;
        form.descricao.value = genero.descricao || '';
        form.slug.value = genero.slug || '';
        form.imagem.value = '';
        form.nome.focus();
        return;
        }
    });

    carregarGeneros();
    });

document.getElementById('voltarBtn')?.addEventListener('click', () => {
  window.location.href = '/admin/index.html';
});