# GEMINI.md — Sistema Neta Dantas

Leia `ARCHITECTURE.md` para conhecer os módulos e fluxos do projeto. Este arquivo contém instruções de trabalho específicas para o Gemini CLI.

## Contexto

Projeto React 19 + JavaScript/JSX + Vite, integrado ao Supabase/PostgreSQL. Domínios: requisições/transferências, separação por bipagem, reposição, recebimento, catálogo, histórico, ranking, metas, OTIF, permissões, administração e marketplace.

## Antes de alterar

1. Leia a arquitetura e inspecione os arquivos atuais na branch de trabalho.
2. Rastreie o fluxo completo: interface → callback/estado → transformação do dado → consulta/mutação Supabase → módulos consumidores.
3. Pesquise todos os usos da tabela, campo, função, componente ou status afetado.
4. Diferencie valor zero legítimo, dado ausente, consulta sem resultados e erro de consulta.
5. Explique a causa com evidências do código antes de propor uma refatoração ampla.

## Regras de implementação

- Faça a menor alteração que resolva o problema, preservando regras operacionais e compatibilidade com registros históricos.
- Reutilize componentes, hooks e utilitários existentes.
- Evite concentrar novas regras de negócio em `App.jsx`.
- Não replique fórmulas de ranking ou Metas em várias telas.
- Não adicione dependências sem justificar a necessidade.
- Não altere nomes de campos, status, formatos JSON ou persistência sem mapear todos os leitores e escritores.
- Não remova cache, sincronização, salvamento parcial, pausas, autorizações ou proteções do scanner sem avaliar os impactos.
- Não invente tabelas nem colunas; confirme o schema do Supabase ou liste o que precisa ser confirmado.

## Supabase e formatos

O cliente é inicializado em `src/services/supabase.js`, mas consultas são feitas em `App.jsx` e várias páginas. Em cada consulta, capture e trate `error`; não interprete uma falha como resultado vazio válido. Verifique filtros de status, período, loja e permissões.

O banco frequentemente usa snake_case, enquanto a aplicação pode normalizar para camelCase:
- `metricas_separacao` → `metricasSeparacao`
- `lista_itens` → `listaItens`
- `metricas_recebimento` → métricas do fluxo de recebimento

Não presuma nomes ou estruturas idênticas. Confira registros antigos e novos.

## Metas e ranking

Arquivos principais:
- `src/pages/admin/metas/MetasEstoque.jsx`
- `src/pages/admin/metas/utils/calculadoraMetricas.js`
- `src/pages/admin/metas/visao-geral/`
- `src/pages/admin/metas/configuracao/`
- `src/pages/painel/hooks/useRankingData.js`
- `src/pages/painel/utils/calculadoraRanking.js`

Confira as assinaturas reais das funções e se os filtros de usuário/equipe são efetivamente usados. Distinga criação e finalização ao filtrar períodos. Valide `finalizadoEm`, `tempoTotalSegundos`, `totalItensFisicos` e timestamps administrativos. Não converta ausência de dados automaticamente em 0% ou 100%. Não altere UPM, pontos ou multiplicadores sem pedido explícito.

## Fluxos de risco

- **Requisições/separação:** confira `App.jsx`, `DetalhesRequisicao.jsx`, `SeparacaoReq.jsx`, esteiras, ranking e histórico.
- **Recebimento:** confira `RecebimentoProdutos.jsx`, `DetalhesRecebimento.jsx`, `recebimento/detalhes/`, carrinho de reposição e histórico.
- **OTIF:** preserve relato do destino, análise da origem, justificativa e transição final.
- **Cache/sincronização:** pesquise os leitores/escritores de `localStorage` e avalie tráfego, dados obsoletos e recuperação após recarregar.

## Estilo e validação

Siga o padrão de JavaScript/JSX/CSS já utilizado no módulo. Evite formatar ou reorganizar arquivos fora do escopo. Mantenha comentários que expliquem compatibilidade relevante.

Após alterações de código, execute:
```bash
npm run build
npm run lint
```

Informe comandos não executados ou falhas; não declare testes como aprovados sem executá-los.

## Conclusão das tarefas

Resuma causa/objetivo, arquivos alterados, impacto nos módulos relacionados, verificações executadas e o que ainda precisa ser validado manualmente. Atualize `ARCHITECTURE.md` quando a arquitetura, o schema ou regras de negócio mudarem.
