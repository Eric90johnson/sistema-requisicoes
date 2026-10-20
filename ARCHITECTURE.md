# Arquitetura do Sistema Neta Dantas

> Documento de referência para desenvolvedores e ferramentas de IA que trabalham neste repositório.
>
> **Versão exibida no rodapé:** 1.6.7  
> **Branch analisada:** `main`  
> **Commit analisado:** `b66c13153e6553ca6e4bf28824a0b62be6081d19`  
> **Data desta revisão:** 19/10/2026

Este documento descreve o comportamento identificado no código do repositório. Ele não substitui a inspeção dos arquivos envolvidos em cada mudança nem confirma configurações que vivem exclusivamente no painel do Supabase, como políticas RLS, triggers, índices ou o schema completo do banco.

## 1. Visão geral

O Sistema Neta Dantas é uma aplicação web para apoiar a operação de estoque e logística das lojas. O produto evoluiu de um sistema de requisições entre lojas para uma plataforma que reúne:

- requisições internas e transferências entre lojas;
- separação de produtos com bipagem e cronômetro;
- reposição interna e carrinho de reposição;
- recebimento, conferência, precificação, cadastro e liberação para reposição;
- scanner de código de barras;
- autorizações de bipagem manual e solicitações de pausa;
- ranking de produtividade com UPM e pontuação;
- metas operacionais, filtros de período e metas variáveis;
- registro e análise de divergências de envio (fluxo de qualidade/OTIF);
- consulta de estoque e catálogo de produtos;
- histórico de requisições e recebimentos, com exportação CSV;
- administração de usuários, permissões e novidades;
- painel de pedidos de marketplace;
- alertas e notificações operacionais.

### Stack detectada

- **Frontend:** React 19, JavaScript/JSX, Vite 8 e CSS.
- **Dados/autenticação:** Supabase JS v2, Supabase Auth e PostgreSQL gerenciado pelo Supabase.
- **Scanner:** `html5-qrcode`.
- **CSV:** `papaparse`.
- **Persistência temporária no navegador:** `localStorage`.
- **Qualidade de código:** `oxlint`.

O repositório não apresenta uma API/backend próprio organizado em uma camada de servidor. As telas React e `App.jsx` executam consultas ao Supabase diretamente.

## 2. Estrutura do projeto

```text
sistema-requisicoes/
├── ARCHITECTURE.md
├── README.md
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── services/
    │   └── supabase.js
    ├── components/
    │   ├── menu/Menu.jsx
    │   ├── novidades/ModalNovidades.jsx
    │   └── rodape/Rodape.jsx
    ├── pages/
    │   ├── login/Login.jsx
    │   ├── painel/
    │   │   ├── Painel.jsx
    │   │   ├── hooks/useRankingData.js
    │   │   ├── utils/calculadoraRanking.js
    │   │   ├── nova-requisicao/
    │   │   ├── detalhes/
    │   │   │   ├── DetalhesRequisicao.jsx
    │   │   │   ├── SeparacaoReq.jsx
    │   │   │   ├── EsteiraInterna.jsx
    │   │   │   ├── EsteiraExterna.jsx
    │   │   │   ├── PopupDivergenciaRecebedor.jsx
    │   │   │   └── PopupAnaliseOrigem.jsx
    │   │   └── romaneio/Romaneio.jsx
    │   ├── recebimento/
    │   │   ├── PainelRecebimento.jsx
    │   │   ├── RecebimentoProdutos.jsx
    │   │   ├── DetalhesRecebimento.jsx
    │   │   └── detalhes/
    │   ├── base-dados/BaseDados.jsx
    │   ├── historico/Historico.jsx
    │   ├── admin/
    │   │   ├── Admin.jsx
    │   │   ├── base-dados/AdminBaseDados.jsx
    │   │   ├── metas/MetasEstoque.jsx
    │   │   ├── novidades/AdminNovidades.jsx
    │   │   └── usuarios/AdminUsuarios.jsx
    │   └── marketplace/
    │       ├── inserir-pedido/InserirPedido.jsx
    │       └── painel/PainelMarketplace.jsx
    └── styles/
```

