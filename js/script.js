// script.js adaptado para consumir a API do servidor com carrinho via banco de dados
let livros = [];
let generos = [];
let livroGeneros = [];


// Função para obter o id do usuário logado ou criar um id anônimo persistente
function getUsuarioAtual() {
  // Primeiro tenta pegar o id do usuário logado
  let id = localStorage.getItem('usuario_id');
  if (id) return id;
  // Se não houver usuário logado, cria um id anônimo persistente
  id = localStorage.getItem('anon_id');
  if (!id) {
    id = 'anon-' + crypto.randomUUID();
    localStorage.setItem('anon_id', id);
  }
  return id;
}

async function carregarDados() {
  try {
    const [livrosResp, generosResp, livroGenerosResp, carrinhoResp] = await Promise.all([
      fetch('/api/livros'),
      fetch('/api/generos'),
      fetch('/api/livroGenero'),
      fetch(`/api/carrinho/${getUsuarioAtual()}`)
    ]);

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
    mostrarLivrosDoGeneroAtual();

  } catch (erro) {
    console.error("Erro ao carregar dados da API:", erro);
  }
}

function popularGeneros() {
  const container = document.getElementById('genres-container');
  if (container) {
    generos.forEach(genero => {
      const div = document.createElement('div');
      div.classList.add('genre-line');
      div.setAttribute('data-genre', genero.slug);
      div.innerHTML = `
        <img src="${genero.imagem}" alt="${genero.nome}">
        <p>${genero.descricao}</p>
      `;
      div.addEventListener('click', () => {
        window.location.href = `genres/${genero.slug}.html`;
      });
      container.appendChild(div);
    });
  }
}

function mostrarLivrosDoGeneroAtual() {
  const url = window.location.pathname;
  const generoAtual = url.split("/").pop().replace(".html", "");
  console.log("Gênero atual da URL:", generoAtual);
  console.log("🔗 livroGeneros:", livroGeneros);

  const livrosRelacionados = livroGeneros
    .filter(lg => {
      const genero = generos.find(g => Number(g.id) === Number(lg.id_genero));
      if (!genero) {
        console.log("Gênero não encontrado para idgenero:", lg.id_genero);
        return false;
      }
      return genero.slug === generoAtual;
    })
    .map(lg => {
      const livro = livros.find(l => Number(l.id) === Number(lg.id_livro));
      if (!livro) {
        console.log("Livro não encontrado para idlivro:", lg.id_livro);
      }
      return livro;
    })
    .filter(Boolean);

  console.log("Livros relacionados encontrados:", livrosRelacionados);

  const cont = document.querySelector(".book-list");
  if (!cont) {
    console.log("Container .book-list não encontrado");
    return;
  }

  cont.innerHTML = ''; // Limpa livros anteriores

  if (livrosRelacionados.length > 0) {
    livrosRelacionados.forEach(livro => {
      const div = document.createElement("div");
      div.classList.add("book");
      div.innerHTML = `
        <div class="book-info">
          <strong>${livro.titulo}</strong> - <p class="preco"> R$${livro.preco.toFixed(2)}</p>
          <p>${livro.descricao}</p>
          <button onclick="adicionarAoCarrinho(${livro.id}, '${livro.titulo}', ${livro.preco})">Adicionar ao Carrinho</button>
          <button onclick="removerDoCarrinho('${livro.titulo}')">Remover do Carrinho</button>
        </div>
        <img src="../${livro.imagem}" alt="Capa de ${livro.titulo}" />
      `;
      cont.appendChild(div);
    });
  } else {
    console.log("Nenhum livro relacionado para mostrar.");
  }
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


if (!document.body.classList.contains('payment-theme')) {
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
      if (path.includes('/genres/')) {
        window.location.href = '../checkout.html';
      } else {
        window.location.href = 'checkout.html';
      }
  });
}

if (!document.body.classList.contains('payment-theme')) {
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
}

// Se for a página de checkout...
if (document.body.classList.contains('checkout-theme')) {
  (async () => {
    // Busca o carrinho atualizado da API
    const carrinhoResp = await fetch(`/api/carrinho/${getUsuarioAtual()}`);
    const cart = (await carrinhoResp.json()).map(item => ({
      id: item.id,
      title: item.titulo,
      price: item.preco,
      qty: item.quantidade
    }));

    const checkoutBooks = document.getElementById('checkout-books');
    const totalEl = document.getElementById('checkout-total');
    checkoutBooks.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
      const div = document.createElement('div');
      div.textContent = `${item.title} - R$ ${item.price.toFixed(2)} x ${item.qty}`;
      checkoutBooks.appendChild(div);
      total += item.price * item.qty;
    });
    totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;


     //  Redireciona para a página de pagamento
     const btn = document.getElementById('proceed-to-payment');
     if (btn) {
       btn.addEventListener('click', () => {
         window.location.href = 'pagamento.html';
       });
     }
  })();
}

