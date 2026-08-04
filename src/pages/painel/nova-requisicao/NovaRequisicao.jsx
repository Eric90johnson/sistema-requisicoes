import { useState, useRef } from 'react';
import '../../../styles/pages/painel/nova-requisicao/novaRequisicao.css';

export default function NovaRequisicao({ aoVoltar, baseProdutos, aoSalvar }) {
  const lojas = [
    'Loja Neta Dantas Araturi (matriz)', 
    'Loja Neta Dantas Conjunto Ceará', 
    'Loja Neta Dantas Messejana'
  ];

  const [lojaDe, setLojaDe] = useState(lojas[0]);
  const [lojaPara, setLojaPara] = useState(lojas[1]);
  const [solicitante, setSolicitante] = useState('');
  const [motivo, setMotivo] = useState('');

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itensAdicionados, setItensAdicionados] = useState([]);
  
  // Estados para edição inline
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [novaQuantidadeEdit, setNovaQuantidadeEdit] = useState('');

  // ESTADO DO ALERTA PERSONALIZADO
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', acao: null });

  const inputCodigoRef = useRef(null);
  const inputArquivoRef = useRef(null);

  // FUNÇÃO PARA CHAMAR O ALERTA
  const mostrarAlerta = (tipo, titulo, mensagem, acao = null) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem, acao });
  };

  const fecharAlerta = () => {
    if (alerta.acao) {
      alerta.acao(); // Executa a ação pendente (se houver) ao fechar
    }
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

    if (isInsuficiente) {
      mostrarAlerta('aviso', 'Atenção ao Estoque', `Você está solicitando ${qtdSolicitada} un, mas o estoque atual na base é de apenas ${estoqueAtual} un!\n\nO item será adicionado em vermelho para revisão.`);
    }

    setItensAdicionados([
      ...itensAdicionados, 
      { 
        cod: codigo, 
        descricao: descricao || 'Produto não encontrado', 
        quantidade: qtdSolicitada,
        estoque: estoqueAtual,
        insuficiente: isInsuficiente
      }
    ]);
    
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

    itensAtualizados[index] = {
      ...itemAtual,
      quantidade: novaQtd,
      insuficiente: isInsuficiente
    };

    setItensAdicionados(itensAtualizados);
    cancelarEdicao();
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

          novosItens.push({
            cod: codFormatado,
            descricao: descFinal,
            quantidade: qtdSolicitada,
            estoque: estoqueAtual,
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
    if (!motivo.trim()) { 
      mostrarAlerta('erro', 'Campo Obrigatório', 'Preencha o motivo da transferência antes de prosseguir.'); 
      return; 
    }
    if (itensAdicionados.length === 0) { 
      mostrarAlerta('erro', 'Lista Vazia', 'Adicione pelo menos um produto na lista antes de gravar a requisição.'); 
      return; 
    }

    const temErroDeEstoque = itensAdicionados.some(item => item.insuficiente);
    if (temErroDeEstoque) {
      mostrarAlerta('erro', 'Estoque Insuficiente', 'Existem produtos solicitados com quantidades superiores ao que há na base de dados.\n\nSolicite a alteração da base de dados do sistema ou edite a quantidade em vermelho para continuar.');
      return; 
    }

    const novaRequisicao = {
      id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
      data: new Date().toLocaleDateString('pt-BR'),
      destino: lojaPara,
      solicitante: solicitante,
      motivo: motivo,
      itens: itensAdicionados.length,
      status: 'Pendente',
      listaItens: itensAdicionados,
      historico: {} 
    };

    // Alerta de sucesso que, ao ser fechado, salva e muda a tela
    mostrarAlerta('sucesso', 'Requisição Concluída!', 'A requisição foi gravada e já está disponível no painel.', () => {
      aoSalvar(novaRequisicao);
    });
  };

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
              <label>Loja Solicitante (De):</label>
              <select value={lojaDe} onChange={(e) => setLojaDe(e.target.value)}>
                {lojas.map(loja => <option key={`de-${loja}`} value={loja}>{loja}</option>)}
              </select>
            </div>
            
            <div className="campo-loja">
              <label>Loja Atendente (Para):</label>
              <select value={lojaPara} onChange={(e) => setLojaPara(e.target.value)}>
                {lojas.map(loja => <option key={`para-${loja}`} value={loja}>{loja}</option>)}
              </select>
            </div>
          </div>

          <div className="campo-loja">
            <label>Motivo da Transferência:</label>
            <input 
              type="text" 
              className="input-item" 
              placeholder="Ex: Reposição de estoque, Transferência de mostruário, Pedido especial..." 
              value={motivo} 
              onChange={(e) => setMotivo(e.target.value)} 
            />
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
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="rodape-formulario">
          <button className="btn-salvar" onClick={finalizarRequisicao}>Gravar Requisição</button>
        </div>
      </div>

      {/* --- RENDERIZAÇÃO DO MODAL DE ALERTA --- */}
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
              {/* O map ajuda a pular linha caso enviemos o texto com "\n" */}
              {alerta.mensagem.split('\n').map((linha, i) => (
                <span key={i}>
                  {linha}
                  <br/>
                </span>
              ))}
            </div>

            <div className="alerta-modal-footer">
              <button className="btn-fechar-alerta" onClick={fecharAlerta}>
                Entendi
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}