Os estilos ficam principalmente em `src/styles/` e acompanham as áreas de páginas e componentes. A tela de Metas também contém estilos locais embutidos em `MetasEstoque.jsx`, além de `src/styles/admin/metas/metasEstoque.css`.

## 3. Arquitetura de alto nível

```text
Usuário
  |
  v
Login.jsx -----> usuarios_sistema / Supabase Auth
  |
  v
App.jsx  (estado global, navegação, sincronização e coordenação)
  |
  +--> Painel de requisições
  |      +--> NovaRequisicao
  |      +--> DetalhesRequisicao
  |      |      +--> SeparacaoReq / bipagem / pausa / autorização
  |      |      +--> EsteiraInterna
  |      |      +--> EsteiraExterna
  |      |      +--> fluxo OTIF / divergências
  |      +--> Ranking (hook + calculadora)
  |      +--> Romaneio
  |
  +--> Recebimento
  |      +--> PainelRecebimento
  |      +--> RecebimentoProdutos
  |      +--> DetalhesRecebimento
  |             +--> scanner / tabela / cronômetro / diluição
  |             +--> conferência / precificação / cadastro
  |             +--> carrinho de reposição pós-cadastro
  |
  +--> Base de Dados / Estoque
  +--> Histórico
  +--> Administração / Usuários / Novidades
  +--> Metas Operacionais
  +--> Marketplace
  +--> Dashboard (tela atualmente identificada como placeholder)
  |
  v
Supabase client (`src/services/supabase.js`)
  |
  v
Supabase Auth + tabelas PostgreSQL
```

A navegação é controlada manualmente pelo estado `telaAtual` em `App.jsx`; o projeto não usa um roteador dedicado no `package.json`. O `Menu.jsx` chama callbacks que alteram essa tela.

## 4. `App.jsx`: orquestrador central

`App.jsx` concentra estado e regras de coordenação compartilhadas por vários módulos. Responsabilidades identificadas:

- estado de login e usuário;
- navegação e seleção de requisição/recebimento;
- listas globais de requisições, recebimentos, produtos, recordes e pedidos de marketplace;
- criação/edição/cancelamento de requisições e atualização de status;
- atualização de histórico, itens e métricas de separação;
- aprovação/recusa de solicitações de bipagem e pausa;
- sincronização do Supabase;
- cache da base de produtos;
- carrinho persistente de reposição;
- alerta global de cargas cadastradas;
- timeout por inatividade.

### Carregamento e sincronização vistos no código

- Requisições: carrega até as **100 mais recentes**, ordenadas por `timestamp_criacao`.
- `lista_itens` é incluída nessa consulta somente para usuários com `perm_ver_ranking` ou para `admin`, de acordo com a lógica de `App.jsx`.
- Recebimentos: carrega até os **50 mais recentes**.
- Recordes: consulta `recordes_globais` quando a sincronização não está no modo rápido.
- Base de produtos: paginação em blocos de **1.000 registros**, guardada em cache local com TTL de **20 minutos**. Existe função para recarregar o catálogo ignorando o cache.
- Sincronização silenciosa periódica: tenta executar a cada **20 segundos** quando a página está visível.
- O fluxo de sessão monitora atividade do usuário e encerra o login após aproximadamente **10 minutos** de inatividade.
- Autorizações/pausas pendentes são consultadas para o responsável apropriado durante a sincronização.

O `App.jsx` também contém várias escritas diretas no banco. Por isso, modificações em status, `historico`, `metricas_separacao` ou `lista_itens` devem ser analisadas em conjunto com as telas de detalhes, ranking e histórico.

## 5. Autenticação e permissões

Arquivos principais:

- `src/pages/login/Login.jsx`
- `src/components/menu/Menu.jsx`
- `src/pages/admin/usuarios/AdminUsuarios.jsx`
- `src/App.jsx`

