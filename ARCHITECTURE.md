# Arquitetura do Sistema Neta Dantas

> Mapa técnico de referência baseado na estrutura de código analisada em 26/10/2026. Confirme sempre o código atual e o schema real do Supabase.
>
> Consulte também `GEMINI.md` para as instruções de trabalho específicas do Gemini.

## 1. Visão geral

Aplicação web para operações de estoque e logística, desenvolvida com React 19, JavaScript/JSX, Vite 8 e CSS. Usa Supabase JS v2, Supabase Auth e PostgreSQL. Há scanner por câmera e leitores de código de barras a laser/Bluetooth, CSV com papaparse, armazenamento auxiliar em localStorage e validação estática com oxlint.

Comandos disponíveis: `npm run dev`, `npm run build`, `npm run lint` e `npm run preview`. Não há script de testes automatizados configurado em `package.json`.

## 2. Estrutura funcional

```text
src/
├── App.jsx                         # estado global, navegação e sincronização
├── services/supabase.js             # cliente Supabase
├── components/
│   ├── menu/Menu.jsx
│   ├── novidades/ModalNovidades.jsx
│   └── rodape/Rodape.jsx
└── pages/
    ├── login/Login.jsx
    ├── painel/
    │   ├── Painel.jsx
    │   ├── hooks/useRankingData.js
    │   ├── utils/calculadoraRanking.js
    │   ├── nova-requisicao/
    │   ├── detalhes/
    │   │   ├── DetalhesRequisicao.jsx
    │   │   ├── SeparacaoReq.jsx
    │   │   ├── EsteiraInterna.jsx
    │   │   ├── EsteiraExterna.jsx
    │   │   ├── PopupDivergenciaRecebedor.jsx
    │   │   └── PopupAnaliseOrigem.jsx
    │   └── romaneio/Romaneio.jsx
    ├── recebimento/
    │   ├── PainelRecebimento.jsx
    │   ├── RecebimentoProdutos.jsx
    │   ├── DetalhesRecebimento.jsx
    │   └── detalhes/
    ├── admin/
    │   ├── Admin.jsx
    │   ├── usuarios/AdminUsuarios.jsx
    │   ├── novidades/AdminNovidades.jsx
    │   ├── base-dados/AdminBaseDados.jsx
    │   └── metas/
    │       ├── MetasEstoque.jsx
    │       ├── utils/calculadoraMetricas.js
    │       ├── configuracao/
    │       └── visao-geral/
    ├── base-dados/BaseDados.jsx
    ├── historico/Historico.jsx
    └── marketplace/
        ├── inserir-pedido/InserirPedido.jsx
        └── painel/PainelMarketplace.jsx
```

Os estilos ficam em `src/styles/`. A navegação principal é controlada pelo estado `telaAtual` em `App.jsx`; não há roteador dedicado listado nas dependências.

## 3. App.jsx: orquestrador central

Responsabilidades identificadas: sessão, usuário, navegação, listas recentes de requisições e recebimentos, catálogo, recordes, atualização de status, sincronização, cache, notificações, autorizações, pausas e carrinho de reposição.

Parâmetros do carregamento principal:
- até 100 requisições recentes;
- até 50 recebimentos recentes;
- catálogo carregado em páginas de 1.000 itens;
- cache local de produtos com TTL de 20 minutos;
- sincronização silenciosa periódica a cada 20 segundos enquanto a página está visível;
- controle de inatividade de aproximadamente 10 minutos.

`useRankingData.js` carrega histórico de ranking sob demanda, em páginas de 1.000 registros. Alterações em status, histórico, lista de itens ou métricas precisam considerar todos os módulos consumidores.

## 4. Requisições, separação e transferências

Arquivos principais: `Painel.jsx`, componentes de `nova-requisicao/`, `DetalhesRequisicao.jsx`, `SeparacaoReq.jsx`, `EsteiraInterna.jsx`, `EsteiraExterna.jsx` e `Romaneio.jsx`.

Fluxo externo conceitual: Pendente → Em Separação → Separado → Saída de produtos → Faturamento → Transporte → recebimento/conclusão no destino. A reposição interna tem um fluxo mais curto. A separação registra bipagem, tempo e responsável, além de utilizar pausas e autorizações para operações excepcionais. Preserve compatibilidade com registros antigos e status legados.

## 5. Qualidade / OTIF

`PopupDivergenciaRecebedor.jsx` registra divergências relatadas pelo destino; `PopupAnaliseOrigem.jsx` permite que a origem analise o caso. A tabela `registro_divergencias` guarda ocorrências, status, itens, análise e justificativa. O status `Divergência` destaca a requisição no painel; a análise leva à conclusão do fluxo conforme o código atual.

Ao alterar qualidade, confirme o denominador, o período e como divergências procedentes são contadas.

## 6. Recebimento

Arquivos principais: `PainelRecebimento.jsx`, `RecebimentoProdutos.jsx`, `DetalhesRecebimento.jsx` e componentes em `recebimento/detalhes/`.

