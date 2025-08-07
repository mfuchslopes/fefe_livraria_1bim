document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formUsuario');
  const lista = document.getElementById('listaUsuarios');
  const cpfInput = document.getElementById('cpf');
  const cepInput = document.getElementById('cep');
  const senhaInput = document.getElementById('senha');
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

  async function carregarUsuarios() {
    const resp = await fetch('http://localhost:3000/api/usuarios');
    const usuarios = await resp.json();
    lista.innerHTML = '';

    usuarios.forEach(user => {
      const li = document.createElement('li');
      li.dataset.id = user.id;
      li.classList.add('usuario-item');

      li.innerHTML = `
        <div class="usuario-info">
          <strong>${user.nome}</strong> (${user.email}) - <span class="tipo">${user.tipo}</span><br>
          CPF: ${user.cpf} | CEP: ${user.cep}<br>
        </div>
        <div class="botoes">
          <button class="editar" data-id="${user.id}">Editar</button>
          <button class="excluir" data-id="${user.id}">Excluir</button>
        </div>
      `;

      lista.appendChild(li);
    });

    resetarRequisitosSenha();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = form.id.value;
    const senha = form.senha.value;
    const dados = {
      nome: form.nome.value,
      cpf: form.cpf.value,
      email: form.email.value,
      cep: form.cep.value,
      tipo: form.tipo.value
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
    carregarUsuarios();
  });

  lista.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('excluir')) {
      await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' });
      carregarUsuarios();
    }

    if (e.target.classList.contains('editar')) {
      const li = e.target.closest('li');
      const resp = await fetch(`http://localhost:3000/api/usuarios/${id}`);
      const user = await resp.json();

      const tipoSpan = li.querySelector('.tipo');
      const botoesDiv = li.querySelector('.botoes');

      tipoSpan.outerHTML = `
        <select id="tipo-inline">
          <option value="cliente" ${user.tipo === 'cliente' ? 'selected' : ''}>Cliente</option>
          <option value="admin" ${user.tipo === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      `;

      botoesDiv.innerHTML = `
        <button class="salvar" data-id="${user.id}">Salvar</button>
        <button class="cancelar" data-id="${user.id}">Cancelar</button>
      `;

      form.id.value = user.id;
      form.nome.value = user.nome;
      form.nome.disabled = true;
      form.cpf.value = user.cpf;
      form.cpf.disabled = true;
      form.email.value = user.email;
      form.email.disabled = true;
      form.cep.value = user.cep;
      form.cep.disabled = true;
      form.tipo.value = user.tipo;
      senhaInput.disabled = true;
      senhaInput.value = '';
      senhaInput.style.display = 'inline-block';
      senhaRequisitos.style.display = 'none';
    }

    if (e.target.classList.contains('salvar')) {
      const li = e.target.closest('li');
      const id = li.dataset.id;
      const tipoSelect = li.querySelector('#tipo-inline');
      const novoTipo = tipoSelect.value;

      const dados = {
        nome: form.nome.value,
        cpf: form.cpf.value,
        email: form.email.value,
        cep: form.cep.value,
        tipo: novoTipo
      };

      if (form.senha.value) {
        dados.senha = form.senha.value;
      }

      await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: 'PUT',
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
      carregarUsuarios();
    }

    if (e.target.classList.contains('cancelar')) {
      form.reset();
      form.id.value = '';
      form.nome.disabled = false;
      form.cpf.disabled = false;
      form.email.disabled = false;
      form.cep.disabled = false;
      senhaInput.style.display = 'inline-block';
      resetarRequisitosSenha();
      carregarUsuarios();
    }
  });

  carregarUsuarios();
});

document.getElementById('voltarBtn')?.addEventListener('click', () => {
  window.location.href = '/admin/index.html';
});