`Login.jsx` consulta a tabela `usuarios_sistema` usando o nome de usuário e a senha informados. Depois, o código tenta autenticar uma identidade derivada no Supabase Auth e entrega os dados do usuário ao `App.jsx`. O cadastro/edição de usuários também manipula campos como `username`, `senha`, `hierarquia`, `encarregado_responsavel` e permissões.

Permissões reconhecidas no frontend incluem, entre outras:

- `acesso_admin` e usuário `admin`;
- `perm_gerenciar_usuarios`;
- `perm_atualizar_estoque`;
- `perm_ver_relatorios`;
- `perm_gerenciar_metas`;
- `perm_gerenciar_novidades`;
- `perm_bip_livre`;
- `perm_consulta_estoque`;
- `perm_ver_ranking`;
- `perm_dashboard`;
- `perm_ocultar_requisicao`.

Usuários subordinados podem ter `encarregado_responsavel` associado a um ou mais encarregados.

### Atenção de segurança

As verificações de permissão no React controlam a interface, mas **não substituem autorização no banco**. Antes de alterar autenticação ou acesso a dados, verificar as políticas RLS do Supabase. O código atual consulta a coluna `senha` em `usuarios_sistema`; convém revisar esse desenho e a forma de armazenamento/autenticação como uma tarefa de segurança separada. Não expor credenciais, chaves privadas ou dados sensíveis em novos arquivos/documentos.

Existe ainda uma diferença a revisar: o menu verifica `perm_gerenciar_metas` para exibir a navegação de Metas, enquanto a aba de configuração dentro de `MetasEstoque.jsx` usa `acesso_admin`, `admin` ou `hierarquia === 'Encarregado'` para validar a permissão na própria tela.

## 6. Requisições e transferências

Arquivos principais:

- `src/pages/painel/Painel.jsx`
- `src/pages/painel/nova-requisicao/NovaRequisicao.jsx`
- `src/pages/painel/detalhes/DetalhesRequisicao.jsx`
- `src/pages/painel/detalhes/SeparacaoReq.jsx`
- `src/pages/painel/detalhes/EsteiraInterna.jsx`
- `src/pages/painel/detalhes/EsteiraExterna.jsx`
- `src/pages/painel/romaneio/Romaneio.jsx`

Fluxo conceitual da requisição:

```text
Criar requisição
    -> selecionar produtos/quantidades
    -> Pendente
    -> Em Separação
    -> bipagem e validação da quantidade
    -> Separado
    -> fluxo interno: recebimento e conclusão
       ou
       fluxo externo: Saída de produtos -> Faturamento -> Transporte
    -> Concluída
```

O fluxo interno também aceita o status legado `Recebimento` na `EsteiraInterna.jsx` para não bloquear registros antigos. O fluxo externo exige número da ordem interna para a saída e número de nota fiscal para faturamento. A tela de separação valida a bipagem antes de permitir a saída, com exceções sujeitas a autorização.

### Status de qualidade / OTIF

A esteira externa permite que a loja de destino confirme o recebimento ou registre uma divergência. Quando há divergência:

1. `PopupDivergenciaRecebedor.jsx` pede os itens e uma descrição por item (mínimo de 50 caracteres);
2. a ocorrência é gravada em `registro_divergencias` com status `Pendente`;
3. a requisição recebe status `Divergência`, destacado como prioridade alta no painel;
4. a loja de origem abre `PopupAnaliseOrigem.jsx`, classifica o caso como procedente/improcedente e informa justificativa (mínimo de 20 caracteres);
5. a análise é gravada em `registro_divergencias`, e a requisição é finalizada após a análise.

Estados vistos em `registro_divergencias`: `Pendente` e `Analisado`. O status `Divergência` pertence à requisição; após a análise, o código atualiza a requisição para `Concluída`.

O painel também escuta inserts de `alertas_reposicao` via Supabase Realtime (`postgres_changes`, evento `INSERT`). Esse é um uso explícito de Realtime identificado no código; não assumir que todas as tabelas usam o mesmo mecanismo.

## 7. Separação, pausas e autorizações

