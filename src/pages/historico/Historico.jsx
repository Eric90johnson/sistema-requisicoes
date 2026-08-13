import { useState } from 'react';
import '../../styles/pages/historico/historico.css';

export default function Historico({ requisicoes, aoVoltar }) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroOrdem, setFiltroOrdem] = useState('');
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState('');

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-enviado';
      case 'Recebimento': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  const converterData = (dataStr) => {
    if (!dataStr) return null;
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(`${ano}-${mes}-${dia}T00:00:00`);
  };

  const temFiltroAtivo = dataInicio || dataFim || filtroCodigo || filtroOrdem || filtroNotaFiscal;

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

    return passaFiltro;
  }) : [];

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroCodigo('');
    setFiltroOrdem('');
    setFiltroNotaFiscal('');
  };

  // Função auxiliar para formatar os segundos salvos na base
  const formatarTempo = (segundos) => {
    if (!segundos && segundos !== 0) return '-';
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}m ${s}s`;
  };

  // --- LÓGICA DE EXPORTAÇÃO (ATUALIZADA COM AS MÉTRICAS DE PRODUTIVIDADE) ---
  const exportarParaExcel = () => {
    if (requisicoesFiltradas.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }

    // Adicionado "Tempo Separação" e "Eficiência (%)" no cabeçalho
    let csv = "ID da Requisicao;Data da Requisicao;Cod. do Produto;Descricao do Produto;Quantidade;Ordem Interna;N da NF;Tempo Separacao;Eficiencia (%);Observacoes\n";

    requisicoesFiltradas.forEach(req => {
      // Extraindo as métricas globais da requisição
      const tempo = req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-';
      const eficiencia = req.metricasSeparacao ? `${req.metricasSeparacao.eficienciaPercentual}%` : '-';
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

          csv += `${id};${dataReq};${codProduto};"${descProduto}";${qtd};${ordemInterna};${nf};${tempo};${eficiencia};"${obs}"\n`;
        });
      }
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Auditoria_Produtividade_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="historico-container">
      <div className="historico-header">
        <h2>Histórico e Auditoria de Produtividade</h2>
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
          <label>Cód. do Produto</label>
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
                {/* --- NOVAS COLUNAS GERENCIAIS --- */}
                <th>Tempo</th>
                <th>Eficiência</th>
                <th>Status Atual</th>
              </tr>
            </thead>
            <tbody>
              {!temFiltroAtivo ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px', color: '#666' }}>
                    <span style={{ fontSize: '2rem', display: 'block', margin: '0 auto 10px' }}>🔍</span>
                    <strong>Preencha um ou mais filtros acima para visualizar o histórico.</strong>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>
                      Para manter o sistema rápido, as requisições só aparecem após a busca.
                    </p>
                  </td>
                </tr>
              ) : requisicoesFiltradas.length > 0 ? (
                requisicoesFiltradas.map((req) => (
                  <tr key={req.id}>
                    <td><strong>{req.id}</strong></td>
                    <td>{req.data}</td>
                    <td>{req.solicitante}</td>
                    <td>{req.destino}</td>
                    <td style={{ color: '#2980b9', fontWeight: 'bold' }}>{req.numeroRequisicaoExterna || '-'}</td>
                    <td style={{ color: '#e67e22', fontWeight: 'bold' }}>{req.notaFiscal || '-'}</td>
                    <td>{req.itens}</td>
                    
                    {/* Exibe o tempo e eficiência (se a requisição já passou pela separação) */}
                    <td style={{ fontWeight: 'bold' }}>
                      {req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-'}
                    </td>
                    <td style={{ fontWeight: 'bold', color: req.metricasSeparacao?.eficienciaPercentual > 0 ? '#27ae60' : (req.metricasSeparacao ? '#e74c3c' : 'inherit') }}>
                      {req.metricasSeparacao ? `${req.metricasSeparacao.eficienciaPercentual > 0 ? '+' : ''}${req.metricasSeparacao.eficienciaPercentual}%` : '-'}
                    </td>

                    <td>
                      <span className={`status-badge ${getStatusClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
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