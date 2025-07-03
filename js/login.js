// login.js
const loginBtn = document.getElementById('login-button');
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    window.location.href = '/html/public/login.html';
  });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await resp.json();
    if (resp.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('tipo', data.tipo);
      localStorage.setItem('usuario_id', data.id); // Salva o id numérico do usuário logado
      // Redireciona conforme o tipo
      if (data.tipo === 'admin') {
        window.location.href = '/html/admin/index.html';
      } else {
        window.location.href = '/html/public/index.html';
      }
    } else {
      alert(data.erro || 'Usuário ou senha inválidos');
    }
  });
}