`SeparacaoReq.jsx` trata a leitura de códigos, contagem bipada, andamento do cronômetro e conclusão. Os dados de autorização e pausa são persistidos em tabelas separadas:

- `autorizacoes_bip`: solicitações de digitação/liberação de bip manual, direcionadas ao encarregado e com status operacional;
- `pausas_separacao`: pedidos de pausa, tipo, solicitante, encarregado de destino e estado da pausa.

A aprovação/recusa de solicitações é coordenada pelo `App.jsx`. O cronômetro precisa considerar início, tempo pausado e retomada; alterações na estrutura de pausa podem afetar UPM e pontuação.

## 8. Ranking e cálculo de produtividade

Arquivos principais:

- `src/pages/painel/hooks/useRankingData.js`
- `src/pages/painel/utils/calculadoraRanking.js`
- integração visual em `Painel.jsx` e `PainelRecebimento.jsx`

O hook busca sob demanda o histórico de requisições com `metricas_separacao` e recebimentos com `metricas_recebimento`, paginando em lotes de 1.000. O cálculo é feito no frontend.

### Regras atuais identificadas

- UPM consolidada: `totalItens / totalSegundos * 60`.
- Requisições: pontuação por operação calculada a partir de unidades físicas e UPM da requisição.
- Reposição interna: multiplicador de pontuação **2x**.
- Recebimento de mercadorias: multiplicador de pontuação **1,5x**; para registros antigos sem `pontosGanhos`, a pontuação é recalculada no frontend.
- Quando há mais de um responsável separado por `+`, a operação é atribuída a cada nome listado.
- Filtros de período do ranking usam o campo `finalizadoEm` das métricas.

### Limitações a considerar

O cálculo prioriza `totalItensFisicos`; em registros antigos pode recorrer a `listaItens` e, depois, ao campo `req.itens`. Antes de alterar o cálculo retroativo, verificar se `req.itens` representa quantidade de unidades ou quantidade de linhas/SKUs em todos os registros históricos. O hook de ranking busca o histórico completo de registros que possuem métricas; isso ocorre sob demanda, mas pode gerar tráfego significativo conforme a base cresce.

Não duplicar a fórmula dentro de uma tela nova: reutilizar `calcularRanking` ou centralizar a regra de negócio se o escopo crescer.

## 9. Recebimento de mercadorias

Arquivos principais:

- `src/pages/recebimento/PainelRecebimento.jsx`
- `src/pages/recebimento/RecebimentoProdutos.jsx`
- `src/pages/recebimento/DetalhesRecebimento.jsx`
- `src/pages/recebimento/detalhes/`

Componentes de apoio incluem cabeçalho, banners de etapas, tabela de produtos, cronômetro, scanner, calculadora de diluição, edição, observações, popup e impressão.

Fluxo principal identificado:

```text
Pendente
  -> Em Conferência
  -> Aguardando Precificação
  -> Aguardando Cadastro
  -> Cadastrado
  -> Concluída (encerramento definitivo)
```

Também há suporte a `Cancelada` e caminhos de criação/edição que precisam ser preservados ao modificar o workflow.

Funcionalidades presentes no código:

- conferente vinculado à conferência, com modo de visualização para outro usuário quando já existe responsável;
- leitura via `html5-qrcode`, incluindo câmera e proteção contra re-renderizações que reiniciem o scanner;
- trava do Bip Mestre e controle de quantidade bipada;
- solicitação de bip manual e pausa ao encarregado;
- salvamento do progresso físico no banco e persistência local de apoio;
- controle de validade/lote e geração de `loteInterno` quando ausente;
- histórico de diluição guardado em `historico_diluicao`;
- etapas de precificação, cadastro e encerramento definitivo;
- carrinho de reposição pós-cadastro integrado ao estado do `App.jsx` e ao `localStorage`.

### Bloqueios para evitar estoque fantasma

