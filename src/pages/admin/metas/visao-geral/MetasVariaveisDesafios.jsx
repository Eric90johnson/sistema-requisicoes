import React from 'react';

export default function MetasVariaveisDesafios({ metasVariaveisList, isGestor, handleLancarProgressoMeta }) {
  return (
    <div className="painel-card card-destaque-roxo">
      <div className="card-header">
        <h4 className="titulo-roxo">⭐ Metas Variáveis e Desafios</h4>
        <span>Progresso das campanhas vigentes.</span>
      </div>
      <div className="saude-lista mt-10">
        {metasVariaveisList.length > 0 ? (
          metasVariaveisList.map(mv => {
            const progressoNum = Number(mv.valor_atual) || 0;
            const metaNum = Number(mv.valor_meta) || 1;
            const perc = Math.min(100, Math.round((progressoNum / metaNum) * 100));

            return (
              <div key={mv.id} className="saude-item meta-var-item">
                <div className="meta-var-header">
                  <strong className="meta-var-title">{mv.nome_exibicao}</strong>
                  {isGestor && (
                    <button onClick={() => handleLancarProgressoMeta(mv)} className="btn-lancar-prog">+ Lançar</button>
                  )}
                </div>
                <div className="meta-var-stats">
                  <span>Progresso: <strong>{progressoNum}</strong> / {mv.valor_meta} {mv.unidade}</span>
                  <span className="meta-var-perc">{perc}%</span>
                </div>
                <div className="meta-var-bar-bg">
                  <div className="meta-var-bar-fill" style={{ width: `${perc}%` }}></div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="vazio-metas">Nenhum desafio ativo. Configure na aba ao lado.</div>
        )}
      </div>
    </div>
  );
}