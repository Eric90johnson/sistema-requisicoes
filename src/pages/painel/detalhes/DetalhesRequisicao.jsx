import { useState } from 'react';
import '../../../styles/pages/painel/detalhes/detalhes.css';

export default function DetalhesRequisicao({ req, aoVoltar, aoMudarStatus }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  
  // Novos estados para os campos condicionais
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

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
    
    // Validações condicionais
    if (novoStatus === 'Separado' && !numReqExterna.trim()) {
      alert("Por favor, insira o Número da Requisição gerado pelo sistema da loja!");
      return;
    }
    
    if (novoStatus === 'Faturado' && !notaFiscal.trim()) {
      alert("Por favor, insira o Número da Nota Fiscal de transferência!");
      return;
    }

    // Prepara os dados extras
    const dadosExtras = {};
    if (novoStatus === 'Separado') dadosExtras.numeroRequisicaoExterna = numReqExterna;
    if (novoStatus === 'Faturado') dadosExtras.notaFiscal = notaFiscal;

    // Envia tudo para o App.jsx salvar
    aoMudarStatus(req.id, novoStatus, responsavel, dadosExtras);
    
    // Limpa os campos após salvar
    setResponsavel('');
    setNumReqExterna('');
    setNotaFiscal('');
  };

  return (
    <div className="detalhes-container">
      <div className="detalhes-header">
        <h2>Detalhes da Requisição {req.id}</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
      </div>

      <div className="card-info">
        <div className="info-grid">
          <div className="info-item"><label>Solicitante</label><span>{req.solicitante}</span></div>
          <div className="info-item"><label>Data da Solicitação</label><span>{req.data}</span></div>
          <div className="info-item"><label>Loja Destino (Para)</label><span>{req.destino}</span></div>
          <div className="info-item">
            <label>Status Atual</label>
            <div><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></div>
          </div>
          
          {/* Exibe os números gravados anteriormente, se existirem */}
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

        {/* Adicionado flexWrap para não quebrar a tela com os novos campos */}
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

          {/* Campo condicional para Separado */}
          {novoStatus === 'Separado' && (
            <input 
              type="text" 
              placeholder="Nº da Req. no Sistema" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #3498db', flex: '1', minWidth: '180px' }}
              value={numReqExterna}
              onChange={(e) => setNumReqExterna(e.target.value)}
            />
          )}

          {/* Campo condicional para Faturado */}
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

      <div className="card-info">
        <h3>Lista de Produtos ({req.itens} itens)</h3>
        <table className="tabela-itens" style={{ marginTop: '15px', width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px' }}>Código</th>
              <th style={{ padding: '10px' }}>Descrição</th>
              <th style={{ padding: '10px' }}>Qtd</th>
            </tr>
          </thead>
          <tbody>
            {req.listaItens && req.listaItens.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}><strong>{item.cod}</strong></td>
                <td style={{ padding: '10px' }}>{item.descricao}</td>
                <td style={{ padding: '10px' }}>{item.quantidade} un</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}