O fluxo inclui verificações para impedir ou alertar sobre produtos associados a operações de transporte/recebimento ainda ativas, incluindo bloqueio rígido com redirecionamento para a nota relacionada e alerta para duplicidades em notas ativas. Consultar a implementação em `DetalhesRecebimento.jsx` antes de mudar regras de disponibilidade do produto.

## 10. Catálogo, estoque e reposição

`src/pages/base-dados/BaseDados.jsx` é a tela de consulta/seleção de produtos e fluxo de pré-requisição. Ela interage com o catálogo recebido pelo `App.jsx`, oferece filtros/ordenação e permite selecionar produtos para reposição interna ou externa.

`src/pages/recebimento/detalhes/TabelaProdutosRecebimento.jsx` permite incluir no carrinho produtos provenientes de recebimentos em estado `Cadastrado`. O carrinho é mantido em `itensPreRequisicao` no `App.jsx`, salvo em `localStorage` e usado para iniciar uma nova requisição/reposição.

### Hidratação dinâmica de produtos

O histórico e a tabela de recebimento podem procurar produtos por código de barras na `base_produtos` para exibir o código e a descrição atuais de produtos anteriormente marcados como `NOVO CADASTRO`. A atualização é visual/de pesquisa e não deve alterar automaticamente o snapshot original salvo no recebimento. O histórico também inclui o código de fornecedor e exporta relatório CSV com os dados de recebimento.

## 11. Histórico e relatórios

`src/pages/historico/Historico.jsx` alterna entre histórico de transferências/requisições e histórico de recebimento. Possui filtros de data, status e dados de produto; carrega detalhes sob demanda e pode buscar itens que não vieram na consulta inicial.

A exportação do relatório gerencial é CSV (separador `;`). Para recebimentos inclui dados como código do fornecedor, código, código de barras, descrição, quantidade, avarias, preços, informações da nota, status, responsáveis e duração da conferência.

Não confundir o histórico operacional das requisições/recebimentos com histórico auditável de alteração das metas: este último ainda não está implementado integralmente na tela Metas.

## 12. Metas Operacionais

Arquivo principal: `src/pages/admin/metas/MetasEstoque.jsx` (com estilos em `src/styles/admin/metas/metasEstoque.css`). A tela tem duas abas principais: visão geral e configuração.

### Visão geral atual

A tela consulta `metas_operacionais`, `usuarios_sistema`, `requisicoes`, `registro_divergencias`, `recebimento_mercadorias`, `autorizacoes_bip` e `relatorios_mensais` (esta última apenas ao tentar gravar um relatório). Exibe:

- indicadores de produtividade, SLA de atendimento, qualidade e operação;
- desempenho geral e cards de gestão (faturamento, saída e cadastro);
- saúde da operação: requisições pendentes/vencidas, reposições pendentes, recebimentos pendentes, divergências pendentes e autorizações pendentes;
- ranking calculado para separadores;
- metas variáveis/desafios, com progresso lançado manualmente;
- filtro por datas, ciclo oficial e usuário/equipe.

A lista de usuários relaciona `nome_completo` a `encarregado_responsavel` para compor o filtro de equipe. A área de saúde operacional é atualizada a cada 30 segundos enquanto o componente estiver ativo.

### Metas fixas configuráveis

Os valores padrão presentes no código são:

| Indicador | Valor padrão | Unidade/conceito |
|---|---:|---|
| `upm_minima` | 8,0 | UPM |
| `tempo_separacao` | 15 | minutos |
| `volume_diario` | 300 | peças |
| `sla_atendimento` | 5 | minutos |
| `sla_total` | 20 | minutos |
| `sla_percentual` | 90 | % |
| `erro_separacao` | 1,0 | % |
| `divergencia_conferencia` | 1,0 | % |
| `retrabalho` | 1,0 | % |
| `reposicao_atendimento` | 5 | minutos |
| `reposicao_total` | 30 | minutos |
| `recebimento_total` | 60 | minutos |
| `sla_faturamento` | 30 | minutos |
| `sla_saida` | 30 | minutos |
| `tempo_cadastro` | 120 | minutos |

