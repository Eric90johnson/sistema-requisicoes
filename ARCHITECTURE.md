# Architecture — Sistema Neta Dantas

> Documento de referência arquitetural para desenvolvedores e ferramentas de IA que trabalham neste repositório.
>
> **Versão de referência:** 1.6.4  
> **Branch principal:** `main`

---

## 1. Visão geral

O Sistema Neta Dantas é uma aplicação web voltada para a operação de estoque e logística das lojas.

O projeto começou como um sistema de requisições entre lojas, mas evoluiu para uma plataforma operacional que integra:

- requisições e transferências entre lojas;
- separação de produtos;
- reposição interna;
- recebimento de mercadorias;
- conferência por código de barras;
- precificação e diluição;
- cadastro de produtos;
- reposição pós-cadastro;
- controle de pausas;
- autorizações de bipagem;
- ranking de produtividade;
- UPM;
- SLA;
- recordes;
- metas;
- histórico operacional;
- usuários e permissões;
- notificações;
- marketplace;
- cache local;
- sincronização com Supabase.

A arquitetura atual é predominantemente React no frontend, com Supabase como camada de persistência e autenticação.

---

# 2. Stack tecnológica

## Frontend

- React
- JavaScript / JSX
- Vite
- CSS
- HTML5

## Backend / BaaS

- Supabase
- Supabase Auth
- Banco de dados PostgreSQL do Supabase

## Recursos complementares

- `html5-qrcode` para leitura de códigos de barras/QR
- `localStorage` para persistência local e cache
- APIs do navegador
- impressão pelo navegador
- importação/exportação de dados quando aplicável

---

# 3. Arquitetura de alto nível

A aplicação pode ser representada da seguinte forma:

```text
                         USUÁRIO
                            |
                            v
                     +-------------+
                     |    LOGIN    |
                     +------+------+
                            |
                            v
                     +-------------+
                     |   App.jsx   |
                     |             |
                     | Orquestrador|
                     +------+------+
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
 +-------------+     +-------------+     +-------------+
 | Requisições |     | Recebimento |     |    Admin    |
 +------+------+     +------+------+     +-------------+
        |                   |
        |                   +----------------+
        |                                    |
        v                                    v
 +-------------+                      +-------------+
 | Separação   |                      | Reposição  |
 | Ranking     |                      | Pós-cadastro|
 | Esteiras    |                      +-------------+
 +-------------+
        |
        v
 +---------------------------------------------+
 |              Supabase / PostgreSQL          |
 +---------------------------------------------+
```

---

# 4. `App.jsx` — orquestrador central

O `App.jsx` atualmente concentra uma parte significativa do estado e da coordenação da aplicação.

Entre suas responsabilidades estão:

- controle da sessão;
- usuário logado;
- navegação entre telas;
- carregamento de dados;
- sincronização periódica;
- cache de produtos;
- requisições;
- recebimentos;
- autorizações;
- pausas;
- notificações;
- carrinho de reposição;
- cronômetros compartilhados;
- integração com módulos administrativos.

### Atenção arquitetural

O `App.jsx` deve ser tratado como ponto de orquestração, não como local preferencial para novas regras de negócio.

Ao adicionar funcionalidades:

1. procurar primeiro por hooks existentes;
2. procurar services existentes;
3. procurar utilitários existentes;
4. criar um módulo específico quando a funcionalidade tiver complexidade própria;
5. evitar aumentar desnecessariamente o tamanho e a responsabilidade do `App.jsx`.

---

# 5. Autenticação e sessão

O fluxo conceitual é:

```text
Login.jsx
    |
    v
usuarios_sistema
    |
    v
Validação / autenticação
    |
    v
Supabase Auth
    |
    v
App.jsx
    |
    v
Usuário autenticado
```

O sistema também mantém informações de sessão no armazenamento local quando necessário.

Existe controle de inatividade do usuário.

Eventos monitorados incluem:

- mouse;
- teclado;
- clique;
- toque.

Após o período configurado de inatividade, a sessão é encerrada e o usuário é desconectado.

### Regra para alterações

Qualquer alteração no fluxo de autenticação deve preservar:

- logout correto;
- limpeza de sessão;
- permissões;
- estado do usuário;
- compatibilidade com as telas dependentes do usuário autenticado.

---

# 6. Permissões e hierarquia

O sistema possui usuários com diferentes responsabilidades operacionais.

Exemplos conceituais:

```text
Usuário
|
+-- Vendedor
+-- Estoquista
+-- Encarregado
+-- Administrador
```

As permissões podem controlar:

- acesso a determinadas telas;
- visualização de ranking;
- operações administrativas;
- autorizações;
- ações relacionadas à separação;
- funcionalidades específicas.

### Regra importante

Não assumir que todo usuário possui acesso a todos os dados.

Antes de adicionar uma consulta ou funcionalidade:

1. verificar a permissão necessária;
2. verificar se a consulta pode retornar dados adicionais;
3. preservar as restrições existentes.

---

# 7. Módulo de Requisições

Localização principal:

```text
src/pages/painel/
```

Responsável pelo fluxo de requisições entre lojas e operações relacionadas à separação.

Fluxo principal:

```text
Nova requisição
       |
       v
Seleção de produtos
       |
       v
Requisição criada
       |
       v
Painel
       |
       v
Detalhes da requisição
       |
       v
Separação
       |
       +---- Bipagem
       |
       +---- Pausa
       |
       +---- Autorização
       |
       +---- Esteiras
       |
       v
Conclusão
       |
       v
Métricas / histórico / ranking
```

---

# 8. Criação de requisição

Componentes relevantes incluem:

```text
NovaRequisicao.jsx
FormularioCabecalho.jsx
TabelaProdutosForm.jsx
CronometroCheckout.jsx
ModalAlerta.jsx
requisicaoUtils.js
```

Responsabilidades:

- identificação da requisição;
- loja origem;
- loja destino;
- solicitante;
- motivo;
- prioridade;
- seleção de produtos;
- quantidades;
- observações;
- controle do cronômetro;
- validações.

### Regra

Alterações na estrutura de uma requisição devem considerar:

- tela de criação;
- tela de detalhes;
- separação;
- ranking;
- histórico;
- persistência no Supabase.

---

# 9. Separação de produtos

A separação é uma das áreas mais importantes do sistema.

Fluxo:

```text
Requisição
    |
    v
Separação
    |
    +--> Bipagem
    |
    +--> Digitação autorizada
    |
    +--> Ajuste de quantidade
    |
    +--> Pausa
    |
    +--> Cronômetro
    |
    v
Conferência
    |
    v
Conclusão
```

O sistema possui mecanismos de autorização para operações que não seguem o fluxo normal de bipagem.

---

# 10. Autorizações de bipagem

Quando uma operação exige autorização:

```text
Estoquista
    |
    v
Solicitação
    |
    v
autorizacoes_bip
    |
    v
Encarregado / responsável
    |
    +--> Aprovar
    |
    +--> Recusar
```

Alterações nessa lógica devem preservar:

- rastreabilidade;
- usuário responsável;
- status da autorização;
- integração com a separação;
- notificações.

---

# 11. Controle de pausas

O sistema possui fluxo específico para pausas durante a separação.

```text
Colaborador
    |
    v
Solicita pausa
    |
    v
pausas_separacao
    |
    v
Responsável
    |
    +--> Aprova
    |
    +--> Recusa
```

A pausa também possui impacto nas métricas de produtividade e deve ser considerada antes de modificar cálculos relacionados à separação.

---

# 12. Ranking e produtividade

O sistema possui uma camada específica para cálculo de produtividade.

Arquivos importantes:

```text
src/pages/painel/hooks/useRankingData.js
src/pages/painel/utils/calculadoraRanking.js
```

Conceito:

```text
Dados de separação
        |
        v
useRankingData
        |
        v
calculadoraRanking
        |
        v
Ranking
        |
        +--> UPM
        +--> SLA
        +--> Recordes
        +--> Metas
```

### Regra arquitetural

Separar:

```text
BUSCAR DADOS
```

de:

```text
CALCULAR INDICADORES
```

Regras matemáticas devem preferencialmente permanecer em utilitários ou módulos de domínio, e não dentro dos componentes visuais.

---

# 13. Metas, SLA e UPM

A gestão de desempenho possui relação com:

- UPM;
- SLA;
- ranking;
- recordes;
- metas.

Área administrativa relacionada:

```text
admin/metas/
    |
    +-- MetasEstoque.jsx
```

Qualquer mudança nas metas deve ser analisada em conjunto com:

- cálculo do ranking;
- histórico;
- separação;
- indicadores exibidos no painel.

---

# 14. Módulo de Recebimento

O módulo de recebimento evoluiu para um subsistema operacional próprio.

Estrutura conceitual:

```text
Recebimento
    |
    v
Conferência
    |
    v
Scanner / Bipagem
    |
    v
FEFO / controle de produtos
    |
    v
Aguardando Precificação
    |
    v
Diluição / Precificação
    |
    v
Cadastro
    |
    v
Reposição pós-cadastro
    |
    v
Finalização
```

