document.addEventListener('DOMContentLoaded', () => {
  const codInput = document.getElementById('cod');
  const senhaArea = document.getElementById('senhaArea');
  const senhaNovaInput = document.getElementById('senhaNova');
  const senhaConfirmInput = document.getElementById('senhaConfirm');
  const senhaRequisitos = document.getElementById('senha-requisitos');
  const requisitos = {
    length: document.getElementById('senha-length'),
    maiuscula: document.getElementById('senha-maiuscula'),
    minuscula: document.getElementById('senha-minuscula'),
    numero: document.getElementById('senha-numero'),
    especial: document.getElementById('senha-especial')
  };
  const verificarBtn = document.getElementById('verificarBtn');
  const alterarBtn = document.getElementById('alterarBtn');

  let email = '';
  let codigoGerado = '';

  // Solicita email do usuário
  async function solicitarCodigo() {
    if (!email) {
      email = prompt('Digite seu email cadastrado:');
      if (!email) {
        alert('Email é obrigatório!');
        window.location.href = 'login.html';
        return;
      }
    }
    const resp = await fetch('http://localhost:3000/api/usuarios/solicitarCodigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!resp.ok) {
      alert('Email não encontrado!');
      window.location.href = 'login.html';
      return;
    }
    const data = await resp.json();
    codigoGerado = data.codigo;
    alert('Seu código de confirmação é: ' + codigoGerado);
    codInput.value = '';
    senhaArea.style.display = 'none';
    senhaRequisitos.style.display = 'none';
    alterarBtn.style.display = 'none';
    verificarBtn.style.display = 'inline-block';
  }

  // Ao carregar, solicita o código
  solicitarCodigo();

  // Verifica o código quando clicar no botão
  verificarBtn.addEventListener('click', async () => {
    if (codInput.value === codigoGerado) {
      senhaArea.style.display = 'block';
      senhaRequisitos.style.display = 'block';
      verificarBtn.style.display = 'none';
      alterarBtn.style.display = 'inline-block';
      codInput.style.display = 'none'; //
    } else {
      alert('Código incorreto!');
      await solicitarCodigo();
    }
  });

  // Validação dos requisitos da senha
  senhaNovaInput.addEventListener('input', () => {
    const senha = senhaNovaInput.value;
    requisitos.length.className = senha.length >= 8 ? 'ok' : 'pendente';
    requisitos.maiuscula.className = /[A-Z]/.test(senha) ? 'ok' : 'pendente';
    requisitos.minuscula.className = /[a-z]/.test(senha) ? 'ok' : 'pendente';
    requisitos.numero.className = /\d/.test(senha) ? 'ok' : 'pendente';
    requisitos.especial.className = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(senha) ? 'ok' : 'pendente';
  });

  senhaConfirmInput.addEventListener('input', () => {
    if (senhaNovaInput.value !== senhaConfirmInput.value) {
      senhaConfirmInput.setCustomValidity('As senhas não coincidem.');
    } else {
      senhaConfirmInput.setCustomValidity('');
    }
  });

  // Troca a senha ao submeter o formulário
  document.getElementById('recuperarForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (alterarBtn.style.display === 'none') return; // Só permite se botão estiver visível

    const senha = senhaNovaInput.value;
    if (
      senha.length < 8 ||
      !/[A-Z]/.test(senha) ||
      !/[a-z]/.test(senha) ||
      !/\d/.test(senha) ||
      !/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(senha)
    ) {
      alert('A nova senha não atende aos requisitos.');
      return;
    }
    if (senha !== senhaConfirmInput.value) {
      alert('As senhas não coincidem.');
      return;
    }

    // Envia para a API
    const resp = await fetch('http://localhost:3000/api/usuarios/recuperarSenha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo: codigoGerado, senha })
    });
    if (resp.ok) {
      alert('Senha alterada com sucesso!');
      window.location.href = 'login.html';
    } else {
      alert('Erro ao alterar senha.');
    }
  });
});