As metas fixas e o ciclo oficial são gravados por `upsert` na tabela `metas_operacionais`, usando `indicador` como chave de conflito. O ciclo oficial é representado pelos indicadores `periodo_vigente_inicio` e `periodo_vigente_fim`, com as datas guardadas no campo `unidade` no código atual.

### Metas variáveis

Metas variáveis usam `categoria = 'Variável'` e campos como `indicador`, `nome_exibicao`, `valor_meta`, `valor_atual`, `unidade` e `atualizado_por`. Podem ser criadas/excluídas por gestores autorizados e o progresso atual é atualizado manualmente (valor incremental positivo ou negativo). Esse mecanismo não é, atualmente, um motor que detecta automaticamente a conclusão de tarefas como limpeza ou reciclagem.

### Fórmulas reais atualmente implementadas — importante

- **Produtividade:** calcula a média de UPM dos separadores identificados no período e a compara com `upm_minima`, limitada a 100% no card.
- **SLA operacional:** conta requisições válidas concluídas cujo tempo de `timestamp_criacao` até `metricas_separacao.finalizadoEm` é menor ou igual a `sla_total`; mostra percentual dentro do prazo.
- **Qualidade:** conta registros de `registro_divergencias` com `analise_procedente = true` no período e calcula uma taxa em relação ao total de requisições consideradas; o card é zerado quando não há volume válido.
- **Operação/recebimento:** considera recebimentos com status `Concluída` e `metricas_recebimento.tempoTotalSegundos`, compara a duração com `recebimento_total` e calcula percentual no prazo.
- **Desempenho geral:** é a média aritmética dos sete percentuais exibidos no código (produtividade, SLA, qualidade, operação e três indicadores de gestão).
- **Saúde operacional:** conta status operacionais nas tabelas correspondentes; a regra de requisição vencida atualmente usa mais de duas horas desde `timestamp_criacao`.

### Lacunas conhecidas da tela de Metas

1. Embora existam alvos configuráveis `sla_faturamento`, `sla_saida` e `tempo_cadastro`, os cards de gestão atualmente recebem **100% quando existe algum volume válido**, em vez de calcularem a duração real dessas etapas. Não tratar esses três indicadores como SLAs temporais já implementados.
2. `sla_atendimento`, `sla_percentual`, `erro_separacao`, `divergencia_conferencia` e `retrabalho` são configuráveis, mas nem todos são aplicados em cálculos distintos na visão geral atual. Hoje o cálculo de SLA principal usa `sla_total`; qualidade usa divergências procedentes.
3. A seção visual “Histórico de Metas” contém linhas de exemplo fixas no JSX e está marcada como “Módulo Fase 2”. Ela **não é um log dinâmico de alterações**.
4. Como as metas fixas são atualizadas com `upsert` pelo campo `indicador`, o valor anterior não é preservado automaticamente como versão histórica.
5. O código tenta inserir snapshots em `relatorios_mensais`, mas o próprio tratamento de erro prevê que essa tabela pode não existir. A existência e o schema no ambiente Supabase devem ser confirmados antes de depender desse recurso.
6. A lógica de filtro de período usa `timestamp_criacao` para requisições, enquanto `finalizadoEm` define o intervalo do ranking. Avaliações que precisem atribuir resultados ao mês de conclusão devem alinhar explicitamente esses critérios.
7. A contagem de divergências procedentes é por registro de divergência, não necessariamente por unidade/item divergente; validar o denominador e a regra de qualidade antes de usar esse percentual como KPI definitivo.

## 13. Administração, novidades e marketplace

- `src/pages/admin/Admin.jsx` organiza as áreas administrativas de base de dados, usuários e novidades.
- `src/pages/admin/usuarios/AdminUsuarios.jsx` gerencia usuários, hierarquia, vínculo com encarregados e permissões.
- `src/pages/admin/base-dados/AdminBaseDados.jsx` importa/processa dados de novidades e registra alertas de reposição em `alertas_reposicao`.
- `src/pages/admin/novidades/AdminNovidades.jsx` usa `notificacoes_sistema` para administrar/consultar novidades.
- `src/pages/marketplace/inserir-pedido/InserirPedido.jsx` importa e processa pedidos/itens com base no catálogo; `PainelMarketplace.jsx` exibe o painel.
- A navegação `dashboard` está conectada no `App.jsx`, mas o conteúdo encontrado no estado analisado ainda é um placeholder “Em Breve”. Não descrever o dashboard separado como funcional sem verificar alterações futuras.

