// ============================================================================
// Gestão da Loja v2 - Lógica Front-End com Supabase JS
// Segurança: Todos os dados vindos do banco são renderizados via textContent
// NUNCA utilize innerHTML com dados do banco de dados (Prevenção de XSS)
// Design: Brand Book Simples Sistemas — Azul #2563A6, Teal #48B5A3
// ============================================================================

import { supabase } from './supabaseClient.js';
import { setupAuth } from './auth.js';

// Estado local da aplicação
let produtosCache = [];
let clientesCache = [];
let pedidosCache = [];
let itensDoNovoPedido = []; // [{ produtoId, nome, precoUnitario, quantidade, subtotal }]

// ============================================================================
// Métricas e KPIs do Dashboard (Design System Luxury Stats)
// ============================================================================
function atualizarMetricas() {
  const elClientes = document.getElementById('metric-clientes');
  if (elClientes) elClientes.textContent = String(clientesCache.length);

  const elProdutos = document.getElementById('metric-produtos');
  if (elProdutos) elProdutos.textContent = String(produtosCache.length);

  const elPedidos = document.getElementById('metric-pedidos');
  if (elPedidos) elPedidos.textContent = String(pedidosCache.length);

  const elFaturamento = document.getElementById('metric-faturamento');
  if (elFaturamento) {
    const totalGeral = pedidosCache.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    elFaturamento.textContent = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Atualiza contadores nos headers das tabelas
  const countClientes = document.getElementById('count-clientes');
  if (countClientes) countClientes.textContent = String(clientesCache.length);

  const countProdutos = document.getElementById('count-produtos');
  if (countProdutos) countProdutos.textContent = String(produtosCache.length);

  const countPedidos = document.getElementById('count-pedidos');
  if (countPedidos) countPedidos.textContent = String(pedidosCache.length);
}

// ============================================================================
// Tratamento de Erros do Banco (Códigos Postgres / Supabase)
// ============================================================================
function traduzirErroSupabase(error) {
  if (!error) return '';
  const code = String(error.code || '');

  switch (code) {
    case '23502':
      return 'Erro (23502): Campo obrigatório não preenchido no banco de dados.';
    case '23503':
      return 'Erro (23503): Operação recusada. Este cadastro está vinculado a outro registro (chave estrangeira).';
    case '23505':
      return 'Erro (23505): Operação recusada. Valor repetido (já existe um registro com este mesmo e-mail, CPF ou dados únicos).';
    case '23514':
      return 'Erro (23514): Operação recusada. Valor fora da regra de validação do banco (ex: preço ou estoque negativo).';
    case '42501':
      return 'Erro (42501): Sem permissão para realizar esta operação (política de segurança RLS ativa no Supabase).';
    default:
      return `Erro (${code || 'desconhecido'}): ${error.message || 'Falha ao processar solicitação no banco.'}`;
  }
}

// Exibe mensagem de feedback seguro usando textContent
function mostrarMensagem(tipo, texto) {
  const alertBox = document.getElementById('feedback-alert');
  if (!alertBox) return;

  alertBox.className = `alert-box ${tipo}`;
  alertBox.textContent = texto; // Segurança: textContent em vez de innerHTML

  // Auto-esconder após 6 segundos se for sucesso
  if (tipo === 'success') {
    setTimeout(() => {
      if (alertBox.textContent === texto) {
        alertBox.className = 'alert-box';
        alertBox.textContent = '';
      }
    }, 6000);
  }
}

// Limpa mensagens de alerta
function limparMensagem() {
  const alertBox = document.getElementById('feedback-alert');
  if (alertBox) {
    alertBox.className = 'alert-box';
    alertBox.textContent = '';
  }
}

// ============================================================================
// Sistema de Navegação por Abas
// ============================================================================
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Atualiza botões
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Atualiza seções
      document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.remove('active');
      });

      const activeSection = document.getElementById(`tab-${targetTab}`);
      if (activeSection) {
        activeSection.classList.add('active');
      }

      limparMensagem();

      // Recarrega os dados ao trocar de aba
      if (targetTab === 'clientes') carregarClientes();
      if (targetTab === 'produtos') carregarProdutos();
      if (targetTab === 'pedidos') {
        carregarDropdownsPedido();
        carregarPedidos();
      }
    });
  });
}

