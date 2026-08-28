import React, { useState } from 'react';
import '../../../styles/pages/painel/detalhes/observacoesReq.css';

export default function ObservacoesReq({ req, usuarioLogado, aoAtualizarObservacoes, exibirPopup }) {
  const [novaObs, setNovaObs] = useState('');

  const obsBrutas = req.historico?.observacoesGerais;
  let listaObservacoes = [];

  if (Array.isArray(obsBrutas)) {
    listaObservacoes = obsBrutas;
  } else if (typeof obsBrutas === 'string' && obsBrutas.trim() !== '') {
    listaObservacoes = [{
      id_obs: 'legado',
      texto: obsBrutas,
      autor: 'Sistema (Nota Antiga)',
      data: req.data || 'Data anterior'
    }];
  }

  const handleAdicionarObservacaoLista = () => {
    if (!novaObs.trim()) { 
      exibirPopup('aviso', 'Atenção', 'Digite alguma instrução ou observação antes de adicionar.'); 
      return; 
    }
    const autorAtual = usuarioLogado?.nome_completo || usuarioLogado?.username || 'Usuário Não Identificado';
    
    aoAtualizarObservacoes(req.id, novaObs, autorAtual);
    setNovaObs('');
    exibirPopup('sucesso', 'Salvo', 'A observação foi registrada no histórico!');
  };

  return (
    <div className="info-item obs-geral-box">
      <label>📝 Histórico de Observações / Instruções</label>
      
      <div className="lista-observacoes-wrapper">
        {listaObservacoes.length > 0 ? (
          <ul className="lista-obs-ul">
            {listaObservacoes.map((obs, i) => (
              <li key={obs.id_obs || i} className="item-obs-li">
                <div className="obs-meta">
                  <strong>{obs.autor}</strong> em {obs.data}
                </div>
                <div className="obs-conteudo">{obs.texto}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="obs-readonly">
            <span className="obs-vazia">Nenhuma instrução adicional registrada nesta requisição.</span>
          </div>
        )}
      </div>

      {(req.status === 'Pendente' || req.status === 'Em Separação') && (
        <div className="obs-add-mode">
          <textarea 
            className="obs-textarea-nova" 
            value={novaObs} 
            onChange={e => setNovaObs(e.target.value)} 
            placeholder="Escreva uma nova observação ou instrução para esta requisição..." 
          />
          <button className="btn-adicionar-obs-lista" onClick={handleAdicionarObservacaoLista}>
            ➕ Adicionar Observação
          </button>
        </div>
      )}
    </div>
  );
}