## 14. Tabelas Supabase identificadas no código

A lista abaixo reúne tabelas referenciadas por consultas `from(...)` no frontend analisado. Ela não é substituto do schema do banco.

| Tabela | Papel identificado no frontend |
|---|---|
| `usuarios_sistema` | Usuários, hierarquia, encarregados e permissões |
| `requisicoes` | Requisições/transferências, itens, status, histórico e métricas de separação |
| `recebimento_mercadorias` | Cabeçalhos, itens, status, responsáveis, métricas de conferência e histórico de diluição |
| `base_produtos` | Catálogo, código, código de barras, descrição e informações de preço |
| `recordes_globais` | Recordes por quantidade de itens/tempo/responsável |
| `autorizacoes_bip` | Solicitações de liberação de bipagem manual |
| `pausas_separacao` | Solicitações e estado das pausas operacionais |
| `alertas_reposicao` | Alertas do processo de reposição; há escuta Realtime de inserts no Painel |
| `registro_divergencias` | Registro e análise de divergências/OTIF da transferência |
| `metas_operacionais` | Metas fixas, ciclo oficial e metas variáveis |
| `notificacoes_sistema` | Novidades/notificações administrativas |
| `relatorios_mensais` | Destino opcional usado pela tela Metas para salvar snapshots; precisa confirmar se existe no ambiente |

Os nomes de colunas, tipos, constraints, índices, chaves estrangeiras, funções SQL, triggers e políticas RLS não estão documentados por migrations neste repositório analisado. Antes de alterar o banco, consultar o schema real do Supabase.

## 15. `localStorage` e estado temporário

Entre as chaves identificadas no código:

- `netadantas_logado` e `netadantas_usuario`: estado local do usuário logado;
- `netadantas_cache_base_produtos` e `netadantas_cache_base_produtos_ts`: cache do catálogo e timestamp;
- `netadantas_carrinho_reposicao`: carrinho persistente de reposição;
- chaves `alerta_...`: controle local de alertas já ignorados;
- `sessao_expirada`: sinal de expiração da sessão.

O Supabase é a persistência operacional principal; o armazenamento local apoia cache, preferências e continuidade temporária. Não remover ou renomear chaves sem verificar todos os pontos em que são lidas.

## 16. Camada de serviços e dívida arquitetural

`src/services/supabase.js` é essencialmente a inicialização/exportação do cliente Supabase. A lógica de consulta, transformação e gravação está distribuída entre `App.jsx` e as próprias páginas.

Principais riscos arquiteturais observados:

- `App.jsx` coordena muitos fluxos diferentes;
- componentes de tela executam consultas e atualizações diretamente no Supabase;
- regras de negócio e transformação de dados estão divididas entre a camada global, páginas, hooks e utilitários;
- parte da sincronização ocorre por polling e outra parte usa Supabase Realtime;
- o ranking busca histórico completo sob demanda;
- metas configuráveis e métricas calculadas ainda não estão totalmente alinhadas;
- o histórico de mudanças das metas ainda é estático, não auditável.

### Direção recomendada

Não reescrever a aplicação de uma vez. Evoluir incrementalmente, quando houver benefício, para uma organização por responsabilidade:

```text
pages/        composição de telas
components/   UI reutilizável
hooks/        estado e lógica React reutilizável
services/     consultas e comandos Supabase
utils/        cálculos puros e formatação
domain/       regras de negócio que cruzam módulos
contexts/     estado global somente quando necessário
```

Ao extrair consultas para serviços, manter nomes, formatos dos objetos e regras de negócio compatíveis com as telas existentes. Migrar um fluxo por vez e validar regressões.

