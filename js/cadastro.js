document.addEventListener("DOMContentLoaded", () => {
  // === CEP - Preenchimento automático ===
  const cepInput = document.getElementById("cep");
  if (cepInput) {
    cepInput.addEventListener("blur", async () => {
      const cep = cepInput.value.replace(/\D/g, "");
      if (cep.length === 8) {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();
        if (!dados.erro) {
          document.getElementById("rua").value = dados.logradouro;
          document.getElementById("bairro").value = dados.bairro;
          document.getElementById("cidade").value = dados.localidade;
          document.getElementById("estado").value = dados.uf;
        }
      }
    });
  }

  function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}

function senhaForte(senha) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
  return regex.test(senha);
}

  // === Cadastro ===
  const cadastroForm = document.getElementById("cadastroForm");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validarCPF(dados.cpf)) {
        alert("CPF inválido!");
        return;
        }
     if (!senhaForte(dados.senha)) {
        alert("A senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um símbolo.");
        return;
     }


      const dados = Object.fromEntries(new FormData(cadastroForm));
      try {
        const res = await fetch("http://localhost:3000/api/cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados)
        });

        if (res.ok) {
          alert("Cadastro realizado com sucesso!");
          window.location.href = "index.html";
        } else {
          const erro = await res.text();
          alert("Erro: " + erro);
        }
      } catch (err) {
        alert("Erro ao conectar com o servidor.");
      }
    });
  }

  // === Login ===
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(loginForm));
      try {
        const res = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados)
        });

        if (res.ok) {
          alert("Login bem-sucedido!");
          // redirecionar para página interna, ex: dashboard.html
        } else {
          const erro = await res.text();
          alert("Erro: " + erro);
        }
      } catch (err) {
        alert("Erro ao conectar com o servidor.");
      }
    });
  }

  // === Recuperar senha - enviar código ===
  const recuperarForm = document.getElementById("recuperarForm");
  let emailRecuperacao = "";
  let codigoGerado = "";

  if (recuperarForm) {
    recuperarForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(recuperarForm);
      emailRecuperacao = formData.get("email");

      try {
        const res = await fetch("http://localhost:3000/api/enviar-codigo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailRecuperacao })
        });

        if (res.ok) {
          const resposta = await res.json();
          codigoGerado = resposta.codigo;
          document.getElementById("codigoArea").style.display = "block";
          alert("Código enviado para o e-mail.");
        } else {
          alert("Erro ao enviar o código.");
        }
      } catch (err) {
        alert("Erro ao conectar com o servidor.");
      }
    });
  }

  // === Redefinir senha ===
  window.redefinirSenha = async () => {
    const codigoDigitado = document.getElementById("codigoInput").value;
    const novaSenha = document.getElementById("novaSenha").value;

    if (codigoDigitado !== codigoGerado) {
      alert("Código incorreto!");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacao, novaSenha })
      });

      if (res.ok) {
        alert("Senha redefinida com sucesso!");
        window.location.href = "index.html";
      } else {
        alert("Erro ao redefinir senha.");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    }
  };
});