// Se for a página de pagamento...
if (document.body.classList.contains('payment-theme')) {
  (async () => {
    // Busca o carrinho atualizado da API
    const carrinhoResp = await fetch(`/api/carrinho/${getUsuarioAtual()}`);
    const cart = (await carrinhoResp.json()).map(item => ({
      id: item.id,
      title: item.titulo,
      price: item.preco,
      qty: item.quantidade
    }));

    const totalEl = document.getElementById('payment-total');
    let total = 0;
    cart.forEach(item => {
      total += item.price * item.qty;
    });
    totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;

    const btn = document.getElementById('pix');
    if (btn) {
      btn.addEventListener('click', async () => {
        confettiAnimation();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await Swal.fire({
          title: 'Compra Finalizada!',
          text: 'Muito obrigada por comprar com a gente 💖',
          icon: 'success',
          confirmButtonText: 'Voltar pra livraria',
          confirmButtonColor: 'mediumseagreen',
          background: 'lavenderblush',
          color: 'midnightblue'
        });
        // Limpa o carrinho no banco de dados
        await fetch(`/api/carrinho/${getUsuarioAtual()}`, { method: 'DELETE' });
        window.location.href = 'index.html';
      });
    }
  })();
}

// Animação de confete (usando biblioteca externa)
function confettiAnimation() {
  const duration = 2000; // Duração da animação
  const end = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  const interval = setInterval(() => {
    const timeLeft = end - Date.now();
    if (timeLeft <= 0) return clearInterval(interval); // Encerra a animação após o tempo
    confetti({
      particleCount: 50, // Número de partículas por vez
      origin: { x: Math.random(), y: Math.random() - 0.2 }, // Posição aleatória
      ...defaults
    });
  }, 200);
}


async function pagarPIX() {
  // Busca o carrinho atualizado da API
  const carrinhoResp = await fetch(`/api/carrinho/${getUsuarioAtual()}`);
  const cart = (await carrinhoResp.json()).map(item => ({
    id: item.id,
    title: item.titulo,
    price: item.preco,
    qty: item.quantidade
  }));
  let total = 0;
  cart.forEach(item => {
    total += item.price * item.qty;
  });

  const valor = total.toFixed(2);
  const chavePix = '69563462904';
  const nomeRecebedor = 'Janaina Fuchs';
  const cidade = 'CAMPO MOURAO';

  // Função auxiliar para formatar campos
  function format(id, value) {
    return id + value.length.toString().padStart(2, '0') + value;
  }

  // Merchant Account Information (GUI, chave PIX)
  const merchantAccount = 
    format('00', 'BR.GOV.BCB.PIX') +
    format('01', chavePix);

  // Payload base
  const payload =
    format('00', '01') + // Payload Format Indicator
    format('26', merchantAccount) + // Merchant Account Info
    format('52', '0000') + // Merchant Category Code
    format('53', '986') + // BRL
    format('54', valor) + // Valor
    format('58', 'BR') + // País
    format('59', nomeRecebedor) + // Nome
    format('60', cidade) + // Cidade
    format('62', format('05', '***')) + // Txid
    '6304'; // Checksum CRC16

  // Cálculo CRC16-CCITT
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  const payloadFinal = payload + crc16(payload);
  console.log(payloadFinal); // Para teste

  const qrCodeDiv = document.getElementById('qrcode');
  qrCodeDiv.innerHTML = '';
  document.getElementById('pix-section').classList.remove('hidden');

  new QRCode(qrCodeDiv, {
    text: payloadFinal,
    width: 250,
    height: 250,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M // M = medium (melhor para compatibilidade)
  });

  const info = document.createElement('div');
  info.className = 'nome-valor';
  info.innerHTML = `
    <p><strong>Nome:</strong> ${nomeRecebedor}</p>
    <p><strong>CPF (PIX):</strong> ${chavePix}</p>
    <p><strong>Valor:</strong> R$ ${valor}</p>
  `;
  qrCodeDiv.appendChild(info);
}


// Só carrega os dados completos se não estiver na tela de pagamento
window.addEventListener('pageshow', (event) => {
  if (!document.body.classList.contains('payment-theme') && !document.body.classList.contains('checkout-theme')) {
    carregarDados();
  }
});

