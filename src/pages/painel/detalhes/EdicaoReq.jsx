import React, { useState } from 'react';
import '../../../styles/pages/painel/detalhes/edicaoReq.css';

export default function EdicaoReq({ req, aoIniciarEdicao, exibirPopup }) {
  const [modoEditarReq, setModoEditarReq] = useState(false);
  const [nomeEditorEdicao, setNomeEditorEdicao] = useState('');

  if (req.status !== 'Pendente') return null;

  return (
    <div className="box-assumir-tarefa box-editar-req">
      <div className="assumir-info">
        <span><strong>Modo de Edição:</strong> Altere quantidades, adicione novos produtos, remova itens ou cancele a requisição. A requisição ficará oculta do painel durante a edição.</span>
        {req.historico?.['Última Edição'] && (
          <div style={{fontSize: '0.8rem', marginTop: '5px', color: '#8e44ad'}}>
            Última edição: {req.historico['Última Edição']}
          </div>
        )}
      </div>
      
      {!modoEditarReq ? (
        <button className="btn-assumir btn-editar-roxo" onClick={() => setModoEditarReq(true)}>
          ✏️ Editar Requisição Completa
        </button>
      ) : (
        <div className="linha-assumir">
          <input 
            type="text" 
            placeholder="Digite seu nome para auditar..." 
            value={nomeEditorEdicao} 
            onChange={(e) => setNomeEditorEdicao(e.target.value)} 
          />
          <button className="btn-confirmar-assumir btn-roxo-escuro" onClick={() => {
            if (!nomeEditorEdicao.trim()) { exibirPopup('aviso', 'Atenção', 'Digite seu nome obrigatoriamente para registrar a edição!'); return; }
            aoIniciarEdicao(req.id, nomeEditorEdicao);
          }}>Prosseguir para Edição</button>
          <button className="btn-cancelar-assumir" onClick={() => { setModoEditarReq(false); setNomeEditorEdicao(''); }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}