Arquivos principais:

```text
src/pages/recebimento/
    PainelRecebimento.jsx
    RecebimentoProdutos.jsx
    DetalhesRecebimento.jsx
```

E componentes relacionados:

```text
src/pages/recebimento/detalhes/
    BannersEtapas.jsx
    CabecalhoRecebimento.jsx
    CalculadoraDiluicao.jsx
    CronometroRecebimento.jsx
    EdicaoRecebimento.jsx
    ImpressaoRecebimento.jsx
    ModalPopup.jsx
    ModalScanner.jsx
    ObservacoesRecebimento.jsx
    TabelaProdutosRecebimento.jsx
```

---

# 15. Scanner

O scanner utiliza `html5-qrcode`.

Fluxo:

```text
ModalScanner
     |
     v
Câmera
     |
     v
html5-qrcode
     |
     v
Código detectado
     |
     v
Identificação do produto
     |
     v
Bipagem / operação correspondente
```

O controle do scanner deve evitar reinicializações desnecessárias.

A lógica de inicialização da câmera é separada das atualizações frequentes de estado, como cronômetros.

Também existe proteção contra leituras duplicadas em sequência.

---

# 16. Controle de estoque fantasma

O recebimento possui mecanismos para evitar inconsistências relacionadas a produtos que ainda estão em processos ativos.

Conceito:

```text
Produto
   |
   v
Verificação
   |
   +--> Normal
   |
   +--> Soft Lock
   |
   +--> Hard Lock
```

### Soft Lock

Apresenta alerta ao usuário.

### Hard Lock

Impede a operação e direciona o usuário para a origem do bloqueio quando aplicável.

Essas regras são importantes para evitar que produtos em transporte ou recebimento sejam tratados como estoque disponível de forma incorreta.

---

# 17. FEFO / controle de lotes

O recebimento possui lógica relacionada ao controle de validade e priorização dos produtos.

Ao modificar essa lógica, considerar:

- lote;
- validade;
- quantidade;
- produtos em recebimento;
- estoque existente;
- separação;
- reposição.

Não substituir regras de estoque sem verificar os efeitos nos demais fluxos.

---

# 18. Calculadora de diluição e precificação

A calculadora de diluição participa do workflow de recebimento.

```text
Recebimento
    |
    v
Conferência
    |
    v
Aguardando Precificação
    |
    v
Calculadora de Diluição
    |
    v
Precificação
    |
    v
Cadastro
```

Ela deve ser tratada como parte do processo de recebimento, e não apenas como uma calculadora independente.

---

# 19. Reposição pós-cadastro

Uma funcionalidade importante é o carrinho de reposição.

Fluxo:

```text
Produto recebido
       |
       v
Cadastro concluído
       |
       v
Produto selecionado para reposição
       |
       v
Carrinho de reposição
       |
       v
Reposição na loja
```

Existe persistência local para o carrinho.

O estado pode envolver:

```text
itensPreRequisicao
tipoReposicaoGlobal
inicioCronometroGlobal
```

e armazenamento local relacionado ao carrinho de reposição.

### Regra

Não remover a persistência local sem avaliar o impacto em:

- perda de dados durante navegação;
- fechamento/recarga da página;
- continuidade da operação;
- sincronização com o fluxo de reposição.

---

# 20. Cache de produtos

A base de produtos possui mecanismo de cache local.

Conceito:

```text
Solicitação de produtos
       |
       v
Cache válido?
   /          \
 SIM           NÃO
  |             |
  v             v
Cache       Supabase
  |             |
  |             v
  |         Atualização
  |          do cache
  |             |
  +------+------+
         |
         v
    Base de produtos
```

O cache possui TTL configurado.

### Regra

Ao alterar a estrutura da tabela ou os dados fundamentais de produtos, avaliar:

- invalidação do cache;
- versão dos dados;
- consistência;
- tempo de validade.

---

# 21. Sincronização

O aplicativo realiza sincronização periódica com o Supabase.

Conceito:

```text
App ativo
    |
    v
Sincronização
    |
    +--> Requisições
    |
    +--> Recebimentos
    |
    +--> Produtos / cache
    |
    +--> Notificações
    |
    v
Estado React atualizado
```

A sincronização deve evitar consultas desnecessárias.

Sempre que possível:

- usar filtros;
- usar paginação;
- respeitar permissões;
- utilizar cache;
- carregar dados sob demanda;
- evitar buscar grandes volumes sem necessidade.

---

# 22. Notificações

O `App.jsx` coordena notificações globais relacionadas a eventos operacionais.

