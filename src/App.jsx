import { useState } from 'react';
import './styles/global.css';
import Painel from './pages/painel/Painel';
import NovaRequisicao from './pages/painel/nova-requisicao/NovaRequisicao';
import DetalhesRequisicao from './pages/painel/detalhes/DetalhesRequisicao';
import BaseDados from './pages/base-dados/BaseDados';
import Menu from './components/menu/Menu';

function App() {
  const [telaAtual, setTelaAtual] = useState('painel');
  const [baseProdutos, setBaseProdutos] = useState([]);
  const [reqSelecionada, setReqSelecionada] = useState(null);
  const [requisicoes, setRequisicoes] = useState([]);

  const handleSalvarRequisicao = (novaReq) => {
    setRequisicoes([novaReq, ...requisicoes]);
    setTelaAtual('painel');
  };

  // AGORA RECEBE DADOS EXTRAS (Nota Fiscal, Nº Requisição Externa, etc.)
  const handleAlterarStatus = (id, novoStatus, responsavel, dadosExtras = {}) => {
    const listaAtualizada = requisicoes.map(req => {
      if (req.id === id) {
        return { 
          ...req, 
          status: novoStatus,
          historico: { ...req.historico, [novoStatus]: responsavel },
          ...dadosExtras // Injeta os novos campos dentro do pedido
        };
      }
      return req;
    });
    setRequisicoes(listaAtualizada);
    
    // Atualiza a tela de detalhes em tempo real
    const reqAtualizada = listaAtualizada.find(r => r.id === id);
    setReqSelecionada(reqAtualizada);
  };

  const abrirDetalhes = (req) => {
    setReqSelecionada(req);
    setTelaAtual('detalhes');
  };

  return (
    <div className="layout-container">
      <header className="cabecalho-global">
        <div className="espaco-logo">Logo</div>
        <h1 className="titulo-cabecalho">Painel de Requisição Interna de Produtos</h1>
        <Menu aoClicarBaseDados={() => setTelaAtual('base-dados')} />
      </header>

      <main>
        {telaAtual === 'painel' && (
          <Painel aoClicarNovo={() => setTelaAtual('nova')} requisicoes={requisicoes} aoAbrirDetalhes={abrirDetalhes} />
        )}
        
        {telaAtual === 'nova' && (
          <NovaRequisicao aoVoltar={() => setTelaAtual('painel')} baseProdutos={baseProdutos} aoSalvar={handleSalvarRequisicao} />
        )}

        {telaAtual === 'detalhes' && (
          <DetalhesRequisicao req={reqSelecionada} aoVoltar={() => setTelaAtual('painel')} aoMudarStatus={handleAlterarStatus} />
        )}

        {telaAtual === 'base-dados' && (
          <BaseDados aoVoltar={() => setTelaAtual('painel')} produtos={baseProdutos} setProdutos={setBaseProdutos} />
        )}
      </main>
    </div>
  );
}

export default App;