import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import '../../styles/pages/historico/historico.css';

export default function Historico({ requisicoes, aoVoltar }) {
  const [tipoHistorico, setTipoHistorico] = useState('transferencia'); 

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

  // Controle de Busca Direta no Banco
  const [dadosHistorico, setDadosHistorico] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);

  // 🚀 ESTADO INTELIGENTE: Guarda as informações em tempo real da base de produtos (Apenas Código e Descrição)
  const [baseAtualizada, setBaseAtualizada] = useState({});

  // Listas de Status adaptativas
  const opcoesStatusReq = ['Pendente', 'Em Separação', 'Separado', 'Em Edição', 'Cancelada', 'Saída de produtos', 'Faturamento', 'Transporte', 'Recebimento', 'Concluída'];
  const opcoesStatusRec = ['Pendente', 'Em Conferência', 'Aguardando Precificação', 'Aguardando Cadastro', 'Concluída', 'Cancelada'];
  const opcoesStatusAtuais = tipoHistorico === 'transferencia' ? opcoesStatusReq : opcoesStatusRec;

  const handleTrocarTipo = (novoTipo) => {
    setTipoHistorico(novoTipo);
    limparFiltros(novoTipo);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': case 'Em Conferência': return 'status-separacao';
      case 'Saída de produtos': case 'Aguardando Precificação': return 'status-separado';
      case 'Faturamento': case 'Aguardando Cadastro': return 'status-faturado';
      case 'Transporte': return 'status-enviado';
      case 'Recebimento': case 'Concluída': return 'status-recebido';
      case 'Cancelada': return 'status-pendente';
      default: return 'status-pendente';
    }
  };

  const converterData = (dataStr) => {
    if (!dataStr) return null;
    if (dataStr.includes('T')) return new Date(dataStr);
    const partes = dataStr.split('/');
    if (partes.length === 3) return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`);
    return new Date(dataStr);
  };

  const handlePesquisar = async () => {
    if (!dataInicio && !dataFim && !filtroId && !filtroOrdem && !filtroNotaFiscal && !filtroCodigo && !filtroMarca && !filtroStatus) {
      alert("Por favor, preencha pelo menos um campo de filtro para pesquisar.");
      return;
    }

    setBuscando(true);
    setLinhaExpandida(null);
    
    try {
      if (tipoHistorico === 'transferencia') {
        const precisaListaItens = !!(filtroCodigo || filtroMarca);
        const colunasBase = 'id, data, timestamp_criacao, origem, destino, solicitante, motivo, prioridade, itens, status, historico, metricas_separacao, numero_requisicao_externa, nota_fiscal, oculto';
        const colunasQuery = precisaListaItens ? `${colunasBase}, lista_itens` : colunasBase;

        let query = supabase.from('requisicoes').select(colunasQuery);

        if (dataInicio) query = query.gte('timestamp_criacao', new Date(`${dataInicio}T00:00:00`).getTime());
        if (dataFim) query = query.lte('timestamp_criacao', new Date(`${dataFim}T23:59:59`).getTime());
        if (filtroStatus) query = query.eq('status', filtroStatus);
        if (filtroOrdem) query = query.ilike('numero_requisicao_externa', `%${filtroOrdem}%`);
        if (filtroNotaFiscal) query = query.ilike('nota_fiscal', `%${filtroNotaFiscal}%`);

        const limiteResultados = precisaListaItens ? 400 : 1500;
        query = query.limit(limiteResultados).order('timestamp_criacao', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        if (precisaListaItens && data.length === limiteResultados) {
          alert(`Atenção: a busca por código/marca retornou o limite máximo de ${limiteResultados} resultados.`);
        }

        const reqsFormatadas = data.map(r => ({
          ...r,
          timestampCriacao: r.timestamp_criacao,
          listaItens: r.lista_itens, 
          metricasSeparacao: r.metricas_separacao,
          numeroRequisicaoExterna: r.numero_requisicao_externa,
          notaFiscal: r.nota_fiscal
        }));

        const resultadosFinais = reqsFormatadas.filter(req => {
          let passa = true;
          if (filtroId && !req.id.toString().includes(filtroId)) passa = false;
          if (filtroCodigo && passa) {
            const temProduto = req.listaItens && req.listaItens.some(item => (item.cod || item.codigo || '').toUpperCase().includes(filtroCodigo.toUpperCase()));
            if (!temProduto) passa = false;
          }
          if (filtroMarca && passa) {
            const temProdutoMarca = req.listaItens && req.listaItens.some(item => 
              (item.marca || '').toUpperCase().includes(filtroMarca.toUpperCase()) || 
              (item.descricao || item.nome || '').toUpperCase().includes(filtroMarca.toUpperCase())
            );
            if (!temProdutoMarca) passa = false;
          }
          return passa;
        });

        setDadosHistorico(resultadosFinais);

      } else {
        const precisaListaItens = !!filtroCodigo; 
        const colunasBase = 'id, data_criacao, loja_recebedora, numero_relatorio, nome_fornecedor, marca, numero_nf, volumes, numero_pedido, responsavel_recebedor, responsavel_cadastro, observacoes, status, metricas_recebimento';
        const colunasQuery = precisaListaItens ? `${colunasBase}, itens` : colunasBase;

        let query = supabase.from('recebimento_mercadorias').select(colunasQuery);

        if (dataInicio) query = query.gte('data_criacao', `${dataInicio}T00:00:00`);
        if (dataFim) query = query.lte('data_criacao', `${dataFim}T23:59:59`);
        if (filtroStatus) query = query.eq('status', filtroStatus);
        if (filtroOrdem) query = query.ilike('numero_pedido', `%${filtroOrdem}%`);
        if (filtroNotaFiscal) query = query.ilike('numero_nf', `%${filtroNotaFiscal}%`);
        if (filtroId) query = query.ilike('numero_relatorio', `%${filtroId}%`);
        if (filtroMarca) {
          query = query.or(`nome_fornecedor.ilike.%${filtroMarca}%,marca.ilike.%${filtroMarca}%`);
        }

        const limiteResultados = precisaListaItens ? 400 : 1500;
        query = query.limit(limiteResultados).order('data_criacao', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        const recsFormatados = data.map(r => ({
          ...r,
          idExibicao: r.numero_relatorio,
          timestampCriacao: new Date(r.data_criacao).getTime(),
          listaItens: r.itens, 
          metricasSeparacao: r.metricas_recebimento,
          destino: r.loja_recebedora
        }));

        const resultadosFinais = recsFormatados.filter(req => {
          let passa = true;
          if (filtroCodigo && passa) {
            const temProduto = req.listaItens && req.listaItens.some(item => (item.codigoSistema || item.cod || item.codigo || '').toUpperCase().includes(filtroCodigo.toUpperCase()));
            if (!temProduto) passa = false;
          }
          return passa;
        });

        setDadosHistorico(resultadosFinais);
      }
      
      setPesquisaRealizada(true);

    } catch (err) {
      console.error("Erro ao pesquisar histórico:", err);
      alert("Ocorreu um erro ao buscar o histórico. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  };

  const dadosOrdenados = useMemo(() => {
    return [...dadosHistorico].sort((a, b) => {
      let valA = a[ordenacao.coluna];
      let valB = b[ordenacao.coluna];

      if (ordenacao.coluna === 'separador') {
        valA = tipoHistorico === 'transferencia' ? (a.historico?.['Em Separação'] || a.metricasSeparacao?.responsavel || '') : (a.responsavel_recebedor || '');
        valB = tipoHistorico === 'transferencia' ? (b.historico?.['Em Separação'] || b.metricasSeparacao?.responsavel || '') : (b.responsavel_recebedor || '');
      } else if (ordenacao.coluna === 'tempoSeparacao') {
        valA = a.metricasSeparacao?.tempoTotalSegundos || 0;
        valB = b.metricasSeparacao?.tempoTotalSegundos || 0;
      } else if (ordenacao.coluna === 'data') {
        valA = a.timestampCriacao || 0;
        valB = b.timestampCriacao || 0;
      } else if (ordenacao.coluna === 'itens' || ordenacao.coluna === 'volumes') {
        valA = tipoHistorico === 'transferencia' ? (a.metricasSeparacao?.totalItensFisicos || a.itens || 0) : (a.volumes || 0);
        valB = tipoHistorico === 'transferencia' ? (b.metricasSeparacao?.totalItensFisicos || b.itens || 0) : (b.volumes || 0);
      } else if (ordenacao.coluna === 'tempoTotal' || ordenacao.coluna === 'horaCriacao') {
        valA = a.timestampCriacao || 0;
        valB = b.timestampCriacao || 0;
      } else if (ordenacao.coluna === 'horaFim') {
        valA = a.metricasSeparacao?.finalizadoEm ? new Date(a.metricasSeparacao.finalizadoEm).getTime() : 0;
        valB = b.metricasSeparacao?.finalizadoEm ? new Date(b.metricasSeparacao.finalizadoEm).getTime() : 0;
      } else if (ordenacao.coluna === 'id') {
        valA = a.idExibicao || a.id;
        valB = b.idExibicao || b.id;
      }

      if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dadosHistorico, ordenacao, tipoHistorico]);

  const limparFiltros = (forcarTipo = null) => {
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

  const formatarPrecoLocal = (valor) => {
    if (valor === undefined || valor === null || valor === '' || valor === '-') return '-';
    const strVal = String(valor).replace('R$', '').trim();
    return `R$ ${strVal}`;
  };

  const extrairHora = (timestampOuData) => {
    if (!timestampOuData) return '-';
    const data = new Date(Number(timestampOuData) || timestampOuData);
    if (isNaN(data.getTime())) return '-';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

  const exportarParaExcel = async () => {
    if (dadosOrdenados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    let listaParaExportar = [...dadosOrdenados];
    const idsFaltando = dadosOrdenados.filter(r => !r.listaItens).map(r => r.id);

    if (idsFaltando.length > 0) {
      setBuscando(true);
      try {
        const tabela = tipoHistorico === 'transferencia' ? 'requisicoes' : 'recebimento_mercadorias';
        const colunaItens = tipoHistorico === 'transferencia' ? 'lista_itens' : 'itens';
        const tamanhoLote = 100;
        let dataResultados = [];
        
        for (let i = 0; i < idsFaltando.length; i += tamanhoLote) {
          const loteIds = idsFaltando.slice(i, i + tamanhoLote);
          const { data, error } = await supabase.from(tabela).select(`id, ${colunaItens}`).in('id', loteIds);
          if (error) throw error;
          dataResultados = [...dataResultados, ...data];
        }

        const mapaItens = {};
        dataResultados.forEach(d => { mapaItens[d.id] = d[colunaItens]; });

        listaParaExportar = dadosOrdenados.map(r => mapaItens[r.id] !== undefined ? { ...r, listaItens: mapaItens[r.id] } : r);
        setDadosHistorico(prev => prev.map(r => mapaItens[r.id] !== undefined ? { ...r, listaItens: mapaItens[r.id] } : r));
      } catch (e) {
        console.error('Erro ao carregar itens para exportação:', e);
        alert('Não foi possível carregar os itens para o CSV. Tente novamente.');
        setBuscando(false);
        return;
      }
    }

    let mapaBaseExport = { ...baseAtualizada };
    if (tipoHistorico === 'recebimento') {
      const barcodesParaBuscar = [];
      listaParaExportar.forEach(req => {
        if (req.listaItens) {
          req.listaItens.forEach(i => barcodesParaBuscar.push(i.codigoBarra || i.codigo_barra || i.codigoBarras));
        }
      });
      const uniqueBarcodes = [...new Set(barcodesParaBuscar.filter(Boolean))];
      if (uniqueBarcodes.length > 0) {
        try {
          const { data: pData } = await supabase.from('base_produtos').select('codigo_barra, codigo, descricao').in('codigo_barra', uniqueBarcodes);
          if (pData) {
            pData.forEach(p => {
              mapaBaseExport[p.codigo_barra] = { cod: p.codigo, desc: p.descricao };
            });
          }
        } catch(e) {}
      }
    }
    setBuscando(false);

    let csv = "";
    if (tipoHistorico === 'transferencia') {
      csv = "ID da Requisicao;Cod. do Produto;Descricao do Produto;Qtd. Solicitada;Qtd. Bipada;Motivo (Tipo);Status Atual;Data da Requisicao;Solicitante;Destino;Criado as;Finalizado as;Tempo Total Estimado;Tempo Separacao;Tempo Bip Medio;Separador;N do Sistema;Nota Fiscal;Observacoes do Produto\n";
      listaParaExportar.forEach(req => {
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
        const separador = req.historico?.['Em Separação'] || req.metricasSeparacao?.responsavel || '-';
        const ordemInterna = req.numeroRequisicaoExterna || '-';
        const nf = req.notaFiscal || '-';

        if (req.listaItens && req.listaItens.length > 0) {
          req.listaItens.forEach(item => {
            const displayCod = item.codigo || item.cod || '-';
            const displayDesc = item.descricao || item.nome || '-';
            csv += `"${id}";"${displayCod}";"${displayDesc}";"${item.quantidade || '0'}";"${item.bipContagem || '0'}";"${motivo}";"${status}";"${dataReq}";"${solicitante}";"${destino}";"${horaCriacao}";"${horaFim}";"${tempoTotal}";"${tempoSep}";"${tempoBip}";"${separador}";"${ordemInterna}";"${nf}";"${item.observacao ? item.observacao.replace(/"/g, '""').replace(/\n/g, ' ') : '-'}"\n`;
          });
        } else {
          csv += `"${id}";"-";"-";"-";"-";"${motivo}";"${status}";"${dataReq}";"${solicitante}";"${destino}";"${horaCriacao}";"${horaFim}";"${tempoTotal}";"${tempoSep}";"${tempoBip}";"${separador}";"${ordemInterna}";"${nf}";"-"\n`;
        }
      });
    } else {
      csv = "ID Relatorio;Código;Cód. Barras;Descricao do Produto;Qtd. Conferida;Avarias;Preço Custo;Preço Venda;Produto Novo;Observacao do Produto;Fornecedor;Marca;Nota Fiscal;Volumes;Status Atual;Data do Registro;Loja Destino;Resp. Recebedor;Resp. Cadastro;Tempo Total Conferência\n";
      listaParaExportar.forEach(req => {
        const id = req.numero_relatorio || '-';
        const fornecedor = req.nome_fornecedor || '-';
        const marca = req.marca || '-';
        const nf = req.numero_nf || '-';
        const volumes = req.volumes || '-';
        const status = req.status || '-';
        const dataReq = new Date(req.data_criacao).toLocaleDateString('pt-BR');
        const destino = req.destino || '-';
        const recebedor = req.responsavel_recebedor || '-';
        const cadastrador = req.responsavel_cadastro || '-';
        const tempoSep = req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-';

        if (req.listaItens && req.listaItens.length > 0) {
          req.listaItens.forEach(item => {
            const codBarras = item.codigoBarra || item.codigo_barra || item.codigoBarras || '-';
            
            // 🚀 CHAVES EXATAS DO RECEBIMENTO APLICADAS NA EXPORTAÇÃO
            let displayCod = item.codigoSistema || item.codigo || item.cod || '';
            let displayDesc = item.descricaoFornecedor || item.descricaoProduto || item.descricao || item.nome || '-';
            
            let pCusto = item.precoCusto || item.preco_custo || item.custo || '-';
            let pVenda = item.precoVenda || item.preco_venda || item.venda || '-';
            
            const isNovo = item.produtoNovo || !displayCod || displayDesc.toUpperCase() === 'NOVO CADASTRO';

            if (isNovo) {
              if (req.status === 'Concluída' && mapaBaseExport[codBarras]) {
                displayCod = mapaBaseExport[codBarras].cod || displayCod;
                displayDesc = mapaBaseExport[codBarras].desc || displayDesc;
              }
              if (displayDesc.toUpperCase() === 'NOVO CADASTRO') {
                displayDesc = '-';
              }
            }
            
            displayCod = displayCod || '-';

            const avarias = item.avarias || item.qtdAvarias || '0';
            const qtdConferida = item.quantidade || item.bipContagem || item.quantidadeRecebida || '0';
            const obs = item.observacao ? item.observacao.replace(/"/g, '""').replace(/\n/g, ' ') : '-';

            csv += `"${id}";"${displayCod}";"${codBarras}";"${displayDesc}";"${qtdConferida}";"${avarias}";"${formatarPrecoLocal(pCusto)}";"${formatarPrecoLocal(pVenda)}";"${isNovo ? 'SIM' : 'NAO'}";"${obs}";"${fornecedor}";"${marca}";"${nf}";"${volumes}";"${status}";"${dataReq}";"${destino}";"${recebedor}";"${cadastrador}";"${tempoSep}"\n`;
          });
        } else {
          csv += `"${id}";"-";"-";"-";"-";"-";"-";"-";"-";"-";"${fornecedor}";"${marca}";"${nf}";"${volumes}";"${status}";"${dataReq}";"${destino}";"${recebedor}";"${cadastrador}";"${tempoSep}"\n`;
        }
      });
    }

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_${tipoHistorico}_NetaDantas_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleLinha = async (req) => {
    if (linhaExpandida === req.id) {
      setLinhaExpandida(null);
      return;
    }

    setLinhaExpandida(req.id);

    let itensDaReq = req.listaItens;

    if (!req.listaItens) {
      try {
        const tabela = tipoHistorico === 'transferencia' ? 'requisicoes' : 'recebimento_mercadorias';
        const colunaItens = tipoHistorico === 'transferencia' ? 'lista_itens' : 'itens';
        
        const { data, error } = await supabase.from(tabela).select(colunaItens).eq('id', req.id).single();
        if (!error && data) {
          itensDaReq = data[colunaItens];
          setDadosHistorico(prev => prev.map(r => r.id === req.id ? { ...r, listaItens: itensDaReq } : r));
        }
      } catch (e) {
        console.error('Erro ao carregar itens da requisição:', e);
      }
    }

    if (tipoHistorico === 'recebimento' && req.status === 'Concluída' && itensDaReq) {
      const itensNovos = itensDaReq.filter(i => i.produtoNovo || !i.codigoSistema || !i.cod || !i.codigo);
      if (itensNovos.length > 0) {
        const barcodes = itensNovos.map(i => i.codigoBarra || i.codigo_barra || i.codigoBarras).filter(Boolean);
        
        if (barcodes.length > 0) {
          try {
            // 🚀 BUSCA APENAS CÓDIGO E DESCRIÇÃO PARA A ATUALIZAÇÃO RETROATIVA
            const { data: prodsAtualizados } = await supabase
              .from('base_produtos')
              .select('codigo, codigo_barra, descricao')
              .in('codigo_barra', barcodes);

            if (prodsAtualizados && prodsAtualizados.length > 0) {
              setBaseAtualizada(prev => {
                const novoMapa = { ...prev };
                prodsAtualizados.forEach(p => {
                  novoMapa[p.codigo_barra] = { cod: p.codigo, desc: p.descricao };
                });
                return novoMapa;
              });
            }
          } catch (e) {
            console.error("Erro ao buscar atualizações de base:", e);
          }
        }
      }
    }
  };

  const handleSort = (coluna) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const RenderHeaderSort = ({ titulo, coluna, isReqOnly = false, isRecOnly = false }) => {
    if (isReqOnly && tipoHistorico !== 'transferencia') return null;
    if (isRecOnly && tipoHistorico !== 'recebimento') return null;

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

      <div style={{ marginBottom: '25px', display: 'flex', gap: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: tipoHistorico === 'transferencia' ? 'bold' : 'normal', color: tipoHistorico === 'transferencia' ? '#8e44ad' : '#7f8c8d' }}>
          <input 
            type="radio" 
            name="tipoHistorico" 
            value="transferencia" 
            checked={tipoHistorico === 'transferencia'} 
            onChange={() => handleTrocarTipo('transferencia')} 
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          📦 Transferências (Requisições)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: tipoHistorico === 'recebimento' ? 'bold' : 'normal', color: tipoHistorico === 'recebimento' ? '#2980b9' : '#7f8c8d' }}>
          <input 
            type="radio" 
            name="tipoHistorico" 
            value="recebimento" 
            checked={tipoHistorico === 'recebimento'} 
            onChange={() => handleTrocarTipo('recebimento')} 
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          🚛 Recebimento de Mercadorias
        </label>
      </div>

      <div className="filtros-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
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
              {opcoesStatusAtuais.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filtros-linha" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' }}>
          
          <div className="filtro-item">
            <label>{tipoHistorico === 'transferencia' ? 'Nº Requisição (ID)' : 'ID Relatório'}</label>
            <input type="text" className="input-filtro" placeholder={tipoHistorico === 'transferencia' ? 'Ex: REQ-001' : 'Ex: REC.001'} value={filtroId} onChange={(e) => setFiltroId(e.target.value)} />
          </div>
          
          <div className="filtro-item">
            <label>{tipoHistorico === 'transferencia' ? 'Marca' : 'Fornecedor / Marca'}</label>
            <input type="text" className="input-filtro" placeholder="Buscar Nome..." value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} />
          </div>
          
          <div className="filtro-item">
            <label>Cód. Produto</label>
            <input type="text" className="input-filtro" placeholder="Ex: 1001" value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} />
          </div>

          <div className="filtro-item">
            <label>{tipoHistorico === 'transferencia' ? 'Nº Sistema (Ordem)' : 'Nº Pedido'}</label>
            <input type="text" className="input-filtro" placeholder="Buscar Num..." value={filtroOrdem} onChange={(e) => setFiltroOrdem(e.target.value)} />
          </div>

          <div className="filtro-item">
            <label>Nota Fiscal</label>
            <input type="text" className="input-filtro" placeholder="Buscar NF" value={filtroNotaFiscal} onChange={(e) => setFiltroNotaFiscal(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-limpar" onClick={() => limparFiltros(null)} style={{ flex: 1 }} disabled={buscando}>
              Limpar
            </button>
            <button 
              className="btn-salvar-rec" 
              onClick={handlePesquisar} 
              disabled={buscando} 
              style={{ flex: 1.5, backgroundColor: tipoHistorico === 'transferencia' ? '#2980b9' : '#16a085', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}
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
                <RenderHeaderSort titulo={tipoHistorico === 'transferencia' ? "ID" : "Relatório"} coluna="id" />
                <RenderHeaderSort titulo="Motivo (Tipo)" coluna="motivo" isReqOnly />
                <RenderHeaderSort titulo="Fornecedor" coluna="fornecedor" isRecOnly />
                <RenderHeaderSort titulo="Data" coluna="data" />
                <RenderHeaderSort titulo="Destino" coluna="destino" />
                <RenderHeaderSort titulo="Separador" coluna="separador" isReqOnly />
                <RenderHeaderSort titulo="Recebedor" coluna="separador" isRecOnly />
                <RenderHeaderSort titulo="Itens" coluna="itens" isReqOnly />
                <RenderHeaderSort titulo="Volumes" coluna="volumes" isRecOnly />
                <RenderHeaderSort titulo="Criado às" coluna="horaCriacao" isReqOnly />
                <RenderHeaderSort titulo="T. Separação" coluna="tempoSeparacao" isReqOnly />
                <RenderHeaderSort titulo="T. Conferência" coluna="tempoSeparacao" isRecOnly />
                <RenderHeaderSort titulo="T. Bip Médio" coluna="tempoBip" isReqOnly />
                <RenderHeaderSort titulo="Finalizado às" coluna="horaFim" />
                <RenderHeaderSort titulo="T. Total Estimado" coluna="tempoTotal" isReqOnly />
                <RenderHeaderSort titulo="Status Atual" coluna="status" />
              </tr>
            </thead>
            <tbody>
              {!pesquisaRealizada ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '50px 20px', color: '#666' }}>
                    <span style={{ fontSize: '2rem', display: 'block', margin: '0 auto 10px' }}>🔍</span>
                    <strong>Selecione o Módulo, preencha os filtros e clique em "Pesquisar" para gerar o relatório.</strong>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>
                      As buscas são feitas diretamente na base de dados para garantir informações completas.
                    </p>
                  </td>
                </tr>
              ) : dadosOrdenados.length > 0 ? (
                dadosOrdenados.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr 
                      className={`tr-clicavel-historico ${linhaExpandida === req.id ? 'linha-ativa-historico' : ''}`} 
                      onClick={() => toggleLinha(req)}
                      title="Clique para ver os produtos detalhados"
                    >
                      <td><strong>{req.idExibicao || req.id}</strong></td>
                      
                      {tipoHistorico === 'transferencia' && (
                        <td style={{ fontWeight: 'bold', color: req.motivo === 'Reposição Interna' ? '#8e44ad' : 'inherit' }}>{req.motivo || '-'}</td>
                      )}
                      {tipoHistorico === 'recebimento' && (
                        <td>{req.nome_fornecedor || '-'} <span style={{fontSize: '0.8em', display: 'block', color: '#7f8c8d'}}>{req.marca || ''}</span></td>
                      )}

                      <td>{tipoHistorico === 'transferencia' ? req.data : new Date(req.timestampCriacao).toLocaleDateString('pt-BR')}</td>
                      
                      <td>{req.destino}</td>
                      
                      <td style={{ color: '#2980b9' }}>
                        <strong>{tipoHistorico === 'transferencia' ? (req.historico?.['Em Separação'] || req.metricasSeparacao?.responsavel || '-') : (req.responsavel_recebedor || '-')}</strong>
                      </td>
                      
                      {tipoHistorico === 'transferencia' ? (
                        <td>{req.metricasSeparacao?.totalItensFisicos || req.itens} un</td>
                      ) : (
                        <td>{req.volumes} cx</td>
                      )}
                      
                      {tipoHistorico === 'transferencia' && (
                        <td style={{ color: '#8e44ad' }}>{extrairHora(req.timestampCriacao)}</td>
                      )}

                      <td style={{ fontWeight: 'bold' }}>
                        {req.metricasSeparacao ? formatarTempo(req.metricasSeparacao.tempoTotalSegundos) : '-'}
                      </td>
                      
                      {tipoHistorico === 'transferencia' && (
                        <td style={{ color: '#e67e22', fontWeight: 'bold' }}>{getTempoBipProduto(req)}</td>
                      )}

                      <td style={{ color: '#27ae60' }}>
                        {req.metricasSeparacao?.finalizadoEm ? extrairHora(req.metricasSeparacao.finalizadoEm) : '-'}
                      </td>

                      {tipoHistorico === 'transferencia' && (
                        <td style={{ color: '#7f8c8d' }}>{getTempoTotalReq(req)}</td>
                      )}

                      <td>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>

                    {/* ACORDEÃO COM OS PRODUTOS ADAPTATIVO */}
                    {linhaExpandida === req.id && (
                      <tr className="linha-expandida-historico">
                        <td colSpan="12">
                          <div className="conteudo-expandido-historico">
                            
                            <div style={{ marginBottom: '15px' }}>
                              <h4 style={{ margin: '0 0 5px 0' }}>📦 Itens de {tipoHistorico === 'transferencia' ? 'Separação' : 'Conferência'} ({req.idExibicao || req.id})</h4>
                              <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                <strong style={{ color: '#2980b9' }}>{tipoHistorico === 'transferencia' ? 'Nº Sistema:' : 'Marca:'}</strong> {tipoHistorico === 'transferencia' ? (req.numeroRequisicaoExterna || 'N/D') : (req.marca || 'N/D')} &nbsp;|&nbsp; 
                                <strong style={{ color: '#e67e22' }}>NF:</strong> {req.notaFiscal || req.numero_nf || 'N/D'}
                              </div>
                            </div>
                            
                            {/* VISÃO TRANSFERÊNCIA */}
                            {tipoHistorico === 'transferencia' && (
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
                                  {!req.listaItens ? (
                                    <tr>
                                      <td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#999' }}>Carregando itens...</td>
                                    </tr>
                                  ) : req.listaItens.length > 0 ? (
                                    req.listaItens.map((item, idx) => {
                                      const displayCod = item.codigo || item.cod || '-';
                                      const displayDesc = item.descricao || item.nome || '-';
                                      return (
                                        <tr key={idx}>
                                          <td><strong>{displayCod}</strong></td>
                                          <td>{displayDesc}</td>
                                          <td style={{ textAlign: 'center' }}>{item.quantidade} un</td>
                                          <td style={{ textAlign: 'center', color: (item.bipContagem >= item.quantidade) ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                            {item.bipContagem || 0} un
                                          </td>
                                          <td style={{ fontStyle: 'italic', color: '#7f8c8d' }}>{item.observacao || '-'}</td>
                                        </tr>
                                      )
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>Nenhum produto registrado.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}

                            {/* 🚀 VISÃO RECEBIMENTO (COM CHAVES CORRIGIDAS) */}
                            {tipoHistorico === 'recebimento' && (
                              <table className="subtabela-historico">
                                <thead>
                                  <tr>
                                    <th>Código</th>
                                    <th>Cód. Barras</th>
                                    <th>Descrição do Produto</th>
                                    <th style={{ textAlign: 'center' }}>Qtd. Conferida</th>
                                    <th style={{ textAlign: 'center' }}>Avarias</th>
                                    <th>Custo</th>
                                    <th>Venda</th>
                                    <th>Observações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {!req.listaItens ? (
                                    <tr>
                                      <td colSpan="8" style={{ textAlign: 'center', padding: '15px', color: '#999' }}>Carregando itens do recebimento...</td>
                                    </tr>
                                  ) : req.listaItens.length > 0 ? (
                                    req.listaItens.map((item, idx) => {
                                      const codBarras = item.codigoBarra || item.codigo_barra || item.codigoBarras || '-';
                                      
                                      // 🚀 CORREÇÃO DEFINITIVA: Mapeando os nomes exatos das chaves usadas no Painel de Recebimento
                                      let displayCod = item.codigoSistema || item.codigo || item.cod || '';
                                      let displayDesc = item.descricaoFornecedor || item.descricaoProduto || item.descricao || item.nome || '-';
                                      let seloStatus = null;

                                      // 🚀 PREÇOS RETIRADOS ESTRITAMENTE DA NOTA (DA ETAPA DE PRECIFICAÇÃO)
                                      let pCusto = item.precoCusto || item.preco_custo || item.custo || '-';
                                      let pVenda = item.precoVenda || item.preco_venda || item.venda || '-';

                                      const isNovo = item.produtoNovo || !displayCod || displayDesc.toUpperCase() === 'NOVO CADASTRO';

                                      if (isNovo) {
                                        if (req.status === 'Concluída' && baseAtualizada[codBarras]) {
                                          displayCod = baseAtualizada[codBarras].cod || displayCod;
                                          displayDesc = baseAtualizada[codBarras].desc || displayDesc;
                                          seloStatus = <span style={{ fontSize: '0.75rem', backgroundColor: '#27ae60', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Cadastrado</span>;
                                        } else {
                                          seloStatus = <span style={{ fontSize: '0.75rem', backgroundColor: '#f39c12', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Novo Cadastro</span>;
                                          // Limpa a descrição se estiver preenchida apenas com a palavra genérica
                                          if (displayDesc.toUpperCase() === 'NOVO CADASTRO') {
                                            displayDesc = '-';
                                          }
                                        }
                                      }
                                      
                                      displayCod = displayCod || '-';

                                      const avarias = item.avarias || item.qtdAvarias || 0;
                                      const qtdConferida = item.quantidade || item.bipContagem || item.quantidadeRecebida || 0;

                                      return (
                                        <tr key={idx}>
                                          <td style={{ color: displayCod !== '-' ? '#2980b9' : 'inherit' }}><strong>{displayCod}</strong></td>
                                          <td style={{ color: '#7f8c8d' }}>{codBarras}</td>
                                          <td>{displayDesc} {seloStatus}</td>
                                          
                                          <td style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>
                                            {qtdConferida} un
                                          </td>
                                          
                                          <td style={{ textAlign: 'center', color: avarias > 0 ? '#e74c3c' : 'inherit', fontWeight: avarias > 0 ? 'bold' : 'normal' }}>
                                            {avarias > 0 ? `${avarias} un` : '-'}
                                          </td>
                                          
                                          <td style={{ color: '#e67e22' }}>{formatarPrecoLocal(pCusto)}</td>
                                          <td style={{ color: '#2980b9', fontWeight: 'bold' }}>{formatarPrecoLocal(pVenda)}</td>
                                          
                                          <td style={{ fontStyle: 'italic', color: '#7f8c8d' }}>{item.observacao || '-'}</td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan="8" style={{ textAlign: 'center', padding: '15px' }}>Nenhum produto registrado neste recebimento.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
                    Nenhuma operação encontrada com os filtros selecionados no banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {dadosOrdenados.length > 0 && (
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