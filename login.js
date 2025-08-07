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
            const userData = await resposta.json();
            console.log('Login OK:', userData);

            
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

            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect === 'pagamento') {
                window.location.href = './pagamento.html';
                return;
            }

            if (userData.tipo === 'admin') {
                window.location.href = './admin/index.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert('Email ou senha incorretos.');
        }
    });
});