## 17. Regras para ferramentas de IA

Antes de modificar o sistema, a IA deve:

1. Ler este arquivo e conferir os arquivos atuais na branch de trabalho; o documento pode ficar desatualizado.
2. Examinar o fluxo completo relacionado à solicitação, não somente o componente visual.
3. Procurar implementações, hooks e utilitários já existentes antes de criar outros.
4. Identificar tabelas, colunas, formatos JSON e status do Supabase que serão afetados.
5. Verificar as permissões no menu, no componente e no banco, sem assumir que controle visual equivale a segurança.
6. Avaliar os efeitos sobre requisições, recebimento, reposição, ranking, metas, histórico, cache e sincronização.
7. Não inventar colunas nem presumir a existência de tabelas ou políticas; confirmar no projeto/Supabase.
8. Não alterar regras de negócio, pontuação, multiplicadores ou estados sem pedido explícito.
9. Evitar concentrar novas regras no `App.jsx`; preferir serviços/hooks/utilitários específicos quando apropriado.
10. Preservar estados antigos necessários à compatibilidade, como o status legado `Recebimento` na esteira interna.
11. Não retirar cache, salvamento parcial, persistência do carrinho ou mecanismos de proteção do scanner sem analisar o impacto operacional.
12. Informar quais arquivos serão alterados, quais regras mudam e quais dependências podem ser afetadas.
13. Após alterar, verificar imports, estados, consultas, permissões, status e build/lint disponíveis no projeto.
14. Atualizar este `ARCHITECTURE.md` quando uma mudança alterar responsabilidades, fluxos, tabelas ou regras de negócio estruturais.

## 18. Fluxo operacional integrado

```text
RECEBIMENTO
  -> conferência / scanner / validade / lote
  -> precificação e diluição
  -> cadastro
  -> reposição pós-cadastro

REQUISIÇÃO / TRANSFERÊNCIA
  -> solicitação
  -> separação / bipagem / pausas / autorizações
  -> saída / faturamento / transporte (fluxo externo)
  -> recebimento no destino
  -> conclusão ou divergência OTIF

DADOS OPERACIONAIS
  -> ranking / UPM / pontuação
  -> Metas Operacionais / SLA / qualidade
  -> histórico e relatórios
```

O sistema deve ser tratado como uma plataforma operacional com fluxos integrados, e não somente como um painel de requisições. Mudanças num módulo podem alterar a consistência de dados e indicadores em outros.

## 19. Histórico recente que motivou esta revisão

- **25/09/2026:** inclusão do fluxo de divergência/OTIF e dos modais de relato e análise; status de divergência com prioridade visual no painel.
- **01/10/2026:** correção da animação de destaque no painel para usar snapshot em memória e reduzir conflitos com atualizações Realtime.
- **01/10/2026:** hidratação dinâmica de produtos no recebimento e histórico para exibir código/descrição oficiais após cadastro, melhoria da pesquisa histórica e inclusão de código do fornecedor na exportação CSV.
- **01/10/2026:** reformulação do módulo Metas com ciclo oficial de avaliação, metas fixas operacionais e de gestão, filtro por usuário/equipe, metas variáveis e ajuste para evitar percentuais `NaN` sem produção.

Commits de referência:

- [Fluxo de qualidade OTIF](https://github.com/Eric90johnson/sistema-requisicoes/commit/1201137d5ed8990bc100772b056322d72e34ae99)
- [Hidratação dinâmica de produtos e histórico](https://github.com/Eric90johnson/sistema-requisicoes/commit/17def99aa64e2d9c0793e5b9efee80e9c2a25983)
- [Atualização do módulo Metas](https://github.com/Eric90johnson/sistema-requisicoes/commit/b66c13153e6553ca6e4bf28824a0b62be6081d19)

---

**Regra final:** use este arquivo como mapa inicial, mas confirme o código e o schema reais antes de toda mudança relevante. A fonte da verdade para implementação é o código atual e o banco Supabase configurado no ambiente.
