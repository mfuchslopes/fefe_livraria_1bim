// script.js adaptado para consumir a API do servidor com carrinho via banco de dados
let livros = [];
let generos = [];
let livroGeneros = [];


// Função para obter o id do usuário logado ou criar um id anônimo persistente
function getUsuarioAtual() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_id'));
    if (usuario && usuario.id) return usuario.id;
  } catch {
    const id = localStorage.getItem('usuario_id');
    if (id && !isNaN(id)) return Number(id); // caso seja um id simples
  }

  // Se não houver usuário logado, cria um id anônimo persistente
  let anon = localStorage.getItem('anon_id');
  if (!anon) {
    anon = 'anon-' + crypto.randomUUID();
    localStorage.setItem('anon_id', anon);
  }
  return anon;
}


async function carregarDados() {
  try {
    const [livrosResp, generosResp, livroGenerosResp, carrinhoResp] = await Promise.all([
      fetch('/api/livros'),
      fetch('/api/generos'),
      fetch('/api/livroGenero'),
      fetch(`/api/carrinho/${getUsuarioAtual()}`)
    ]);

    livros = [];
    generos = [];
    livroGeneros = [];

    livros = await livrosResp.json();
    generos = await generosResp.json();
    livroGeneros = await livroGenerosResp.json();
    cartItems = (await carrinhoResp.json()).map(item => ({
      id: item.id,
      title: item.titulo,
      price: item.preco,
      qty: item.quantidade
    }));

    updateCartUI();
    popularGeneros();

  } catch (erro) {
    console.error("Erro ao carregar dados da API:", erro);
  }
}

function popularGeneros() {
  const container = document.getElementById('genres-container');
  if (!container) return;

  generos.forEach(genero => {
    const div = document.createElement('div');
    div.classList.add('genre-line');
    div.setAttribute('data-genre', genero.slug);
    div.innerHTML = `
      <img src="${genero.imagem}" alt="${genero.nome}">
      <div class="genre-text">
        <h3>${genero.nome}</h3>
        <p>${genero.descricao}</p>
      </div>
      <section class="book-list book-list-${genero.slug} hidden"></section>
    `;

    div.addEventListener('click', () => {

      if (event.target !== div) return;

      const cont = div.querySelector(`.book-list-${genero.slug}`);
      const jaVisivel = !cont.classList.contains('hidden');

      // Fecha todos os gêneros abertos (limpa e oculta)
      document.querySelectorAll('.book-list').forEach(sec => {
        sec.classList.add('hidden');
        sec.innerHTML = '';
      });
      document.querySelectorAll('.genre-line').forEach(g => g.classList.remove('ativo'));

      if (jaVisivel) {
        // Se já está visível, apenas fecha e remove 'ativo'
        cont.classList.add('hidden');
        div.classList.remove('ativo');
        return;
      }

      div.classList.add('ativo');

      // Busca os livros do gênero
      const livrosRelacionados = livroGeneros
        .filter(lg => Number(lg.id_genero) === Number(genero.id))
        .map(lg => livros.find(l => Number(l.id) === Number(lg.id_livro)))
        .filter(Boolean);

      if (livrosRelacionados.length > 0) {
        livrosRelacionados.forEach(livro => {
          const livroDiv = document.createElement('div');
          livroDiv.classList.add('book');
          livroDiv.innerHTML = `
            <img src="../${livro.imagem}" alt="Capa de ${livro.titulo}" />
            <div class="book-info">
              <strong>${livro.titulo}</strong>
              <p class="preco">R$${livro.preco.toFixed(2)}</p>
              <p>${livro.descricao}</p>
              <button onclick="adicionarAoCarrinho(${livro.id}, '${livro.titulo}', ${livro.preco})">Adicionar ao Carrinho</button>
              <button onclick="removerDoCarrinho('${livro.titulo}')">Remover do Carrinho</button>
            </div>
          `;
          cont.appendChild(livroDiv);
        });
      } else {
        cont.innerHTML = "<p style='text-align:center;'>Nenhum livro disponível neste gênero.</p>";
      }

      cont.classList.remove('hidden');

     const yOffset = -window.innerHeight * 0.166; // 16.6vh como altura do header
    const y = div.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    });

    container.appendChild(div);
  });
}


let cartItems = [];
let total = 0;

const cartButton = document.getElementById('cart-button');
const cartOverlay = document.getElementById('cart-overlay');
if (!document.body.classList.contains('payment-theme')) {
  cartButton?.addEventListener('click', () => {
    cartOverlay.classList.toggle('hidden');
  });
}

