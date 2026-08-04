import '../../styles/pages/painel/painel.css';

export default function Painel({ aoClicarNovo, requisicoes, aoAbrirDetalhes }) {
  
  const ordemProcesso = ['Em Separação', 'Separado', 'Faturado', 'Enviado', 'Recebido'];
  
  // NOVA LÓGICA: Filtra a lista principal para remover as requisições concluídas
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Recebido');
  
  // Agora as colunas dinâmicas são calculadas baseadas apenas nas requisições ativas
  const colunasDinamicas = ordemProcesso.filter(etapa => 
    requisicoesAtivas.some(req => req.historico && req.historico[etapa])
  );

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Separado': return 'status-separado';
      case 'Faturado': return 'status-faturado';
      case 'Enviado': return 'status-enviado';
      case 'Recebido': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  return (
    <div className="painel-container">
      <div className="painel-header">
        <h2>Visão Geral</h2>
        <button className="btn-nova-req" onClick={aoClicarNovo}>+ Nova Requisição</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tabela-requisicoes" style={{ whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Data</th>
              <th>Solicitante</th>
              <th>Loja Destino</th>
              <th>Itens</th>
              
              {colunasDinamicas.map(coluna => (
                <th key={coluna}>Resp. {coluna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* LÓGICA DE EXIBIÇÃO: Agora utiliza a lista "requisicoesAtivas" */}
            {requisicoesAtivas.length > 0 ? (
              requisicoesAtivas.map((req) => (
                <tr key={req.id} onClick={() => aoAbrirDetalhes(req)} style={{ cursor: 'pointer' }} className="linha-tabela-hover">
                  <td>{req.id}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>{req.data}</td>
                  <td><strong>{req.solicitante}</strong></td>
                  <td>{req.destino}</td>
                  <td>{req.itens}</td>
                  
                  {colunasDinamicas.map(coluna => (
                    <td key={coluna} style={{ color: '#666', fontSize: '0.9em' }}>
                      {req.historico && req.historico[coluna] ? req.historico[coluna] : '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              /* Mensagem de tela vazia atualizada */
              <tr>
                <td 
                  colSpan={6 + colunasDinamicas.length} 
                  style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}
                >
                  Parabéns equipe de estoque! Nenhuma requisição de transferência pendente no momento. A operação está limpa!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}