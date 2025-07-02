// esqueci-senha.js

document.getElementById('esqueci-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const resp = await fetch('/api/esqueci-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await resp.json();
  if (resp.ok) {
    alert('Código enviado para seu e-mail!');
    document.getElementById('codigo-section').style.display = 'block';
  } else {
    alert(data.erro || 'Erro ao enviar código');
  }
});

document.getElementById('resetar-btn').addEventListener('click', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const codigo = document.getElementById('codigo').value;
  const senha = document.getElementById('nova-senha').value;
  const resp = await fetch('/api/resetar-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, codigo, senha })
  });
  const data = await resp.json();
  if (resp.ok) {
    alert('Senha redefinida! Faça login.');
    window.location.href = 'login.html';
  } else {
    alert(data.erro || 'Erro ao redefinir senha');
  }
});
