import React from 'react';

export default function BannersEtapas({
  status, isEditing, isViewer, responsavelRecebedor,
  responsavelCadastro, setResponsavelCadastro, handleConcluirCadastro,
  responsavelEncerramento, setResponsavelEncerramento, handleFinalizarRecebimentoDefinitivo, processando
}) {
  
  if (isEditing || isViewer) return null;

  return (
    <>
      {status === 'Cadastrado' && (
        <div style={{ backgroundColor: '#eafaf1', borderLeft: '4px solid #27ae60', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} className="no-print">
          <h4 style={{ color: '#27ae60', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>📦 Modo Reposição Ativo</h4>
          <p style={{ margin: 0, color: '#2c3e50', fontSize: '0.95rem' }}>Esta carga já foi cadastrada. Clique nas linhas dos produtos abaixo para adicioná-los ao carrinho e criar a requisição de abastecimento da loja.</p>
        </div>
      )}

      {status === 'Aguardando Precificação' && (
        <div style={{ backgroundColor: '#fcf3cf', borderLeft: '4px solid #f1c40f', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} className="no-print">
          <h4 style={{ color: '#d35400', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>💲 Etapa Intermediária: Precificação (Opcional)</h4>
          <p style={{ margin: 0, color: '#34495e', fontSize: '0.95rem' }}>A conferência física foi finalizada por <strong>{responsavelRecebedor}</strong>. Preencha os preços de Custo e Venda diretamente na tabela abaixo (opcional) e confirme para liberar a nota para cadastro.</p>
        </div>
      )}

      {status === 'Aguardando Cadastro' && (
        <div style={{ backgroundColor: '#ebf5fb', borderLeft: '4px solid #3498db', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} className="no-print">
          <h4 style={{ color: '#2980b9', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>💻 Última Etapa: Cadastro da NF no Sistema</h4>
          <p style={{ margin: '0 0 15px 0', color: '#34495e', fontSize: '0.95rem' }}>A precificação foi concluída. Informe quem realizou o lançamento da Nota Fiscal no sistema da loja para liberar a carga para reposição.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '600px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7f8c8d' }}>Resp. Cadastro da NF</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Ex: Maria" value={responsavelCadastro} onChange={(e) => setResponsavelCadastro(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid #dcdde1', borderRadius: '6px', outline: 'none', fontSize: '1rem', backgroundColor: '#fdfdfd' }} disabled={processando} />
              <button type="button" onClick={handleConcluirCadastro} disabled={processando} style={{ background: '#3498db', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                {processando ? '⏳ Aguarde...' : 'Confirmar Cadastro ✔️'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'Cadastrado' && (
        <div style={{ backgroundColor: '#f4f6f7', borderLeft: '4px solid #7f8c8d', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} className="no-print">
          <h4 style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🏁 Fim do Processo: Encerrar Relatório</h4>
          <p style={{ margin: '0 0 15px 0', color: '#34495e', fontSize: '0.95rem' }}>A reposição da loja já foi feita? Informe quem está encerrando e clique abaixo para arquivar este relatório em definitivo.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '600px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7f8c8d' }}>Resp. Encerramento</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Ex: Carlos" value={responsavelEncerramento} onChange={(e) => setResponsavelEncerramento(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid #dcdde1', borderRadius: '6px', outline: 'none', fontSize: '1rem', backgroundColor: '#fdfdfd' }} disabled={processando} />
              <button type="button" onClick={handleFinalizarRecebimentoDefinitivo} disabled={processando} style={{ background: '#34495e', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                {processando ? '⏳ Aguarde...' : 'Finalizar Recebimento ✔️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}