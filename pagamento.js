
function getUsuarioAtualObj() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_id'));
    if (usuario && typeof usuario.id === 'number') {
      return usuario;
    }
  } catch {}
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const usuario = getUsuarioAtualObj();

  if (!usuario) {
    // Redireciona para login, exigindo login para pagamento
    window.location.href = 'login.html?redirect=pagamento';
    return;
  }

  const h1 = document.createElement('h1');
  h1.style.marginTop = '2rem';
  h1.style.textAlign = 'center';
  h1.textContent = `Obrigada por fazer sua compra conosco, ${usuario.nome}!!`;
  document.body.prepend(h1);
});

(async () => {

        document.addEventListener("DOMContentLoaded", function () {
        const pixBtn = document.getElementById("pix-button");
        const cardBtn = document.getElementById("card-button");

        const pixSection = document.getElementById("pix-section");
        const cardSection = document.getElementById("card-section");

        pixBtn.addEventListener("click", () => {
            pixSection.classList.remove("hidden");
            cardSection.classList.add("hidden");
        });

        cardBtn.addEventListener("click", () => {
            cardSection.classList.remove("hidden");
            pixSection.classList.add("hidden");
        });
        });

        document.addEventListener("DOMContentLoaded", () => {
    const numeroInput = document.getElementById("card-number");
    const validadeInput = document.getElementById("card-expiry");
    const cvcInput = document.getElementById("card-cvc");
    const botaoCartao = document.getElementById("cartao");

    // Máscara para número do cartão
    numeroInput.addEventListener("input", () => {
        let valor = numeroInput.value.replace(/\D/g, "").substring(0, 16);
        valor = valor.replace(/(\d{4})(?=\d)/g, "$1 ");
        numeroInput.value = valor;
    });

    // Máscara para validade
    validadeInput.addEventListener("input", () => {
        let valor = validadeInput.value.replace(/\D/g, "").substring(0, 4);
        if (valor.length >= 3) {
        valor = valor.replace(/(\d{2})(\d{1,2})/, "$1/$2");
        } else if (valor.length >= 1) {
        valor = valor.replace(/(\d{1,2})/, "$1");
        }
        validadeInput.value = valor;
    });

    // Máscara para CVC
    cvcInput.addEventListener("input", () => {
        cvcInput.value = cvcInput.value.replace(/\D/g, "").substring(0, 4);
    });

    // Validação do formulário
    botaoCartao.addEventListener("click", async (e) => {
        e.preventDefault();

        const numero = numeroInput.value.trim();
        const validade = validadeInput.value.trim();
        const cvc = cvcInput.value.trim();

        const bandeira = detectarBandeira(numero);
        console.log("Bandeira detectada:", bandeira || "desconhecida");

        if (!validarNumeroCartao(numero)) {
        Swal.fire("Erro", "Número do cartão inválido!", "error");
        return;
        }

        if (!validarValidade(validade)) {
        Swal.fire("Erro", "Data de validade inválida ou expirada!", "error");
        return;
        }

        // Validação do CVC com base na bandeira
        if (bandeira === "amex") {
        if (!/^\d{4}$/.test(cvc)) {
            Swal.fire("Erro", "American Express exige CVC de 4 dígitos!", "error");
            return;
        }
        } else {
        if (!/^\d{3}$/.test(cvc)) {
            Swal.fire("Erro", "CVC deve ter 3 dígitos!", "error");
            return;
        }
        }
        confettiAnimation(); // Animação de confete
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos antes de mostrar o alerta
        await Swal.fire({
            title: 'Compra Finalizada!',
            text: 'Muito obrigada por comprar com a gente 💖',
            icon: 'success',
            confirmButtonText: 'Voltar pra livraria',
            confirmButtonColor: 'mediumseagreen', // Nome de cor CSS
            background: 'lavenderblush',          // Cor de fundo
            color: 'midnightblue'                 // Cor do texto
        });
        await fetch(`/api/carrinho/${usuarioId}`, { method: 'DELETE' });
        window.location.href = 'index.html';
         // Redireciona para a página inicial
        });
    });

    // Algoritmo de Luhn
    function validarNumeroCartao(numero) {
    const apenasDigitos = numero.replace(/\D/g, "");
    if (apenasDigitos.length < 13 || apenasDigitos.length > 19) return false;

    let soma = 0;
    let deveDobrar = false;
    for (let i = apenasDigitos.length - 1; i >= 0; i--) {
        let digito = parseInt(apenasDigitos.charAt(i));
        if (deveDobrar) {
        digito *= 2;
        if (digito > 9) digito -= 9;
        }
        soma += digito;
        deveDobrar = !deveDobrar;
    }
    return soma % 10 === 0;
    }

    // Validade
    function validarValidade(data) {
    const match = data.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const mes = parseInt(match[1], 10);
    const ano = parseInt("20" + match[2], 10);

    if (mes < 1 || mes > 12) return false;

    const agora = new Date();
    const vencimento = new Date(ano, mes);
    return vencimento > agora;
    }

    // Detecta a bandeira do cartão
    function detectarBandeira(numero) {
    const n = numero.replace(/\D/g, "");

    if (/^4\d{12}(\d{3})?$/.test(n)) return "visa";
    if (/^5[1-5]\d{14}$/.test(n)) return "mastercard";
    if (/^3[47]\d{13}$/.test(n)) return "amex";
    if (/^6(?:011|5\d{2})\d{12}$/.test(n)) return "discover";
    if (/^35\d{14}$/.test(n)) return "jcb";
    if (/^(636368|504175|438935|451416|636297)\d+$/.test(n)) return "elo";

    return null; // não reconhecida
    }


    // Busca o carrinho atualizado da API
    const usuario = getUsuarioAtualObj();
    if (!usuario) return; // proteção extra, caso seja usado fora do DOMContentLoaded
    const usuarioId = usuario.id;
    console.log(usuarioId);
    const carrinhoResp = await fetch(`/api/carrinho/${usuarioId}`);
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
        await fetch(`/api/carrinho/${usuarioId}`, { method: 'DELETE' });
        window.location.href = 'index.html';
      });
    }
  })();


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
  const usuario = getUsuarioAtualObj();
  if (!usuario) return; // proteção extra, caso seja usado fora do DOMContentLoaded
  const usuarioId = usuario.id;
  const carrinhoResp = await fetch(`/api/carrinho/${usuarioId}`);
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
