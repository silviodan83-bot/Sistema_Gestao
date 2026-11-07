import React, { useState, useEffect } from 'react';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY } from './config';
import './App.css';

// Inicializa cliente a partir do CDN injetado no index.html
const apiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY;
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, apiKey) : null;

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('clientes');
  const [mensagem, setMensagem] = useState(null); // { tipo: 'success' | 'error', texto: string }

  // Clientes State
  const [clientes, setClientes] = useState([]);
  const [clienteForm, setClienteForm] = useState({ id: '', nome: '', email: '', telefone: '', cpf: '' });

  // Produtos State
  const [produtos, setProdutos] = useState([]);
  const [produtoForm, setProdutoForm] = useState({ id: '', nome: '', descricao: '', preco: '', estoque: '', ativo: true });

  // Pedidos State
  const [pedidos, setPedidos] = useState([]);
  const [pedidoClienteId, setPedidoClienteId] = useState('');
  const [pedidoStatus, setPedidoStatus] = useState('pendente');
  const [itensNovoPedido, setItensNovoPedido] = useState([]);
  const [itemProdutoId, setItemProdutoId] = useState('');
  const [itemPrecoUnitario, setItemPrecoUnitario] = useState('');
  const [itemQuantidade, setItemQuantidade] = useState(1);

  // Tratamento de Erros conforme especificações do banco
  const traduzirErro = (error) => {
    if (!error) return '';
    const code = String(error.code || '');
    switch (code) {
      case '23502':
        return 'Erro (23502): Campo obrigatório não preenchido no banco de dados.';
      case '23503':
        return 'Erro (23503): Operação recusada. Cadastro ligado a outro registro (chave estrangeira).';
      case '23505':
        return 'Erro (23505): Operação recusada. Valor repetido / duplicado (já cadastrado no sistema).';
      case '23514':
        return 'Erro (23514): Operação recusada. Valor fora da regra de validação (ex: preço ou estoque negativo).';
      case '42501':
        return 'Erro (42501): Sem permissão para realizar esta operação (política de segurança RLS ativa).';
      default:
        return `Erro (${code || 'desconhecido'}): ${error.message || 'Falha na operação.'}`;
    }
  };

  const mostrarAlerta = (tipo, texto) => {
    setMensagem({ tipo, texto });
    if (tipo === 'success') {
      setTimeout(() => setMensagem(null), 5000);
    }
  };

  // Carga de dados
  const carregarClientes = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('clientes').select('*').order('id', { ascending: true });
    if (error) mostrarAlerta('error', traduzirErro(error));
    else setClientes(data || []);
  };

  const carregarProdutos = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('produtos').select('*').order('id', { ascending: true });
    if (error) mostrarAlerta('error', traduzirErro(error));
    else setProdutos(data || []);
  };

  const carregarPedidos = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, clientes ( id, nome, email )')
      .order('id', { ascending: false });
    if (error) mostrarAlerta('error', traduzirErro(error));
    else setPedidos(data || []);
  };

  useEffect(() => {
    carregarClientes();
    carregarProdutos();
    carregarPedidos();
  }, []);

  // ==========================================
  // CLIENTES CRUD
  // ==========================================
  const handleSalvarCliente = async (e) => {
    e.preventDefault();
    setMensagem(null);

    const payload = {
      nome: clienteForm.nome.trim(),
      email: clienteForm.email.trim(),
      telefone: clienteForm.telefone.trim() || null,
      cpf: clienteForm.cpf.trim() || null,
    };

    let res;
    if (clienteForm.id) {
      res = await supabase.from('clientes').update(payload).eq('id', clienteForm.id);
    } else {
      res = await supabase.from('clientes').insert([payload]);
    }

    if (res.error) {
      mostrarAlerta('error', traduzirErro(res.error));
    } else {
      mostrarAlerta('success', clienteForm.id ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!');
      setClienteForm({ id: '', nome: '', email: '', telefone: '', cpf: '' });
      carregarClientes();
    }
  };

  const handleExcluirCliente = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o cliente "${nome}"?`)) return;
    setMensagem(null);
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) mostrarAlerta('error', traduzirErro(error));
    else {
      mostrarAlerta('success', 'Cliente excluído!');
      carregarClientes();
    }
  };

  // ==========================================
  // PRODUTOS CRUD
  // ==========================================
  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    setMensagem(null);

    const payload = {
      nome: produtoForm.nome.trim(),
      descricao: produtoForm.descricao.trim() || null,
      preco: parseFloat(produtoForm.preco),
      estoque: parseInt(produtoForm.estoque, 10),
      ativo: Boolean(produtoForm.ativo),
    };

    let res;
    if (produtoForm.id) {
      res = await supabase.from('produtos').update(payload).eq('id', produtoForm.id);
    } else {
      res = await supabase.from('produtos').insert([payload]);
    }

    if (res.error) {
      mostrarAlerta('error', traduzirErro(res.error));
    } else {
      mostrarAlerta('success', produtoForm.id ? 'Produto atualizado!' : 'Produto cadastrado com sucesso!');
      setProdutoForm({ id: '', nome: '', descricao: '', preco: '', estoque: '', ativo: true });
      carregarProdutos();
    }
  };

  const handleExcluirProduto = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o produto "${nome}"?`)) return;
    setMensagem(null);
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) mostrarAlerta('error', traduzirErro(error));
    else {
      mostrarAlerta('success', 'Produto excluído!');
      carregarProdutos();
    }
  };

  // ==========================================
  // PEDIDOS (Adicionar itens, Copiar preço, Total)
  // ==========================================
  const handleProdutoSelecionado = (prodId) => {
    setItemProdutoId(prodId);
    const prod = produtos.find((p) => p.id === Number(prodId));
    if (prod) {
      // Regra: "O preco_unitario do item deve copiar o preço atual do produto"
      setItemPrecoUnitario(Number(prod.preco).toFixed(2));
    } else {
      setItemPrecoUnitario('');
    }
  };

  const handleAdicionarItem = () => {
    setMensagem(null);
    const prodIdNum = Number(itemProdutoId);
    const qtdNum = parseInt(itemQuantidade, 10);
    const precoNum = parseFloat(itemPrecoUnitario);

    if (!prodIdNum) return mostrarAlerta('error', 'Selecione um produto.');
    if (isNaN(qtdNum) || qtdNum <= 0) return mostrarAlerta('error', 'Quantidade deve ser maior que 0.');

    const prod = produtos.find((p) => p.id === prodIdNum);
    if (!prod) return;

    if (itensNovoPedido.some((i) => i.produtoId === prodIdNum)) {
      return mostrarAlerta('error', 'Produto já inserido no pedido. Remova antes de alterar.');
    }

    const subtotal = qtdNum * precoNum;
    setItensNovoPedido([
      ...itensNovoPedido,
      {
        produtoId: prodIdNum,
        nome: prod.nome,
        precoUnitario: precoNum,
        quantidade: qtdNum,
        subtotal,
      },
    ]);

    setItemProdutoId('');
    setItemPrecoUnitario('');
    setItemQuantidade(1);
  };

  const handleRemoverItem = (index) => {
    setItensNovoPedido(itensNovoPedido.filter((_, i) => i !== index));
  };

  const totalCalculadoPedido = itensNovoPedido.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    setMensagem(null);

    const cId = Number(pedidoClienteId);
    if (!cId) return mostrarAlerta('error', 'Selecione um cliente para o pedido.');
    if (itensNovoPedido.length === 0) return mostrarAlerta('error', 'Adicione ao menos 1 item ao pedido.');

    // 1. Cria Pedido
    const { data: novoPed, error: errPed } = await supabase
      .from('pedidos')
      .insert([{ cliente_id: cId, status: pedidoStatus, total: totalCalculadoPedido }])
      .select()
      .single();

    if (errPed) {
      return mostrarAlerta('error', traduzirErro(errPed));
    }

    // 2. Insere Itens
    const itensPayload = itensNovoPedido.map((i) => ({
      pedido_id: novoPed.id,
      produto_id: i.produtoId,
      quantidade: i.quantidade,
      preco_unitario: i.precoUnitario,
    }));

    const { error: errItens } = await supabase.from('itens_pedido').insert(itensPayload);

    if (errItens) {
      mostrarAlerta('error', `Pedido criado (#${novoPed.id}), mas houve erro nos itens: ${traduzirErro(errItens)}`);
    } else {
      mostrarAlerta('success', `Pedido #${novoPed.id} cadastrado com sucesso! Total: R$ ${totalCalculadoPedido.toFixed(2)}`);
      setPedidoClienteId('');
      setItensNovoPedido([]);
      carregarPedidos();
    }
  };

  const handleAlterarStatusPedido = async (id, statusAtual) => {
    const opcoes = ['pendente', 'pago', 'enviado', 'cancelado'];
    const novoStatus = window.prompt(`Status atual: "${statusAtual}".\nDigite o novo status (${opcoes.join(', ')}):`, statusAtual);
    if (!novoStatus || !opcoes.includes(novoStatus.toLowerCase())) return;

    setMensagem(null);
    const { error } = await supabase.from('pedidos').update({ status: novoStatus.toLowerCase() }).eq('id', id);
    if (error) mostrarAlerta('error', traduzirErro(error));
    else {
      mostrarAlerta('success', `Status do Pedido #${id} alterado com sucesso!`);
      carregarPedidos();
    }
  };

  const handleExcluirPedido = async (id) => {
    if (!window.confirm(`Deseja excluir o Pedido #${id}?`)) return;
    setMensagem(null);
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) mostrarAlerta('error', traduzirErro(error));
    else {
      mostrarAlerta('success', `Pedido #${id} excluído!`);
      carregarPedidos();
    }
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1>🛍️ Gestão da Loja <span className="badge">v1.0 React</span></h1>
        <p className="subtitle">Aplicação conectada ao Supabase via @supabase/supabase-js CDN</p>
      </header>

      {mensagem && (
        <div className={`alert-box ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Navegação por Abas */}
      <nav className="tabs-nav">
        <button className={`tab-btn ${abaAtiva === 'clientes' ? 'active' : ''}`} onClick={() => { setAbaAtiva('clientes'); setMensagem(null); }}>
          👤 Clientes
        </button>
        <button className={`tab-btn ${abaAtiva === 'produtos' ? 'active' : ''}`} onClick={() => { setAbaAtiva('produtos'); setMensagem(null); }}>
          📦 Produtos
        </button>
        <button className={`tab-btn ${abaAtiva === 'pedidos' ? 'active' : ''}`} onClick={() => { setAbaAtiva('pedidos'); setMensagem(null); }}>
          🧾 Pedidos
        </button>
      </nav>

      {/* ABA 1: CLIENTES */}
      {abaAtiva === 'clientes' && (
        <section>
          <div className="card">
            <h2>{clienteForm.id ? `Editar Cliente #${clienteForm.id}` : 'Cadastrar Cliente'}</h2>
            <form onSubmit={handleSalvarCliente}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input type="text" value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>E-mail *</label>
                  <input type="email" value={clienteForm.email} onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input type="text" value={clienteForm.telefone} onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })} placeholder="(11) 98765-4321" />
                </div>
                <div className="form-group">
                  <label>CPF</label>
                  <input type="text" value={clienteForm.cpf} onChange={(e) => setClienteForm({ ...clienteForm, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">{clienteForm.id ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
                {clienteForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setClienteForm({ id: '', nome: '', email: '', telefone: '', cpf: '' })}>Cancelar</button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Clientes Cadastrados ({clientes.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Nome</th><th>E-mail</th><th>Telefone</th><th>CPF</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan="6" className="empty">Nenhum cliente cadastrado.</td></tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.nome}</td>
                      <td>{c.email}</td>
                      <td>{c.telefone || '—'}</td>
                      <td>{c.cpf || '—'}</td>
                      <td className="actions">
                        <button className="btn btn-sm btn-outline" onClick={() => setClienteForm(c)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleExcluirCliente(c.id, c.nome)}>🗑️ Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 2: PRODUTOS */}
      {abaAtiva === 'produtos' && (
        <section>
          <div className="card">
            <h2>{produtoForm.id ? `Editar Produto #${produtoForm.id}` : 'Cadastrar Produto'}</h2>
            <form onSubmit={handleSalvarProduto}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do Produto *</label>
                  <input type="text" value={produtoForm.nome} onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Preço (R$) *</label>
                  <input type="number" step="0.01" min="0" value={produtoForm.preco} onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Estoque *</label>
                  <input type="number" min="0" value={produtoForm.estoque} onChange={(e) => setProdutoForm({ ...produtoForm, estoque: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <input type="text" value={produtoForm.descricao} onChange={(e) => setProdutoForm({ ...produtoForm, descricao: e.target.value })} />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={produtoForm.ativo} onChange={(e) => setProdutoForm({ ...produtoForm, ativo: e.target.checked })} /> Ativo no catálogo
                  </label>
                </div>
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">{produtoForm.id ? 'Salvar Alterações' : 'Cadastrar Produto'}</button>
                {produtoForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setProdutoForm({ id: '', nome: '', descricao: '', preco: '', estoque: '', ativo: true })}>Cancelar</button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Produtos Cadastrados ({produtos.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Nome</th><th>Descrição</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 ? (
                  <tr><td colSpan="7" className="empty">Nenhum produto cadastrado.</td></tr>
                ) : (
                  produtos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nome}</td>
                      <td>{p.descricao || '—'}</td>
                      <td>{Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{p.estoque}</td>
                      <td>
                        <span className={`badge-status ${p.ativo ? 'badge-pago' : 'badge-cancelado'}`}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn btn-sm btn-outline" onClick={() => setProdutoForm(p)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleExcluirProduto(p.id, p.nome)}>🗑️ Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 3: PEDIDOS */}
      {abaAtiva === 'pedidos' && (
        <section>
          <div className="card">
            <h2>Novo Pedido</h2>
            <form onSubmit={handleFinalizarPedido}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Selecione o Cliente *</label>
                  <select value={pedidoClienteId} onChange={(e) => setPedidoClienteId(e.target.value)} required>
                    <option value="">-- Escolha um cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status do Pedido</label>
                  <select value={pedidoStatus} onChange={(e) => setPedidoStatus(e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="enviado">Enviado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Adicionar Itens */}
              <div className="item-builder">
                <h3>Itens do Pedido</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Produto *</label>
                    <select value={itemProdutoId} onChange={(e) => handleProdutoSelecionado(e.target.value)}>
                      <option value="">-- Selecione o produto --</option>
                      {produtos.filter((p) => p.ativo).map((p) => (
                        <option key={p.id} value={p.id}>{p.nome} - R$ {Number(p.preco).toFixed(2)} (Estoque: {p.estoque})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Preço Unitário Copiado (R$)</label>
                    <input type="text" value={itemPrecoUnitario} readOnly className="readonly-input" />
                  </div>
                  <div className="form-group">
                    <label>Quantidade *</label>
                    <input type="number" min="1" value={itemQuantidade} onChange={(e) => setItemQuantidade(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleAdicionarItem}>➕ Adicionar Item</button>
                  </div>
                </div>

                {/* Tabela de itens adicionados */}
                <table style={{ marginTop: '12px' }}>
                  <thead>
                    <tr><th>Produto</th><th>Preço Unitário</th><th>Qtd</th><th>Subtotal</th><th>Ação</th></tr>
                  </thead>
                  <tbody>
                    {itensNovoPedido.length === 0 ? (
                      <tr><td colSpan="5" className="empty">Nenhum item adicionado ao pedido.</td></tr>
                    ) : (
                      itensNovoPedido.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.nome}</td>
                          <td>R$ {item.precoUnitario.toFixed(2)}</td>
                          <td>{item.quantidade}</td>
                          <td>R$ {item.subtotal.toFixed(2)}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoverItem(idx)}>❌</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="total-display">
                  <span>Total do Pedido:</span>
                  <strong>{totalCalculadoPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                ✅ Finalizar e Salvar Pedido
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Histórico de Pedidos ({pedidos.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Cliente</th><th>Data</th><th>Status</th><th>Total</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 ? (
                  <tr><td colSpan="6" className="empty">Nenhum pedido realizado.</td></tr>
                ) : (
                  pedidos.map((ped) => (
                    <tr key={ped.id}>
                      <td>#{ped.id}</td>
                      <td>{ped.clientes ? ped.clientes.nome : `Cliente #${ped.cliente_id}`}</td>
                      <td>{ped.created_at ? new Date(ped.created_at).toLocaleString('pt-BR') : '—'}</td>
                      <td>
                        <span className={`badge-status badge-${ped.status}`}>
                          {ped.status}
                        </span>
                      </td>
                      <td><strong>{Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td>
                      <td className="actions">
                        <button className="btn btn-sm btn-outline" onClick={() => handleAlterarStatusPedido(ped.id, ped.status)}>🔄 Status</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleExcluirPedido(ped.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
