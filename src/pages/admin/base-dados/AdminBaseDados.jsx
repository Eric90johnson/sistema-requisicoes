import { useRef, useState } from 'react';
import '../../../styles/admin/base-dados/adminBaseDados.css';
import { supabase } from '../../../services/supabase';

export default function AdminBaseDados({ setProdutos }) {
  const inputFileRef = useRef(null);
  const [popup, setPopup] = useState({ visivel: false, quantidade: 0 });
  const [carregando, setCarregando] = useState(false);

  const handleProcessarArquivo = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    const leitor = new FileReader();
    
    leitor.onload = async (e) => {
      const texto = e.target.result;
      const linhas = texto.split('\n');
      const novosProdutos = [];

      for (let i = 1; i < linhas.length; i++) {
        const linhaAtual = linhas[i].trim();
        if (linhaAtual) {
          const separador = linhaAtual.includes(';') ? ';' : ',';
          const colunas = linhaAtual.split(separador);
          novosProdutos.push({
            codigo: colunas[0] ? colunas[0].trim() : '-',
            descricao: colunas[1] ? colunas[1].trim() : 'Sem descrição',
            codigo_barra: colunas[2] ? colunas[2].trim() : '-',
            ncm: colunas[3] ? colunas[3].trim() : '-',
            fornecedor: colunas[4] ? colunas[4].trim() : '-',
            marca: colunas[5] ? colunas[5].trim() : '-',
            quantidade: parseFloat((colunas[6] ? colunas[6].trim() : '0').replace(',', '.')) || 0, 
            preco_venda: colunas[7] ? colunas[7].trim() : '0,00',
            preco_custo: colunas[8] ? colunas[8].trim() : '0,00'
          });
        }
      }

      const produtosFormatadosFrontend = novosProdutos.map(p => ({
        ...p,
        codigoBarra: p.codigo_barra,
        precoVenda: p.preco_venda,
        precoCusto: p.preco_custo
      }));

      // --- SUPABASE: SOBRESCREVER DADOS NA NUVEM ---
      try {
        // 1. Limpa completamente a tabela antiga
        await supabase.from('base_produtos').delete().neq('codigo', 'EXCLUIR_TUDO_IMPOSSIVEL');

        // 2. Insere os novos produtos em lotes de 500
        const tamanhoLote = 500;
        for (let i = 0; i < novosProdutos.length; i += tamanhoLote) {
          const lote = novosProdutos.slice(i, i + tamanhoLote);
          const { error } = await supabase.from('base_produtos').insert(lote);
          if (error) {
            console.error("Erro ao inserir lote no Supabase:", error);
          }
        }

        // 3. Atualiza a tela do sistema para não precisar recarregar a página
        setProdutos(produtosFormatadosFrontend);
        setPopup({ visivel: true, quantidade: novosProdutos.length });

      } catch (err) {
        console.error("Erro ao sincronizar base de produtos com a nuvem:", err);
        alert("Ocorreu um erro ao atualizar o banco de dados.");
      } finally {
        setCarregando(false);
        evento.target.value = null; // Limpa o input
      }
    };
    
    leitor.readAsText(arquivo);
  };

  const fecharPopup = () => setPopup({ visivel: false, quantidade: 0 });

  return (
    <div className="admin-bd-container">
      <div className="admin-bd-header">
        <h3>Atualização de Estoque</h3>
        <p>Faça o upload da planilha atualizada do ERP para sincronizar todas as lojas.</p>
      </div>

      <div className="alerta-perigo">
        <strong>⚠️ Atenção:</strong> Ao importar um novo arquivo, a base de dados anterior será completamente apagada e substituída pela nova. Certifique-se de que o arquivo <code>.csv</code> está no formato correto (9 colunas).
      </div>

      <div className="area-upload">
        <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>📄</p>
        <h4>Selecione o arquivo POSICAODEESTOQUE.CSV</h4>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>O sistema processará o arquivo e enviará os dados para a nuvem.</p>
        
        <input 
          type="file" 
          accept=".csv" 
          ref={inputFileRef} 
          className="input-file-oculto" 
          onChange={handleProcessarArquivo} 
          disabled={carregando}
        />
        
        <button 
          className="btn-importar-admin" 
          onClick={() => inputFileRef.current.click()}
          disabled={carregando}
        >
          {carregando ? '⏳ Sincronizando com a Nuvem...' : '📥 Procurar Arquivo ERP'}
        </button>
      </div>

      {popup.visivel && (
        <div className="popup-overlay-admin" onClick={fecharPopup}>
          <div className="popup-content-admin" onClick={(e) => e.stopPropagation()}>
            <span className="popup-icone-admin">✅</span>
            <h3 style={{ color: '#27ae60', marginBottom: '10px' }}>Sucesso!</h3>
            <p>
              A base de dados foi atualizada na nuvem com <strong>{popup.quantidade}</strong> produtos.<br/><br/>
              Todas as lojas já têm acesso ao novo estoque.
            </p>
            <button className="popup-btn-admin" onClick={fecharPopup}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}