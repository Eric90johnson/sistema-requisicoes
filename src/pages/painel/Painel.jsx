import '../../styles/pages/painel/painel.css';

export default function Painel({ aoClicarNovo, requisicoes, aoAbrirDetalhes }) {
  
  const ordemProcesso = ['Em Separação', 'Separado', 'Faturado', 'Enviado', 'Recebido'];
  
  const colunasDinamicas = ordemProcesso.filter(etapa => 
    requisicoes.some(req => req.historico && req.historico[etapa])
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
              <th>Data</th>
              <th>Solicitante</th>
              <th>Loja Destino</th>
              <th>Itens</th>
              <th>Status</th>
              
              {colunasDinamicas.map(coluna => (
                <th key={coluna}>Resp. {coluna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Verifica se a lista está vazia */}
            {requisicoes.length > 0 ? (
              requisicoes.map((req) => (
                <tr key={req.id} onClick={() => aoAbrirDetalhes(req)} style={{ cursor: 'pointer' }} className="linha-tabela-hover">
                  <td>{req.id}</td>
                  <td>{req.data}</td>
                  <td><strong>{req.solicitante}</strong></td>
                  <td>{req.destino}</td>
                  <td>{req.itens}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  
                  {colunasDinamicas.map(coluna => (
                    <td key={coluna} style={{ color: '#666', fontSize: '0.9em' }}>
                      {req.historico && req.historico[coluna] ? req.historico[coluna] : '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              /* Mensagem de tela vazia caso não tenha pedidos */
              <tr>
                <td 
                  colSpan={6 + colunasDinamicas.length} 
                  style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}
                >
                  Nenhuma requisição criada no momento. Clique em "+ Nova Requisição" para começar!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}