import React, { useState } from 'react';
import '../../styles/pages/historico/historico.css';

export default function Historico({ requisicoes, aoVoltar }) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroOrdem, setFiltroOrdem] = useState('');
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState('');
  
  // NOVO: Filtro de Status
  const [filtroStatus, setFiltroStatus] = useState('');

  // NOVO: Controle da linha expandida para mostrar os produtos
  const [linhaExpandida, setLinhaExpandida] = useState(null);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-enviado';
      case 'Recebimento': return 'status-recebido';
      case 'Cancelada': return 'status-pendente'; // Utiliza cor limpa
      default: return 'status-pendente';
    }
  };

  const converterData = (dataStr) => {
    if (!dataStr) return null;
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(`${ano}-${mes}-${dia}T00:00:00`);
  };

  const temFiltroAtivo = dataInicio || dataFim || filtroCodigo || filtroOrdem || filtroNotaFiscal || filtroStatus;

  const requisicoesFiltradas = temFiltroAtivo ? requisicoes.filter(req => {
    let passaFiltro = true;

    if (dataInicio || dataFim) {
      const dataReq = converterData(req.data);
      if (dataInicio) {
        const inicio = new Date(`${dataInicio}T00:00:00`);
        if (dataReq < inicio) passaFiltro = false;
      }
      if (dataFim) {
        const fim = new Date(`${dataFim}T23:59:59`);
        if (dataReq > fim) passaFiltro = false;
      }
    }

    if (filtroCodigo && passaFiltro) {
      const temProduto = req.listaItens && req.listaItens.some(item => 
        item.cod.toUpperCase().includes(filtroCodigo.toUpperCase())
      );
      if (!temProduto) passaFiltro = false;
    }

    if (filtroOrdem && passaFiltro) {
      if (!req.numeroRequisicaoExterna || !req.numeroRequisicaoExterna.includes(filtroOrdem)) {
        passaFiltro = false;
      }
    }

    if (filtroNotaFiscal && passaFiltro) {
      if (!req.notaFiscal || !req.notaFiscal.includes(filtroNotaFiscal)) {
        passaFiltro = false;
      }
    }

    // Aplicação do novo filtro de Status
    if (filtroStatus && passaFiltro) {
      if (req.status !== filtroStatus) {
        passaFiltro = false;
      }
    }

    return passaFiltro;
  }) : [];

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroCodigo('');
    setFiltroOrdem('');
    setFiltroNotaFiscal('');
    setFiltroStatus('');
    setLinhaExpandida(null);
  };

  // --- CIRURGIA AQUI: Formatar tempo padronizado (HH:MM:SS) ---
  const formatarTempo = (segundos) => {
    if (!segundos && segundos !== 0) return '-';
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Extrai lista única de status existentes no banco para preencher o select
  const opcoesStatus = [...new Set(requisicoes.map(r => r.status))].filter(Boolean);

  const exportarParaExcel = () => {
    if (requisicoesFiltradas.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }

    // Removido "Eficiência (%)" do cabeçalho
    let csv = "ID da Requisicao;Data da Requisicao;Cod. do Produto;Descricao do Produto;Quantidade;Ordem Interna;N da NF;Tempo Separacao;Observacoes\n";

    requisicoesFiltradas.forEach(req => {
      const tempo = req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-';
      const id = req.id || '-';
      const dataReq = req.data || '-';
      const ordemInterna = req.numeroRequisicaoExterna || '-';
      const nf = req.notaFiscal || '-';

      if (req.listaItens && req.listaItens.length > 0) {
        req.listaItens.forEach(item => {
          const codProduto = item.cod || '-';
          const descProduto = item.descricao || '-';
          const qtd = item.quantidade || '0';
          const obs = item.observacao || '-';

          csv += `${id};${dataReq};${codProduto};"${descProduto}";${qtd};${ordemInterna};${nf};${tempo};"${obs}"\n`;
        });
      }
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Auditoria_Historico_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleLinha = (id) => {
    if (linhaExpandida === id) {
      setLinhaExpandida(null);
    } else {
      setLinhaExpandida(id);
    }
  };

  return (
    <div className="historico-container">
      <div className="historico-header">
        <h2>Histórico e Auditoria de Requisições</h2>
        <button className="btn-voltar" onClick={aoVoltar}>
          ← Voltar ao Painel
        </button>
      </div>

      <div className="filtros-container">
        <div className="filtro-item">
          <label>Data Início</label>
          <input type="date" className="input-filtro" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="filtro-item">
          <label>Data Fim</label>
          <input type="date" className="input-filtro" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <div className="filtro-item">
          <label>Status</label>
          <select className="input-filtro select-filtro-historico" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">(Todos os Status)</option>
            {opcoesStatus.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="filtro-item">
          <label>Cód. Produto</label>
          <input type="text" className="input-filtro" placeholder="Ex: 1001" value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} />
        </div>
        <div className="filtro-item">
          <label>Nº Sistema</label>
          <input type="text" className="input-filtro" placeholder="Buscar Ordem" value={filtroOrdem} onChange={(e) => setFiltroOrdem(e.target.value)} />
        </div>
        <div className="filtro-item">
          <label>Nota Fiscal</label>
          <input type="text" className="input-filtro" placeholder="Buscar NF" value={filtroNotaFiscal} onChange={(e) => setFiltroNotaFiscal(e.target.value)} />
        </div>
        
        <button className="btn-limpar" onClick={limparFiltros}>Limpar Tudo</button>
      </div>

      <div className="card-historico">
        <div className="tabela-wrapper">
          <table className="tabela-requisicoes" style={{ whiteSpace: 'nowrap', width: '100%' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Solicitante</th>
                <th>Loja Destino</th>
                <th>Nº Sistema</th>
                <th>Nota Fiscal</th>
                <th>Itens</th>
                {/* Removida Eficiência, mantido Tempo formatado */}
                <th>Tempo</th>
                <th>Status Atual</th>
              </tr>
            </thead>
            <tbody>
              {!temFiltroAtivo ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '50px 20px', color: '#666' }}>
                    <span style={{ fontSize: '2rem', display: 'block', margin: '0 auto 10px' }}>🔍</span>
                    <strong>Preencha um ou mais filtros acima para visualizar o histórico.</strong>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>
                      Para manter o sistema rápido, as requisições só aparecem após a busca.
                    </p>
                  </td>
                </tr>
              ) : requisicoesFiltradas.length > 0 ? (
                requisicoesFiltradas.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr 
                      className={`tr-clicavel-historico ${linhaExpandida === req.id ? 'linha-ativa-historico' : ''}`} 
                      onClick={() => toggleLinha(req.id)}
                      title="Clique para ver os produtos desta requisição"
                    >
                      <td><strong>{req.id}</strong></td>
                      <td>{req.data}</td>
                      <td>{req.solicitante}</td>
                      <td>{req.destino}</td>
                      <td style={{ color: '#2980b9', fontWeight: 'bold' }}>{req.numeroRequisicaoExterna || '-'}</td>
                      <td style={{ color: '#e67e22', fontWeight: 'bold' }}>{req.notaFiscal || '-'}</td>
                      <td>{req.itens}</td>
                      
                      <td style={{ fontWeight: 'bold' }}>
                        {req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-'}
                      </td>

                      <td>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>

                    {/* ACORDEÃO COM OS PRODUTOS (Visível ao clicar na linha) */}
                    {linhaExpandida === req.id && (
                      <tr className="linha-expandida-historico">
                        <td colSpan="9">
                          <div className="conteudo-expandido-historico">
                            <h4>📦 Itens Solicitados na {req.id}</h4>
                            <table className="subtabela-historico">
                              <thead>
                                <tr>
                                  <th>Código</th>
                                  <th>Descrição</th>
                                  <th style={{ textAlign: 'center' }}>Qtd. Solicitada</th>
                                  <th style={{ textAlign: 'center' }}>Separado/Bipado</th>
                                  <th>Observações do Produto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {req.listaItens && req.listaItens.length > 0 ? (
                                  req.listaItens.map((item, idx) => (
                                    <tr key={idx}>
                                      <td><strong>{item.cod}</strong></td>
                                      <td>{item.descricao}</td>
                                      <td style={{ textAlign: 'center' }}>{item.quantidade} un</td>
                                      <td style={{ textAlign: 'center', color: (item.bipContagem >= item.quantidade) ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                        {item.bipContagem || 0} un
                                      </td>
                                      <td style={{ fontStyle: 'italic', color: '#7f8c8d' }}>{item.observacao || '-'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>Nenhum produto registrado.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
                    Nenhuma requisição encontrada com os filtros selecionados. Tente ajustar a busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {requisicoesFiltradas.length > 0 && (
          <div className="acoes-rodape">
            <button className="btn-exportar" onClick={exportarParaExcel} title="Baixar relatório gerencial completo">
              📊 Exportar Dados para Excel (.csv)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}