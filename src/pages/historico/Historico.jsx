import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import '../../styles/pages/historico/historico.css';

export default function Historico({ requisicoes, aoVoltar }) {
  // Filtros de Pesquisa
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroId, setFiltroId] = useState(''); 
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroOrdem, setFiltroOrdem] = useState('');
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroMarca, setFiltroMarca] = useState(''); 

  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [ordenacao, setOrdenacao] = useState({ coluna: 'data', direcao: 'desc' });

  // NOVOS ESTADOS: Controle de Busca Direta no Banco
  const [dadosHistorico, setDadosHistorico] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

  // Lista Fixa de Status para evitar dependência do cache limitado
  const opcoesStatus = ['Pendente', 'Em Separação', 'Separado', 'Em Edição', 'Cancelada', 'Saída de produtos', 'Faturamento', 'Transporte', 'Recebimento', 'Concluída'];

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-enviado';
      case 'Recebimento': return 'status-recebido';
      case 'Cancelada': return 'status-pendente';
      default: return 'status-pendente';
    }
  };

  const converterData = (dataStr) => {
    if (!dataStr) return null;
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(`${ano}-${mes}-${dia}T00:00:00`);
  };

  // ==========================================
  // FUNÇÃO DE BUSCA DIRETA NO SUPABASE
  // ==========================================
  const handlePesquisar = async () => {
    if (!dataInicio && !dataFim && !filtroId && !filtroOrdem && !filtroNotaFiscal && !filtroCodigo && !filtroMarca && !filtroStatus) {
      alert("Por favor, preencha pelo menos um campo de filtro para pesquisar.");
      return;
    }

    setBuscando(true);
    
    try {
      // Prepara a consulta base
      let query = supabase.from('requisicoes').select('*');

      // Aplica filtros nativos no banco para economizar banda (Lazy Loading)
      if (dataInicio) {
        const inicioTs = new Date(`${dataInicio}T00:00:00`).getTime();
        query = query.gte('timestamp_criacao', inicioTs);
      }
      if (dataFim) {
        const fimTs = new Date(`${dataFim}T23:59:59`).getTime();
        query = query.lte('timestamp_criacao', fimTs);
      }
      if (filtroStatus) {
        query = query.eq('status', filtroStatus);
      }
      if (filtroOrdem) {
        query = query.ilike('numero_requisicao_externa', `%${filtroOrdem}%`);
      }
      if (filtroNotaFiscal) {
        query = query.ilike('nota_fiscal', `%${filtroNotaFiscal}%`);
      }

      // Limita em 2000 para proteção do navegador caso a busca seja muito ampla
      query = query.limit(2000).order('timestamp_criacao', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Formata os dados retornados
      const reqsFormatadas = data.map(r => ({
        ...r,
        timestampCriacao: r.timestamp_criacao,
        listaItens: r.lista_itens,
        metricasSeparacao: r.metricas_separacao,
        numeroRequisicaoExterna: r.numero_requisicao_externa,
        notaFiscal: r.nota_fiscal
      }));

      // Aplica os Filtros Complexos (dentro do JSON) localmente
      const resultadosFinais = reqsFormatadas.filter(req => {
        let passa = true;
        
        if (filtroId && !req.id.toString().includes(filtroId)) passa = false;
        
        if (filtroCodigo && passa) {
          const temProduto = req.listaItens && req.listaItens.some(item => 
            item.cod.toUpperCase().includes(filtroCodigo.toUpperCase())
          );
          if (!temProduto) passa = false;
        }

        if (filtroMarca && passa) {
          const temProdutoMarca = req.listaItens && req.listaItens.some(item => 
            (item.marca || '').toUpperCase().includes(filtroMarca.toUpperCase()) || 
            (item.descricao || '').toUpperCase().includes(filtroMarca.toUpperCase())
          );
          if (!temProdutoMarca) passa = false;
        }
        
        return passa;
      });

      setDadosHistorico(resultadosFinais);
      setPesquisaRealizada(true);

    } catch (err) {
      console.error("Erro ao pesquisar histórico:", err);
      alert("Ocorreu um erro ao buscar o histórico. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  };

  const requisicoesOrdenadas = useMemo(() => {
    return [...dadosHistorico].sort((a, b) => {
      let valA = a[ordenacao.coluna];
      let valB = b[ordenacao.coluna];

      if (ordenacao.coluna === 'separador') {
        valA = a.historico?.['Em Separação'] || a.metricasSeparacao?.responsavel || '';
        valB = b.historico?.['Em Separação'] || b.metricasSeparacao?.responsavel || '';
      } else if (ordenacao.coluna === 'tempoSeparacao') {
        valA = a.metricasSeparacao?.tempoTotalSegundos || 0;
        valB = b.metricasSeparacao?.tempoTotalSegundos || 0;
      } else if (ordenacao.coluna === 'data') {
        valA = converterData(a.data)?.getTime() || 0;
        valB = converterData(b.data)?.getTime() || 0;
      } else if (ordenacao.coluna === 'itens') {
        valA = a.metricasSeparacao?.totalItensFisicos || a.itens || 0;
        valB = b.metricasSeparacao?.totalItensFisicos || b.itens || 0;
      } else if (ordenacao.coluna === 'tempoTotal' || ordenacao.coluna === 'horaCriacao') {
        valA = a.timestampCriacao || 0;
        valB = b.timestampCriacao || 0;
      } else if (ordenacao.coluna === 'horaFim') {
        valA = a.metricasSeparacao?.finalizadoEm ? new Date(a.metricasSeparacao.finalizadoEm).getTime() : 0;
        valB = b.metricasSeparacao?.finalizadoEm ? new Date(b.metricasSeparacao.finalizadoEm).getTime() : 0;
      }

      if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dadosHistorico, ordenacao]);

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroId('');
    setFiltroCodigo('');
    setFiltroOrdem('');
    setFiltroNotaFiscal('');
    setFiltroStatus('');
    setFiltroMarca(''); 
    setLinhaExpandida(null);
    setDadosHistorico([]);
    setPesquisaRealizada(false);
  };

  const formatarTempo = (segundos) => {
    if (!segundos && segundos !== 0) return '-';
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const extrairHora = (timestampOuData) => {
    if (!timestampOuData) return '-';
    const data = new Date(Number(timestampOuData) || timestampOuData);
    if (isNaN(data.getTime())) return '-';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSeparador = (req) => {
    return req.historico?.['Em Separação'] || req.metricasSeparacao?.responsavel || '-';
  };

  const getTempoTotalReq = (req) => {
    if (!req.timestampCriacao) return '-';
    if (req.metricasSeparacao && req.metricasSeparacao.finalizadoEm) {
      const inicio = Number(req.timestampCriacao);
      const fim = new Date(req.metricasSeparacao.finalizadoEm).getTime();
      const diff = Math.floor((fim - inicio) / 1000);
      return formatarTempo(diff > 0 ? diff : 0);
    }
    return 'Em andamento';
  };

  const getTempoBipProduto = (req) => {
    if (!req.metricasSeparacao) return '-';
    const seg = req.metricasSeparacao.tempoTotalSegundos || 1;
    const itens = req.metricasSeparacao.totalItensFisicos || req.itens || 1;
    return `${(seg / itens).toFixed(1)}s / un`;
  };

  const exportarParaExcel = () => {
    if (requisicoesOrdenadas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    let csv = "ID da Requisicao;Cod. do Produto;Descricao do Produto;Qtd. Solicitada;Qtd. Bipada;Motivo (Tipo);Status Atual;Data da Requisicao;Solicitante;Destino;Criado as;Finalizado as;Tempo Total Estimado;Tempo Separacao;Tempo Bip Medio;Separador;N do Sistema;Nota Fiscal;Observacoes do Produto\n";

    requisicoesOrdenadas.forEach(req => {
      const id = req.id || '-';
      const motivo = req.motivo || '-';
      const status = req.status || '-';
      const dataReq = req.data || '-';
      const solicitante = req.solicitante || '-';
      const destino = req.destino || '-';
      
      const horaCriacao = extrairHora(req.timestampCriacao);
      const horaFim = req.metricasSeparacao?.finalizadoEm ? extrairHora(req.metricasSeparacao.finalizadoEm) : '-';
      const tempoTotal = getTempoTotalReq(req);
      const tempoSep = req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-';
      const tempoBip = getTempoBipProduto(req);
      const separador = getSeparador(req);
      
      const ordemInterna = req.numeroRequisicaoExterna || '-';
      const nf = req.notaFiscal || '-';

      if (req.listaItens && req.listaItens.length > 0) {
        req.listaItens.forEach(item => {
          const codProduto = item.cod || '-';
          const descProduto = item.descricao || '-';
          const qtd = item.quantidade || '0';
          const qtdBipada = item.bipContagem || '0';
          const obs = item.observacao ? item.observacao.replace(/"/g, '""').replace(/\n/g, ' ') : '-';

          csv += `"${id}";"${codProduto}";"${descProduto}";"${qtd}";"${qtdBipada}";"${motivo}";"${status}";"${dataReq}";"${solicitante}";"${destino}";"${horaCriacao}";"${horaFim}";"${tempoTotal}";"${tempoSep}";"${tempoBip}";"${separador}";"${ordemInterna}";"${nf}";"${obs}"\n`;
        });
      } else {
        csv += `"${id}";"-";"-";"-";"-";"${motivo}";"${status}";"${dataReq}";"${solicitante}";"${destino}";"${horaCriacao}";"${horaFim}";"${tempoTotal}";"${tempoSep}";"${tempoBip}";"${separador}";"${ordemInterna}";"${nf}";"-"\n`;
      }
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_Logistica_NetaDantas_${new Date().getTime()}.csv`;
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

  const handleSort = (coluna) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const RenderHeaderSort = ({ titulo, coluna }) => {
    const isAtiva = ordenacao.coluna === coluna;
    return (
      <th className="th-sortable" onClick={() => handleSort(coluna)} title="Clique para ordenar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {titulo}
          <span className={`sort-icon ${isAtiva ? 'ativo' : ''}`}>
            {isAtiva ? (ordenacao.direcao === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="historico-container">
      <div className="historico-header">
        <h2>Histórico e Relatório Gerencial</h2>
        <button className="btn-voltar" onClick={aoVoltar}>
          ← Voltar ao Painel
        </button>
      </div>

      <div className="filtros-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* LINHA 1: Seleções e Datas */}
        <div className="filtros-linha" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
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
        </div>

        {/* LINHA 2: Textos Livres e Botões de Pesquisa */}
        <div className="filtros-linha" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div className="filtro-item">
            <label>Nº Requisição (ID)</label>
            <input type="text" className="input-filtro" placeholder="Ex: REQ-001" value={filtroId} onChange={(e) => setFiltroId(e.target.value)} />
          </div>
          <div className="filtro-item">
            <label>Marca</label>
            <input type="text" className="input-filtro" placeholder="Buscar Marca..." value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} />
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
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-limpar" onClick={limparFiltros} style={{ flex: 1 }} disabled={buscando}>
              Limpar
            </button>
            <button 
              className="btn-salvar-rec" 
              onClick={handlePesquisar} 
              disabled={buscando} 
              style={{ flex: 1.5, backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}
            >
              {buscando ? '⏳ ...' : '🔍 Pesquisar'}
            </button>
          </div>
        </div>

      </div>

      <div className="card-historico">
        <div className="tabela-wrapper">
          <table className="tabela-requisicoes" style={{ whiteSpace: 'nowrap', width: '100%' }}>
            <thead>
              <tr>
                <RenderHeaderSort titulo="ID" coluna="id" />
                <RenderHeaderSort titulo="Motivo (Tipo)" coluna="motivo" />
                <RenderHeaderSort titulo="Data" coluna="data" />
                <RenderHeaderSort titulo="Destino" coluna="destino" />
                <RenderHeaderSort titulo="Separador" coluna="separador" />
                <RenderHeaderSort titulo="Itens" coluna="itens" />
                <RenderHeaderSort titulo="Criado às" coluna="horaCriacao" />
                <RenderHeaderSort titulo="T. Separação" coluna="tempoSeparacao" />
                <RenderHeaderSort titulo="T. Bip Médio" coluna="tempoBip" />
                <RenderHeaderSort titulo="Finalizado às" coluna="horaFim" />
                <RenderHeaderSort titulo="T. Total Estimado" coluna="tempoTotal" />
                <RenderHeaderSort titulo="Status Atual" coluna="status" />
              </tr>
            </thead>
            <tbody>
              {!pesquisaRealizada ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '50px 20px', color: '#666' }}>
                    <span style={{ fontSize: '2rem', display: 'block', margin: '0 auto 10px' }}>🔍</span>
                    <strong>Preencha um ou mais filtros acima e clique em "Pesquisar" para gerar o relatório.</strong>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>
                      As buscas são feitas diretamente na base de dados para garantir informações completas.
                    </p>
                  </td>
                </tr>
              ) : requisicoesOrdenadas.length > 0 ? (
                requisicoesOrdenadas.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr 
                      className={`tr-clicavel-historico ${linhaExpandida === req.id ? 'linha-ativa-historico' : ''}`} 
                      onClick={() => toggleLinha(req.id)}
                      title="Clique para ver os produtos desta requisição"
                    >
                      <td><strong>{req.id}</strong></td>
                      <td style={{ fontWeight: 'bold', color: req.motivo === 'Reposição Interna' ? '#8e44ad' : 'inherit' }}>{req.motivo || '-'}</td>
                      <td>{req.data}</td>
                      <td>{req.destino}</td>
                      <td style={{ color: '#2980b9' }}><strong>{getSeparador(req)}</strong></td>
                      <td>{req.metricasSeparacao?.totalItensFisicos || req.itens} un</td>
                      
                      <td style={{ color: '#8e44ad' }}>
                        {extrairHora(req.timestampCriacao)}
                      </td>

                      <td style={{ fontWeight: 'bold' }}>
                        {req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-'}
                      </td>
                      
                      <td style={{ color: '#e67e22', fontWeight: 'bold' }}>
                        {getTempoBipProduto(req)}
                      </td>

                      <td style={{ color: '#27ae60' }}>
                        {req.metricasSeparacao?.finalizadoEm ? extrairHora(req.metricasSeparacao.finalizadoEm) : '-'}
                      </td>

                      <td style={{ color: '#7f8c8d' }}>
                        {getTempoTotalReq(req)}
                      </td>

                      <td>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>

                    {/* ACORDEÃO COM OS PRODUTOS */}
                    {linhaExpandida === req.id && (
                      <tr className="linha-expandida-historico">
                        <td colSpan="12">
                          <div className="conteudo-expandido-historico">
                            
                            <div style={{ marginBottom: '15px' }}>
                              <h4 style={{ margin: '0 0 5px 0' }}>📦 Itens Solicitados na {req.id}</h4>
                              <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                <strong style={{ color: '#2980b9' }}>Nº Sistema:</strong> {req.numeroRequisicaoExterna || 'N/D'} &nbsp;|&nbsp; <strong style={{ color: '#e67e22' }}>NF:</strong> {req.notaFiscal || 'N/D'}
                              </div>
                            </div>
                            
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
                  <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
                    Nenhuma requisição encontrada com os filtros selecionados no banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {requisicoesOrdenadas.length > 0 && (
          <div className="acoes-rodape">
            <button className="btn-exportar" onClick={exportarParaExcel} title="Baixar relatório gerencial completo">
              📊 Exportar Relatório Gerencial (.csv)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}