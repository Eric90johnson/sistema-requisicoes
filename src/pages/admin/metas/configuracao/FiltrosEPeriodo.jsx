import React from 'react';

export default function FiltrosEPeriodo({
  editPeriodoInicio, setEditPeriodoInicio, editPeriodoFim, setEditPeriodoFim,
  handleSalvarPeriodoVigente, salvando, usuarioFiltro, setUsuarioFiltro,
  usuariosLista, dataInicio, setDataInicio, dataFim, setDataFim,
  handleFiltrarPorPeriodo, handleLimparFiltroData
}) {
  return (
    <div className="painel-card card-destaque-azul">
      <div className="card-header mb-15">
        <h3 className="titulo-escuro">📅 Filtros de Visão e Período Oficial</h3>
        <span className="secao-sub">Defina o ciclo de avaliação oficial (que salva no banco) ou aplique um filtro temporário de equipe.</span>
      </div>
      
      <div className="bloco-filtro-oficial">
        <div className="input-row">
          <label className="lbl-azul-bold">Travar Período Oficial (Data Início)</label>
          <input type="date" className="input-oficial" value={editPeriodoInicio} onChange={e => setEditPeriodoInicio(e.target.value)} />
        </div>
        <div className="input-row">
          <label className="lbl-azul-bold">Travar Período Oficial (Data Fim)</label>
          <input type="date" className="input-oficial" value={editPeriodoFim} onChange={e => setEditPeriodoFim(e.target.value)} />
        </div>
        <button onClick={handleSalvarPeriodoVigente} disabled={salvando} className="btn-travar-oficial">
          {salvando ? '⏳ Salvando...' : '🔒 Travar Período Oficial no Banco'}
        </button>
      </div>

      <div className="flex-wrap-end" style={{ gap: '15px' }}>
        <div className="input-row" style={{ flex: '1 1 200px' }}>
          <label>👤 Analisar Desempenho de Equipe (Liderança):</label>
          <select className="select-oficial" value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)}>
            <option value="">(Toda a Operação Geral)</option>
            {usuariosLista.map(u => <option key={u.nome_completo} value={u.nome_completo}>{u.nome_completo} (Líder: {u.encarregado_responsavel || 'Nenhum'})</option>)}
          </select>
        </div>

        <div className="input-row">
          <label>De (Temp):</label>
          <input type="date" className="input-oficial" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div className="input-row">
          <label>Até (Temp):</label>
          <input type="date" className="input-oficial" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        
        <div className="flex-center" style={{ gap: '10px' }}>
          <button onClick={handleFiltrarPorPeriodo} className="btn-filter-apply">🔍 Aplicar Filtros Pessoais</button>
          {(dataInicio || dataFim || usuarioFiltro) && (
            <button onClick={handleLimparFiltroData} className="btn-filter-clear">Limpar</button>
          )}
        </div>
      </div>
    </div>
  );
}