O fluxo contém conferência, scanner, lote/validade, salvamento parcial, precificação, diluição, cadastro e encerramento definitivo. Também existem pausas, autorizações de bipagem manual, impressão e carrinho de reposição pós-cadastro. Os dados persistem em `recebimento_mercadorias`, com métricas em `metricas_recebimento` e informações de diluição em `historico_diluicao`.

Há verificações para reduzir inconsistências de disponibilidade de produtos durante transporte/recebimento. Antes de alterar estas regras, rastreie os efeitos em catálogo, reposição e histórico.

## 7. Ranking e produtividade

- `src/pages/painel/hooks/useRankingData.js`: busca histórico de requisições e recebimentos com métricas.
- `src/pages/painel/utils/calculadoraRanking.js`: agrega unidades, tempo, UPM e pontuação.
- O código inclui multiplicador 2x para reposição interna e 1,5x para recebimento.

Convenções frequentes:
- banco `metricas_separacao`; objeto normalizado `metricasSeparacao`;
- banco `lista_itens`; objeto normalizado `listaItens`;
- banco `metricas_recebimento`; JSON com métricas específicas do recebimento.

Não replique fórmulas em componentes visuais. Considere registros legados sem `totalItensFisicos` e valide com cuidado qualquer fallback baseado em quantidade de itens.

## 8. Metas operacionais: estrutura atual

A tela foi dividida entre coordenação, utilitário de cálculo, visão geral e configuração:

- `src/pages/admin/metas/MetasEstoque.jsx`
- `src/pages/admin/metas/utils/calculadoraMetricas.js`
- `src/pages/admin/metas/visao-geral/PerformanceCard.jsx`
- `src/pages/admin/metas/visao-geral/SaudeOperacao.jsx`
- `src/pages/admin/metas/visao-geral/MetasVariaveisDesafios.jsx`
- `src/pages/admin/metas/visao-geral/RankingColaboradores.jsx`
- `src/pages/admin/metas/configuracao/FiltrosEPeriodo.jsx`
- `src/pages/admin/metas/configuracao/MetasFixasOperacionais.jsx`
- `src/pages/admin/metas/configuracao/MetasFixasGestao.jsx`
- `src/pages/admin/metas/configuracao/GerenciamentoMetasVariaveis.jsx`
- `src/pages/admin/metas/configuracao/HistoricoAlteracoesMetas.jsx`

A tela acompanha produtividade, SLA, qualidade, operação/recebimento, gestão, saúde operacional, ranking, ciclo oficial e metas variáveis.

Cuidados técnicos:
- Confira a assinatura real das funções antes de passar parâmetros. Argumentos extras são ignorados quando a função não os consome.
- Normalize os nomes das colunas antes de enviar dados à calculadora.
- Verifique se o filtro por colaborador/equipe é efetivamente aplicado.
- Distinga data de criação e data de finalização nos períodos.
- Faturamento, saída e cadastro precisam ter timestamps persistidos na mesma localização/formatação em que o cálculo os lê.
- Não exiba 0% ou 100% automaticamente quando faltam dados suficientes.
- Capture e trate erros do Supabase.
- Confirme a existência e o schema das tabelas `historico_metas` e `relatorios_mensais` antes de depender delas.

## 9. Catálogo, histórico e marketplace

`BaseDados.jsx` consulta e permite selecionar produtos para requisições/reposição. `Historico.jsx` consulta requisições, recebimentos e, quando necessário, `base_produtos`, com filtros e exportação CSV. A hidratação dinâmica pode resolver códigos e descrições atuais de produtos recém-cadastrados sem assumir que o snapshot histórico foi alterado. O marketplace fica em `marketplace/inserir-pedido/` e `marketplace/painel/`.

## 10. Tabelas Supabase identificadas no frontend

- `usuarios_sistema`
- `requisicoes`
- `recebimento_mercadorias`
- `base_produtos`
- `recordes_globais`
- `autorizacoes_bip`
- `pausas_separacao`
- `registro_divergencias`
- `alertas_reposicao`
- `metas_operacionais`
- `historico_metas`
- `notificacoes_sistema`
- `relatorios_mensais` (confirmar existência e schema no ambiente)

Esta lista não confirma colunas, tipos, constraints, relacionamentos, triggers, índices ou RLS. Consulte o schema real do Supabase antes de modificar o banco.

## 11. Segurança, cache e permissões

As permissões no frontend não substituem políticas RLS. Confirme a autorização no banco antes de mudanças no acesso a dados. `localStorage` mantém cache de produtos, dados auxiliares de sessão, carrinho de reposição e sinalizadores de alertas; pesquise leitores e escritores antes de alterar chaves.

## 12. Direção arquitetural e validação

O cliente Supabase é inicializado em `services/supabase.js`, mas a lógica de dados continua distribuída entre `App.jsx` e páginas. Refatore incrementalmente: `services/` para operações de dados, `hooks/` para lógica React reutilizável e `utils/` para cálculos puros. Evite reescrever tudo.

Antes de concluir mudanças, execute `npm run build` e `npm run lint`. Informe quais verificações foram executadas e atualize esta documentação quando arquitetura, dados ou regras de negócio mudarem.
