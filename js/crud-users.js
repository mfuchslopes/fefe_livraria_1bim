// crud-users.js


async function carregarUsuarios() {
  const resp = await fetch('/api/usuarios');
  const usuarios = await resp.json();
  const tbody = document.querySelector('#tabela-usuarios tbody');
  tbody.innerHTML = '';
  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>
        <select data-id="${u.id}" class="tipo-select">
          <option value="cliente" ${u.tipo === 'cliente' ? 'selected' : ''}>Cliente</option>
          <option value="admin" ${u.tipo === 'admin' ? 'selected' : ''}>Administrador</option>
        </select>
      </td>
      <td></td>
    `;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.tipo-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      const id = this.getAttribute('data-id');
      const tipo = this.value;
      await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      });
      carregarUsuarios();
    });
  });
}

carregarUsuarios();

document.getElementById('form-novo-usuario').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const tipo = document.getElementById('tipo').value;
  const senha = document.getElementById('senha').value;
  const resp = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, tipo, senha })
  });
  const data = await resp.json();
  const msg = document.getElementById('mensagem-usuario');
  if (resp.ok) {
    msg.textContent = 'Usuário cadastrado!';
    this.reset();
    carregarUsuarios();
  } else {
    msg.textContent = data.erro || 'Erro ao cadastrar usuário';
  }
});
