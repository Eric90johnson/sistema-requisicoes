import { useRef } from 'react';
import '../../styles/pages/base-dados/baseDados.css';

export default function BaseDados({ aoVoltar, produtos, setProdutos }) {
  const inputFileRef = useRef(null);

  // Aciona o input de arquivo oculto
  const handleBotaoImportarClick = () => {
    inputFileRef.current.click();
  };

  // Processa o arquivo quando o usuário seleciona um CSV
  const handleProcessarArquivo = (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = (e) => {
      const texto = e.target.result;
      const linhas = texto.split('\n');
      const novosProdutos = [];
      
      // Pula a primeira linha (cabeçalho) e lê o resto
      for (let i = 1; i < linhas.length; i++) {
        const linhaAtual = linhas[i].trim();
        
        if (linhaAtual) {
          const separador = linhaAtual.includes(';') ? ';' : ',';
          const colunas = linhaAtual.split(separador);
          
          // Capturamos as 5 colunas. O "||" garante um valor padrão caso a coluna esteja vazia.
          novosProdutos.push({
            codigo: colunas[0] || '-',
            descricao: colunas[1] || 'Sem descrição',
            quantidade: colunas[2] || '0',
            precoCusto: colunas[3] || '0,00',
            precoVenda: colunas[4] || '0,00'
          });
        }
      }
      
      setProdutos(novosProdutos);
      alert(`${novosProdutos.length} produtos importados com sucesso!`);
    };

    leitor.readAsText(arquivo);
  };

  return (
    <div className="base-dados-container">
      <div className="base-dados-header">
        <h2>Base de Dados de Produtos</h2>
        <button className="btn-voltar" onClick={aoVoltar}>
          ← Voltar ao Painel
        </button>
      </div>

      <div className="acoes-base">
        <p>Importe a planilha contendo os produtos da rede. O arquivo deve ser formato <strong>.CSV</strong> contendo as colunas na exata ordem: <strong>Código, Descrição, Quantidade, Preço de Custo e Preço de Venda</strong>.</p>
        
        <input 
          type="file" 
          accept=".csv" 
          ref={inputFileRef} 
          className="input-file-oculto" 
          onChange={handleProcessarArquivo}
        />
        
        <button className="btn-importar" onClick={handleBotaoImportarClick}>
          <span>📥</span> Importar e Atualizar Base
        </button>
      </div>

      {produtos.length > 0 ? (
        <table className="tabela-produtos">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Código</th>
              <th style={{ width: '40%' }}>Descrição do Produto</th>
              <th style={{ width: '10%' }}>Qtd.</th>
              <th style={{ width: '15%' }}>Custo (R$)</th>
              <th style={{ width: '20%' }}>Venda (R$)</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((prod, index) => (
              <tr key={index}>
                <td><strong>{prod.codigo}</strong></td>
                <td>{prod.descricao}</td>
                <td>{prod.quantidade}</td>
                <td>R$ {prod.precoCusto}</td>
                <td>R$ {prod.precoVenda}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mensagem-vazia">
          Nenhum produto na base. Faça a importação do arquivo CSV para visualizar.
        </div>
      )}
    </div>
  );
}