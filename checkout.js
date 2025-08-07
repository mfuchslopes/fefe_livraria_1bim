(async () => {

    // Função para obter o id do usuário logado ou criar um id anônimo persistente
    function getUsuarioAtual() {
      try {
        const usuario = JSON.parse(localStorage.getItem('usuario_id'));
        if (usuario && usuario.id) return usuario.id;
      } catch {
        const id = localStorage.getItem('usuario_id');
        if (id && !isNaN(id)) return Number(id); // caso seja um id simples
      }

      // Se não houver usuário logado, cria um id anônimo persistente
      let anon = localStorage.getItem('anon_id');
      if (!anon) {
        anon = 'anon-' + crypto.randomUUID();
        localStorage.setItem('anon_id', anon);
      }
      return anon;
    }

    // Busca o carrinho atualizado da API
    const carrinhoResp = await fetch(`/api/carrinho/${getUsuarioAtual()}`);
    const cart = (await carrinhoResp.json()).map(item => ({
      id: item.id,
      title: item.titulo,
      price: item.preco,
      qty: item.quantidade
    }));

    const checkoutBooks = document.getElementById('checkout-books');
    const totalEl = document.getElementById('checkout-total');
    checkoutBooks.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
      const div = document.createElement('div');
      div.textContent = `${item.title} - R$ ${item.price.toFixed(2)} x ${item.qty}`;
      checkoutBooks.appendChild(div);
      total += item.price * item.qty;
    });
    totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;


     //  Redireciona para a página de pagamento
     const btn = document.getElementById('proceed-to-payment');
     if (btn) {
       btn.addEventListener('click', () => {
        const usuario = localStorage.getItem('usuario_id');
        if (!usuario) {
          alert('Por favor, cadastre-se ou faça login antes de finalizar a compra!');
          window.location.href = 'cadastro.html?redirect=pagamento';
        } else {
          window.location.href = 'pagamento.html';
        }
      }); 
     }
  })();