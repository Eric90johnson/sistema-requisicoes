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

  const inputCodigoRef = useRef(null);
  const inputArquivoRef = useRef(null);

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
    if (!codigo || !quantidade) { alert('Preencha o código e a quantidade!'); return; }
    
    const produto = baseProdutos.find((p) => p.codigo === codigo);
    const temEstoqueDefinido = produto && produto.quantidade !== undefined && produto.quantidade !== null;
    const estoqueAtual = temEstoqueDefinido ? Number(produto.quantidade.toString().replace(',', '.')) : null;
    const qtdSolicitada = Number(quantidade);
    
    const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

    if (isInsuficiente) {
      alert(`Aviso: Você está solicitando ${qtdSolicitada} un, mas o estoque atual na base é de apenas ${estoqueAtual} un! O item será adicionado em vermelho para revisão.`);
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

  // Funções de Edição Inline
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
      alert('Insira uma quantidade válida!');
      return;
    }

    const itensAtualizados = [...itensAdicionados];
    const itemAtual = itensAtualizados[index];
    const novaQtd = Number(novaQuantidadeEdit);
    
    // Recalcula se a nova quantidade bate com o estoque
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
          alert(`${novosItens.length} produtos importados! ATENÇÃO: ${qtdAlertas} produto(s) excedem o estoque atual e foram marcados em vermelho na lista.`);
        } else {
          alert(`${novosItens.length} produtos importados com sucesso!`);
        }
      } else {
        alert('Nenhum produto válido encontrado no arquivo. O formato deve ser: Código;Quantidade');
      }
      
      e.target.value = null; 
    };
    
    reader.readAsText(file);
  };

  const finalizarRequisicao = () => {
    if (!solicitante.trim()) { alert('Preencha o nome do Solicitante!'); return; }
    if (!motivo.trim()) { alert('Preencha o motivo da transferência!'); return; }
    if (itensAdicionados.length === 0) { alert('Adicione pelo menos um item!'); return; }

    // Trava de segurança: Bloqueia a gravação se houver algum item vermelho
    const temErroDeEstoque = itensAdicionados.some(item => item.insuficiente);
    if (temErroDeEstoque) {
      alert('Existem produtos solicitados com quantidades superiores ao que há na base de dados atuais. Solicite a alteração da base de dados do sistema ou edite a quantidade desejada.');
      return; // O 'return' impede que o código continue e grave a requisição
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

    aoSalvar(novaRequisicao);
    alert('Requisição gravada com sucesso!');
  };

  return (
    <div className="nova-req-container">
      <div className="nova-req-header">
        <h2>Criar Nova Requisição</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Cancelar</button>
      </div>

      <div className="card-formulario">
        
        <div className="grupo-lojas-grid">
          <div className="campo-loja">
            <label>Solicitante (Seu Nome):</label>
            <input type="text" className="input-item" placeholder="Ex: Maria" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          </div>
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

        <div className="campo-loja campo-motivo">
          <label>Motivo da Transferência:</label>
          <input 
            type="text" 
            className="input-item input-motivo" 
            placeholder="Ex: Reposição de estoque, Transferência de mostruário, Pedido especial..." 
            value={motivo} 
            onChange={(e) => setMotivo(e.target.value)} 
          />
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
                        // MODO DE EDIÇÃO
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
                        // MODO DE VISUALIZAÇÃO COM LÁPIS
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
    </div>
  );
}