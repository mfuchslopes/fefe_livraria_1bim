// cadastro.js

document.getElementById('cadastro-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const cpf = document.getElementById('cpf').value;
  const cep = document.getElementById('cep').value;
  const endereco = document.getElementById('endereco').value;
  const senha = document.getElementById('senha').value;
  const senha2 = document.getElementById('senha2').value;
  if (senha !== senha2) {
    alert('As senhas não coincidem!');
    return;
  }
  // Validação de CPF, CEP, força de senha pode ser feita aqui
  const resp = await fetch('/api/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, cpf, cep, endereco, senha })
  });
  const data = await resp.json();
  if (resp.ok) {
    alert('Cadastro realizado com sucesso! Faça login.');
    window.location.href = 'login.html';
  } else {
    alert(data.erro || 'Erro ao cadastrar');
  }
});

// Preencher endereço pelo CEP
document.getElementById('cep').addEventListener('blur', async function() {
  const cep = this.value.replace(/\D/g, '');
  if (cep.length === 8) {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
    if (!data.erro) {
      document.getElementById('endereco').value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
    } else {
      alert('CEP não encontrado!');
    }
  }
});
