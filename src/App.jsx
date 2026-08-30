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
import logo from './assets/logo.jpeg'; 
import Admin from './pages/admin/Admin';
import { supabase } from './services/supabase';

function App() {
  const [isLogado, setIsLogado] = useState(() => localStorage.getItem('netadantas_logado') === 'true');
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    const salvo = localStorage.getItem('netadantas_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [telaAtual, setTelaAtual] = useState('painel');
  const [reqSelecionada, setReqSelecionada] = useState(null);
  const [abaAdminAtiva, setAbaAdminAtiva] = useState('base-dados');

  const [produtosPreSelecionados, setProdutosPreSelecionados] = useState(null);
  const [reqEmEdicao, setReqEmEdicao] = useState(null); 

  // =======================================================================
  // NOVOS ESTADOS GLOBAIS PARA A "REPOSIÇÃO EXTERNA GAMIFICADA SIMULTÂNEA"
  // =======================================================================
  const [itensPreRequisicao, setItensPreRequisicao] = useState([]);
  const [tipoReposicaoGlobal, setTipoReposicaoGlobal] = useState('interna'); 
  const [inicioCronometroGlobal, setInicioCronometroGlobal] = useState(null);

  const [baseProdutos, setBaseProdutos] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);
  const [pedidosMarketplace, setPedidosMarketplace] = useState([]);
  const [recordesGlobais, setRecordesGlobais] = useState({});
  const [carregando, setCarregando] = useState(false);

  const [autorizacoesPendentes, setAutorizacoesPendentes] = useState([]);

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

    const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin';
    
    const fetchPendentes = async () => {
      if (isEncarregado && usuarioLogado?.nome_completo) {
        try {
          const { data, error } = await supabase.from('autorizacoes_bip')
            .select('*')
            .eq('encarregado_destino', usuarioLogado.nome_completo)
            .eq('status', 'pendente');
          
          if (!error && data) {
            setAutorizacoesPendentes(prev => {
              const hasNew = data.some(novaAuth => !prev.some(p => p.id === novaAuth.id));
              if (hasNew) tocarSomNotificacao();
              return data;
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
    setInicioCronometroGlobal(null); // Reseta caso o usuário desista no meio
    setTipoReposicaoGlobal('interna');
  };

  const handleCancelarRequisicao = async (id, nomeCancelador) => {
    const req = requisicoes.find(r => r.id === id);
    const dataCancelamento = new Date().toLocaleString('pt-BR');
    
    const historicoAtualizado = { 
      ...req.historico, 
      'Cancelamento': `Por ${nomeCancelador} em ${dataCancelamento}` 
    };

    const { error } = await supabase.from('requisicoes').update({
      status: 'Cancelada', 
      historico: historicoAtualizado
    }).eq('id', id);

    if (!error) {
      setReqEmEdicao(null);
      await carregarDadosDaNuvem(true); 
      setTelaAtual('painel'); 
    }
  };

  // =======================================================================
  // AJUSTE REALIZADO AQUI: Suporte a gravação das métricas de separação 
  // direto da criação da Nova Requisição (se for "Externa Gamificada")
  // =======================================================================
  const handleSalvarRequisicao = async (novaReq, isEdicao = false) => {
    if (isEdicao) {
      const { error } = await supabase.from('requisicoes').update({
        origem: novaReq.origem,
        destino: novaReq.destino,
        solicitante: novaReq.solicitante,
        motivo: novaReq.motivo,
        prioridade: novaReq.prioridade,
        itens: novaReq.itens,
        status: 'Pendente', 
        lista_itens: novaReq.listaItens,
        historico: novaReq.historico
      }).eq('id', novaReq.id);

      if (!error) { 
        setReqEmEdicao(null);
        await carregarDadosDaNuvem(true); 
        setTelaAtual('painel'); 
      }
    } else {
      const { error } = await supabase.from('requisicoes').insert([{
        id: novaReq.id, data: novaReq.data, timestamp_criacao: novaReq.timestampCriacao, origem: novaReq.origem, destino: novaReq.destino, solicitante: novaReq.solicitante,
        motivo: novaReq.motivo, prioridade: novaReq.prioridade, itens: novaReq.itens, status: novaReq.status, lista_itens: novaReq.listaItens, historico: novaReq.historico,
        metricas_separacao: novaReq.metricasSeparacao || null // <-- ADICIONADO AQUI
      }]);
      
      if (!error) { 
        // Verifica se a gamificação simultânea bateu recorde e salva no banco
        if (novaReq.metricasSeparacao?.bateuRecorde) {
          await supabase.from('recordes_globais').upsert({ 
            qtd_itens: novaReq.metricasSeparacao.totalItensFisicos, 
            tempo_segundos: novaReq.metricasSeparacao.tempoTotalSegundos, 
            responsavel: novaReq.metricasSeparacao.responsavel, 
            data: new Date().toLocaleDateString() 
          });
        }
        
        await carregarDadosDaNuvem(true); 
        setTelaAtual('painel'); 
        setProdutosPreSelecionados(null); 
        setInicioCronometroGlobal(null); // Limpa o cronômetro para o próximo pedido
        setTipoReposicaoGlobal('interna'); // Volta ao padrão
      }
    }
  };

  const handleAtualizarObservacoes = async (id, novaDescricaoObs, autorDaObs) => {
    const req = requisicoes.find(r => r.id === id);
    
    const listaAntiga = Array.isArray(req.historico?.observacoesGerais) 
      ? req.historico.observacoesGerais 
      : [];

    const novaObsObj = {
      id_obs: Date.now(),
      texto: novaDescricaoObs,
      autor: autorDaObs,
      data: new Date().toLocaleString('pt-BR')
    };

    const novaListaGeral = [...listaAntiga, novaObsObj];
    const historicoAtualizado = { ...req.historico, observacoesGerais: novaListaGeral };
    
    setRequisicoes(requisicoes.map(r => r.id === id ? { ...r, historico: historicoAtualizado } : r));
    if (reqSelecionada?.id === id) setReqSelecionada({ ...reqSelecionada, historico: historicoAtualizado });

    await supabase.from('requisicoes').update({ historico: historicoAtualizado }).eq('id', id);
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
    await carregarDadosDaNuvem(true);
  };

  const handleAdicionarResponsavel = async (id, novoResponsavel) => {
    const req = requisicoes.find(r => r.id === id);
    const statusAtual = req.status; 
    const responsavelAtual = req.historico && req.historico[statusAtual] ? req.historico[statusAtual] : '';
    if (responsavelAtual.includes(novoResponsavel)) return;
    const responsavelConcatenado = responsavelAtual ? `${responsavelAtual} + ${novoResponsavel}` : novoResponsavel;
    const historicoAtualizado = { ...req.historico, [statusAtual]: responsavelConcatenado };
    const reqAtualizada = { ...req, historico: historicoAtualizado };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);
    await supabase.from('requisicoes').update({ historico: historicoAtualizado }).eq('id', id);
    await carregarDadosDaNuvem(true);
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

    const reqAtualizada = { 
      ...req, 
      metricasSeparacao: novasMetricas,
      status: novoStatusAutomatico,
      historico: historicoAtualizado 
    };

    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ 
      metricas_separacao: novasMetricas,
      status: novoStatusAutomatico,
      historico: historicoAtualizado
    }).eq('id', id);

    await carregarDadosDaNuvem(true, true);
    return novasMetricas;
  };

  const abrirDetalhes = (req) => { setReqSelecionada(req); setTelaAtual('detalhes'); };
  const handleSalvarPedidosMarketplace = (novosPedidos) => { setPedidosMarketplace([...novosPedidos, ...pedidosMarketplace]); setTelaAtual('painel'); };

  // Funções da Pré-requisição (Base de Dados)
  const handleAdicionarPreRequisicao = (produto) => {
    setItensPreRequisicao(prev => {
      if (prev.some(p => String(p.codigo) === String(produto.codigo))) return prev;
      return [...prev, produto];
    });
  };

  const handleRemoverPreRequisicao = (codigoProd) => {
    setItensPreRequisicao(prev => prev.filter(p => String(p.codigo) !== String(codigoProd)));
  };

  const handleIrParaPreRequisicao = () => {
    setProdutosPreSelecionados(itensPreRequisicao);
    setItensPreRequisicao([]); 
    setTelaAtual('nova');
  };

  if (!isLogado) return <Login aoLogar={handleLogar} />;

  return (
    <div className="layout-container">
      <header className={`cabecalho-global ${telaAtual === 'admin' ? 'cabecalho-admin-mode' : ''}`}>
        <div className="header-wrapper-flex">
          <img src={logo} alt="Logo Neta Dantas" className="logo-header" />
          <h1 className="titulo-cabecalho">Painel de Requisição Interna de Produtos</h1>
          <Menu 
            aoClicarPainel={() => setTelaAtual('painel')} aoClicarHistorico={() => setTelaAtual('historico')}
            aoClicarBaseDados={() => setTelaAtual('base-dados')} aoClicarAdmin={() => setTelaAtual('admin')}
            usuarioLogado={usuarioLogado} aoSair={handleSair} 
          />
        </div>
        {telaAtual === 'admin' && usuarioLogado?.username === 'admin' && (
          <div className="admin-tabs-header">
            <button className={`tab-header ${abaAdminAtiva === 'base-dados' ? 'ativo' : ''}`} onClick={() => setAbaAdminAtiva('base-dados')}>🗄️ Base de Dados</button>
            <button className={`tab-header ${abaAdminAtiva === 'usuarios' ? 'ativo' : ''}`} onClick={() => setAbaAdminAtiva('usuarios')}>👥 Gestão de Usuários</button>
            <button className={`tab-header ${abaAdminAtiva === 'novidades' ? 'ativo' : ''}`} onClick={() => setAbaAdminAtiva('novidades')}>📢 Novidades</button>
          </div>
        )}
      </header>
      
      <main>
        {carregando ? (
          <div className="tela-loading">
            <h2>🔄 Conectando com a Nuvem...</h2>
            <p>Sincronizando as requisições da Neta Dantas, aguarde.</p>
          </div>
        ) : (
          <>
            {telaAtual === 'painel' && <Painel aoClicarNovo={(produtos = null) => { setProdutosPreSelecionados(produtos); setTelaAtual('nova'); }} aoClicarNovoPedido={() => setTelaAtual('inserir-marketplace')} requisicoes={requisicoes.filter(r => r.status !== 'Em Edição' && r.status !== 'Cancelada')} pedidosMarketplace={pedidosMarketplace} aoAbrirDetalhes={abrirDetalhes} />}
            
            {/* PASSANDO AS NOVAS PROPS GLOBAIS PARA A NOVA REQUISIÇÃO */}
            {telaAtual === 'nova' && (
              <NovaRequisicao 
                aoVoltar={handleCancelarEdicao} 
                baseProdutos={baseProdutos} 
                aoSalvar={handleSalvarRequisicao} 
                aoCancelarReq={handleCancelarRequisicao} 
                requisicoes={requisicoes} 
                produtosPreSelecionados={produtosPreSelecionados} 
                reqEmEdicao={reqEmEdicao} 
                usuarioLogado={usuarioLogado}
                recordesGlobais={recordesGlobais}
                tipoReposicaoGlobal={tipoReposicaoGlobal}
                inicioCronometroGlobal={inicioCronometroGlobal}
              />
            )}
            
            {telaAtual === 'detalhes' && <DetalhesRequisicao req={reqSelecionada} usuarioLogado={usuarioLogado} baseProdutos={baseProdutos} aoVoltar={() => setTelaAtual('painel')} aoMudarStatus={handleAlterarStatus} aoAtualizarItens={handleAtualizarItens} aoAdicionarResponsavel={handleAdicionarResponsavel} aoFinalizarSeparacao={handleFinalizarSeparacao} aoIniciarEdicao={handleIniciarEdicao} aoAtualizarObservacoes={handleAtualizarObservacoes} recordesGlobais={recordesGlobais} />}
            {telaAtual === 'inserir-marketplace' && <InserirPedido aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={handleSalvarPedidosMarketplace} />}
            {telaAtual === 'historico' && <Historico requisicoes={requisicoes} aoVoltar={() => setTelaAtual('painel')} />}
            
            {/* PASSANDO AS NOVAS PROPS GLOBAIS PARA A BASE DE DADOS */}
            {telaAtual === 'base-dados' && (
              <BaseDados 
                aoVoltar={() => {
                  setTelaAtual('painel');
                  setInicioCronometroGlobal(null);
                  setTipoReposicaoGlobal('interna');
                }} 
                produtos={baseProdutos} 
                setProdutos={setBaseProdutos} 
                itensPreRequisicao={itensPreRequisicao}
                aoAdicionarPreRequisicao={handleAdicionarPreRequisicao}
                aoRemoverPreRequisicao={handleRemoverPreRequisicao}
                aoIrParaPreRequisicao={handleIrParaPreRequisicao}
                tipoReposicaoGlobal={tipoReposicaoGlobal}
                setTipoReposicaoGlobal={setTipoReposicaoGlobal}
                inicioCronometroGlobal={inicioCronometroGlobal}
                setInicioCronometroGlobal={setInicioCronometroGlobal}
              />
            )}
            
            {telaAtual === 'admin' && usuarioLogado?.username === 'admin' && <Admin setProdutos={setBaseProdutos} abaAtiva={abaAdminAtiva} />}
          </>
        )}
      </main>

      {autorizacoesPendentes.length > 0 && (
        <div className="container-notificacoes-bip">
          {autorizacoesPendentes.map(auth => (
            <div key={auth.id} className="toast-autorizacao-bip">
              <div className="toast-bip-header">🔑 Liberação de Bip Manual</div>
              <div className="toast-bip-body">
                <strong>{auth.solicitante_nome}</strong> não conseguiu bipar o produto abaixo e solicita digitação:<br/>
                <br/>
                <span>{auth.produto_descricao}</span>
              </div>
              <div className="toast-bip-footer">
                <button className="btn-recusar-bip" onClick={() => handleRecusarBip(auth)}>Recusar ❌</button>
                <button className="btn-aprovar-bip" onClick={() => handleAprovarBip(auth)}>Aprovar ✅</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Rodape />
    </div>
  );
}

export default App;