// Fecha overlay do carrinho ao clicar fora do conteúdo
if (cartOverlay) {
  cartOverlay.addEventListener('mousedown', function(e) {
    if (e.target === cartOverlay) {
      cartOverlay.classList.add('hidden');
    }
  });
}

function updateCartUI() {
  const ul = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  ul.innerHTML = '';
  total = 0;

  cartItems.forEach(item => {
    total += item.price * item.qty;
    const li = document.createElement('li');
    li.innerText = `${item.title} ${item.qty} - R$ ${(item.price * item.qty).toFixed(2)}`;
    ul.appendChild(li);
  });

  totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}

async function adicionarAoCarrinho(idLivro, titulo, preco) {
  const itemExistente = cartItems.find(item => item.title === titulo);
  if (itemExistente) {
    itemExistente.qty++;
  } else {
    cartItems.push({ id: idLivro, title: titulo, price: preco, qty: 1 });
  }
  await fetch('/api/carrinho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_usuario: getUsuarioAtual(), id_livro: idLivro, quantidade: 1 })
  });
  updateCartUI();
}

async function removerDoCarrinho(titulo) {
  try {
    const resposta = await fetch('/api/carrinho', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_usuario: getUsuarioAtual(),
        titulo,
        removerApenasUm: true
      })
    });

    if (!resposta.ok) {
      console.error('Erro ao remover item:', await resposta.json());
      return;
    }

    // Usa o carrinho atualizado retornado pelo servidor
    const novosItens = await resposta.json();
    cartItems = novosItens.map(item => ({
      id: item.id,
      title: item.titulo,
      price: item.preco,
      qty: item.quantidade
    }));
    updateCartUI();

  } catch (error) {
    console.error('Erro ao se comunicar com o servidor:', error);
  }
}

  document.getElementById('login-button')?.addEventListener('click', () => {
    const usuario = localStorage.getItem('usuario_id');
    if (usuario) {
      window.location.href = '/dados.html';
    } else {
      window.location.href = '/login.html';
    }
  });

  document.getElementById('checkout-button')?.addEventListener('click', () => {
    if (total === 0) {
      Swal.fire({
        title: 'Carrinho vazio!',
        text: 'Você precisa adicionar pelo menos um livro antes de finalizar o pedido 📚',
        icon: 'info',
        confirmButtonText: 'Entendi',
        confirmButtonColor: 'mediumseagreen',
        background: 'lavenderblush',
        color: 'midnightblue'
      });
      return;
    } 

    // Caminho dinâmico para checkout.html
      let path = window.location.pathname;
      if (path.includes('/admin/')) {
        window.location.href = '../checkout.html';
      } else {
        window.location.href = 'checkout.html';
      }
  });

  document.getElementById('clear-cart-button')?.addEventListener('click', async () => {
    if (cartItems.length === 0) {
      Swal.fire({
        title: 'Ops! Carrinho já está vazio!',
        text: 'Não há nada para remover por aqui 🧺',
        icon: 'info',
        confirmButtonText: 'Ok!',
        confirmButtonColor: 'mediumseagreen',
        background: 'lavenderblush',
        color: 'midnightblue'
      });
      return;
    }
    const result = await Swal.fire({
      title: 'Esvaziar carrinho?',
      text: 'Tem certeza que deseja remover todos os itens?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, esvaziar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'crimson',
      cancelButtonColor: 'mediumseagreen',
      background: 'lavenderblush',
      color: 'midnightblue'
    });
    if (result.isConfirmed) {
      cartItems = [];
      await fetch(`/api/carrinho/${getUsuarioAtual()}`, { method: 'DELETE' });
      updateCartUI();
      Swal.fire({
        title: 'Carrinho limpo!',
        text: 'Você removeu todos os itens do carrinho.',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: 'mediumseagreen',
        background: 'lavenderblush',
        color: 'midnightblue'
      });
    }
  });

window.addEventListener('DOMContentLoaded', (event) => {
    carregarDados();
});

const crudLivrosBtn = document.getElementById('crud-livros');
if (crudLivrosBtn) {
  crudLivrosBtn.addEventListener('click', () => {
    window.location.href = '/admin/crud-livros.html';
  });
}

const crudUsersBtn = document.getElementById('crud-users');
if (crudUsersBtn) {
  crudUsersBtn.addEventListener('click', () => {
    window.location.href = '/admin/crud-users.html';
  });
}

const crudGenresBtn = document.getElementById('crud-genres');
if (crudGenresBtn) {
  crudGenresBtn.addEventListener('click', () => {
    window.location.href = '/admin/crud-genre.html';
  });
}

