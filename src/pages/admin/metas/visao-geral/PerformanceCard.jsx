import React from 'react';

export default function PerformanceCard({ titulo, percentual, cor, isGeral = false }) {
  return (
    <div className={`perf-card ${isGeral ? 'card-geral' : ''}`}>
      <div className="perf-header">
        <span className="perf-titulo" style={{ color: cor }}>{titulo}</span>
      </div>
      <div className="perf-valor">{percentual}%</div>
      <div className="perf-status" style={{ color: cor }}>
        {percentual >= 100 ? 'Excelente' : percentual >= 80 ? 'Dentro da meta' : percentual > 0 ? 'Atenção' : 'Sem Produção'}
      </div>
      <div className="perf-barra-bg">
        <div className="perf-barra-fill" style={{ width: `${Math.min(100, percentual)}%`, backgroundColor: cor }}></div>
      </div>
    </div>
  );
}