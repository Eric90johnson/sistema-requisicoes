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

- Faça a menor alteração que resolva o problema, preservando comportamento existente e compatibilidade com registros históricos, salvo solicitação expressa em contrário.
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
- `metricas_recebimento` contém métricas do fluxo de recebimento.

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
- verifique como o filtro de usuário/equipe é aplicado de fato;
- diferencie data de criação, início de atividade e data de finalização;
- valide `finalizadoEm`, `tempoTotalSegundos`, `totalItensFisicos` e timestamps das etapas administrativas;
- não considere automaticamente ausência de dados como 0% nem como 100%;
- não altere UPM, pontos ou multiplicadores sem pedido explícito;
- teste registros antigos e novos, incluindo registros com métricas nulas ou incompletas.

## 6. Cuidados com os fluxos operacionais

### Requisições e separação
Ao alterar status, bipagem, lista de itens, tempo ou responsável, confira `App.jsx`, `DetalhesRequisicao.jsx`, `SeparacaoReq.jsx`, as esteiras, o ranking e o histórico.

### Recebimento
Ao alterar conferência, scanner, lote/validade, diluição, cadastro ou encerramento, confira `RecebimentoProdutos.jsx`, `DetalhesRecebimento.jsx`, os componentes em `recebimento/detalhes/`, o carrinho de reposição e o histórico.

### Qualidade/OTIF
Ao alterar `registro_divergencias` ou o status `Divergência`, preserve o relato do destino, a análise da origem, a justificativa e a transição final da requisição.

### Cache e sincronização
Antes de mudar `localStorage`, a sincronização periódica ou o carregamento paginado, busque todos os leitores/escritores e considere tráfego, dados obsoletos e recuperação após recarregar a página.

## 7. Estilo e organização

- Siga o padrão de JavaScript/JSX e CSS já usado no arquivo e no módulo.
- Preserve os nomes e convenções locais, exceto quando a tarefa incluir uma refatoração planejada.
- Prefira funções pequenas e nomes que expressem a regra de negócio.
- Evite efeitos colaterais dentro de funções de cálculo puro.
- Evite apagar comentários que registrem decisões ou compatibilidade ainda relevantes.
- Não formate ou reorganize arquivos sem necessidade para a tarefa.

## 8. Validação antes de concluir

Quando houver alterações de código, tente executar:

```bash
npm run build
npm run lint
```

Se uma verificação falhar:
- informe qual comando falhou;
- diferencie erro novo de erro preexistente quando houver evidência;
- não declare a alteração como validada sem ter executado o comando.

Quando apropriado, proponha testes para:
- dados válidos;
- dados ausentes/nulos;
- erro retornado pelo Supabase;
- limites e datas do período;
- usuário sem permissão;
- registro legado;
- fluxo normal e fluxo de exceção.

## 9. Resposta final obrigatória ao usuário

Ao terminar uma tarefa de código, resuma:
1. causa do problema ou objetivo da mudança;
2. arquivos modificados e motivo de cada alteração;
3. impacto esperado nos módulos relacionados;
4. verificações executadas e seus resultados;
5. o que ainda precisa ser validado manualmente no sistema ou no Supabase.

Não afirme que executou testes, consultou dados privados ou verificou o schema do banco se isso não foi feito.

## 10. Atualização da documentação

Se a alteração modificar arquitetura, regras de negócio, tabelas, formatos de dados ou fluxo operacional, atualize também `ARCHITECTURE.md`. Mantenha este `GEMINI.md` curto e focado nas instruções de trabalho; não duplique aqui toda a documentação arquitetural.