// ============================================================================
// MÓDULO 1: CLIENTES (Cadastrar, Listar, Editar, Excluir)
// ============================================================================
async function carregarClientes() {
  const tbody = document.getElementById('tabela-clientes-body');
  tbody.textContent = ''; // Limpa tabela

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
    return;
  }

  clientesCache = data || [];
  atualizarMetricas();

  if (clientesCache.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'empty-state';
    td.textContent = 'Nenhum cliente cadastrado no momento.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  clientesCache.forEach(cliente => {
    const tr = document.createElement('tr');

    // ID curto (apenas 8 chars do UUID ou o id numérico)
    const tdId = document.createElement('td');
    const idStr = String(cliente.id);
    tdId.textContent = idStr.length > 10 ? '#' + idStr.slice(0, 8) : '#' + idStr;
    tdId.style.color = 'var(--brand-muted)';
    tdId.style.fontSize = '0.78rem';
    tdId.style.fontFamily = 'monospace';
    tr.appendChild(tdId);

    // Nome
    const tdNome = document.createElement('td');
    tdNome.textContent = cliente.nome || '';
    tr.appendChild(tdNome);

    // E-mail
    const tdEmail = document.createElement('td');
    tdEmail.textContent = cliente.email || '';
    tr.appendChild(tdEmail);

    // Telefone
    const tdTel = document.createElement('td');
    tdTel.textContent = cliente.telefone || '—';
    tr.appendChild(tdTel);

    // CPF
    const tdCpf = document.createElement('td');
    tdCpf.textContent = cliente.cpf || '—';
    tr.appendChild(tdCpf);

    // Ações
    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'actions-cell';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-outline btn-sm';
    btnEditar.textContent = '✏️ Editar';
    btnEditar.addEventListener('click', () => iniciarEdicaoCliente(cliente));

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-sm';
    btnExcluir.textContent = '🗑️ Excluir';
    btnExcluir.addEventListener('click', () => excluirCliente(cliente.id, cliente.nome));

    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function iniciarEdicaoCliente(cliente) {
  document.getElementById('cliente-id').value = cliente.id;
  document.getElementById('cliente-nome').value = cliente.nome || '';
  document.getElementById('cliente-email').value = cliente.email || '';
  document.getElementById('cliente-telefone').value = cliente.telefone || '';
  document.getElementById('cliente-cpf').value = cliente.cpf || '';

  document.getElementById('cliente-form-title').textContent = `Editar Cliente #${cliente.id}`;
  document.getElementById('btn-salvar-cliente').textContent = 'Salvar Alterações';
  document.getElementById('btn-cancelar-cliente').style.display = 'inline-flex';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoCliente() {
  document.getElementById('form-cliente').reset();
  document.getElementById('cliente-id').value = '';
  document.getElementById('cliente-form-title').textContent = 'Cadastrar Novo Cliente';
  document.getElementById('btn-salvar-cliente').textContent = 'Salvar Cliente';
  document.getElementById('btn-cancelar-cliente').style.display = 'none';
}

async function salvarCliente(event) {
  event.preventDefault();
  limparMensagem();

  const id = document.getElementById('cliente-id').value;
  const nome = document.getElementById('cliente-nome').value.trim();
  const email = document.getElementById('cliente-email').value.trim();
  const telefone = document.getElementById('cliente-telefone').value.trim() || null;
  const cpf = document.getElementById('cliente-cpf').value.trim() || null;

  const dadosCliente = { nome, email, telefone, cpf };

  let resultado;
  if (id) {
    // UPDATE
    resultado = await supabase
      .from('clientes')
      .update(dadosCliente)
      .eq('id', id);
  } else {
    // INSERT
    resultado = await supabase
      .from('clientes')
      .insert([dadosCliente]);
  }

  if (resultado.error) {
    mostrarMensagem('error', traduzirErroSupabase(resultado.error));
  } else {
    mostrarMensagem('success', id ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
    cancelarEdicaoCliente();
    carregarClientes();
  }
}

async function excluirCliente(id, nome) {
  if (!confirm(`Tem certeza que deseja excluir o cliente "${nome}" (#${id})?`)) {
    return;
  }

  limparMensagem();
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
  } else {
    mostrarMensagem('success', 'Cliente excluído com sucesso!');
    carregarClientes();
  }
}

// ============================================================================
// MÓDULO 2: PRODUTOS (Cadastrar, Listar, Editar, Excluir)
// ============================================================================
async function carregarProdutos() {
  const tbody = document.getElementById('tabela-produtos-body');
  tbody.textContent = '';

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
    return;
  }

  produtosCache = data || [];
  atualizarMetricas();

  if (produtosCache.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'empty-state';
    td.textContent = 'Nenhum produto cadastrado no catálogo.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  produtosCache.forEach(produto => {
    const tr = document.createElement('tr');

    // ID curto
    const tdId = document.createElement('td');
    const idStr = String(produto.id);
    tdId.textContent = idStr.length > 10 ? '#' + idStr.slice(0, 8) : '#' + idStr;
    tdId.style.color = 'var(--brand-muted)';
    tdId.style.fontSize = '0.78rem';
    tdId.style.fontFamily = 'monospace';
    tr.appendChild(tdId);

    // Nome
    const tdNome = document.createElement('td');
    tdNome.textContent = produto.nome || '';
    tr.appendChild(tdNome);

    // Descrição
    const tdDesc = document.createElement('td');
    tdDesc.textContent = produto.descricao || '—';
    tr.appendChild(tdDesc);

    // Preço
    const tdPreco = document.createElement('td');
    tdPreco.textContent = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    tr.appendChild(tdPreco);

    // Estoque
    const tdEstoque = document.createElement('td');
    tdEstoque.textContent = String(produto.estoque ?? 0);
    tr.appendChild(tdEstoque);

    // Status / Ativo
    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${produto.ativo ? 'status-pago' : 'status-cancelado'}`;
    badge.textContent = produto.ativo ? 'Ativo' : 'Inativo';
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Ações
    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'actions-cell';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-outline btn-sm';
    btnEditar.textContent = '✏️ Editar';
    btnEditar.addEventListener('click', () => iniciarEdicaoProduto(produto));

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-sm';
    btnExcluir.textContent = '🗑️ Excluir';
    btnExcluir.addEventListener('click', () => excluirProduto(produto.id, produto.nome));

    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function iniciarEdicaoProduto(produto) {
  document.getElementById('produto-id').value = produto.id;
  document.getElementById('produto-nome').value = produto.nome || '';
  document.getElementById('produto-descricao').value = produto.descricao || '';
  document.getElementById('produto-preco').value = produto.preco;
  document.getElementById('produto-estoque').value = produto.estoque;
  document.getElementById('produto-ativo').checked = !!produto.ativo;

  document.getElementById('produto-form-title').textContent = `Editar Produto #${produto.id}`;
  document.getElementById('btn-salvar-produto').textContent = 'Salvar Alterações';
  document.getElementById('btn-cancelar-produto').style.display = 'inline-flex';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoProduto() {
  document.getElementById('form-produto').reset();
  document.getElementById('produto-id').value = '';
  document.getElementById('produto-ativo').checked = true;
  document.getElementById('produto-form-title').textContent = 'Cadastrar Novo Produto';
  document.getElementById('btn-salvar-produto').textContent = 'Salvar Produto';
  document.getElementById('btn-cancelar-produto').style.display = 'none';
}

async function salvarProduto(event) {
  event.preventDefault();
  limparMensagem();

  const id = document.getElementById('produto-id').value;
  const nome = document.getElementById('produto-nome').value.trim();
  const descricao = document.getElementById('produto-descricao').value.trim() || null;
  const preco = parseFloat(document.getElementById('produto-preco').value);
  const estoque = parseInt(document.getElementById('produto-estoque').value, 10);
  const ativo = document.getElementById('produto-ativo').checked;

  const dadosProduto = { nome, descricao, preco, estoque, ativo };

  let resultado;
  if (id) {
    resultado = await supabase
      .from('produtos')
      .update(dadosProduto)
      .eq('id', id);
  } else {
    resultado = await supabase
      .from('produtos')
      .insert([dadosProduto]);
  }

  if (resultado.error) {
    mostrarMensagem('error', traduzirErroSupabase(resultado.error));
  } else {
    mostrarMensagem('success', id ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
    cancelarEdicaoProduto();
    carregarProdutos();
  }
}

async function excluirProduto(id, nome) {
  if (!confirm(`Tem certeza que deseja excluir o produto "${nome}" (#${id})?`)) {
    return;
  }

  limparMensagem();
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
  } else {
    mostrarMensagem('success', 'Produto excluído com sucesso!');
    carregarProdutos();
  }
}

// ============================================================================
// MÓDULO 3: PEDIDOS (Escolher cliente, Adicionar itens, Copiar preço, Total)
// ============================================================================

// Popula os dropdowns de seleção de clientes e produtos no form de pedidos
async function carregarDropdownsPedido() {
  // Clientes
  const clienteSelect = document.getElementById('pedido-cliente-select');
  clienteSelect.textContent = '';
  const optDefaultCliente = document.createElement('option');
  optDefaultCliente.value = '';
  optDefaultCliente.textContent = '-- Escolha um cliente --';
  clienteSelect.appendChild(optDefaultCliente);

  const resClientes = await supabase.from('clientes').select('id, nome, email').order('nome');
  if (resClientes.data) {
    clientesCache = resClientes.data;
    resClientes.data.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      // textContent com dados do banco
      opt.textContent = `${c.nome} (${c.email})`;
      clienteSelect.appendChild(opt);
    });
  }

  // Produtos
  const produtoSelect = document.getElementById('item-produto-select');
  produtoSelect.textContent = '';
  const optDefaultProd = document.createElement('option');
  optDefaultProd.value = '';
  optDefaultProd.textContent = '-- Escolha um produto --';
  produtoSelect.appendChild(optDefaultProd);

  const resProdutos = await supabase.from('produtos').select('*').eq('ativo', true).order('nome');
  if (resProdutos.data) {
    produtosCache = resProdutos.data;
    resProdutos.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} - R$ ${Number(p.preco).toFixed(2)} (Estoque: ${p.estoque})`;
      produtoSelect.appendChild(opt);
    });
  }

  // Evento: quando escolhe produto, COPIA o preço atual para o input de preço unitário
  produtoSelect.addEventListener('change', () => {
    const produtoId = Number(produtoSelect.value);
    const precoInput = document.getElementById('item-preco-unitario');
    const prod = produtosCache.find(p => p.id === produtoId);
    if (prod) {
      // Regra obrigatória: "O preco_unitario do item deve copiar o preço atual do produto"
      precoInput.value = Number(prod.preco).toFixed(2);
    } else {
      precoInput.value = '';
    }
  });
}

// Adiciona um item na lista temporária do pedido
function adicionarItemAoPedido() {
  limparMensagem();
  const produtoSelect = document.getElementById('item-produto-select');
  const precoInput = document.getElementById('item-preco-unitario');
  const qtdInput = document.getElementById('item-quantidade');

  const produtoId = Number(produtoSelect.value);
  const quantidade = parseInt(qtdInput.value, 10);
  const precoUnitario = parseFloat(precoInput.value);

  if (!produtoId) {
    mostrarMensagem('error', 'Por favor, selecione um produto.');
    return;
  }

  if (isNaN(quantidade) || quantidade <= 0) {
    mostrarMensagem('error', 'A quantidade do item deve ser maior que zero (regra CHECK).');
    return;
  }

  const prod = produtosCache.find(p => p.id === produtoId);
  if (!prod) {
    mostrarMensagem('error', 'Produto selecionado não encontrado.');
    return;
  }

  // Evita duplicidade do mesmo produto no mesmo pedido (regra UNIQUE pedido_id, produto_id)
  const itemExistente = itensDoNovoPedido.find(i => i.produtoId === produtoId);
  if (itemExistente) {
    mostrarMensagem('error', 'Este produto já foi adicionado ao pedido. Remova-o antes de alterar a quantidade.');
    return;
  }

  const subtotal = quantidade * precoUnitario;
  itensDoNovoPedido.push({
    produtoId,
    nome: prod.nome,
    precoUnitario,
    quantidade,
    subtotal
  });

  // Limpa campos de inserção de item
  produtoSelect.value = '';
  precoInput.value = '';
  qtdInput.value = '1';

  atualizarTabelaItensTemporarios();
}

// Renderiza a lista de itens temporários do pedido e calcula o total
function atualizarTabelaItensTemporarios() {
  const tbody = document.getElementById('tabela-itens-temporarios-body');
  tbody.textContent = '';

  let totalGeral = 0;

  if (itensDoNovoPedido.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'empty-state';
    td.textContent = 'Nenhum item adicionado a este pedido.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    itensDoNovoPedido.forEach((item, index) => {
      totalGeral += item.subtotal;

      const tr = document.createElement('tr');

      const tdNome = document.createElement('td');
      tdNome.textContent = item.nome;
      tr.appendChild(tdNome);

      const tdPreco = document.createElement('td');
      tdPreco.textContent = item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      tr.appendChild(tdPreco);

      const tdQtd = document.createElement('td');
      tdQtd.textContent = String(item.quantidade);
      tr.appendChild(tdQtd);

      const tdSub = document.createElement('td');
      tdSub.textContent = item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      tr.appendChild(tdSub);

      const tdRemover = document.createElement('td');
      const btnRemover = document.createElement('button');
      btnRemover.className = 'btn btn-danger btn-sm';
      btnRemover.textContent = '❌';
      btnRemover.title = 'Remover item';
      btnRemover.addEventListener('click', () => {
        itensDoNovoPedido.splice(index, 1);
        atualizarTabelaItensTemporarios();
      });
      tdRemover.appendChild(btnRemover);
      tr.appendChild(tdRemover);

      tbody.appendChild(tr);
    });
  }

  // Atualiza o display do Total
  document.getElementById('pedido-total-display').textContent = totalGeral.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Salva o pedido e seus itens no Supabase
async function finalizarPedido(event) {
  event.preventDefault();
  limparMensagem();

  const clienteSelect = document.getElementById('pedido-cliente-select');
  const statusSelect = document.getElementById('pedido-status-select');

  const clienteId = Number(clienteSelect.value);
  const status = statusSelect.value || 'pendente';

  if (!clienteId) {
    mostrarMensagem('error', 'Selecione um cliente para vincular ao pedido.');
    return;
  }

  if (itensDoNovoPedido.length === 0) {
    mostrarMensagem('error', 'Adicione pelo menos 1 item ao pedido antes de salvar.');
    return;
  }

  // Calcula o total acumulado
  const total = itensDoNovoPedido.reduce((acc, item) => acc + item.subtotal, 0);

  // 1. Insere o Pedido
  const { data: pedidoData, error: pedidoError } = await supabase
    .from('pedidos')
    .insert([{ cliente_id: clienteId, status, total }])
    .select()
    .single();

  if (pedidoError) {
    mostrarMensagem('error', traduzirErroSupabase(pedidoError));
    return;
  }

  const pedidoId = pedidoData.id;

  // 2. Prepara e insere os Itens do Pedido
  const registrosItens = itensDoNovoPedido.map(item => ({
    pedido_id: pedidoId,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: item.precoUnitario
  }));

  const { error: itensError } = await supabase
    .from('itens_pedido')
    .insert(registrosItens);

  if (itensError) {
    mostrarMensagem('error', `Pedido #${pedidoId} criado, mas falhou ao gravar itens: ${traduzirErroSupabase(itensError)}`);
  } else {
    mostrarMensagem('success', `Pedido #${pedidoId} cadastrado com sucesso!`);
    // Limpa o formulário e a lista temporária
    document.getElementById('form-pedido').reset();
    itensDoNovoPedido = [];
    atualizarTabelaItensTemporarios();
    carregarPedidos();
  }
}

