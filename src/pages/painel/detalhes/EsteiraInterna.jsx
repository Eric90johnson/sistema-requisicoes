import React, { useState } from 'react';
import '../../../styles/pages/painel/detalhes/esteira.css';

export default function EsteiraInterna({ req, onProcessar }) {
  const [responsavel, setResponsavel] = useState('');

  if (req.status === 'Em Separação' || req.status === 'Concluída' || req.status === 'Cancelada') return null;

  const handleAvancar = (proximoStatus) => {
    onProcessar(proximoStatus, responsavel);
    setResponsavel('');
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

  if (req.status === 'Separado' || req.status === 'Recebimento') {
    return (
      <div className="esteira-box">
        <h3>🏢 Finalizar Reposição Interna</h3>
        <div className="esteira-inputs">
          <div className="esteira-input-group">
            <label>Nome do Recebedor</label>
            <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
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