import { useState } from 'react';
import '../../../styles/pages/painel/detalhes/detalhes.css';

// 1. Recebemos a nova função aoAtualizarItens aqui
export default function DetalhesRequisicao({ req, aoVoltar, aoMudarStatus, aoAtualizarItens }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  const [itens, setItens] = useState(req.listaItens || []);
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Separado': return 'status-separado';
      case 'Faturado': return 'status-faturado';
      case 'Enviado': return 'status-enviado';
      case 'Recebido': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  const confirmarMudanca = () => {
    if (!responsavel.trim()) {
      alert("Por favor, insira seu nome para assumir a responsabilidade!");
      return;
    }
    
    if (novoStatus === 'Separado' && !numReqExterna.trim()) {
      alert("Por favor, insira o Número da Requisição gerado pelo sistema da loja!");
      return;
    }
    
    if (novoStatus === 'Faturado' && !notaFiscal.trim()) {
      alert("Por favor, insira o Número da Nota Fiscal de transferência!");
      return;
    }

    const dadosExtras = {};
    if (novoStatus === 'Separado') dadosExtras.numeroRequisicaoExterna = numReqExterna;
    if (novoStatus === 'Faturado') dadosExtras.notaFiscal = notaFiscal;
    
    // Na confirmação de status, mandamos a lista atual também por segurança
    dadosExtras.listaItensAtualizada = itens; 

    aoMudarStatus(req.id, novoStatus, responsavel, dadosExtras);
    
    setResponsavel('');
    setNumReqExterna('');
    setNotaFiscal('');
  };

  const iniciarEdicao = (index, qtdAtual, obsAtual) => {
    setEditandoIndex(index);
    setNovaQuantidade(qtdAtual);
    setMotivoAlteracao(obsAtual || '');
  };

  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setNovaQuantidade('');
    setMotivoAlteracao('');
  };

  const salvarEdicao = (index) => {
    if (motivoAlteracao.trim().length < 10) {
      alert('Atenção: O motivo da alteração deve conter no mínimo 10 caracteres para justificar a mudança.');
      return;
    }

    const itensAtualizados = [...itens];
    itensAtualizados[index] = {
      ...itensAtualizados[index],
      quantidade: novaQuantidade,
      observacao: motivoAlteracao
    };

    setItens(itensAtualizados); // Atualiza a tela na hora
    
    // 2. A MÁGICA ACONTECE AQUI: Salva na memória global (App.jsx) imediatamente
    if (aoAtualizarItens) {
      aoAtualizarItens(req.id, itensAtualizados);
    }
    
    cancelarEdicao();
  };

  return (
    <div className="detalhes-container">
      <div className="detalhes-header">
        <h2>Detalhes da Requisição {req.id}</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
      </div>

      {/* CARD 1: INFORMAÇÕES E STATUS (Seu código intacto) */}
      <div className="card-info">
        <div className="info-grid">
          <div className="info-item"><label>Solicitante</label><span>{req.solicitante}</span></div>
          <div className="info-item"><label>Data da Solicitação</label><span>{req.data}</span></div>
          <div className="info-item"><label>Loja Destino (Para)</label><span>{req.destino}</span></div>
          <div className="info-item">
            <label>Status Atual</label>
            <div><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></div>
          </div>
          
          {req.numeroRequisicaoExterna && (
            <div className="info-item">
              <label>Nº Req. Sistema</label>
              <span style={{ color: '#2980b9' }}>{req.numeroRequisicaoExterna}</span>
            </div>
          )}
          {req.notaFiscal && (
            <div className="info-item">
              <label>Nota Fiscal</label>
              <span style={{ color: '#e67e22' }}>{req.notaFiscal}</span>
            </div>
          )}
        </div>

        <div className="controle-status" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Atualizar Status:</strong>
          <select className="select-status" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
            <option value="Pendente">Pendente</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Separado">Separado</option>
            <option value="Faturado">Faturado</option>
            <option value="Enviado">Enviado</option>
            <option value="Recebido">Recebido</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Nome do Responsável" 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', flex: '1', minWidth: '150px' }}
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />

          {novoStatus === 'Separado' && (
            <input 
              type="text" 
              placeholder="Nº da Req. no Sistema" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #3498db', flex: '1', minWidth: '180px' }}
              value={numReqExterna}
              onChange={(e) => setNumReqExterna(e.target.value)}
            />
          )}

          {novoStatus === 'Faturado' && (
            <input 
              type="text" 
              placeholder="Nº da Nota Fiscal" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #e67e22', flex: '1', minWidth: '180px' }}
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
            />
          )}
          
          <button 
            style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={confirmarMudanca}
          >
            Confirmar
          </button>
        </div>
      </div>

      {/* CARD 2: LISTA DE PRODUTOS MESCLADA COM A NOVA FUNÇÃO E NOVO LAYOUT */}
      <div className="card-info">
        <h3>Lista de Produtos ({req.itens} itens)</h3>
        <table className="tabela-itens" style={{ marginTop: '15px', width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px' }}>Código</th>
              <th style={{ padding: '10px' }}>Descrição</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Qtd. Solicitada / Separada</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}><strong>{item.cod}</strong></td>
                <td style={{ padding: '10px' }}>{item.descricao}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {editandoIndex === index ? (
                    // MODO EDIÇÃO INLINE
                    <div className="edicao-container">
                      <div className="edicao-linha">
                        <input 
                          type="number" 
                          className="input-qtd-edit" 
                          value={novaQuantidade} 
                          onChange={(e) => setNovaQuantidade(e.target.value)} 
                        />
                        <input 
                          type="text" 
                          className="input-obs-edit" 
                          placeholder="Motivo da alteração..." 
                          value={motivoAlteracao} 
                          onChange={(e) => setMotivoAlteracao(e.target.value)} 
                        />
                        <button className="btn-acao-edit" onClick={() => salvarEdicao(index)} title="Salvar">✔️</button>
                        <button className="btn-acao-edit" onClick={cancelarEdicao} title="Cancelar">❌</button>
                      </div>
                    </div>
                  ) : (
                    // MODO DE VISUALIZAÇÃO COM LÁPIS E NOVO CONTAINER
                    <div>
                      <div className="quantidade-container">
                        <span>{item.quantidade} un</span>
                        
                        {/* O lápis só aparece se a requisição estiver 'Em Separação' */}
                        {req.status === 'Em Separação' && (
                          <button 
                            className="btn-editar-item" 
                            onClick={() => iniciarEdicao(index, item.quantidade, item.observacao)}
                            title="Ajustar quantidade física"
                          >
                            ✏️
                          </button>
                        )}
                      </div>

                      {/* Exibe o motivo da quebra caso exista */}
                      {item.observacao && (
                        <span className="texto-observacao">
                          Obs: {item.observacao}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}