Exemplos:

```text
autorizacoes_bip
       |
       v
Notificação

pausas_separacao
       |
       v
Notificação

Nova carga cadastrada
       |
       v
Notificação
```

Novas notificações devem ser implementadas sem duplicar mecanismos existentes.

---

# 23. Histórico

O histórico serve como camada de consulta operacional.

Conceito:

```text
Requisições
     |
     +----------------+
                      |
Recebimentos          |
     |                |
     +-------+--------+
             |
             v
         Histórico
             |
             v
       Filtros / consulta
```

Como o histórico pode envolver grande volume de dados, priorizar carregamento sob demanda e filtros no banco.

---

# 24. Marketplace

O projeto também possui módulo de marketplace.

Estrutura conceitual:

```text
marketplace/
|
+-- inserir-pedido/
|      |
|      +-- InserirPedido.jsx
|
+-- painel/
       |
       +-- PainelMarketplace.jsx
```

O marketplace deve ser tratado como módulo independente, evitando criar dependências desnecessárias com os fluxos de recebimento e requisições.

---

# 25. Principais entidades de dados

Entre as entidades/tabelas utilizadas pelo sistema estão:

```text
usuarios_sistema
    -> usuários e informações de acesso/permissões

requisicoes
    -> requisições e transferências

recebimento_mercadorias
    -> recebimentos / cargas / notas

base_produtos
    -> catálogo de produtos

recordes_globais
    -> recordes de produtividade

autorizacoes_bip
    -> autorizações relacionadas à bipagem

pausas_separacao
    -> solicitações e controle de pausas
```

> Esta lista representa as principais entidades identificadas na arquitetura atual. Antes de alterar o banco, verificar o schema real do Supabase e todas as referências no código.

---

# 26. Persistência local

O sistema utiliza `localStorage` para algumas informações de suporte.

Entre os conceitos existentes:

```text
Sessão
Usuário
Cache de produtos
Timestamp do cache
Carrinho de reposição
Dados temporários de operação
```

### Regra

`localStorage` não deve ser tratado automaticamente como fonte definitiva de verdade.

A regra geral deve ser:

```text
Supabase = persistência principal
localStorage = cache / continuidade local / estado temporário
```

---

# 27. Camadas recomendadas

A arquitetura atual ainda possui responsabilidades concentradas em páginas e no `App.jsx`.

Para novas funcionalidades, preferir gradualmente uma estrutura como:

```text
src/
|
+-- pages/
|     -> telas e composição visual
|
+-- components/
|     -> componentes reutilizáveis
|
+-- hooks/
|     -> lógica React reutilizável
|
+-- services/
|     -> acesso ao Supabase / APIs
|
+-- utils/
|     -> funções puras e cálculos
|
+-- contexts/
|     -> estados globais quando realmente necessários
|
+-- domain/
|     -> regras de negócio complexas
|
+-- styles/
|     -> estilos
```

Isso não significa reescrever o projeto imediatamente.

A migração deve ser incremental.

---

# 28. Regra para novas funcionalidades

Antes de criar uma nova funcionalidade:

1. Identificar o módulo responsável.
2. Procurar funcionalidades semelhantes já existentes.
3. Procurar hooks reutilizáveis.
4. Procurar componentes reutilizáveis.
5. Procurar utilitários existentes.
6. Verificar as tabelas Supabase envolvidas.
7. Verificar permissões.
8. Verificar efeitos sobre ranking/métricas.
9. Verificar efeitos sobre cache.
10. Verificar efeitos sobre sincronização.
11. Verificar impactos em outros módulos.

---

# 29. Regra para alterações no banco

Antes de alterar uma tabela:

```text
Tabela
   |
   +--> Procurar todas as consultas
   |
   +--> Procurar inserts
   |
   +--> Procurar updates
   |
   +--> Procurar deletes
   |
   +--> Procurar filtros
   |
   +--> Procurar relacionamentos
   |
   +--> Procurar impactos no frontend
```

Não assumir que uma coluna pertence a apenas um módulo.

Uma mudança no schema pode afetar:

- requisições;
- recebimento;
- ranking;
- histórico;
- reposição;
- administração.

---

# 30. Regras para inteligência artificial

Este arquivo deve ser utilizado como contexto arquitetural antes de modificar o projeto.

## Antes de alterar

A IA deve:

1. Ler este `ARCHITECTURE.md`.
2. Examinar os arquivos diretamente relacionados à tarefa.
3. Procurar implementações existentes da mesma funcionalidade.
4. Identificar dependências.
5. Identificar tabelas Supabase envolvidas.
6. Identificar estados globais envolvidos.
7. Verificar permissões.
8. Verificar impactos nos fluxos existentes.

