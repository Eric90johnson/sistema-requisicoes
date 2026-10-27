# GEMINI.md — Sistema Neta Dantas

Este arquivo define como o Gemini deve trabalhar neste repositório. A arquitetura detalhada é mantida em `ARCHITECTURE.md`.

@./ARCHITECTURE.md

## 1. Contexto do projeto

Aplicação React + JavaScript/JSX + Vite integrada ao Supabase/PostgreSQL para operações de estoque e logística. Os domínios incluem requisições e transferências, separação por bipagem, reposição, recebimento, catálogo, histórico, ranking, metas, qualidade/OTIF, usuários/permissões, novidades e marketplace.

Não trate o projeto como um CRUD isolado. Há regras operacionais, registros históricos e dados JSON compartilhados por diversos módulos.

## 2. Procedimento antes de alterar código

1. Leia este arquivo e `ARCHITECTURE.md`.
2. Inspecione os arquivos atuais na branch de trabalho; a documentação pode estar desatualizada.
3. Siga o fluxo completo: interface → evento/callback → estado/transformação → consulta ou mutação Supabase → demais telas e relatórios que consomem o dado.
4. Pesquise todos os usos do campo, função, tabela, componente ou status antes de alterá-lo.
5. Identifique separadamente: dado ausente, zero legítimo, consulta sem resultados e falha de consulta.
6. Explique a causa provável com evidências do código antes de propor uma refatoração ampla.

## 3. Regras de implementação

- Faça a menor alteração que resolva o problema, preservando comportamento existente e compatibilidade com registros antigos, salvo solicitação expressa em contrário.
- Reutilize componentes, hooks e utilitários existentes quando apropriado.
- Evite concentrar novas regras de negócio em `App.jsx` se elas pertencem a serviço, hook ou utilitário específico.
- Mantenha cálculos fora dos componentes visuais quando já existir um módulo de cálculo.
- Não replique fórmulas de ranking ou Metas em várias páginas. Procure uma fonte de cálculo comum.
- Não adicione dependências sem explicar o motivo e confirmar que o projeto não oferece solução existente.
- Não altere nomes de campos, status, formatos JSON ou persistência sem mapear leitores e escritores.
- Não remova cache, sincronização, salvamento parcial, pausas, autorizações ou proteções do scanner sem avaliar o impacto operacional.
- Não invente tabelas ou colunas. Confirme o schema do Supabase; se não for possível, informe explicitamente o que precisa de confirmação.
- Nunca grave credenciais, tokens ou dados privados em documentação, exemplos, commits ou logs.

## 4. Supabase e formatos dos dados

O cliente é inicializado em `src/services/supabase.js`, mas as consultas estão distribuídas por `App.jsx` e várias páginas.

Para cada consulta/mutação:

- capture e examine o `error` retornado;
- não trate falha de consulta como uma resposta vazia válida;
- mantenha filtros de status, período, loja e permissões coerentes;
- valide o formato recebido antes de calcular indicadores;
- verifique as políticas RLS quando houver alterações de autorização ou acesso.

O banco frequentemente usa `snake_case`, enquanto objetos normalizados no frontend podem usar `camelCase`. Exemplos:

- `metricas_separacao` → `metricasSeparacao`;
- `lista_itens` → `listaItens`;
- `metricas_recebimento` contém métricas do recebimento, com campos internos definidos pelo fluxo da aplicação.

Nunca presuma que esses nomes sejam intercambiáveis. Preserve a normalização existente e confirme a estrutura de registros antigos e novos.

## 5. Regras especiais para Metas e ranking

Arquivos principais:

- `src/pages/admin/metas/MetasEstoque.jsx`
- `src/pages/admin/metas/utils/calculadoraMetricas.js`
- `src/pages/admin/metas/visao-geral/`
- `src/pages/admin/metas/configuracao/`
- `src/pages/painel/hooks/useRankingData.js`
- `src/pages/painel/utils/calculadoraRanking.js`

Ao trabalhar nesses arquivos:

- confira a assinatura das funções antes de passar argumentos;
- verifique se o filtro por colaborador/equipe realmente é aplicado pela implementação, e não apenas passado como parâmetro;
- diferencie data de criação, início de atividade e data de finalização;
- valide `finalizadoEm`, `tempoTotalSegundos`, `totalItensFisicos` e timestamps das etapas administrativas;
- não considere automaticamente ausência de dados como 0% nem como 100%;
- não altere UPM, pontos ou multiplicadores sem solicitação expressa;
- considere registros antigos com métricas ausentes ou incompletas.

## 6. Fluxos que exigem análise transversal

### Requisições e separação

Ao alterar status, itens, responsáveis, bipagem ou tempo, confira `App.jsx`, `DetalhesRequisicao.jsx`, `SeparacaoReq.jsx`, as esteiras, a calculadora de ranking e o histórico.

### Recebimento

Ao alterar conferência, scanner, validade/lote, diluição, precificação, cadastro ou encerramento, confira `RecebimentoProdutos.jsx`, `DetalhesRecebimento.jsx`, os componentes de `recebimento/detalhes/`, o carrinho de reposição e o histórico.

### Qualidade/OTIF

Ao alterar `registro_divergencias` ou o status `Divergência`, preserve o relato do destino, a análise da origem, a justificativa e a transição final da requisição.

### Cache e sincronização

Antes de mudar `localStorage`, paginação ou sincronização periódica, pesquise todos os leitores e escritores e avalie tráfego, dados obsoletos e recuperação após recarregar a página.

## 7. Estilo e organização

- Siga as convenções JavaScript/JSX e CSS já usadas no módulo.
- Preserve nomes locais e padrões de importação, salvo se a tarefa incluir uma refatoração planejada.
- Prefira funções pequenas e nomes que expressem a regra de negócio.
- Evite efeitos colaterais dentro de funções de cálculo puro.
- Não formate ou reorganize arquivos fora do escopo sem necessidade.
- Preserve comentários que documentem decisões técnicas ou compatibilidade relevante.

## 8. Validação

Quando alterar código, execute:

```bash
npm run build
npm run lint
```

Se um comando falhar, informe o comando, o erro e se existe evidência de que seja preexistente. Não declare algo validado sem executar os comandos.

Quando apropriado, cubra: dados válidos, valores nulos/ausentes, erros Supabase, limites de data, permissões, registros legados e fluxos de exceção.

## 9. Como apresentar a conclusão

Ao finalizar, resuma:

1. a causa ou objetivo;
2. os arquivos modificados e o motivo;
3. impactos possíveis nos módulos relacionados;
4. verificações executadas e resultados;
5. o que ainda precisa de validação manual ou confirmação no Supabase.

Não afirme ter consultado dados privados nem validado o schema do banco se isso não ocorreu.

## 10. Atualização da documentação

Se uma alteração modificar arquitetura, regras de negócio, tabelas, formatos de dados ou fluxos operacionais, atualize `ARCHITECTURE.md`. Mantenha este arquivo focado nas instruções do Gemini e não duplique toda a arquitetura aqui.
