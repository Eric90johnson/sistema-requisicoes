import React from 'react';

export default function MetasFixasOperacionais({ valoresEditados, setValoresEditados, handleSalvarMetas, salvando, carregandoMetas }) {
  return (
    <>
      <div className="secao-titulo flex-space-between align-center">
        <div>
          <h3>Metas Fixas Operacionais</h3>
          <span className="secao-sub">Pilares globais permanentes da operação logística de separação e estoque. As metas podem ser ajustadas pelo gestor.</span>
        </div>
        <button className="btn-salvar-metas" onClick={handleSalvarMetas} disabled={salvando || carregandoMetas}>
          {salvando ? '⏳ Salvando...' : '💾 Salvar Alterações no Banco'}
        </button>
      </div>

      <div className="config-grid">
        <div className="config-card">
          <div className="cc-header bg-verde">📦 Produtividade (Fixa)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>UPM mínima</label>
              <div className="input-box"><input type="number" step="0.1" value={valoresEditados.upm_minima} onChange={e => setValoresEditados({...valoresEditados, upm_minima: e.target.value})} /><span>UPM</span></div>
            </div>
            <div className="input-row">
              <label>Tempo de separação</label>
              <div className="input-box"><input type="number" value={valoresEditados.tempo_separacao} onChange={e => setValoresEditados({...valoresEditados, tempo_separacao: e.target.value})} /><span>min</span></div>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="cc-header bg-azul">⏱️ SLA / Atendimento (Fixa)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>Tempo total da requisição</label>
              <div className="input-box"><input type="number" value={valoresEditados.sla_total} onChange={e => setValoresEditados({...valoresEditados, sla_total: e.target.value})} /><span>min</span></div>
            </div>
            <div className="input-row">
              <label>% dentro do SLA</label>
              <div className="input-box"><input type="number" value={valoresEditados.sla_percentual} onChange={e => setValoresEditados({...valoresEditados, sla_percentual: e.target.value})} /><span>%</span></div>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="cc-header bg-amarelo">🎯 Qualidade (Fixa)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>Erro de separação</label>
              <div className="input-box"><input type="number" step="0.1" value={valoresEditados.erro_separacao} onChange={e => setValoresEditados({...valoresEditados, erro_separacao: e.target.value})} /><span>%</span></div>
            </div>
            <div className="input-row">
              <label>Divergência na conferência</label>
              <div className="input-box"><input type="number" step="0.1" value={valoresEditados.divergencia_conferencia} onChange={e => setValoresEditados({...valoresEditados, divergencia_conferencia: e.target.value})} /><span>%</span></div>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="cc-header bg-roxo">🚚 Operação (Fixa)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>Recebimento (total)</label>
              <div className="input-box"><input type="number" value={valoresEditados.recebimento_total} onChange={e => setValoresEditados({...valoresEditados, recebimento_total: e.target.value})} /><span>min</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}