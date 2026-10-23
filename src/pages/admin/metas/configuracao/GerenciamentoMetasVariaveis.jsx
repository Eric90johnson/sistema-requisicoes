import React from 'react';

export default function GerenciamentoMetasVariaveis({ 
  novaMetaTitulo, setNovaMetaTitulo, novaMetaDesc, setNovaMetaDesc, novaMetaValor, setNovaMetaValor,
  handleAdicionarMetaVariavel, metasVariaveisList, handleExcluirMetaVariavel
}) {
  return (
    <div className="painel-card card-destaque-roxo mt-30">
      <div className="card-header">
        <h3 className="titulo-roxo">⭐ Gerenciamento de Metas Variáveis</h3>
        <span className="secao-sub">Crie desafios ou metas operacionais diversas (Limpeza, Reciclagem, Pontualidade). O progresso será alimentado no painel da Visão Geral.</span>
      </div>

      <form onSubmit={handleAdicionarMetaVariavel} className="form-meta-variavel">
        <div className="input-row" style={{ flex: '1 1 200px' }}>
          <label>Título da Meta *</label>
          <input type="text" placeholder="Ex: Limpeza do Setor 1" className="input-oficial" value={novaMetaTitulo} onChange={e => setNovaMetaTitulo(e.target.value)} />
        </div>
        <div className="input-row" style={{ flex: '1 1 150px' }}>
          <label>Unidade / Formato *</label>
          <input type="text" placeholder="Ex: %, R$, caixas, dias" className="input-oficial" value={novaMetaDesc} onChange={e => setNovaMetaDesc(e.target.value)} />
        </div>
        <div className="input-row" style={{ flex: '1 1 120px' }}>
          <label>Valor Alvo *</label>
          <input type="number" step="0.1" placeholder="Ex: 100" className="input-oficial" value={novaMetaValor} onChange={e => setNovaMetaValor(e.target.value)} />
        </div>
        <button type="submit" className="btn-add-meta">➕ Criar Meta</button>
      </form>

      <div className="mt-20">
        <h4 className="subtitulo-escuro">Metas Variáveis Ativas:</h4>
        <table className="tabela-ranking-limpa">
          <thead>
            <tr><th>Título</th><th>Progresso Atual</th><th>Alvo / Unidade</th><th>Ação</th></tr>
          </thead>
          <tbody>
            {metasVariaveisList.map(mv => (
              <tr key={mv.id}>
                <td><strong>{mv.nome_exibicao}</strong></td>
                <td className="txt-verde-bold">{mv.valor_atual || 0}</td>
                <td>{mv.valor_meta} {mv.unidade}</td>
                <td>
                  <button onClick={() => handleExcluirMetaVariavel(mv.id)} className="btn-del-meta">🗑️ Excluir</button>
                </td>
              </tr>
            ))}
            {metasVariaveisList.length === 0 && (
              <tr><td colSpan="4" className="tabela-vazia">Nenhuma meta variável cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}