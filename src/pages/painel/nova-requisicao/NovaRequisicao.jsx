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

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itensAdicionados, setItensAdicionados] = useState([]);
  
  const inputCodigoRef = useRef(null);

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
    setItensAdicionados([
      ...itensAdicionados, 
      { cod: codigo, descricao: descricao || 'Produto não encontrado', quantidade: quantidade }
    ]);
    setCodigo(''); setDescricao(''); setQuantidade('');
    
    if (inputCodigoRef.current) inputCodigoRef.current.focus();
  };

  const finalizarRequisicao = () => {
    if (!solicitante.trim()) { alert('Preencha o nome do Solicitante!'); return; }
    if (itensAdicionados.length === 0) { alert('Adicione pelo menos um item!'); return; }

    const novaRequisicao = {
      id: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
      data: new Date().toLocaleDateString('pt-BR'),
      destino: lojaPara,
      solicitante: solicitante,
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
        
        {/* Usando a nova classe CSS para o layout das lojas (Responsivo) */}
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

        <h3>Inserir Produtos</h3>
        
        <div className="linha-insercao" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '100px' }}>
            <input type="text" className="input-item" placeholder="Cód" value={codigo} onChange={(e) => handleMudancaCodigo(e.target.value)} ref={inputCodigoRef} />
          </div>
          <div style={{ flex: '3', minWidth: '200px' }}>
            <input type="text" className="input-item" placeholder="Descrição..." value={descricao} disabled />
          </div>
          <div style={{ flex: '1', minWidth: '100px' }}>
            <input type="number" className="input-item" placeholder="Qtd" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarNaLista()} />
          </div>
          <button 
            className="btn-adicionar" 
            onClick={adicionarNaLista} 
            style={{ padding: '10px 20px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Adicionar ↓
          </button>
        </div>

        {itensAdicionados.length > 0 && (
          /* Emcapsulamento da tabela para permitir rolagem no celular sem quebrar a tela */
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table className="tabela-itens" style={{ width: '100%', minWidth: '500px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Cód. Produto</th>
                  <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Descrição</th>
                  <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee' }}>Qtd. Solicitada</th>
                </tr>
              </thead>
              <tbody>
                {itensAdicionados.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}><strong>{item.cod}</strong></td>
                    <td style={{ padding: '10px' }}>{item.descricao}</td>
                    <td style={{ padding: '10px' }}>{item.quantidade} un</td>
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