// Carrega e lista o histórico de pedidos
async function carregarPedidos() {
  const tbody = document.getElementById('tabela-pedidos-body');
  tbody.textContent = '';

  // Consulta relacionando pedidos com clientes
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nome, email )')
    .order('id', { ascending: false });

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
    return;
  }

  pedidosCache = pedidos || [];
  atualizarMetricas();

  if (!pedidos || pedidos.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'empty-state';
    td.textContent = 'Nenhum pedido realizado até o momento.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  pedidos.forEach(pedido => {
    const tr = document.createElement('tr');

    // ID
    const tdId = document.createElement('td');
    tdId.textContent = `#${pedido.id}`;
    tr.appendChild(tdId);

    // Cliente (textContent)
    const tdCliente = document.createElement('td');
    tdCliente.textContent = pedido.clientes ? pedido.clientes.nome : `Cliente #${pedido.cliente_id}`;
    tr.appendChild(tdCliente);

    // Data
    const tdData = document.createElement('td');
    tdData.textContent = pedido.created_at ? new Date(pedido.created_at).toLocaleString('pt-BR') : '—';
    tr.appendChild(tdData);

    // Status
    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `status-badge status-${pedido.status}`;
    badgeStatus.textContent = pedido.status;
    tdStatus.appendChild(badgeStatus);
    tr.appendChild(tdStatus);

    // Total
    const tdTotal = document.createElement('td');
    tdTotal.style.fontWeight = '600';
    tdTotal.textContent = Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    tr.appendChild(tdTotal);

    // Ações
    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'actions-cell';

    // Botão Editar Status
    const btnEditarStatus = document.createElement('button');
    btnEditarStatus.className = 'btn btn-outline btn-sm';
    btnEditarStatus.textContent = '🔄 Status';
    btnEditarStatus.addEventListener('click', () => alterarStatusPedido(pedido.id, pedido.status));
    tdAcoes.appendChild(btnEditarStatus);

    // Botão Excluir Pedido
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-danger btn-sm';
    btnExcluir.textContent = '🗑️';
    btnExcluir.title = 'Excluir Pedido';
    btnExcluir.addEventListener('click', () => excluirPedido(pedido.id));
    tdAcoes.appendChild(btnExcluir);

    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });
}

