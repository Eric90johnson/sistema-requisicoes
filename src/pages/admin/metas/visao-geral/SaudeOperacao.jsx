import React from 'react';

export default function SaudeOperacao({ saude }) {
  return (
    <div className="painel-card">
      <div className="card-header">
        <h4>Saúde da Operação</h4>
        <span>Indicadores críticos do dia (Tempo Real)</span>
      </div>
      <div className="saude-lista">
        <div className="saude-item">
          <span className="s-icon">📄</span> <span className="s-label">Requisições pendentes</span>
          <span className="s-val">{saude.reqPendentes}</span> <span className={`s-tag ${saude.reqPendentes > 10 ? 'tag-atencao' : 'tag-normal'}`}>{saude.reqPendentes > 10 ? 'Atenção' : 'Normal'}</span>
        </div>
        <div className="saude-item">
          <span className="s-icon">⏱</span> <span className="s-label">Requisições vencidas</span>
          <span className="s-val">{saude.reqVencidas}</span> <span className={`s-tag ${saude.reqVencidas > 0 ? 'tag-critico' : 'tag-normal'}`}>{saude.reqVencidas > 0 ? 'Crítico' : 'Normal'}</span>
        </div>
        <div className="saude-item">
          <span className="s-icon">🔄</span> <span className="s-label">Reposições pendentes</span>
          <span className="s-val">{saude.repoPendentes}</span> <span className={`s-tag ${saude.repoPendentes > 5 ? 'tag-atencao' : 'tag-normal'}`}>{saude.repoPendentes > 5 ? 'Atenção' : 'Normal'}</span>
        </div>
        <div className="saude-item">
          <span className="s-icon">🚛</span> <span className="s-label">Recebimentos pendentes</span>
          <span className="s-val">{saude.recPendentes}</span> <span className={`s-tag ${saude.recPendentes > 2 ? 'tag-atencao' : 'tag-normal'}`}>{saude.recPendentes > 2 ? 'Atenção' : 'Normal'}</span>
        </div>
        <div className="saude-item">
          <span className="s-icon">⚠️</span> <span className="s-label">Divergências pendentes</span>
          <span className="s-val">{saude.divergencias}</span> <span className={`s-tag ${saude.divergencias > 0 ? 'tag-critico' : 'tag-normal'}`}>{saude.divergencias > 0 ? 'Crítico' : 'Normal'}</span>
        </div>
        <div className="saude-item">
          <span className="s-icon">✔️</span> <span className="s-label">Autorizações pendentes</span>
          <span className="s-val">{saude.authPendentes}</span> <span className={`s-tag ${saude.authPendentes > 0 ? 'tag-atencao' : 'tag-normal'}`}>{saude.authPendentes > 0 ? 'Atenção' : 'Normal'}</span>
        </div>
      </div>
    </div>
  );
}