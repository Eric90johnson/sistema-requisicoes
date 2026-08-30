import React, { useState } from 'react';
import '../../../styles/pages/painel/detalhes/esteira.css';

export default function EsteiraExterna({ req, onProcessar }) {
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  if (req.status === 'Em Separação' || req.status === 'Concluída' || req.status === 'Cancelada') return null;

  const handleAvancar = (proximoStatus) => {
    onProcessar(proximoStatus, responsavel, { numReqExterna, notaFiscal });
    setResponsavel('');
    if (proximoStatus === 'Faturamento') setNumReqExterna('');
    if (proximoStatus === 'Transporte') setNotaFiscal('');
  };

  if (req.status === 'Pendente') {
    return (
      <div className="esteira-box" style={{ borderLeftColor: '#f39c12' }}>
        <h3 style={{ color: '#d35400' }}>▶️ Etapa 0: Iniciar Separação</h3>
        <p style={{marginBottom: '15px', color: '#7f8c8d', fontSize: '0.95rem'}}>
          Informe seu nome para assumir a requisição e mudar o status para "Em Separação".
        </p>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Seu Nome (Separador)</label>
            <input type="text" placeholder="Ex: Carlos" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <button className="btn-avancar-esteira" onClick={() => handleAvancar('Em Separação')}>
            Começar Separação ➔
          </button>
        </div>
      </div>
    );
  }

  if (req.status === 'Separado') {
    return (
      <div className="esteira-box">
        <h3>📦 Etapa 1: Dar Saída dos Produtos</h3>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Seu Nome (Quem dá saída)</label>
            <input type="text" placeholder="Ex: João" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <div className="esteira-input-group">
            <label>Nº da Ordem Interna (Req. Sistema)</label>
            <input type="text" placeholder="Ex: REQ-12345" value={numReqExterna} onChange={e => setNumReqExterna(e.target.value)} />
          </div>
          <button className="btn-avancar-esteira" onClick={() => handleAvancar('Faturamento')}>
            Confirmar Saída ➔
          </button>
        </div>
      </div>
    );
  }

  if (req.status === 'Faturamento' || req.status === 'Saída de produtos') {
    return (
      <div className="esteira-box">
        <h3>🧾 Etapa 2: Faturamento</h3>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Seu Nome (Quem faturou)</label>
            <input type="text" placeholder="Ex: Ana (Faturamento)" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <div className="esteira-input-group">
            <label>Nº da Nota Fiscal</label>
            <input type="text" placeholder="Ex: NF 987654" value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} />
          </div>
          <button className="btn-avancar-esteira" onClick={() => handleAvancar('Transporte')}>
            Confirmar Faturamento ➔
          </button>
        </div>
      </div>
    );
  }

  if (req.status === 'Transporte') {
    return (
      <div className="esteira-box">
        <h3>🚛 Etapa 3: Transporte</h3>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Nome do Motorista</label>
            <input type="text" placeholder="Ex: Motorista Carlos" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <button className="btn-avancar-esteira" onClick={() => handleAvancar('Recebimento')}>
            Confirmar Envio ➔
          </button>
        </div>
      </div>
    );
  }

  if (req.status === 'Recebimento') {
    return (
      <div className="esteira-box">
        <h3>🏬 Etapa 4: Recebimento na Loja</h3>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Nome de quem recebeu</label>
            <input type="text" placeholder="Ex: Gerente Fernanda" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
          </div>
          <button className="btn-avancar-esteira" onClick={() => handleAvancar('Concluída')}>
            Confirmar Recebimento ✔️
          </button>
        </div>
      </div>
    );
  }

  return null;
}