// Altera status de um pedido — inline select, sem prompt()
async function alterarStatusPedido(id, statusAtual) {
  const opcoes = ['pendente', 'pago', 'enviado', 'cancelado'];
  const labels = {
    pendente: '⏳ Pendente',
    pago: '✅ Pago',
    enviado: '🚀 Enviado',
    cancelado: '❌ Cancelado'
  };

  // Cria um select temporário flutuante sobre o botão clicado
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1A1B23; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 24px 28px; min-width: 280px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
  `;

  const titulo = document.createElement('p');
  titulo.style.cssText = 'font-weight:700; color:#fff; margin-bottom:14px; font-size:0.95rem;';
  titulo.textContent = `Pedido #${id} — Alterar Status`;
  dialog.appendChild(titulo);

  const sel = document.createElement('select');
  sel.style.cssText = `
    width:100%; padding:11px 14px; background:#0B1219;
    border:1px solid rgba(255,255,255,0.1); border-radius:10px;
    color:#fff; font-size:0.92rem; margin-bottom:16px;
    appearance:none; cursor:pointer;
  `;
  opcoes.forEach(op => {
    const opt = document.createElement('option');
    opt.value = op;
    opt.textContent = labels[op];
    if (op === statusAtual) opt.selected = true;
    sel.appendChild(opt);
  });
  dialog.appendChild(sel);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:10px; justify-content:flex-end;';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.style.cssText = `
    padding:9px 18px; border-radius:9999px; border:1px solid rgba(255,255,255,0.1);
    background:transparent; color:#8E95A5; cursor:pointer; font-size:0.85rem; font-weight:600;
  `;

  const btnConfirmar = document.createElement('button');
  btnConfirmar.textContent = 'Confirmar';
  btnConfirmar.style.cssText = `
    padding:9px 18px; border-radius:9999px; border:none;
    background:#2563A6; color:#fff; cursor:pointer; font-size:0.85rem; font-weight:700;
  `;

  btnRow.appendChild(btnCancelar);
  btnRow.appendChild(btnConfirmar);
  dialog.appendChild(btnRow);
  wrapper.appendChild(dialog);
  document.body.appendChild(wrapper);

  // Retorna uma Promise resolvida pelo clique
  const novoStatus = await new Promise(resolve => {
    btnCancelar.onclick = () => resolve(null);
    wrapper.onclick = (e) => { if (e.target === wrapper) resolve(null); };
    btnConfirmar.onclick = () => resolve(sel.value);
  });

  document.body.removeChild(wrapper);
  if (!novoStatus || novoStatus === statusAtual) return;

  limparMensagem();
  const { error } = await supabase
    .from('pedidos')
    .update({ status: novoStatus })
    .eq('id', id);

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
  } else {
    mostrarMensagem('success', `Status do Pedido #${id} alterado para "${labels[novoStatus]}"!`);
    carregarPedidos();
  }
}

