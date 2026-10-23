import React from 'react';

export default function MetasFixasGestao({ valoresEditados, setValoresEditados }) {
  return (
    <>
      <div className="secao-titulo mt-30">
        <div>
          <h3>Metas Fixas Gestão (Liderança)</h3>
          <span className="secao-sub">Pilares de tempo para faturamento, saída e cadastro no sistema. Aplica-se aos encarregados e administradores.</span>
        </div>
      </div>

      <div className="config-grid">
        <div className="config-card">
          <div className="cc-header bg-laranja">💻 Faturamento e Saída (Gestão)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>Tempo p/ Faturamento (pós-separação)</label>
              <div className="input-box"><input type="number" value={valoresEditados.sla_faturamento} onChange={e => setValoresEditados({...valoresEditados, sla_faturamento: e.target.value})} /><span>min</span></div>
            </div>
            <div className="input-row">
              <label>Tempo p/ Saída (pós-separação)</label>
              <div className="input-box"><input type="number" value={valoresEditados.sla_saida} onChange={e => setValoresEditados({...valoresEditados, sla_saida: e.target.value})} /><span>min</span></div>
            </div>
          </div>
        </div>

        <div className="config-card">
          <div className="cc-header bg-verde-escuro">🏷️ Cadastro de Mercadorias (Gestão)</div>
          <div className="cc-body">
            <div className="input-row">
              <label>Tempo p/ Cadastro (pós-recebimento)</label>
              <div className="input-box"><input type="number" value={valoresEditados.tempo_cadastro} onChange={e => setValoresEditados({...valoresEditados, tempo_cadastro: e.target.value})} /><span>min</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}