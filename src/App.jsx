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

  const [baseProdutos, setBaseProdutos] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);
  const [pedidosMarketplace, setPedidosMarketplace] = useState([]);
  const [recordesGlobais, setRecordesGlobais] = useState({});
  const [carregando, setCarregando] = useState(false);

  const handleLogar = (dadosUsuario) => {
    localStorage.setItem('netadantas_logado', 'true');
    if (dadosUsuario) {
      localStorage.setItem('netadantas_usuario', JSON.stringify(dadosUsuario));
      setUsuarioLogado(dadosUsuario);
    }
    setIsLogado(true);
  };

  const handleSair = () => {
    localStorage.removeItem('netadantas_logado');
    localStorage.removeItem('netadantas_usuario');
    setUsuarioLogado(null);
    setIsLogado(false);
  };

  const carregarDadosDaNuvem = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      // 1. CARREGA AS REQUISIÇÕES
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

      // 2. CARREGA OS RECORDES
      const { data: recData } = await supabase.from('recordes_globais').select('*');
      if (recData) {
        const objRecordes = {};
        recData.forEach(rec => {
          objRecordes[`qtd_${rec.qtd_itens}`] = { tempoSegundos: rec.tempo_segundos, responsavel: rec.responsavel, data: rec.data };
        });
        setRecordesGlobais(objRecordes);
      }

      // 3. CARREGA OS PRODUTOS (COM PAGINAÇÃO PARA +7000 LINHAS)
      let todosOsProdutos = [];
      let buscouTodos = false;
      let indexAtual = 0;
      const tamanhoPagina = 1000; // Limite de segurança do Supabase

      while (!buscouTodos) {
        const { data: prodData, error } = await supabase
          .from('base_produtos')
          .select('*')
          .range(indexAtual, indexAtual + tamanhoPagina - 1);

        if (error) {
          console.error("Erro na paginação de produtos:", error);
          break;
        }

        if (prodData && prodData.length > 0) {
          todosOsProdutos = [...todosOsProdutos, ...prodData];
          indexAtual += tamanhoPagina;
        }

        // Se retornou menos que 1000, significa que chegou na última página
        if (!prodData || prodData.length < tamanhoPagina) {
          buscouTodos = true;
        }
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

  // MOTOR DE ATUALIZAÇÃO AUTOMÁTICA EM SEGUNDO PLANO (Substituto do Realtime bloqueado)
  useEffect(() => {
    if (isLogado) {
      carregarDadosDaNuvem();

      const intervaloFundo = setInterval(() => {
        carregarDadosDaNuvem(true); 
      }, 4000);

      return () => clearInterval(intervaloFundo);
    }
  }, [isLogado, carregarDadosDaNuvem]);

  const handleSalvarRequisicao = async (novaReq) => {
    const { error } = await supabase.from('requisicoes').insert([{
      id: novaReq.id, data: novaReq.data, timestamp_criacao: novaReq.timestampCriacao,
      origem: novaReq.origem, destino: novaReq.destino, solicitante: novaReq.solicitante,
      motivo: novaReq.motivo, prioridade: novaReq.prioridade, itens: novaReq.itens,
      status: novaReq.status, lista_itens: novaReq.listaItens, historico: novaReq.historico
    }]);

    if (error) {
      alert(`⚠️ Erro do Supabase: ${error.message}`);
    } else {
      await carregarDadosDaNuvem(true); // Autoload forçado
      setTelaAtual('painel');
    }
  };

  const handleAlterarStatus = async (id, novoStatus, responsavel, dadosExtras = {}) => {
    const req = requisicoes.find(r => r.id === id);
    const historicoAtualizado = { ...req.historico, [novoStatus]: responsavel };
    
    if (novoStatus === 'Em Separação' && req.status !== 'Em Separação') {
      historicoAtualizado.inicio_separacao = Date.now();
    }

    // ATUALIZAÇÃO OTIMISTA (Muda a tela instantaneamente para quem clicou)
    const reqAtualizada = { ...req, status: novoStatus, historico: historicoAtualizado, ...dadosExtras };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    // Salva na nuvem e puxa a confirmação (Autoload forçado)
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
    
    // ATUALIZAÇÃO OTIMISTA
    const reqAtualizada = { ...req, historico: historicoAtualizado };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ historico: historicoAtualizado }).eq('id', id);
    await carregarDadosDaNuvem(true); // Autoload forçado
  };

  const handleAtualizarItens = async (id, novaListaItens) => {
    // ATUALIZAÇÃO OTIMISTA
    const reqAtualizada = { 
      ...requisicoes.find(r => r.id === id), 
      listaItens: novaListaItens, 
      lista_itens: novaListaItens 
    };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ lista_itens: novaListaItens }).eq('id', id);
  };

  const handleFinalizarSeparacao = async (id, tempoSegundos, responsavelSeparacao) => {
    const req = requisicoes.find(r => r.id === id);
    const totalItensFisicos = req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0);
    const tempoSlaEsperado = totalItensFisicos * 12; 
    let percentualEficiencia = tempoSegundos > 0 ? Math.round(((tempoSlaEsperado / tempoSegundos) * 100) - 100) : 0;

    const chaveRecorde = `qtd_${totalItensFisicos}`;
    const recordeAtual = recordesGlobais[chaveRecorde];

    const novasMetricas = {
      tempoTotalSegundos: tempoSegundos, eficienciaPercentual: percentualEficiencia,
      bateuRecorde: false, responsavel: responsavelSeparacao, finalizadoEm: new Date().toISOString()
    };

    if (!recordeAtual || tempoSegundos < recordeAtual.tempoSegundos) {
      novasMetricas.bateuRecorde = true;
      await supabase.from('recordes_globais').upsert({
        qtd_itens: totalItensFisicos, tempo_segundos: tempoSegundos, responsavel: responsavelSeparacao, data: new Date().toLocaleDateString()
      });
    }

    // ATUALIZAÇÃO OTIMISTA
    const reqAtualizada = { ...req, metricasSeparacao: novasMetricas };
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ metricas_separacao: novasMetricas }).eq('id', id);
    await carregarDadosDaNuvem(true); // Autoload forçado
    
    return novasMetricas;
  };

  const abrirDetalhes = (req) => { setReqSelecionada(req); setTelaAtual('detalhes'); };
  const handleSalvarPedidosMarketplace = (novosPedidos) => { setPedidosMarketplace([...novosPedidos, ...pedidosMarketplace]); setTelaAtual('painel'); };

  if (!isLogado) return <Login aoLogar={handleLogar} />;

  return (
    <div className="layout-container">
      <header className="cabecalho-global" style={telaAtual === 'admin' ? { display: 'flex', flexDirection: 'column', paddingBottom: '0px' } : {}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
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
          </div>
        )}
      </header>
      
      <main>
        {carregando ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--cor-secundaria)' }}>
            <h2>🔄 Conectando com a Nuvem...</h2>
            <p>Sincronizando as requisições da Neta Dantas, aguarde.</p>
          </div>
        ) : (
          <>
            {telaAtual === 'painel' && <Painel aoClicarNovo={() => setTelaAtual('nova')} aoClicarNovoPedido={() => setTelaAtual('inserir-marketplace')} requisicoes={requisicoes} pedidosMarketplace={pedidosMarketplace} aoAbrirDetalhes={abrirDetalhes} />}
            {telaAtual === 'nova' && <NovaRequisicao aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={handleSalvarRequisicao} requisicoes={requisicoes} />}
            {telaAtual === 'detalhes' && <DetalhesRequisicao req={reqSelecionada} aoVoltar={() => setTelaAtual('painel')} aoMudarStatus={handleAlterarStatus} aoAtualizarItens={handleAtualizarItens} aoAdicionarResponsavel={handleAdicionarResponsavel} aoFinalizarSeparacao={handleFinalizarSeparacao} recordesGlobais={recordesGlobais} />}
            {telaAtual === 'inserir-marketplace' && <InserirPedido aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={handleSalvarPedidosMarketplace} />}
            {telaAtual === 'historico' && <Historico requisicoes={requisicoes} aoVoltar={() => setTelaAtual('painel')} />}
            {telaAtual === 'base-dados' && <BaseDados aoVoltar={() => setTelaAtual('painel')} produtos={baseProdutos} setProdutos={setBaseProdutos} />}
            {telaAtual === 'admin' && usuarioLogado?.username === 'admin' && <Admin setProdutos={setBaseProdutos} abaAtiva={abaAdminAtiva} />}
          </>
        )}
      </main>
      <Rodape />
    </div>
  );
}

export default App;