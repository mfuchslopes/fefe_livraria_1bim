document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastroForm');
  const cpfInput = document.getElementById('cpf');
  const cepInput = document.getElementById('cep');
  const senhaInput = document.getElementById('senha');
  let confirmSenhaInput = document.getElementById('senhaConfirm');
  const senhaRequisitos = document.getElementById('senha-requisitos');

  const requisitos = {
    length: document.getElementById('senha-length'),
    maiuscula: document.getElementById('senha-maiuscula'),
    minuscula: document.getElementById('senha-minuscula'),
    numero: document.getElementById('senha-numero'),
    especial: document.getElementById('senha-especial')
  };
 
  function resetarRequisitosSenha() {
    senhaRequisitos.style.display = 'none';
    for (const item of Object.values(requisitos)) {
      item.className = 'pendente';
    }
  }

  cpfInput.addEventListener('input', () => {
    let value = cpfInput.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    cpfInput.value = value;
  });

  cepInput.addEventListener('input', () => {
    let value = cepInput.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    cepInput.value = value;
  });

  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    if (resto >= 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    if (resto >= 10) resto = 0;
    return resto === parseInt(cpf.charAt(10));
  }

  async function validarCEP(cep) {
    cep = cep.replace(/\D/g, '');
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
    return !data.erro;
  }

  senhaInput.addEventListener('focus', () => {
    senhaRequisitos.style.display = 'block';
  });

  senhaInput.addEventListener('input', () => {
    const senha = senhaInput.value;
    requisitos.length.className = senha.length >= 8 ? 'ok' : 'pendente';
    requisitos.maiuscula.className = /[A-Z]/.test(senha) ? 'ok' : 'pendente';
    requisitos.minuscula.className = /[a-z]/.test(senha) ? 'ok' : 'pendente';
    requisitos.numero.className = /\d/.test(senha) ? 'ok' : 'pendente';
    requisitos.especial.className = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(senha) ? 'ok' : 'pendente';
    
  });

  confirmSenhaInput.addEventListener('input', () => {
    if (senhaInput.value !== confirmSenhaInput.value) {
      confirmSenhaInput.setCustomValidity('As senhas não coincidem.');
    } else {
      confirmSenhaInput.setCustomValidity('');
    }

  });  

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = form.id.value;
    const senha = form.senha.value;
    const dados = {
      nome: form.nome.value,
      cpf: form.cpf.value,
      email: form.email.value,
      cep: form.cep.value,
    };

    if (senha) {
      dados.senha = senha;
    }

    const url = id ? `http://localhost:3000/api/usuarios/${id}` : 'http://localhost:3000/api/usuarios';
    const method = id ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    form.reset();
    form.id.value = '';
    form.nome.disabled = false;
    form.cpf.disabled = false;
    form.email.disabled = false;
    form.cep.disabled = false;
    senhaInput.style.display = 'inline-block';
    resetarRequisitosSenha();

    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');

    if (!id) { // Cadastro novo
      // Login automático
      const loginResp = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, senha: form.senha.value })
      });
      if (loginResp.ok) {

        const userData = await loginResp.json();
        const anonId = localStorage.getItem('anon_id');

        if (anonId) {
          const escolha = await Swal.fire({
            title: 'Qual carrinho deseja usar?',
            text: 'Você já tinha itens salvos como visitante.',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Juntar',
            denyButtonText: 'Usar o atual da conta',
            cancelButtonText: 'Usar o do visitante',
            confirmButtonColor: 'seagreen',
            denyButtonColor: 'midnightblue',
            cancelButtonColor: 'gray'
          });

          let estrategia;
          if (escolha.isConfirmed) estrategia = 'mesclar';
          else if (escolha.isDenied) estrategia = 'conta';
          else estrategia = 'anonimo';

          if (estrategia === 'anonimo') {
            // Não faz nada, apenas mantém anonId e redireciona
          } else {
            await fetch('/api/carrinho/migrar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                de: anonId,
                para: userData.id,
                estrategia: estrategia === 'conta' ? 'substituir' : 'mesclar'
              })
            });
            localStorage.removeItem('anon_id'); // agora o carrinho é do usuário
          }
        }

        localStorage.setItem('usuario_id', JSON.stringify({ id: userData.id, nome: userData.nome, tipo: userData.tipo }));

        if (redirect === 'pagamento') {
          window.location.href = 'pagamento.html';
          return;
        }
      }
    }
    window.location.href = 'index.html';// Redireciona para a página principal
  });
});