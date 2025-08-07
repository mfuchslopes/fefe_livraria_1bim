document.addEventListener('DOMContentLoaded', async () => {
    const usuario = JSON.parse(localStorage.getItem('usuario_id'));
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('dadosForm');
    const senhaArea = document.getElementById('senhaArea');
    const alterarSenhaBtn = document.getElementById('alterarSenhaBtn');
    const senhaNovaInput = document.getElementById('senhaNova');
    const senhaAntigaInput = document.getElementById('senhaAntiga');
    const senhaConfirmInput = document.getElementById('senhaConfirm');
    const senhaRequisitos = document.getElementById('senha-requisitos');
    const requisitos = {
        length: document.getElementById('senha-length'),
        maiuscula: document.getElementById('senha-maiuscula'),
        minuscula: document.getElementById('senha-minuscula'),
        numero: document.getElementById('senha-numero'),
        especial: document.getElementById('senha-especial')
    };


    // Salva os dados originais para comparação
    let dadosOriginais = {};
    const cancelarBtn = form.querySelector('[type="cancel"]');
   

    async function carregarDados() {
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`);
        const dados = await resp.json();
        form.nome.value = dados.nome;
        form.cpf.value = dados.cpf;
        form.email.value = dados.email;
        form.cep.value = dados.cep;
        dadosOriginais = { ...dados };
        esconderCancelar();
    }
    await carregarDados();

    // Função para mostrar/esconder botão cancelar
    function mostrarCancelar() {
        cancelarBtn.style.display = 'inline-block';
    }
    function esconderCancelar() {
        cancelarBtn.style.display = 'none';
    }

    // Monitora alterações nos campos
    ['nome', 'cpf', 'email', 'cep'].forEach(id => {
        form[id].addEventListener('input', () => {
            if (
                form.nome.value !== dadosOriginais.nome ||
                form.cpf.value !== dadosOriginais.cpf ||
                form.email.value !== dadosOriginais.email ||
                form.cep.value !== dadosOriginais.cep
            ) {
                mostrarCancelar();
            } else {
                esconderCancelar();
            }
        });
    });

    // Mostra área de alteração de senha
    alterarSenhaBtn.addEventListener('click', () => {
        mostrarCancelar();
        senhaArea.style.display = 'block';
        senhaRequisitos.style.display = 'block';
        senhaNovaInput.required = true;
        senhaAntigaInput.required = true;
        senhaConfirmInput.required = true;
    });

    // E logo após atualizar os dados, ao esconder a área:
    senhaArea.style.display = 'none';
    senhaRequisitos.style.display = 'none';
    senhaNovaInput.required = false;
    senhaAntigaInput.required = false;
    senhaConfirmInput.required = false;

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

    // Validação de email único
    async function emailExiste(email) {
        const resp = await fetch('http://localhost:3000/api/usuarios');
        const usuarios = await resp.json();
        return usuarios.some(u => u.email === email && u.id !== usuario.id);
    }

    const cpfInput = document.getElementById('cpf');
    const cepInput = document.getElementById('cep');

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


    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Valida email único
        if (await emailExiste(form.email.value)) {
            alert('Este email já está cadastrado por outro usuário.');
            return;
        }

        // Monta dados para atualização
        const dados = {
            nome: form.nome.value,
            cpf: form.cpf.value,
            email: form.email.value,
            cep: form.cep.value
        };

        // Se for alterar senha
        if (senhaArea.style.display === 'block') {
            if (!senhaAntigaInput.value || !senhaNovaInput.value || !senhaConfirmInput.value) {
                alert('Preencha todos os campos de senha.');
                return;
            }
            // Verifica senha antiga
            const resp = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: usuario.email, senha: senhaAntigaInput.value })
            });
            if (!resp.ok) {
                alert('Senha atual incorreta.');
                return;
            }
            // Valida requisitos da nova senha
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
            dados.senha = senha;
        }

        // Atualiza usuário
        const resp = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (resp.ok) {
            alert('Dados atualizados com sucesso!');
            senhaArea.style.display = 'none';
            senhaRequisitos.style.display = 'none';
            senhaNovaInput.value = '';
            senhaAntigaInput.value = '';
            senhaConfirmInput.value = '';
            window.location.href = 'index.html'; // Redireciona para a página principal
        } else {
            alert('Erro ao atualizar dados.');
        }
    });
});

document.getElementById('dadosForm').addEventListener('click', async (e) => {
  if (e.target.type === 'cancel') {
    e.preventDefault();
    const confirmar = window.confirm('Deseja realmente cancelar suas alterações?');
    if (confirmar) {
      window.location.href = 'index.html';
    }
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Você deseja realmente desconectar sua conta?')) {
        localStorage.removeItem('usuario_id');
        window.location.href = 'index.html';
    }
});