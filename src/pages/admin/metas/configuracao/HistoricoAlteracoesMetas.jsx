import React from 'react';

export default function HistoricoAlteracoesMetas({ historicoMetasDb }) {
  return (
    <div className="footer-grid mt-30">
      <div className="painel-card" style={{ flex: 2 }}>
        <div className="card-header">
          <h4>⚙️ Histórico de Alterações de Metas</h4>
          <span>Auditoria de ajustes feitos nos indicadores de operação e gestão.</span>
        </div>
        <table className="tabela-historico-metas">
          <thead>
            <tr><th>Data</th><th>Categoria</th><th>Indicador</th><th>Alteração</th><th>Unidade</th><th>Alterado por</th></tr>
          </thead>
          <tbody>
            {historicoMetasDb.length > 0 ? (
              historicoMetasDb.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.data_alteracao).toLocaleDateString('pt-BR')}</td>
                  <td>{h.categoria}</td>
                  <td>{h.indicador}</td>
                  <td>{h.valor_antigo} ➔ <strong style={{color: '#2980b9'}}>{h.valor_novo}</strong></td>
                  <td>{h.unidade}</td>
                  <td>{h.alterado_por}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="tabela-vazia">Nenhum histórico de alteração encontrado no banco de dados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}