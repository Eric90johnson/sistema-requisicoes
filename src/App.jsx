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

function App() {
  const [telaAtual, setTelaAtual] = useState('painel');
  const [reqSelecionada, setReqSelecionada] = useState(null);

  const [baseProdutos, setBaseProdutos] = useState(() => {
    const salvo = localStorage.getItem('estoqueBaseProdutos');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [requisicoes, setRequisicoes] = useState(() => {
    const salvo = localStorage.getItem('estoqueRequisicoes');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [pedidosMarketplace, setPedidosMarketplace] = useState(() => {
    const salvo = localStorage.getItem('estoquePedidosMarketplace');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [recordesGlobais, setRecordesGlobais] = useState(() => {
    const salvo = localStorage.getItem('estoqueRecordesGlobais');
    return salvo ? JSON.parse(salvo) : {};
  });

  useEffect(() => { localStorage.setItem('estoqueBaseProdutos', JSON.stringify(baseProdutos)); }, [baseProdutos]);
  useEffect(() => { localStorage.setItem('estoqueRequisicoes', JSON.stringify(requisicoes)); }, [requisicoes]);
  useEffect(() => { localStorage.setItem('estoquePedidosMarketplace', JSON.stringify(pedidosMarketplace)); }, [pedidosMarketplace]);
  useEffect(() => { localStorage.setItem('estoqueRecordesGlobais', JSON.stringify(recordesGlobais)); }, [recordesGlobais]);

  const handleSalvarRequisicao = (novaReq) => {
    setRequisicoes([novaReq, ...requisicoes]);
    setTelaAtual('painel');
  };

  const handleAlterarStatus = (id, novoStatus, responsavel, dadosExtras = {}) => {
    const listaAtualizada = requisicoes.map(req => {
      if (req.id === id) {
        return { 
          ...req, 
          status: novoStatus,
          historico: { ...req.historico, [novoStatus]: responsavel },
          ...dadosExtras
        };
      }
      return req;
    });
    setRequisicoes(listaAtualizada);
    const reqAtualizada = listaAtualizada.find(r => r.id === id);
    setReqSelecionada(reqAtualizada);
  };

  const handleAdicionarResponsavel = (id, novoResponsavel) => {
    const listaAtualizada = requisicoes.map(req => {
      if (req.id === id) {
        const statusAtual = req.status; 
        const responsavelAtual = req.historico && req.historico[statusAtual] ? req.historico[statusAtual] : '';
        if (responsavelAtual.includes(novoResponsavel)) return req;
        const responsavelConcatenado = responsavelAtual ? `${responsavelAtual} + ${novoResponsavel}` : novoResponsavel;
        return { ...req, historico: { ...req.historico, [statusAtual]: responsavelConcatenado } };
      }
      return req;
    });
    setRequisicoes(listaAtualizada);
    const reqAtualizada = listaAtualizada.find(r => r.id === id);
    setReqSelecionada(reqAtualizada);
  };

  const handleAtualizarItens = (id, novaListaItens) => {
    const listaAtualizada = requisicoes.map(req => {
      if (req.id === id) {
        return { ...req, listaItens: novaListaItens };
      }
      return req;
    });
    setRequisicoes(listaAtualizada);
    const reqAtualizada = listaAtualizada.find(r => r.id === id);
    setReqSelecionada(reqAtualizada);
  };

  const handleFinalizarSeparacao = (id, tempoSegundos, responsavelSeparacao) => {
    const listaAtualizada = requisicoes.map(req => {
      if (req.id === id) {
        const totalItensFisicos = req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0);
        const tempoSlaEsperado = totalItensFisicos * 12; 
        
        let percentualEficiencia = 0;
        if (tempoSegundos > 0) {
          percentualEficiencia = Math.round(((tempoSlaEsperado / tempoSegundos) * 100) - 100);
        }

        const chaveRecorde = `qtd_${totalItensFisicos}`;
        const recordeAtual = recordesGlobais[chaveRecorde];
        let bateuRecorde = false;

        if (!recordeAtual || tempoSegundos < recordeAtual.tempoSegundos) {
          bateuRecorde = true;
          setRecordesGlobais(prev => ({
            ...prev,
            [chaveRecorde]: { tempoSegundos: tempoSegundos, responsavel: responsavelSeparacao, data: new Date().toLocaleDateString() }
          }));
        }

        return { 
          ...req, 
          metricasSeparacao: {
            tempoTotalSegundos: tempoSegundos,
            eficienciaPercentual: percentualEficiencia,
            bateuRecorde: bateuRecorde,
            responsavel: responsavelSeparacao,
            finalizadoEm: new Date().toISOString()
          }
        };
      }
      return req;
    });
    setRequisicoes(listaAtualizada);
    const reqAtualizada = listaAtualizada.find(r => r.id === id);
    setReqSelecionada(reqAtualizada);
    
    return listaAtualizada.find(r => r.id === id).metricasSeparacao;
  };

  const abrirDetalhes = (req) => {
    setReqSelecionada(req);
    setTelaAtual('detalhes');
  };

  const handleSalvarPedidosMarketplace = (novosPedidos) => {
    setPedidosMarketplace([...novosPedidos, ...pedidosMarketplace]);
    setTelaAtual('painel');
  };

  return (
    <div className="layout-container">
      <header className="cabecalho-global">
        <div className="espaco-logo">Logo</div>
        <h1 className="titulo-cabecalho">Painel de Requisição Interna de Produtos</h1>
        <Menu 
          aoClicarPainel={() => setTelaAtual('painel')}
          aoClicarHistorico={() => setTelaAtual('historico')}
          aoClicarBaseDados={() => setTelaAtual('base-dados')} 
        />
      </header>
      <main>
        {telaAtual === 'painel' && (
          <Painel 
            aoClicarNovo={() => setTelaAtual('nova')} 
            aoClicarNovoPedido={() => setTelaAtual('inserir-marketplace')}
            requisicoes={requisicoes} 
            pedidosMarketplace={pedidosMarketplace}
            aoAbrirDetalhes={abrirDetalhes} 
          />
        )}
        
        {/* NOVO: A propriedade requisicoes={requisicoes} foi adicionada aqui */}
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
      </main>
      <Rodape />
    </div>
  );
}

export default App;