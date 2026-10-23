import React from 'react';

export default function RankingColaboradores({ rankingGeralReal, metaUpmAtual }) {
  return (
    <div className="painel-card">
      <div className="card-header flex-space-between">
        <div>
          <h4>Ranking de Colaboradores</h4>
          <span>Baseado na UPM vs. Meta Atual ({metaUpmAtual})</span>
        </div>
      </div>
      <table className="tabela-ranking-limpa">
        <thead>
          <tr><th>#</th><th>Colaborador</th><th>UPM Real</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {rankingGeralReal.slice(0, 10).map((colab, idx) => {
            const metaValida = metaUpmAtual > 0 ? metaUpmAtual : 1;
            const upmFormatado = Number(colab.upm) || 0;
            const perc = Math.round((upmFormatado / metaValida) * 100) || 0;
            
            return (
              <tr key={idx}>
                <td>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                <td>{colab.nome}</td>
                <td><strong>{upmFormatado}</strong></td>
                <td style={{ color: perc >= 100 ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>{perc}%</td>
              </tr>
            );
          })}
          {rankingGeralReal.length === 0 && <tr><td colSpan="4" className="tabela-vazia">Nenhum dado encontrado para os filtros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}