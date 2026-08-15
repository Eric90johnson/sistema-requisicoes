import { useState, useRef } from 'react';
import '../../../styles/pages/painel/nova-requisicao/novaRequisicao.css';

// Função para tratar valores monetários que vêm sujos da base de dados (Ex: "R$ 493,78" ou "493.78")
const parseValorMoeda = (valorStr) => {
  if (!valorStr) return 0;
  if (typeof valorStr === 'number') return valorStr;
  
  let limpo = valorStr.toString().replace(/[^\d.,-]/g, '');
  
  if (limpo.includes('.') && limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '');
  }
  
  limpo = limpo.replace(',', '.');
  return Number(limpo) || 0;
};

export default function NovaRequisicao({ aoVoltar, baseProdutos, aoSalvar }) {
  // --- NOVO: Lojas com nomes reduzidos e inclusão de Mulungu ---
  const lojas = [
    'Araturi', 
    'Conjunto Ceará', 
    'Messejana',
    'Mulungu'
  ];

  const [lojaDe, setLojaDe] = useState(lojas[0]);
  const [lojaPara, setLojaPara] = useState(lojas[1]);
  const [solicitante, setSolicitante] = useState('');
  
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [prioridadeOutro, setPrioridadeOutro] = useState('3'); 

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itensAdicionados, setItensAdicionados] = useState([]);
  
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [novaQuantidadeEdit, setNovaQuantidadeEdit] = useState('');

  const [alerta, setAlerta] = useState({ 
    visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null, onCancel: null, textoConfirmar: 'Entendi', textoCancelar: 'Cancelar'
  });

  const inputCodigoRef = useRef(null);
  const inputArquivoRef = useRef(null);

  const mostrarAlerta = (tipo, titulo, mensagem, onConfirm = null, onCancel = null, textoConfirmar = 'Entendi', textoCancelar = 'Cancelar') => {
    setAlerta({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel, textoConfirmar, textoCancelar });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
  };

  const handleMudancaCodigo = (valorDigitado) => {
    setCodigo(valorDigitado);
    const produtoEncontrado = baseProdutos.find((prod) => prod.codigo === valorDigitado);
    if (produtoEncontrado) {
      setDescricao(`${produtoEncontrado.descricao}`);
    } else {
      setDescricao('');
    }
  };

  const adicionarNaLista = () => {
    if (!codigo || !quantidade) { 
      mostrarAlerta('erro', 'Campos Obrigatórios', 'Preencha o código do produto e a quantidade desejada!');
      return; 
    }
    
    const produto = baseProdutos.find((p) => p.codigo === codigo);
    const temEstoqueDefinido = produto && produto.quantidade !== undefined && produto.quantidade !== null;
    const estoqueAtual = temEstoqueDefinido ? Number(produto.quantidade.toString().replace(',', '.')) : null;
    const qtdSolicitada = Number(quantidade);
    const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

    let custoUnit = 0;
    const campoCustoTotal = produto ? (produto.custo || produto.precoCusto || produto.preco_custo) : null;
    
    if (campoCustoTotal && estoqueAtual > 0) {
      const custoTotalLimpo = parseValorMoeda(campoCustoTotal);
      custoUnit = custoTotalLimpo / estoqueAtual;
    }

    const itemNovo = { 
      cod: codigo, 
      descricao: descricao || 'Produto não encontrado', 
      quantidade: qtdSolicitada,
      estoque: estoqueAtual,
      custoUnitario: custoUnit,
      insuficiente: isInsuficiente
    };

    if (isInsuficiente) {
      mostrarAlerta(
        'aviso', 
        'Estoque Insuficiente', 
        `Você está solicitando ${qtdSolicitada} un, mas o estoque atual na base é de apenas ${estoqueAtual} un!\n\nDeseja adicionar este produto mesmo assim?`,
        () => { 
          setItensAdicionados([...itensAdicionados, itemNovo]);
          setCodigo(''); setDescricao(''); setQuantidade('');
          if (inputCodigoRef.current) inputCodigoRef.current.focus();
          fecharAlerta();
        },
        () => { 
          fecharAlerta();
          if (inputCodigoRef.current) inputCodigoRef.current.focus();
        },
        'Sim, Adicionar',
        'Não, Inserir Novo'
      );
      return; 
    }

    setItensAdicionados([...itensAdicionados, itemNovo]);
    setCodigo(''); setDescricao(''); setQuantidade('');
    if (inputCodigoRef.current) inputCodigoRef.current.focus();
  };

  const iniciarEdicao = (index, qtdAtual) => {
    setEditandoIndex(index);
    setNovaQuantidadeEdit(qtdAtual);
  };

  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setNovaQuantidadeEdit('');
  };

  const salvarEdicao = (index) => {
    if (!novaQuantidadeEdit || Number(novaQuantidadeEdit) <= 0) {
      mostrarAlerta('erro', 'Quantidade Inválida', 'Insira uma quantidade maior que zero para o produto!');
      return;
    }

    const itensAtualizados = [...itensAdicionados];
    const itemAtual = itensAtualizados[index];
    const novaQtd = Number(novaQuantidadeEdit);
    const isInsuficiente = itemAtual.estoque !== null && novaQtd > itemAtual.estoque;

    if (isInsuficiente) {
      mostrarAlerta(
        'aviso', 
        'Estoque Insuficiente', 
        `A nova quantidade solicitada (${novaQtd} un) ultrapassa o estoque atual (${itemAtual.estoque} un)!\n\nDeseja salvar a edição mesmo assim?`,
        () => { 
          itensAtualizados[index] = { ...itemAtual, quantidade: novaQtd, insuficiente: true };
          setItensAdicionados(itensAtualizados);
          cancelarEdicao();
          fecharAlerta();
        },
        () => fecharAlerta(),
        'Sim, Salvar',
        'Cancelar'
      );
      return; 
    }

    itensAtualizados[index] = { ...itemAtual, quantidade: novaQtd, insuficiente: false };
    setItensAdicionados(itensAtualizados);
    cancelarEdicao();
  };

  const removerDaLista = (index) => {
    mostrarAlerta(
      'aviso',
      'Remover Produto',
      'Tem certeza que deseja excluir este item da requisição?',
      () => {
        const novaLista = [...itensAdicionados];
        novaLista.splice(index, 1);
        setItensAdicionados(novaLista);
        fecharAlerta();
      },
      () => fecharAlerta(),
      'Sim, Excluir',
      'Cancelar'
    );
  };

  const handleImportarCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
      const texto = evento.target.result;
      const linhas = texto.split('\n');
      const novosItens = [];

      linhas.forEach((linha, index) => {
        if (!linha.trim()) return;
        const colunas = linha.split(/,|;/); 
        if (colunas.length >= 2) {
          const codFormatado = colunas[0].trim();
          const qtdFormatada = colunas[1].trim();

          if (index === 0 && isNaN(Number(qtdFormatada))) return;

          const produto = baseProdutos.find((p) => p.codigo === codFormatado);
          const descFinal = produto ? produto.descricao : 'Produto não encontrado';
          const temEstoqueDefinido = produto && produto.quantidade !== undefined && produto.quantidade !== null;
          const estoqueAtual = temEstoqueDefinido ? Number(produto.quantidade.toString().replace(',', '.')) : null;
          const qtdSolicitada = Number(qtdFormatada);
          const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

          let custoUnit = 0;
          const campoCustoTotal = produto ? (produto.custo || produto.precoCusto || produto.preco_custo) : null;
          if (campoCustoTotal && estoqueAtual > 0) {
            const custoTotalLimpo = parseValorMoeda(campoCustoTotal);
            custoUnit = custoTotalLimpo / estoqueAtual;
          }

          novosItens.push({
            cod: codFormatado,
            descricao: descFinal,
            quantidade: qtdSolicitada,
            estoque: estoqueAtual,
            custoUnitario: custoUnit,
            insuficiente: isInsuficiente
          });
        }
      });

      if (novosItens.length > 0) {
        setItensAdicionados(prev => [...prev, ...novosItens]);
        const qtdAlertas = novosItens.filter(item => item.insuficiente).length;
        if (qtdAlertas > 0) {
          mostrarAlerta('aviso', 'Importação Parcial', `${novosItens.length} produtos importados.\n\nATENÇÃO: ${qtdAlertas} produto(s) excedem o estoque atual e foram marcados em vermelho na lista.`);
        } else {
          mostrarAlerta('sucesso', 'Importação Concluída', `${novosItens.length} produtos importados com sucesso!`);
        }
      } else {
        mostrarAlerta('erro', 'Falha na Importação', 'Nenhum produto válido encontrado no arquivo.\n\nLembre-se: O formato do CSV deve ser:\nCódigo;Quantidade');
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const finalizarRequisicao = () => {
    if (!solicitante.trim()) { 
      mostrarAlerta('erro', 'Campo Obrigatório', 'Preencha o nome do Solicitante antes de prosseguir.'); 
      return; 
    }

    let motivoFinal = motivo;
    let grauPrioridade = 3; 

    if (!motivo) { 
      mostrarAlerta('erro', 'Campo Obrigatório', 'Selecione o motivo da transferência antes de prosseguir.'); 
      return; 
    }

    if (motivo === 'Rota para clientes') {
      grauPrioridade = 1;
    } else if (motivo === 'Reposição de estoque') {
      grauPrioridade = 2;
    } else if (motivo === 'Produtos para provadores') {
      grauPrioridade = 3;
    } else if (motivo === 'Outros') {
      if (!motivoOutro.trim()) {
        mostrarAlerta('erro', 'Campo Obrigatório', 'Você selecionou "Outros". Por favor, especifique o motivo escrevendo na caixa abaixo.'); 
        return; 
      }
      motivoFinal = motivoOutro;
      grauPrioridade = Number(prioridadeOutro);
    }

    if (itensAdicionados.length === 0) { 
      mostrarAlerta('erro', 'Lista Vazia', 'Adicione pelo menos um produto na lista antes de gravar a requisição.'); 
      return; 
    }

    const itensComProblema = itensAdicionados.filter(item => item.insuficiente);
    if (itensComProblema.length > 0) {
      mostrarAlerta(
        'erro', 
        'Estoque Insuficiente', 
        `Você não pode salvar a requisição com produtos excedendo o estoque disponível.\n\nExistem ${itensComProblema.length} item(ns) destacado(s) em vermelho. Por favor, clique no ícone do lápis (✏️) para ajustar ou na lixeira (🗑️) para remover o item.`
      );
      return; 
    }

    const novaRequisicao = {
      id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
      data: new Date().toLocaleDateString('pt-BR'),
      timestampCriacao: Date.now(), 
      destino: lojaPara,
      solicitante: solicitante,
      motivo: motivoFinal,
      prioridade: grauPrioridade, 
      itens: itensAdicionados.length,
      status: 'Pendente',
      listaItens: itensAdicionados,
      historico: {} 
    };

    mostrarAlerta('sucesso', 'Requisição Concluída!', 'A requisição foi gravada e já está disponível no painel.', () => {
      fecharAlerta();
      aoSalvar(novaRequisicao);
    });
  };

  const valorTotalRequisicao = itensAdicionados.reduce((total, item) => {
    return total + ((item.custoUnitario || 0) * item.quantidade);
  }, 0);

  return (
    <div className="nova-req-container">
      <div className="nova-req-header">
        <h2>Criar Nova Requisição</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Cancelar</button>
      </div>

      <div className="card-formulario">
        
        <div className="form-secao">
          
          <div className="campo-loja">
            <label>Solicitante (Seu Nome):</label>
            <input type="text" className="input-item" placeholder="Ex: Maria" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          </div>

          <div className="linha-dupla">
            <div className="campo-loja">
              <label>Loja Atendente (De):</label>
              <select value={lojaDe} onChange={(e) => setLojaDe(e.target.value)}>
                {lojas.map(loja => <option key={`de-${loja}`} value={loja}>{loja}</option>)}
              </select>
            </div>
            
            <div className="campo-loja">
              <label>Loja Solicitante (Para):</label>
              <select value={lojaPara} onChange={(e) => setLojaPara(e.target.value)}>
                {lojas.map(loja => <option key={`para-${loja}`} value={loja}>{loja}</option>)}
              </select>
            </div>
          </div>

          <div className="campo-loja">
            <label>Motivo da Transferência:</label>
            <select className="input-item" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option value="">Selecione um motivo...</option>
              <option value="Rota para clientes">Rota para clientes (Prioridade Alta)</option>
              <option value="Reposição de estoque">Reposição de estoque (Prioridade Média)</option>
              <option value="Produtos para provadores">Produtos para provadores (Prioridade Baixa)</option>
              <option value="Outros">Outros (Especificar)</option>
            </select>
            
            {motivo === 'Outros' && (
              <div className="linha-dupla" style={{ marginTop: '5px' }}>
                <div className="campo-loja" style={{ flex: 2 }}>
                  <input 
                    type="text" 
                    className="input-item" 
                    placeholder="Especifique o motivo da requisição..." 
                    value={motivoOutro} 
                    onChange={(e) => setMotivoOutro(e.target.value)} 
                  />
                </div>
                <div className="campo-loja" style={{ flex: 1 }}>
                  <select 
                    className="input-item" 
                    value={prioridadeOutro} 
                    onChange={(e) => setPrioridadeOutro(e.target.value)}
                    title="Defina o nível de urgência desta requisição"
                  >
                    <option value="1">Prioridade 1 (Alta / Urgente)</option>
                    <option value="2">Prioridade 2 (Média)</option>
                    <option value="3">Prioridade 3 (Baixa)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
        </div>

        <div className="cabecalho-insercao">
          <h3 style={{ margin: 0 }}>Inserir Produtos</h3>
          
          <div>
            <input 
              type="file" 
              accept=".csv" 
              ref={inputArquivoRef} 
              style={{ display: 'none' }} 
              onChange={handleImportarCSV} 
            />
            <button 
              className="btn-importar" 
              onClick={() => inputArquivoRef.current.click()}
              title="Importe um arquivo contendo apenas 'Código' e 'Quantidade' separados por vírgula"
            >
              📁 Importar Planilha CSV
            </button>
          </div>
        </div>
        
        <div className="linha-insercao">
          <div className="col-curta">
            <input type="text" className="input-item" placeholder="Cód" value={codigo} onChange={(e) => handleMudancaCodigo(e.target.value)} ref={inputCodigoRef} />
          </div>
          <div className="col-longa">
            <input type="text" className="input-item" placeholder="Descrição..." value={descricao} disabled />
          </div>
          <div className="col-curta">
            <input type="number" className="input-item" placeholder="Qtd" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarNaLista()} />
          </div>
          <button className="btn-adicionar" onClick={adicionarNaLista}>
            Adicionar ↓
          </button>
        </div>

        {itensAdicionados.length > 0 && (
          <>
            <div className="tabela-wrapper">
              <table className="tabela-itens">
                <thead>
                  <tr>
                    <th>Cód. Produto</th>
                    <th>Descrição</th>
                    <th>Qtd. Solicitada</th>
                  </tr>
                </thead>
                <tbody>
                  {itensAdicionados.map((item, index) => (
                    <tr key={index} className={item.insuficiente ? 'linha-alerta-estoque' : ''}>
                      <td><strong>{item.cod}</strong></td>
                      <td className={item.descricao === 'Produto não encontrado' ? 'texto-erro' : ''}>
                        {item.descricao}
                        
                        {item.insuficiente && item.descricao !== 'Produto não encontrado' && (
                          <div>
                            <span className="badge-estoque">
                              Estoque atual: {item.estoque} un
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {editandoIndex === index ? (
                          <div className="edicao-container-nova">
                            <input 
                              type="number" 
                              className="input-qtd-edit-nova" 
                              value={novaQuantidadeEdit} 
                              onChange={(e) => setNovaQuantidadeEdit(e.target.value)} 
                            />
                            <button className="btn-acao-edit-nova" onClick={() => salvarEdicao(index)} title="Salvar">✔️</button>
                            <button className="btn-acao-edit-nova" onClick={cancelarEdicao} title="Cancelar">❌</button>
                          </div>
                        ) : (
                          <div className="quantidade-container-nova">
                            <strong>{item.quantidade} un</strong>
                            
                            <button 
                              className="btn-editar-item-nova" 
                              onClick={() => iniciarEdicao(index, item.quantidade)}
                              title="Editar quantidade"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-remover-item-nova" 
                              onClick={() => removerDaLista(index)}
                              title="Remover item"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="resumo-valores">
              <div className="resumo-valores-texto">
                <strong>Atenção:</strong> Esta transferência movimenta produtos físicos. 
                O valor total estimado (a preço de custo) desta operação é de:
              </div>
              <div className="resumo-valores-total">
                {valorTotalRequisicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </>
        )}
        
        <div className="rodape-formulario">
          <button className="btn-salvar" onClick={finalizarRequisicao}>Gravar Requisição</button>
        </div>
      </div>

      {alerta.visivel && (
        <div className="alerta-modal-overlay">
          <div className="alerta-modal-box">
            
            <div className={`alerta-modal-header tipo-${alerta.tipo}`}>
              {alerta.tipo === 'erro' && '🚨'}
              {alerta.tipo === 'sucesso' && '✅'}
              {alerta.tipo === 'aviso' && '⚠️'}
              {alerta.titulo}
            </div>

            <div className="alerta-modal-body">
              {alerta.mensagem.split('\n').map((linha, i) => (
                <span key={i}>
                  {linha}
                  <br/>
                </span>
              ))}
            </div>

            <div className="alerta-modal-footer">
              {alerta.onCancel && (
                <button className="btn-alerta btn-alerta-cancelar" onClick={alerta.onCancel}>
                  {alerta.textoCancelar}
                </button>
              )}
              
              <button 
                className={`btn-alerta btn-alerta-confirmar tipo-${alerta.tipo}`} 
                onClick={() => {
                  if (alerta.onConfirm) alerta.onConfirm();
                  else fecharAlerta();
                }}
              >
                {alerta.textoConfirmar}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}