// Overlay de informações do usuário logado
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function senhaForte(s) {
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
}

async function buscarEnderecoPorCEP(cep) {
  cep = cep.replace(/\D/g, '');
  if (cep.length !== 8) return '';
  const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await resp.json();
  if (!data.erro) {
    return `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
  }
  return '';
}

function mostrarOverlayUsuario(usuario) {
  let overlay = document.getElementById('user-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'user-overlay';
    overlay.className = 'user-overlay';
    overlay.innerHTML = `
      <div class="user-content">
        <h2>Minha Conta</h2>
        <form id="form-user-edit">
          <label>Nome:<input type="text" id="user-nome" required></label>
          <label>Email:<input type="email" id="user-email" required disabled></label>
          <label>CPF:<input type="text" id="user-cpf" required></label>
          <label>CEP:<input type="text" id="user-cep" required></label>
          <label>Endereço:<input type="text" id="user-endereco" required></label>
          <label>Nova Senha:<input type="password" id="user-senha"></label>
          <label>Confirmar Senha:<input type="password" id="user-senha2"></label>
          <button type="submit">Salvar Alterações</button>
          <button type="button" id="fechar-user-overlay">Fechar</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  document.getElementById('user-nome').value = usuario.nome;
  document.getElementById('user-email').value = usuario.email;
  document.getElementById('user-cpf').value = usuario.cpf;
  document.getElementById('user-cep').value = usuario.cep;
  document.getElementById('user-endereco').value = usuario.endereco;

  document.getElementById('user-cep').addEventListener('blur', async function() {
    const endereco = await buscarEnderecoPorCEP(this.value);
    if (endereco) document.getElementById('user-endereco').value = endereco;
  });

  document.getElementById('fechar-user-overlay').onclick = () => overlay.classList.add('hidden');

  document.getElementById('form-user-edit').onsubmit = async function(e) {
    e.preventDefault();
    const nome = document.getElementById('user-nome').value;
    const cpf = document.getElementById('user-cpf').value;
    const cep = document.getElementById('user-cep').value;
    const endereco = document.getElementById('user-endereco').value;
    const senha = document.getElementById('user-senha').value;
    const senha2 = document.getElementById('user-senha2').value;
    if (!validarCPF(cpf)) {
      Swal.fire('CPF inválido!'); return;
    }
    if (senha && !senhaForte(senha)) {
      Swal.fire('A senha deve ter pelo menos 8 caracteres, maiúscula, minúscula, número e símbolo!'); return;
    }
    if (senha && senha !== senha2) {
      Swal.fire('As senhas não coincidem!'); return;
    }
    if (cep.length !== 8) {
      Swal.fire('CEP inválido!'); return;
    }
    // Atualiza usuário via API
    const id = getUsuarioAtual();
    const body = { id, nome, cpf, cep, endereco };
    if (senha) body.senha = senha;
    const resp = await fetch('/api/usuario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (resp.ok) {
      Swal.fire('Dados atualizados com sucesso!');
      overlay.classList.add('hidden');
    } else {
      Swal.fire(data.erro || 'Erro ao atualizar dados');
    }
  };
}

// Evento do botão login para mostrar overlay se logado
function ativarOverlayUsuario() {
  const loginBtn2 = document.getElementById('login-button');
  if (loginBtn2 && localStorage.getItem('usuario_id')) {
    loginBtn2.onclick = async () => {
      const id = getUsuarioAtual();
      const resp = await fetch(`/api/usuario/${id}`);
      if (resp.ok) {
        const usuario = await resp.json();
        mostrarOverlayUsuario(usuario);
      } else {
        Swal.fire('Erro ao buscar dados do usuário!');
      }
    };
  }
}

// Ativa o overlay ao carregar a página e também após navegação SPA
window.addEventListener('DOMContentLoaded', ativarOverlayUsuario);
window.addEventListener('pageshow', ativarOverlayUsuario);

// Fecha overlay do usuário ao clicar fora do conteúdo
window.addEventListener('mousedown', function(e) {
  const overlay = document.getElementById('user-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    const content = overlay.querySelector('.cart-content, .user-content');
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  }
});

const crudLivrosBtn = document.getElementById('crud-livros');
if (crudLivrosBtn) {
  crudLivrosBtn.addEventListener('click', () => {
    window.location.href = '/html/admin/crud-livros.html';
  });
}

// login.js
const crudUsersBtn = document.getElementById('crud-users');
if (crudUsersBtn) {
  crudUsersBtn.addEventListener('click', () => {
    window.location.href = '/html/admin/crud-users.html';
  });
}
