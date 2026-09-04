import Rodape from './components/rodape/Rodape';
import { useState, useEffect, useCallback } from 'react';
import './styles/global.css';
import Painel from './pages/painel/Painel';
import NovaRequisicao from './pages/painel/nova-requisicao/NovaRequisicao';
import DetalhesRequisicao from './pages/painel/detalhes/DetalhesRequisicao';
import BaseDados from './pages/base-dados/BaseDados';
import Historico from './pages/historico/Historico'; 
import Menu from './components/menu/Menu';
import InserirPedido from './pages/marketplace/inserir-pedido/InserirPedido';
import Login from './pages/login/Login';
import Admin from './pages/admin/Admin';
import { supabase } from './services/supabase';

function App() {
  const [isLogado, setIsLogado] = useState(() => localStorage.getItem('netadantas_logado') === 'true');
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    const salvo = localStorage.getItem('netadantas_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [telaAtual, setTelaAtual] = useState('painel');
  const [abaPainelAtiva, setAbaPainelAtiva] = useState('interna');
  const [reqSelecionada, setReqSelecionada] = useState(null);
  const [abaAdminAtiva, setAbaAdminAtiva] = useState('base-dados');

  const [produtosPreSelecionados, setProdutosPreSelecionados] = useState(null);
  const [reqEmEdicao, setReqEmEdicao] = useState(null); 

  const [itensPreRequisicao, setItensPreRequisicao] = useState([]);
  const [tipoReposicaoGlobal, setTipoReposicaoGlobal] = useState('interna'); 
  const [inicioCronometroGlobal, setInicioCronometroGlobal] = useState(null);

  const [baseProdutos, setBaseProdutos] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);
  const [pedidosMarketplace, setPedidosMarketplace] = useState([]);
  const [recordesGlobais, setRecordesGlobais] = useState({});
  const [carregando, setCarregando] = useState(false);

  // Estados de Notificações
  const [autorizacoesPendentes, setAutorizacoesPendentes] = useState([]);
  const [pausasPendentes, setPausasPendentes] = useState([]); 

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const handleLogar = (dadosUsuario) => {
    localStorage.setItem('netadantas_logado', 'true');
    if (dadosUsuario) {
      localStorage.setItem('netadantas_usuario', JSON.stringify(dadosUsuario));
      setUsuarioLogado(dadosUsuario);
    }
    setIsLogado(true);
  };

  const handleSair = async () => {
    localStorage.removeItem('netadantas_logado');
    localStorage.removeItem('netadantas_usuario');
    setUsuarioLogado(null);
    setIsLogado(false);
    await supabase.auth.signOut();
  };

  const carregarDadosDaNuvem = useCallback(async (silencioso = false, rapido = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const { data: reqData } = await supabase.from('requisicoes').select('*').order('timestamp_criacao', { ascending: false });
      if (reqData) {
        const reqsFormatadas = reqData.map(r => ({
          ...r,
          timestampCriacao: r.timestamp_criacao,
          listaItens: r.lista_itens,
          metricasSeparacao: r.metricas_separacao,
          numeroRequisicaoExterna: r.numero_requisicao_externa,
          notaFiscal: r.nota_fiscal
        }));
        setRequisicoes(reqsFormatadas);

        setReqSelecionada(prev => {
          if (!prev) return null;
          return reqsFormatadas.find(r => r.id === prev.id) || prev;
        });
      }

      if (rapido) return;

      const { data: recData } = await supabase.from('recordes_globais').select('*');
      if (recData) {
        const objRecordes = {};
        recData.forEach(rec => {
          objRecordes[`qtd_${rec.qtd_itens}`] = { tempoSegundos: rec.tempo_segundos, responsavel: rec.responsavel, data: rec.data };
        });
        setRecordesGlobais(objRecordes);
      }

      let todosOsProdutos = [];
      let buscouTodos = false;
      let indexAtual = 0;
      const tamanhoPagina = 1000;

      while (!buscouTodos) {
        const { data: prodData, error } = await supabase.from('base_produtos').select('*').range(indexAtual, indexAtual + tamanhoPagina - 1);
        if (error) break;
        if (prodData && prodData.length > 0) {
          todosOsProdutos = [...todosOsProdutos, ...prodData];
          indexAtual += tamanhoPagina;
        }
        if (!prodData || prodData.length < tamanhoPagina) { buscouTodos = true; }
      }

      if (todosOsProdutos.length > 0) {
        const produtosFormatados = todosOsProdutos.map(p => ({
          ...p, codigoBarra: p.codigo_barra, precoVenda: p.preco_venda, precoCusto: p.preco_custo
        }));
        setBaseProdutos(produtosFormatados);
      }
    } catch (error) {
      console.error("Erro ao sincronizar com o Supabase:", error);
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!isLogado) return;

    carregarDadosDaNuvem();

    const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin;
    
    const fetchPendentes = async () => {
      if (isEncarregado && usuarioLogado?.nome_completo) {
        try {
          const isAdmin = usuarioLogado.username === 'admin' || usuarioLogado.acesso_admin;

          // --- BUSCA BIPS PENDENTES ---
          let queryBip = supabase.from('autorizacoes_bip').select('*').eq('status', 'pendente');
          if (!isAdmin) {
             queryBip = queryBip.ilike('encarregado_destino', `%${usuarioLogado.nome_completo}%`);
          }
          const { data: dataBip } = await queryBip;
          
          if (dataBip) {
            setAutorizacoesPendentes(prev => {
              const hasNew = dataBip.some(novaAuth => !prev.some(p => p.id === novaAuth.id));
              if (hasNew) tocarSomNotificacao();
              return dataBip;
            });
          }

          // --- BUSCA PAUSAS PENDENTES ---
          let queryPausa = supabase.from('pausas_separacao').select('*').eq('status', 'pendente');
          if (!isAdmin) {
             queryPausa = queryPausa.ilike('encarregado_destino', `%${usuarioLogado.nome_completo}%`);
          }
          const { data: dataPausa } = await queryPausa;
          
          if (dataPausa) {
            setPausasPendentes(prev => {
              const hasNew = dataPausa.some(novaPausa => !prev.some(p => p.id === novaPausa.id));
              if (hasNew) tocarSomNotificacao();
              return dataPausa;
            });
          }
        } catch (e) {}
      }
    };

    fetchPendentes();

    let isMounted = true;
    let timerId = null;

    const loopSincronizacao = async () => {
      if (!isMounted) return;
      try {
        await carregarDadosDaNuvem(true, true);
        await fetchPendentes();
      } catch (e) {}
      
      if (isMounted) {
        timerId = setTimeout(loopSincronizacao, 5000);
      }
    };

    timerId = setTimeout(loopSincronizacao, 5000);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isLogado, carregarDadosDaNuvem, usuarioLogado]);

  const tocarSomNotificacao = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  };

  const handleAprovarBip = async (auth) => {
    setAutorizacoesPendentes(prev => prev.filter(a => a.id !== auth.id));
    await supabase.from('autorizacoes_bip').update({ status: 'aprovado' }).eq('id', auth.id);
  };
  const handleRecusarBip = async (auth) => {
    setAutorizacoesPendentes(prev => prev.filter(a => a.id !== auth.id));
    await supabase.from('autorizacoes_bip').update({ status: 'recusado' }).eq('id', auth.id);
  };

  const handleAtualizarHistorico = async (id, novoHistorico) => {
    const reqAtualizada = { ...requisicoes.find(r => r.id === id), historico: novoHistorico };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    if (reqSelecionada?.id === id) setReqSelecionada(reqAtualizada);
    await supabase.from('requisicoes').update({ historico: novoHistorico }).eq('id', id);
  };

  const handleAprovarPausa = async (pausa) => {
    setPausasPendentes(prev => prev.filter(p => p.id !== pausa.id));
    const agora = Date.now();
    await supabase.from('pausas_separacao').update({ status: 'aprovada', inicio_pausa: agora }).eq('id', pausa.id);
    const req = requisicoes.find(r => r.id === pausa.requisicao_id);
    if (req) {
      const historicoAtualizado = {
        ...req.historico,
        pausa_ativa_inicio: agora,
        pausa_ativa_id: pausa.id,
        tipo_pausa_ativa: pausa.tipo_pausa
      };
      await handleAtualizarHistorico(req.id, historicoAtualizado);
    }
  };

  const handleRecusarPausa = async (pausa) => {
    setPausasPendentes(prev => prev.filter(p => p.id !== pausa.id));
    await supabase.from('pausas_separacao').update({ status: 'recusada' }).eq('id', pausa.id);
  };

  const handleIniciarEdicao = async (id, nomeEditor) => {
    const req = requisicoes.find(r => r.id === id);
    const reqEditando = { ...req, editorTemporario: nomeEditor };
    await supabase.from('requisicoes').update({ status: 'Em Edição' }).eq('id', id);
    setReqEmEdicao(reqEditando);
    setTelaAtual('nova');
    carregarDadosDaNuvem(true, true);
  };

  const handleCancelarEdicao = async () => {
    if (reqEmEdicao) {
      await supabase.from('requisicoes').update({ status: 'Pendente' }).eq('id', reqEmEdicao.id);
      setReqEmEdicao(null);
      carregarDadosDaNuvem(true, true);
    }
    setTelaAtual('painel');
    setProdutosPreSelecionados(null);
    setInicioCronometroGlobal(null); 
    setTipoReposicaoGlobal('interna');
  };

  const handleCancelarRequisicao = async (id, nomeCancelador) => {
    const req = requisicoes.find(r => r.id === id);
    const dataCancelamento = new Date().toLocaleString('pt-BR');
    const historicoAtualizado = { ...req.historico, 'Cancelamento': `Por ${nomeCancelador} em ${dataCancelamento}` };
    const { error } = await supabase.from('requisicoes').update({ status: 'Cancelada', historico: historicoAtualizado }).eq('id', id);
    if (!error) {
      setReqEmEdicao(null);
      await carregarDadosDaNuvem(true); 
      setTelaAtual('painel'); 
    }
  };

  const handleSalvarRequisicao = async (novaReq, isEdicao = false) => {
    if (isEdicao) {
      const { error } = await supabase.from('requisicoes').update({
        origem: novaReq.origem, destino: novaReq.destino, solicitante: novaReq.solicitante,
        motivo: novaReq.motivo, prioridade: novaReq.prioridade, itens: novaReq.itens,
        status: 'Pendente', lista_itens: novaReq.listaItens, historico: novaReq.historico
      }).eq('id', novaReq.id);

      if (!error) { 
        setReqEmEdicao(null); await carregarDadosDaNuvem(true); setTelaAtual('painel'); 
      }
    } else {
      const { error } = await supabase.from('requisicoes').insert([{
        id: novaReq.id, data: novaReq.data, timestamp_criacao: novaReq.timestampCriacao, origem: novaReq.origem, destino: novaReq.destino, solicitante: novaReq.solicitante,
        motivo: novaReq.motivo, prioridade: novaReq.prioridade, itens: novaReq.itens, status: novaReq.status, lista_itens: novaReq.listaItens, historico: novaReq.historico,
        metricas_separacao: novaReq.metricasSeparacao || null 
      }]);
      
      if (!error) { 
        if (novaReq.metricasSeparacao?.bateuRecorde) {
          await supabase.from('recordes_globais').upsert({ qtd_itens: novaReq.metricasSeparacao.totalItensFisicos, tempo_segundos: novaReq.metricasSeparacao.tempoTotalSegundos, responsavel: novaReq.metricasSeparacao.responsavel, data: new Date().toLocaleDateString() });
        }
        await carregarDadosDaNuvem(true); 
        setTelaAtual('painel'); 
        setProdutosPreSelecionados(null); setInicioCronometroGlobal(null); setTipoReposicaoGlobal('interna'); 
      }
    }
  };

  const handleAtualizarObservacoes = async (id, novaDescricaoObs, autorDaObs) => {
    const req = requisicoes.find(r => r.id === id);
    const listaAntiga = Array.isArray(req.historico?.observacoesGerais) ? req.historico.observacoesGerais : [];
    const novaObsObj = { id_obs: Date.now(), texto: novaDescricaoObs, autor: autorDaObs, data: new Date().toLocaleString('pt-BR') };
    const novaListaGeral = [...listaAntiga, novaObsObj];
    const historicoAtualizado = { ...req.historico, observacoesGerais: novaListaGeral };
    await handleAtualizarHistorico(id, historicoAtualizado);
  };

  const handleAlterarStatus = async (id, novoStatus, responsavel, dadosExtras = {}) => {
    const req = requisicoes.find(r => r.id === id);
    const historicoAtualizado = { ...req.historico, [novoStatus]: responsavel };
    if (novoStatus === 'Em Separação' && req.status !== 'Em Separação') { historicoAtualizado.inicio_separacao = Date.now(); }
    const reqAtualizada = { ...req, status: novoStatus, historico: historicoAtualizado, ...dadosExtras };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    const payloadBanco = { status: novoStatus, historico: historicoAtualizado };
    if (dadosExtras.numeroRequisicaoExterna) payloadBanco.numero_requisicao_externa = dadosExtras.numeroRequisicaoExterna;
    if (dadosExtras.notaFiscal) payloadBanco.nota_fiscal = dadosExtras.notaFiscal;
    await supabase.from('requisicoes').update(payloadBanco).eq('id', id);
  };

  const handleAdicionarResponsavel = async (id, novoResponsavel) => {
    const req = requisicoes.find(r => r.id === id);
    const statusAtual = req.status; 
    const responsavelAtual = req.historico && req.historico[statusAtual] ? req.historico[statusAtual] : '';
    if (responsavelAtual.includes(novoResponsavel)) return;
    const responsavelConcatenado = responsavelAtual ? `${responsavelAtual} + ${novoResponsavel}` : novoResponsavel;
    const historicoAtualizado = { ...req.historico, [statusAtual]: responsavelConcatenado };
    await handleAtualizarHistorico(id, historicoAtualizado);
  };

  const handleAtualizarItens = async (id, novaListaItens) => {
    const reqAtualizada = { ...requisicoes.find(r => r.id === id), listaItens: novaListaItens, lista_itens: novaListaItens };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);
    await supabase.from('requisicoes').update({ lista_itens: novaListaItens }).eq('id', id);
  };

  const handleFinalizarSeparacao = async (id, tempoSegundos, responsavelSeparacao) => {
    const req = requisicoes.find(r => r.id === id);
    const totalItensFisicos = req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0);
    const novasMetricas = { tempoTotalSegundos: tempoSegundos, totalItensFisicos: totalItensFisicos, bateuRecorde: false, responsavel: responsavelSeparacao, finalizadoEm: new Date().toISOString() };
    
    const chaveRecorde = `qtd_${totalItensFisicos}`;
    const recordeAtual = recordesGlobais[chaveRecorde];
    if (!recordeAtual || tempoSegundos < recordeAtual.tempoSegundos) {
      novasMetricas.bateuRecorde = true;
      await supabase.from('recordes_globais').upsert({ qtd_itens: totalItensFisicos, tempo_segundos: tempoSegundos, responsavel: responsavelSeparacao, data: new Date().toLocaleDateString() });
    }

    const novoStatusAutomatico = 'Separado';
    const historicoAtualizado = { ...req.historico, [novoStatusAutomatico]: responsavelSeparacao };

    const reqAtualizada = { ...req, metricasSeparacao: novasMetricas, status: novoStatusAutomatico, historico: historicoAtualizado };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);
    await supabase.from('requisicoes').update({ metricas_separacao: novasMetricas, status: novoStatusAutomatico, historico: historicoAtualizado }).eq('id', id);
    return novasMetricas;
  };

  const abrirDetalhes = (req) => { setReqSelecionada(req); setTelaAtual('detalhes'); };
  const navegarPara = (novaTela, aba = 'interna') => { setTelaAtual(novaTela); if (novaTela === 'painel') setAbaPainelAtiva(aba); setMenuMobileAberto(false); };

  if (!isLogado) return <Login aoLogar={handleLogar} />;

  return (
    <div className="layout-container">
      <Menu 
        aoClicarTransferencias={() => navegarPara('painel', 'interna')} 
        aoClicarMarketplace={() => navegarPara('painel', 'marketplace')} 
        aoClicarHistorico={() => navegarPara('historico')}
        aoClicarBaseDados={() => navegarPara('base-dados')} 
        aoClicarAdmin={(abaDestino = 'base-dados') => { setAbaAdminAtiva(abaDestino); navegarPara('admin'); }}
        aoClicarContatos={() => navegarPara('contatos')}
        usuarioLogado={usuarioLogado} 
        aoSair={handleSair} 
        telaAtual={telaAtual}
        menuMobileAberto={menuMobileAberto}
        setMenuMobileAberto={setMenuMobileAberto}
      />

      <div className="conteudo-principal-wrapper">
        <header className="cabecalho-global">
          <div className="header-wrapper-flex">
            <button className="btn-toggle-sidebar" onClick={() => setMenuMobileAberto(!menuMobileAberto)}>☰</button>
            <h1 className="titulo-cabecalho">Painel de Requisição Interna de Produtos</h1>
          </div>
        </header>
        
        <main>
          {carregando ? (
            <div className="tela-loading"><h2>🔄 Conectando com a Nuvem...</h2><p>Sincronizando as requisições da Neta Dantas, aguarde.</p></div>
          ) : (
            <>
              {telaAtual === 'painel' && <Painel abaExterna={abaPainelAtiva} aoClicarNovo={(produtos = null) => { setProdutosPreSelecionados(produtos); setTelaAtual('nova'); }} aoClicarNovoPedido={() => setTelaAtual('inserir-marketplace')} requisicoes={requisicoes.filter(r => r.status !== 'Em Edição' && r.status !== 'Cancelada')} pedidosMarketplace={pedidosMarketplace} aoAbrirDetalhes={abrirDetalhes} />}
              {telaAtual === 'nova' && <NovaRequisicao aoVoltar={handleCancelarEdicao} baseProdutos={baseProdutos} aoSalvar={handleSalvarRequisicao} aoCancelarReq={handleCancelarRequisicao} requisicoes={requisicoes} produtosPreSelecionados={produtosPreSelecionados} reqEmEdicao={reqEmEdicao} usuarioLogado={usuarioLogado} recordesGlobais={recordesGlobais} tipoReposicaoGlobal={tipoReposicaoGlobal} inicioCronometroGlobal={inicioCronometroGlobal} />}
              
              {telaAtual === 'detalhes' && (
                <DetalhesRequisicao 
                  req={reqSelecionada} 
                  usuarioLogado={usuarioLogado} 
                  baseProdutos={baseProdutos} 
                  aoVoltar={() => setTelaAtual('painel')} 
                  aoMudarStatus={handleAlterarStatus} 
                  aoAtualizarItens={handleAtualizarItens} 
                  aoAdicionarResponsavel={handleAdicionarResponsavel} 
                  aoFinalizarSeparacao={handleFinalizarSeparacao} 
                  aoIniciarEdicao={handleIniciarEdicao} 
                  aoAtualizarObservacoes={handleAtualizarObservacoes} 
                  aoAtualizarHistorico={handleAtualizarHistorico}
                  recordesGlobais={recordesGlobais} 
                />
              )}
              
              {telaAtual === 'inserir-marketplace' && <InserirPedido aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={(n) => {setPedidosMarketplace([...n, ...pedidosMarketplace]); setTelaAtual('painel');}} />}
              {telaAtual === 'historico' && <Historico requisicoes={requisicoes} aoVoltar={() => setTelaAtual('painel')} />}
              {telaAtual === 'base-dados' && <BaseDados aoVoltar={() => {setTelaAtual('painel'); setInicioCronometroGlobal(null); setTipoReposicaoGlobal('interna');}} produtos={baseProdutos} setProdutos={setBaseProdutos} itensPreRequisicao={itensPreRequisicao} aoAdicionarPreRequisicao={(p) => setItensPreRequisicao(v => v.some(i => String(i.codigo) === String(p.codigo)) ? v : [...v, p])} aoRemoverPreRequisicao={(c) => setItensPreRequisicao(v => v.filter(i => String(i.codigo) !== String(c)))} aoIrParaPreRequisicao={() => {setProdutosPreSelecionados(itensPreRequisicao); setItensPreRequisicao([]); setTelaAtual('nova');}} tipoReposicaoGlobal={tipoReposicaoGlobal} setTipoReposicaoGlobal={setTipoReposicaoGlobal} inicioCronometroGlobal={inicioCronometroGlobal} setInicioCronometroGlobal={setInicioCronometroGlobal} />}
              {telaAtual === 'admin' && (usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin) && <Admin setProdutos={setBaseProdutos} abaAtiva={abaAdminAtiva} />}
            </>
          )}
        </main>

        <div className="container-notificacoes-bip">
          {autorizacoesPendentes.map(auth => (
            <div key={auth.id} className="toast-autorizacao-bip">
              <div className="toast-bip-header">🔑 Liberação de Bip Manual</div>
              <div className="toast-bip-body">
                <strong>{auth.solicitante_nome}</strong> não conseguiu bipar o produto abaixo e solicita digitação:<br/><br/><span>{auth.produto_descricao}</span>
              </div>
              <div className="toast-bip-footer">
                <button className="btn-recusar-bip" onClick={() => handleRecusarBip(auth)}>Recusar ❌</button>
                <button className="btn-aprovar-bip" onClick={() => handleAprovarBip(auth)}>Aprovar ✅</button>
              </div>
            </div>
          ))}

          {pausasPendentes.map(pausa => (
            <div key={pausa.id} className="toast-autorizacao-bip" style={{ borderColor: '#f39c12' }}>
              <div className="toast-bip-header" style={{ backgroundColor: '#f39c12' }}>⏸️ Solicitação de Pausa</div>
              <div className="toast-bip-body">
                O colaborador <strong>{pausa.solicitante_nome}</strong> está solicitando uma pausa no cronômetro.<br/><br/>
                Motivo: <strong>{pausa.tipo_pausa}</strong>
              </div>
              <div className="toast-bip-footer">
                <button className="btn-recusar-bip" onClick={() => handleRecusarPausa(pausa)}>Negar ❌</button>
                <button className="btn-aprovar-bip" style={{ backgroundColor: '#27ae60' }} onClick={() => handleAprovarPausa(pausa)}>Autorizar Pausa ✅</button>
              </div>
            </div>
          ))}
        </div>

        <Rodape />
      </div>
    </div>
  );
}

export default App;