import React from 'react';

export default function FormularioCabecalho({
  solicitante,
  setSolicitante,
  lojaDe,
  setLojaDe,
  lojaPara,
  setLojaPara,
  lojas,
  motivo,
  setMotivo,
  motivoOutro,
  setMotivoOutro,
  prioridadeOutro,
  setPrioridadeOutro,
  listaObservacoes,
  novaObs,
  setNovaObs,
  handleAdicionarObservacao,
  handleRemoverObservacao,
  reqEmEdicao
}) {
  return (
    <div className="form-secao">
      <div className="campo-loja">
        <label>Solicitante (Seu Nome):</label>
        <input 
          type="text" 
          className="input-item" 
          placeholder="Ex: Maria" 
          value={solicitante} 
          onChange={(e) => setSolicitante(e.target.value)} 
        />
      </div>

      <div className="linha-dupla">
        <div className="campo-loja">
          <label>Loja Atendente (De):</label>
          <select value={lojaDe} onChange={(e) => setLojaDe(e.target.value)}>
            {lojas.map(loja => <option key={`de-${loja}`} value={loja}>{loja}</option>)}
          </select>
        </div>
        
        <div className="campo-loja">
          <label>Loja Solicitante (Para):</label>
          <select value={lojaPara} onChange={(e) => setLojaPara(e.target.value)}>
            {lojas.map(loja => <option key={`para-${loja}`} value={loja}>{loja}</option>)}
          </select>
        </div>
      </div>

      <div className="campo-loja">
        <label>Motivo da Transferência:</label>
        <select className="input-item" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">Selecione um motivo...</option>
          <option value="Cliente">Cliente (Prioridade Alta)</option>
          <option value="Rota para clientes">Rota para clientes (Prioridade Alta)</option>
          <option value="Reposição de estoque">Reposição de estoque (Prioridade Média)</option>
          <option value="Produtos para provadores">Produtos para provadores (Prioridade Baixa)</option>
          <option value="Outros">Outros (Especificar)</option>
        </select>
        
        {motivo === 'Outros' && (
          <div className="linha-dupla linha-dupla-motivo">
            <div className="campo-loja campo-loja-flex-2">
              <input 
                type="text" 
                className="input-item" 
                placeholder="Especifique o motivo da requisição..." 
                value={motivoOutro} 
                onChange={(e) => setMotivoOutro(e.target.value)} 
              />
            </div>
            <div className="campo-loja campo-loja-flex-1">
              <select 
                className="input-item" 
                value={prioridadeOutro} 
                onChange={(e) => setPrioridadeOutro(e.target.value)}
                title="Defina o nível de urgência desta requisição"
              >
                <option value="1">Prioridade 1 (Alta / Urgente)</option>
                <option value="2">Prioridade 2 (Média)</option>
                <option value="3">Prioridade 3 (Baixa)</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="campo-loja obs-geral-box" style={{ marginTop: '10px' }}>
        <label>📝 Observações Gerais / Instruções da Requisição:</label>

        {listaObservacoes.length > 0 && (
          <div className="lista-observacoes-wrapper">
            <ul className="lista-obs-ul">
              {listaObservacoes.map((obs) => (
                <li key={obs.id_obs} className="item-obs-li">
                  <div className="obs-meta">
                    <strong>{obs.autor}</strong> em {obs.data}
                  </div>
                  <div className="obs-conteudo">{obs.texto}</div>
                  <button
                    type="button"
                    className="btn-remover-obs"
                    onClick={() => handleRemoverObservacao(obs.id_obs)}
                    title="Remover esta observação"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="obs-add-mode">
          <textarea 
            className="obs-textarea-nova" 
            placeholder={reqEmEdicao ? "Ex: Alterei a quantidade do produto X..." : "Ex: Cuidado com os produtos de vidro. Embalar separadamente..."}
            value={novaObs} 
            onChange={(e) => setNovaObs(e.target.value)} 
          />
          <button 
            type="button" 
            className="btn-adicionar-obs-lista" 
            onClick={handleAdicionarObservacao}
          >
            ➕ Adicionar Observação
          </button>
        </div>
      </div>
    </div>
  );
}