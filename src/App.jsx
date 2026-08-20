import Rodape from './components/rodape/Rodape';
import { useState, useEffect } from 'react';
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

// Importando a ponte de comunicação com o Supabase
import { supabase } from './services/supabase';

function App() {
  // Mantém a sessão ativa mesmo após recarregar a página
  const [isLogado, setIsLogado] = useState(() => {
    return localStorage.getItem('netadantas_logado') === 'true';
  });

  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    const salvo = localStorage.getItem('netadantas_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [telaAtual, setTelaAtual] = useState('painel');
  const [reqSelecionada, setReqSelecionada] = useState(null);

  // Os estados começam vazios, pois a verdade absoluta agora mora no Supabase
  const [baseProdutos, setBaseProdutos] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);
  const [pedidosMarketplace, setPedidosMarketplace] = useState([]);
  const [recordesGlobais, setRecordesGlobais] = useState({});
  
  const [carregando, setCarregando] = useState(false);

  // Registra login e persiste no navegador
  const handleLogar = (dadosUsuario) => {
    localStorage.setItem('netadantas_logado', 'true');
    if (dadosUsuario) {
      localStorage.setItem('netadantas_usuario', JSON.stringify(dadosUsuario));
      setUsuarioLogado(dadosUsuario);
    }
    setIsLogado(true);
  };

  // Encerra sessão e remove os registros locais
  const handleSair = () => {
    localStorage.removeItem('netadantas_logado');
    localStorage.removeItem('netadantas_usuario');
    setUsuarioLogado(null);
    setIsLogado(false);
  };

  // Puxa as informações da nuvem ao autenticar
  useEffect(() => {
    if (isLogado) {
      carregarDadosDaNuvem();
    }
  }, [isLogado]);

  const carregarDadosDaNuvem = async () => {
    setCarregando(true);
    try {
      // 1. Puxa as Requisições Internas
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
      }

      // 2. Puxa os Recordes do Jogo de Produtividade
      const { data: recData } = await supabase.from('recordes_globais').select('*');
      if (recData) {
        const objRecordes = {};
        recData.forEach(rec => {
          objRecordes[`qtd_${rec.qtd_itens}`] = {
            tempoSegundos: rec.tempo_segundos,
            responsavel: rec.responsavel,
            data: rec.data
          };
        });
        setRecordesGlobais(objRecordes);
      }

      // 3. Puxa os Produtos Base do Supabase e converte para o formato do frontend
      const { data: prodData } = await supabase.from('base_produtos').select('*');
      if (prodData) {
        const produtosFormatados = prodData.map(p => ({
          codigo: p.codigo,
          descricao: p.descricao,
          codigoBarra: p.codigo_barra,
          ncm: p.ncm,
          fornecedor: p.fornecedor,
          marca: p.marca,
          quantidade: p.quantidade,
          precoVenda: p.preco_venda,
          precoCusto: p.preco_custo
        }));
        setBaseProdutos(produtosFormatados);
      }

    } catch (error) {
      console.error("Erro ao sincronizar com o Supabase:", error);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarRequisicao = async (novaReq) => {
    setRequisicoes([novaReq, ...requisicoes]);
    setTelaAtual('painel');

    const { error } = await supabase.from('requisicoes').insert([{
      id: novaReq.id,
      data: novaReq.data,
      timestamp_criacao: novaReq.timestampCriacao,
      origem: novaReq.origem,
      destino: novaReq.destino,
      solicitante: novaReq.solicitante,
      motivo: novaReq.motivo,
      prioridade: novaReq.prioridade,
      itens: novaReq.itens,
      status: novaReq.status,
      lista_itens: novaReq.listaItens,
      historico: novaReq.historico
    }]);

    if (error) {
      alert(`⚠️ Erro do Supabase: ${error.message}`);
      console.error("Detalhes do erro:", error);
    }
  };

  const handleAlterarStatus = async (id, novoStatus, responsavel, dadosExtras = {}) => {
    const req = requisicoes.find(r => r.id === id);
    const historicoAtualizado = { ...req.historico, [novoStatus]: responsavel };
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
    const reqAtualizada = { ...req, historico: historicoAtualizado };
    
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ historico: historicoAtualizado }).eq('id', id);
  };

  const handleAtualizarItens = async (id, novaListaItens) => {
    const reqAtualizada = { ...requisicoes.find(r => r.id === id), listaItens: novaListaItens };
    
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);

    await supabase.from('requisicoes').update({ lista_itens: novaListaItens }).eq('id', id);
  };

  const handleFinalizarSeparacao = async (id, tempoSegundos, responsavelSeparacao) => {
    const req = requisicoes.find(r => r.id === id);
    const totalItensFisicos = req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0);
    const tempoSlaEsperado = totalItensFisicos * 12; 
    
    let percentualEficiencia = 0;
    if (tempoSegundos > 0) {
      percentualEficiencia = Math.round(((tempoSlaEsperado / tempoSegundos) * 100) - 100);
    }

    const chaveRecorde = `qtd_${totalItensFisicos}`;
    const recordeAtual = recordesGlobais[chaveRecorde];
    let bateuRecorde = false;

    const novasMetricas = {
      tempoTotalSegundos: tempoSegundos,
      eficienciaPercentual: percentualEficiencia,
      bateuRecorde: false,
      responsavel: responsavelSeparacao,
      finalizadoEm: new Date().toISOString()
    };

    if (!recordeAtual || tempoSegundos < recordeAtual.tempoSegundos) {
      bateuRecorde = true;
      novasMetricas.bateuRecorde = true;
      
      const novoRecorde = { tempoSegundos: tempoSegundos, responsavel: responsavelSeparacao, data: new Date().toLocaleDateString() };
      
      setRecordesGlobais(prev => ({ ...prev, [chaveRecorde]: novoRecorde }));

      await supabase.from('recordes_globais').upsert({
        qtd_itens: totalItensFisicos,
        tempo_segundos: tempoSegundos,
        responsavel: responsavelSeparacao,
        data: novoRecorde.data
      });
    }

    const reqAtualizada = { ...req, metricasSeparacao: novasMetricas };
    
    setRequisicoes(requisicoes.map(r => r.id === id ? reqAtualizada : r));
    setReqSelecionada(reqAtualizada);
    
    await supabase.from('requisicoes').update({ metricas_separacao: novasMetricas }).eq('id', id);
    
    return novasMetricas;
  };

  const abrirDetalhes = (req) => {
    setReqSelecionada(req);
    setTelaAtual('detalhes');
  };

  const handleSalvarPedidosMarketplace = (novosPedidos) => {
    setPedidosMarketplace([...novosPedidos, ...pedidosMarketplace]);
    setTelaAtual('painel');
  };

  if (!isLogado) {
    return <Login aoLogar={handleLogar} />;
  }

  return (
    <div className="layout-container">
      <header className="cabecalho-global">
        <img src={logo} alt="Logo Neta Dantas" className="logo-header" />
        <h1 className="titulo-cabecalho">Painel de Requisição Interna de Produtos</h1>
        <Menu 
          aoClicarPainel={() => setTelaAtual('painel')}
          aoClicarHistorico={() => setTelaAtual('historico')}
          aoClicarBaseDados={() => setTelaAtual('base-dados')} 
          aoSair={handleSair} 
        />
      </header>
      
      <main>
        {carregando ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--cor-secundaria)' }}>
            <h2>🔄 Conectando com a Nuvem...</h2>
            <p>Sincronizando as requisições da Neta Dantas, aguarde.</p>
          </div>
        ) : (
          <>
            {telaAtual === 'painel' && (
              <Painel 
                aoClicarNovo={() => setTelaAtual('nova')} 
                aoClicarNovoPedido={() => setTelaAtual('inserir-marketplace')}
                requisicoes={requisicoes} 
                pedidosMarketplace={pedidosMarketplace}
                aoAbrirDetalhes={abrirDetalhes} 
              />
            )}
            
            {telaAtual === 'nova' && (
              <NovaRequisicao 
                aoVoltar={() => setTelaAtual('painel')} 
                baseProdutos={baseProdutos} 
                aoSalvar={handleSalvarRequisicao} 
                requisicoes={requisicoes} 
              />
            )}
            
            {telaAtual === 'detalhes' && (
              <DetalhesRequisicao 
                req={reqSelecionada} 
                aoVoltar={() => setTelaAtual('painel')} 
                aoMudarStatus={handleAlterarStatus} 
                aoAtualizarItens={handleAtualizarItens}
                aoAdicionarResponsavel={handleAdicionarResponsavel}
                aoFinalizarSeparacao={handleFinalizarSeparacao} 
                recordesGlobais={recordesGlobais}
              />
            )}
            {telaAtual === 'inserir-marketplace' && <InserirPedido aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={handleSalvarPedidosMarketplace} />}
            {telaAtual === 'historico' && <Historico requisicoes={requisicoes} aoVoltar={() => setTelaAtual('painel')} />}
            {telaAtual === 'base-dados' && <BaseDados aoVoltar={() => setTelaAtual('painel')} produtos={baseProdutos} setProdutos={setBaseProdutos} />}
          </>
        )}
      </main>
      <Rodape />
    </div>
  );
}

export default App;