## Durante a implementação

A IA deve:

- reutilizar código existente quando apropriado;
- evitar duplicação;
- evitar aumentar desnecessariamente o `App.jsx`;
- preservar regras de negócio existentes;
- preservar compatibilidade;
- manter nomes e convenções existentes quando possível;
- separar lógica de negócio de apresentação;
- evitar consultas Supabase desnecessárias;
- preservar cache e sincronização;
- não remover funcionalidades existentes sem solicitação explícita.

## Depois da implementação

A IA deve verificar:

```text
Build
  |
  +--> Imports
  |
  +--> Rotas
  |
  +--> Hooks
  |
  +--> Supabase
  |
  +--> Estados
  |
  +--> Permissões
  |
  +--> Fluxos relacionados
  |
  +--> Regressões
```

---

# 31. Regra especial para o App.jsx

Antes de adicionar lógica ao `App.jsx`, perguntar:

> Esta lógica precisa realmente ser global?

Se a resposta for não, preferir:

```text
Hook
Service
Util
Component
Domain module
```

dependendo da responsabilidade.

O objetivo é impedir que o `App.jsx` se transforme progressivamente em um "arquivo monolítico".

---

# 32. Fluxo operacional integrado

A visão mais importante do sistema atualmente é:

```text
                         ESTOQUE / OPERAÇÃO
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
       RECEBIMENTO                            REQUISIÇÕES
             |                                     |
             v                                     v
       CONFERÊNCIA                            SOLICITAÇÃO
             |                                     |
             v                                     v
        SCANNER                               SEPARAÇÃO
             |                                     |
             v                                     |
        PRECIFICAÇÃO                               |
             |                                     |
             v                                     v
          CADASTRO                              BIPAGEM
             |                                     |
             v                                     v
      REPOSIÇÃO LOJA                          CONCLUSÃO
             |                                     |
             +------------------+------------------+
                                |
                                v
                         INDICADORES
                                |
                +---------------+---------------+
                |               |               |
                v               v               v
               UPM             SLA           RANKING
                |               |               |
                +---------------+---------------+
                                |
                                v
                              METAS
```

---

# 33. Princípios arquiteturais

Os princípios desejados para a evolução do projeto são:

### 1. Não duplicar funcionalidades

Antes de criar algo novo, verificar se já existe implementação equivalente.

### 2. Separar responsabilidades

Interface, regras de negócio, acesso a dados e cálculos devem ser progressivamente separados.

### 3. Preservar os fluxos operacionais

Recebimento, separação, reposição e ranking possuem dependências entre si.

### 4. Evitar estado global desnecessário

Somente dados realmente compartilhados devem permanecer no `App.jsx` ou em Contexts globais.

### 5. Minimizar consultas

Utilizar filtros, cache, paginação e carregamento sob demanda.

### 6. Preservar rastreabilidade

Operações de estoque e produtividade devem manter informações suficientes para auditoria e histórico.

### 7. Evoluir incrementalmente

Não reescrever módulos estáveis apenas por preferência arquitetural.

---

# 34. Direção arquitetural futura

A evolução desejada pode ser:

```text
                  App.jsx
                     |
                Contexts/Hooks
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
 Requisições    Recebimento     Estoque
       |             |             |
       v             v             v
   Services      Services       Services
       |             |             |
       +-------------+-------------+
                     |
                     v
                  Supabase
```

Com regras de negócio complexas migrando gradualmente para módulos próprios:

```text
domain/
|
+-- requisicoes/
+-- recebimento/
+-- estoque/
+-- produtividade/
+-- reposicao/
```

A adoção deve ocorrer somente quando houver benefício real.

---

# 35. Resumo para ferramentas de IA

Ao trabalhar neste projeto, considere que:

```text
O sistema NÃO é mais apenas um sistema de requisições.

É uma plataforma operacional de estoque/logística
com múltiplos fluxos integrados.
```

Os principais domínios são:

```text
REQUISIÇÕES
RECEBIMENTO
ESTOQUE
REPOSIÇÃO
SEPARAÇÃO
PRODUTIVIDADE
ADMINISTRAÇÃO
MARKETPLACE
```

E os principais pontos de integração são:

```text
App.jsx
Supabase
Usuários/Permissões
Produtos
Requisições
Recebimentos
Ranking
Reposição
Notificações
```

Qualquer alteração significativa deve considerar os efeitos nos fluxos relacionados, e não somente na tela em que a alteração será implementada.
