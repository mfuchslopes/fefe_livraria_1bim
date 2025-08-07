document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const senha = form.senha.value;
    console.log('Tentando login:', email, senha);

    const resposta = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    });

    console.log('Status da resposta:', resposta.status);

    if (resposta.ok) {
            const data = await resposta.json();
            console.log('Login OK:', data);
             localStorage.setItem('usuario_id', JSON.stringify({ id: userData.id, nome: userData.nome, tipo: userData.tipo }));

            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect === 'pagamento') {
                window.location.href = './pagamento.html';
                return;
            }

            if (data.tipo === 'admin') {
                window.location.href = './admin/index.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert('Email ou senha incorretos.');
        }
    });
});