// Exclui pedido
async function excluirPedido(id) {
  if (!confirm(`Tem certeza que deseja excluir o Pedido #${id} e todos os seus itens?`)) {
    return;
  }

  limparMensagem();
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id);

  if (error) {
    mostrarMensagem('error', traduzirErroSupabase(error));
  } else {
    mostrarMensagem('success', `Pedido #${id} excluído com sucesso!`);
    carregarPedidos();
  }
}

// ============================================================================
// Gerenciamento de Sessão: Limpeza e Carga de Dados da Loja
// ============================================================================
export function limparDadosLoja() {
  // 1. Limpa os caches em memória
  clientesCache = [];
  produtosCache = [];
  pedidosCache = [];
  itensDoNovoPedido = [];
  atualizarMetricas();

  // 2. Limpa o DOM das tabelas com textContent
  const tbodyClientes = document.getElementById('tabela-clientes-body');
  if (tbodyClientes) tbodyClientes.textContent = '';

  const tbodyProdutos = document.getElementById('tabela-produtos-body');
  if (tbodyProdutos) tbodyProdutos.textContent = '';

  const tbodyPedidos = document.getElementById('tabela-pedidos-body');
  if (tbodyPedidos) tbodyPedidos.textContent = '';

  const tbodyItensTemp = document.getElementById('tabela-itens-temporarios-body');
  if (tbodyItensTemp) tbodyItensTemp.textContent = '';

  const totalDisplay = document.getElementById('pedido-total-display');
  if (totalDisplay) totalDisplay.textContent = 'R$ 0,00';

  // 3. Reseta formulários e estados de edição
  cancelarEdicaoCliente();
  cancelarEdicaoProduto();

  const formPedido = document.getElementById('form-pedido');
  if (formPedido) formPedido.reset();
}

export function carregarDadosLoja() {
  // A carga só roda após login confirmado
  carregarClientes();
  carregarProdutos();
  carregarDropdownsPedido();
  carregarPedidos();
}

// ============================================================================
// Inicialização de Eventos
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();

  // Clientes
  document.getElementById('form-cliente').addEventListener('submit', salvarCliente);
  document.getElementById('btn-cancelar-cliente').addEventListener('click', cancelarEdicaoCliente);

  // Produtos
  document.getElementById('form-produto').addEventListener('submit', salvarProduto);
  document.getElementById('btn-cancelar-produto').addEventListener('click', cancelarEdicaoProduto);

  // Pedidos
  document.getElementById('btn-adicionar-item').addEventListener('click', adicionarItemAoPedido);
  document.getElementById('form-pedido').addEventListener('submit', finalizarPedido);

  // Inicializa a autenticação (apenas carrega dados com sessão ativa)
  setupAuth({
    onLogin: () => {
      carregarDadosLoja();
    },
    onLogout: () => {
      limparDadosLoja();
    },
    onFeedback: mostrarMensagem
  });
});

