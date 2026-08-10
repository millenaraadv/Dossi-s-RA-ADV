# Handoff: Sistema de Dossiês Processuais — Rabelo Aguiar Advocacia

## Visão geral

Aplicação interna de um escritório de advocacia brasileiro para organizar processos judiciais em **dossiês vivos**: documentos por processo, atualizados a cada marco processual, que permitem entender o caso e a estratégia sem reler os autos. Cada dossiê tem três etapas fixas:

1. **Gerais e FIRAC** — dados cadastrais do processo, linha do tempo de movimentações e relatório FIRAC (Facts, Issue, Rule, Application, Conclusion)
2. **Estratégia** — objetivo, próximos passos com histórico de tentativas datadas, prazos em aberto com workflow de três etapas
3. **Argumentos e embasamento** — argumentos de fato, cada um com previsão legal, jurisprudência e doutrina

Além dos dossiês, o sistema tem um **calendário unificado** de todas as demandas de todos os processos (grade mensal e lista semanal), com cor por responsável, e um **fluxo de importação de autos** que usa IA para pré-preencher a etapa 1 e sugerir conteúdo para as etapas 2 e 3.

O protótipo atual é 100% client-side, com dados em memória. **O escopo deste handoff é construir o backend real: banco de dados, contas por pessoa, autenticação, persistência, armazenamento de documentos e as chamadas de IA no servidor.**

## Sobre os arquivos de design

Os arquivos HTML deste pacote são **referências de design** — protótipos que mostram a aparência e o comportamento pretendidos, não código de produção para copiar. A tarefa é recriar essas telas no ambiente do codebase alvo (React, Vue, etc.) usando seus padrões estabelecidos, e construir o backend descrito abaixo. Se não existir codebase ainda, escolha a stack apropriada e implemente lá.

`Painel de Dossies.dc.html` usa um runtime de templates proprietário (`support.js`) — não tente reaproveitá-lo. Leia-o como especificação de layout, estados e comportamento. `Dossie Processual.dc.html` é a versão impressa em A4 e serve de referência para a geração de PDF no servidor.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamento e estados finais. Recriar pixel a pixel usando as bibliotecas do codebase. A identidade visual é a do escritório (paleta e marca abaixo).

---

# Parte 1 — Modelo de dados

## Entidades

### `users` (contas por pessoa)
| campo | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | exibido como "Millena Frias" |
| `email` | text unique | domínio `@rabeloaguiar.adv.br` |
| `senha_hash` | text | bcrypt/argon2 |
| `papel` | enum | `socio`, `advogado`, `estagiario`, `admin` |
| `cor` | text | hex da cor pessoal no calendário |
| `ativo` | boolean | desativar sem apagar histórico |
| `criado_em`, `atualizado_em` | timestamptz | |

Equipe inicial (seed) e cores atuais:

| nome | cor |
|---|---|
| Millena Frias | `#C4443F` |
| Gabriel Silveira | `#7FA084` |
| Amanda Lopes | `#D4882F` |
| Hermelinda Rabelo | `#8F3226` |
| Geovanna Rabelo | `#4E6B57` |
| Ítalo Nascimento | `#9A5F1C` |

Fallback para responsável sem cor: `#B3A8A2` / tinta `#FAF6F3`.

### `dossiers`
| campo | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `cliente` | text | |
| `caso` | text | |
| `numero_processo` | text | formato CNJ `0000000-00.0000.0.00.0000`; não único (pode haver dossiê de processo não distribuído) |
| `nome` | text gerado | `"{cliente} - {caso} - Proc. {numero_processo}"` — computar na aplicação, não deixar o usuário editar |
| `materia` | enum | `Cível`, `Trabalhista`, `Tributário`, `Empresarial`, `Família e sucessões`, `Consumidor` |
| `fase` | text | ex. "Sentença publicada — prazo de apelação" |
| `responsavel_id` | uuid FK users | |
| `risco` | enum | `Favorável — êxito provável`, `Favorável com reservas`, `Incerto — prova em disputa`, `Desfavorável — mitigar exposição`, `A avaliar` |
| `valor_causa` | text | texto livre (comporta "R$ 1.612.400,00 (atualizado 07/2026)") |
| `orgao` | text | vara/comarca/tribunal |
| `juiz` | text | |
| `partes` | text | |
| `advogado_contrario` | text | |
| `resumo` | text | resumo executivo, ~5 frases |
| `objetivo`, `objetivo_secundario`, `linha_vermelha` | text | etapa 2 |
| `versao` | text | `v1`, `v2`… incrementa ao concluir edição |
| `marco` | text | marco que gerou a atualização |
| `revisor_id` | uuid FK users | |
| `atualizado_em` | timestamptz | |
| `arquivado` | boolean | |

### `dossier_fields` (campos específicos por matéria)
Pares label/valor livres, ordenados. Ex.: Cível → "Objeto do contrato", "Provisão / risco estimado"; Trabalhista → "Período contratual"; Tributário → "Tributos discutidos"; Empresarial → "Participação societária"; Família → "Regime de bens"; Consumidor → "Produto ou serviço". Todas as matérias incluem "Provisão / risco estimado".

Campos: `id`, `dossier_id` FK, `label`, `valor`, `ordem`.

### `timeline_entries`
`id`, `dossier_id` FK, `data` (text `dd/mm/aaaa` — os autos às vezes trazem data imprecisa; se preferir `date`, guarde também o texto original), `ato` text, `ordem` int.

### `firac_blocks`
`id`, `dossier_id` FK, `letra` enum (`F`,`I`,`R`,`A`,`C`), `paragrafo` text, `ordem` int. Cada letra tem 1..n parágrafos.

### `steps` (próximos passos)
| campo | tipo |
|---|---|
| `id` | uuid PK |
| `dossier_id` | uuid FK |
| `acao` | text |
| `responsavel_id` | uuid FK users |
| `proxima_data` | date null |
| `concluido` | boolean |
| `ordem` | int |

### `step_attempts` (tentativas — o histórico datado)
`id`, `step_id` FK, `data` date, `resultado` text, `registrado_por_id` FK users, `criado_em`.

Um passo pode ter 0..n tentativas. Ex.: acordo extrajudicial tentado em 06/11/2025 ("proposta de R$ 900 mil em 24 parcelas, recusada"), 14/05/2026 e 04/08/2026.

### `deadlines` (prazos em aberto, com workflow de três etapas)
| campo | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `dossier_id` | uuid FK | |
| `ato` | text | ex. "Apelação da parte da sentença que fixou juros da citação" |
| `contagem` | text | ex. "15 dias úteis", "interno" |
| `data` | text | ex. "19/08/2026", "a contar da intimação" |
| `redacao_ok` | boolean | etapa 1 |
| `redacao_link` | text | URL do documento Word |
| `redacao_por_id` | uuid FK users null | |
| `redacao_em` | timestamptz null | |
| `correcao_ok` | boolean | etapa 2 |
| `correcao_por_id` | uuid FK users null | quem corrigiu |
| `correcao_em` | timestamptz null | |
| `protocolo_ok` | boolean | etapa 3 |
| `protocolo_data` | date null | data do protocolo |
| `protocolo_por_id` | uuid FK users null | |

Regra: as etapas são sequenciais na leitura visual, mas **não bloqueie** marcar fora de ordem — a prática do escritório às vezes protocola sem correção formal. Registre quem marcou e quando, sempre.

### `arguments`
`id`, `dossier_id` FK, `tag` text (`A1`, `A2`… recomputar na reordenação), `titulo` text, `fato` text, `previsao_legal` text, `jurisprudencia` text, `doutrina` text, `ordem` int.

### `dossier_versions` (histórico de atualizações)
`id`, `dossier_id` FK, `versao` text, `data` date, `marco` text, `revisor_id` FK users, `etapa` text null, `criado_em`. Uma linha por conclusão de edição. É o que o rodapé do dossiê abre ao ser clicado.

### `imports` (autos importados)
`id`, `dossier_id` FK null, `arquivo_nome`, `arquivo_storage_key`, `paginas_lidas` int, `status` enum (`lendo`,`processando`,`concluido`,`erro`), `erro` text, `campos_faltantes` jsonb (array de labels que a IA não achou), `resposta_bruta` jsonb, `criado_por_id`, `criado_em`.

### `audit_log`
`id`, `user_id`, `entidade`, `entidade_id`, `acao`, `antes` jsonb, `depois` jsonb, `criado_em`. Peça jurídica exige rastreabilidade: registre toda alteração de dossiê, prazo e argumento.

## Índices
- `dossiers(nome)` para ordenação alfabética
- `dossiers(responsavel_id)`, `steps(responsavel_id)` para filtro por pessoa
- `steps(proxima_data)` where `concluido = false` — alimenta lista e calendário
- `step_attempts(data)` — realizadas no calendário
- Busca textual (`pg_trgm` ou tsvector) em `cliente`, `caso`, `numero_processo`, `materia`, `fase`, nome do responsável

---

# Parte 2 — Contas, autenticação e permissões

- **Login por email e senha** com sessão em cookie httpOnly + refresh. MFA opcional (TOTP) — dados de processo judicial justificam.
- **Papéis:**
  - `socio` — tudo, inclusive arquivar dossiê e gerenciar usuários
  - `advogado` — CRUD de dossiês onde é responsável; leitura de todos; editar qualquer dossiê (escritório pequeno, transparência interna é desejável)
  - `estagiario` — leitura de todos; pode registrar tentativas e marcar etapas de prazo; **não** edita FIRAC, estratégia nem argumentos
  - `admin` — usuários e configuração, sem acesso a conteúdo de dossiê
- Toda escrita grava `audit_log` com o autor.
- Usuário desativado preserva histórico e cor; deixa de aparecer nos seletores de responsável.
- LGPD: dados de clientes e partes são sensíveis. Criptografia em repouso no banco e no storage, TLS obrigatório, logs sem conteúdo de peça, retenção de import definida por política do escritório.

---

# Parte 3 — API

Sugestão REST (adapte ao padrão do codebase):

```
POST   /auth/login                       → sessão
POST   /auth/logout
GET    /me

GET    /dossiers?q=&responsavel=&ordem=alfabetica|recente
GET    /dossiers/:id                     → dossiê completo (campos, timeline, firac, steps+attempts, deadlines, arguments, versions)
POST   /dossiers                         → criação por matéria (campos e FIRAC vazios)
PATCH  /dossiers/:id                     → campos gerais
POST   /dossiers/:id/conclude-edit       → body {etapa: 0|1|2} → incrementa versão, grava dossier_version
POST   /dossiers/:id/archive

PUT    /dossiers/:id/timeline            → substitui a lista ordenada
PUT    /dossiers/:id/firac
PUT    /dossiers/:id/arguments

POST   /dossiers/:id/steps
PATCH  /steps/:id                        → ação, responsável, data, concluido
DELETE /steps/:id
POST   /steps/:id/attempts               → {data, resultado}

POST   /dossiers/:id/deadlines
PATCH  /deadlines/:id                    → ato, contagem, data, e as três etapas
DELETE /deadlines/:id

GET    /calendar?mode=mes|semana&ref=YYYY-MM-DD&responsavel=
       → { abertos: [...], realizadas: [...] } já resolvidos com cor do responsável

POST   /imports                          → multipart PDF/TXT; 202 + id
GET    /imports/:id                      → status e resultado
POST   /dossiers/:id/suggest             → {etapa: 1|2} → sugestões da IA

GET    /dossiers/:id/pdf                 → dossiê em A4
```

**Ordenação da lista:** `alfabetica` (padrão) por `nome` com collation pt-BR; `recente` pela data mais recente entre próximas datas em aberto e tentativas registradas, decrescente.

**Regra do calendário (crítica — é o pedido de "o que muda em um altera no outro"):** o calendário não tem entidade própria. Ele é uma projeção de `steps` (próxima data, em aberto) e `step_attempts` (realizadas). Editar um passo no dossiê muda o calendário na hora; concluir um passo o remove da grade. Não crie tabela de eventos duplicando isso.

---

# Parte 4 — Integração de IA

Três chamadas, todas **no servidor** (nunca expor chave de API ao cliente), todas com revisão humana obrigatória.

## 4.1 Importação de autos → etapa 1

1. Upload de PDF ou TXT para storage privado.
2. Extração de texto server-side (`pdf-parse`, `pdfjs-dist` ou PyMuPDF). Limitar a ~80 páginas / ~45.000 caracteres por chamada. **PDF digitalizado sem camada de texto precisa de OCR** (Tesseract ou serviço gerenciado) — se não houver texto, retorne erro explicativo, não um dossiê vazio.
3. Chamada ao modelo pedindo JSON estrito com: `cliente`, `caso`, `proc`, `materia`, `fase`, `orgao`, `juiz`, `partes`, `contraria`, `valor`, `resumo`, `timeline[{data,ato}]`, `firac{f[],i[],r[],a[],c[]}`.
4. Instruções obrigatórias no prompt: string vazia quando a informação não está no texto; **nunca inventar** número de processo, data, valor ou nome; `materia` restrita ao enum; resumo em até 5 frases; FIRAC com 1 a 3 parágrafos por letra, em português.
5. Campos vazios entram no dossiê como `"não localizado nos autos"` e alimentam `campos_faltantes`, exibido como aviso no topo da etapa 1: *"A IA não localizou nos autos: X, Y. Confira campo a campo antes de usar."*
6. O dossiê importado abre **em modo de edição**, versão `v1`, marco "Importação dos autos".

Para autos volumosos (milhares de páginas), o caminho é indexar por peça: separar petição inicial, contestação, decisões e sentença, e rodar a extração peça a peça, ou usar RAG com embeddings por trecho. Não tente uma chamada única.

## 4.2 Sugestões para a etapa 2 (estratégia)

Contexto enviado: matéria, fase, partes, resumo e o FIRAC completo. Retorno JSON: `{objetivo, passos[{acao, responsavel, proximaData}], riscos[]}` — objetivo em uma frase, 3 a 5 passos executáveis (despacho, diligência, acordo, prova, recurso) com data sugerida a partir de hoje, até 3 riscos.

Na UI, cada item tem botão próprio: "Substituir objetivo" e "+ Adicionar" por passo. Nada é gravado sem clique.

## 4.3 Sugestões para a etapa 3 (argumentos)

Mesmo contexto. Retorno `{argumentos[{titulo, fato, legal, juris, doutrina}]}`, 2 a 4 itens.

**Salvaguarda obrigatória:** o prompt proíbe citar número de precedente. A IA descreve a tese jurisprudencial e escreve "a conferir" no lugar da citação. Modelos alucinam jurisprudência com frequência, e uma citação falsa em peça protocolada é falta grave. O aviso "jurisprudência e doutrina precisam ser conferidas" fica visível sobre o bloco de sugestões.

## Observações de implementação
- Toda resposta de IA passa por parse tolerante (localizar o primeiro `{` e o último `}`) e validação de schema antes de tocar o banco.
- Guardar `resposta_bruta` para auditoria.
- Rate limit e timeout por usuário; UI mostra estado de carregamento ("Lendo o dossiê e redigindo sugestões…").
- Erros voltam em português, acionáveis.

---

# Parte 5 — Telas

## 5.1 Barra superior (todas as telas)
Altura auto, `padding: 16px 32px`, fundo `#FFFFFF`, `border-bottom: 1px solid #C4443F`, itens nas extremidades, `flex-wrap`.

Esquerda: marca `assets/marca-rabelo-aguiar.png` com `height: 68px` + rótulo "Dossiês processuais" (11px, uppercase, `letter-spacing: 0.18em`, weight 400, `#8C7F79`).

Direita, `gap: 8px`: **Dossiês**, **Calendário** (outline `1px solid #C4443F`, fundo transparente, texto `#3E332D`, hover `#F4EEEA`), **Importar autos** (outline, texto `#A6332F`, hover `#FBF0EE`), **Novo dossiê** (sólido `#C4443F`, texto branco, hover `#A6332F`). Todos: 12px, weight 600, uppercase, `letter-spacing: 0.08em`, `padding: 8px 16px`, `white-space: nowrap`, sem raio.

## 5.2 Lista de dossiês
`max-width: 1100px`, centrada, `padding: 32px`.

Cabeçalho: H1 "Dossiês" (34px, weight 300, `letter-spacing: 0.06em`) à esquerda; à direita o grupo "Ordenar" com segmentado **A – Z** / **Demanda mais recente** (11.5px, ativo com fundo `#C4443F` e texto branco; inativo transparente com texto `#3E332D`) e a contagem "N de M processos" (12px, uppercase, `#8C7F79`).

Busca: input full-width, sem borda exceto `border-bottom: 1px solid #C4443F`, 15px, `padding: 12px 0`, placeholder "Buscar por cliente, caso, nº do processo, matéria ou responsável". Filtra por nome, matéria, responsável e fase.

Filtro por responsável: linha de chips, cada um com quadrado 8×8 na cor da pessoa + nome curto; ativo com fundo `#C4443F` e texto branco. Primeiro chip "Todos".

Linhas: grid `1fr 250px`, `gap: 24px`, `padding: 16px 12px`, `border-bottom: 1px solid #EBE1DA`, **`border-left: 5px solid` na cor do responsável**, hover `#F4EEEA`, cursor pointer, abre o dossiê.
- Coluna 1: nome padrão (16px, weight 600, `line-height: 1.3`) e subtítulo "Responsável · Fase · Matéria" (12.5px, `#8C7F79`)
- Coluna 2: label "Próxima demanda" (10px uppercase `#8C7F79`), ação (13px), data (13px weight 600 — **`#A6332F` se atrasada**, `#3E332D` se futura)

Vazio: "Nenhum dossiê corresponde à busca."

## 5.3 Calendário
`max-width: 1240px`, `padding: 32px`.

Cabeçalho: H1 "Calendário"; navegação `‹` / título / `›` (botões 34×34, outline) com título centralizado de 210px mínimo — "agosto de 2026" no mês, "03/08/2026 a 09/08/2026" na semana; segmentado **Mês** / **Semana**.

Filtro por responsável idêntico ao da lista, mais **legenda** alinhada à direita: quadrado 12×12 + nome curto de cada pessoa.

**Modo mês:** grid `1fr 300px`. À esquerda, calendário 7 colunas começando na segunda (Seg…Dom), cabeçalhos 10px uppercase; células `min-height: 96px`, `padding: 8px`, bordas `1px solid #EBE1DA`; dias de fora do mês com fundo `#F0E9E5` e número `#B3A8A2`; hoje com número `#C4443F`. Eventos na célula: `border-left: 3px solid` cor do responsável, fundo na tinta dele, ação em 10.5px weight 600 e nome do caso em 9.5px. **A grade traz só demandas em aberto** (nota explicativa embaixo, 11.5px). À direita, coluna "Realizadas no período": data, ação, resultado.

**Modo semana:** duas colunas — "Em aberto" (data | ação + "caso · responsável") e "Realizadas" (data | ação + "caso · resultado"), ambas com `border-left: 3px solid` na cor da pessoa. Datas atrasadas em `#A6332F`.

Clicar em qualquer evento abre o dossiê na etapa 2.

## 5.4 Dossiê
`max-width: 1100px`, `padding: 32px`.

Voltar: "← Todos os dossiês" (11px, uppercase, `#A6332F`, sem borda).

Título: bloco de 62% de largura — linha 1 `"{cliente} - {caso}"` (23px, weight 300, `line-height: 1.25`, `letter-spacing: 0.03em`, `text-wrap: balance`), linha 2 `"Proc. {número}"` (15px, weight 400, `letter-spacing: 0.1em`, `#A6332F`). À direita, botão **Imprimir** (sólido `#C4443F`).

Resumo executivo: bloco com `border-top`/`border-bottom: 1px solid #C4443F`, label 10px uppercase `#A6332F`, texto 14.5px `line-height: 1.5`, `max-width: 82ch`. Editável na etapa 1 (textarea 5 linhas).

Abas: três botões com `border-bottom: 4px solid` — `#C4443F` na ativa, transparente nas outras; texto 12.5px weight 400 uppercase, `#3E332D` ativa / `#9C8F89` inativa. Rótulos: "1 · Gerais e FIRAC", "2 · Estratégia", "3 · Argumentos".

**Cada aba tem seu próprio botão "Editar esta etapa" / "Concluir edição"** (11px, outline `#C4443F`; ativo com fundo `#C4443F` e texto branco), no cabeçalho da seção. Concluir a edição **incrementa a versão, grava a data de hoje e adiciona linha ao histórico** com o marco + "revisão de {etapa}".

### Aba 1 — Gerais e FIRAC
- Aviso de campos faltantes (só em dossiê importado): fundo `#FBF0EE`, `border-left: 3px solid #C4443F`, 12.5px, `#8F3226`
- Leitura: grid de 2 colunas com label 9.5px uppercase `#8C7F79` e valor 14px, separadores `1px solid #EBE1DA`. Ordem: Nº do processo, Matéria, Partes, Profissional responsável, Comarca/tribunal, Magistrado, Fase e rito, Valor da causa, Advogado contrário, Risco/prognóstico, + campos específicos da matéria
- Edição: mesma grid com inputs (`1px solid #DCD0C7`, fundo `#FAF6F3`)
- **Linha do tempo:** `border-left: 1px solid #C4443F`, `padding-left: 16px`; leitura em grid `96px 1fr` (data 12px weight 600 `#8C7F79`, ato 13.5px); edição com inputs data/ato + botão "Excluir" por linha e **"+ Nova movimentação"** no fim (outline `#C4443F`, texto `#A6332F`)
- **FIRAC:** por bloco, quadrado 32×32 com fundo `#C4443F` e a letra em branco 17px, ao lado título 13px uppercase e parágrafos 14px `line-height: 1.55` `max-width: 82ch`. Edição: um textarea de 4 linhas por parágrafo

### Aba 2 — Estratégia
- Botão **"Sugestões da IA"** ao lado de "Editar esta etapa"; bloco de sugestões com fundo `#FAF6F3` e `border-left: 3px solid #D4882F`, com "Substituir objetivo" e "+ Adicionar" por passo, e riscos listados abaixo
- **Objetivo:** bloco `padding: 24px`, fundo `#C4443F`, texto branco, label 10px uppercase, frase 20px weight 400 `line-height: 1.3` `max-width: 48ch`
- Objetivo secundário e Linha vermelha: duas colunas com divisórias
- **Próximos passos** (leitura): por passo, grid `1fr 300px 150px`. Coluna 1: ação 14px (riscada se concluída), "responsável · status" com quadrado 8×8 na cor da pessoa, e dois botões — "Concluir"/"Reabrir" e "+ Tentativa". O "+ Tentativa" abre inline um campo de data + resultado e botão "Registrar". Coluna 2: lista de tentativas ("**28/07/2026** — servidor pediu retorno…") ou "Nenhuma ainda". Coluna 3: próxima data (vermelha se atrasada). Passo concluído com fundo `#F0E9E5`
- Botão "+ Nova demanda" abre formulário inline: ação, responsável, data, "Adicionar"
- Edição: inputs por passo + "Excluir"
- **Prazos em aberto** — cada prazo tem cabeçalho (ato | contagem | data) e abaixo **três colunas de workflow**, cada uma com `border-left: 2px solid` (`#C4443F` quando concluída, `#DCD0C7` quando pendente):
  1. **1 · Redação** — botão "Marcar"/"Concluída" + campo de link do Word; quando há link, aparece "Abrir minuta" (`target="_blank"`)
  2. **2 · Correção** — botão + select de quem corrigiu (lista da equipe)
  3. **3 · Protocolo** — botão "Marcar"/"Protocolado" + campo de data
  
  Essas marcações funcionam **em modo de leitura** (são operação de rotina, não edição de conteúdo). O modo de edição altera ato, contagem e data, exclui prazo e oferece "+ Novo prazo". No backend, gravar autor e timestamp de cada marcação.

### Aba 3 — Argumentos
- Botão "Sugestões da IA" + bloco de sugestões (mesmo padrão, com aviso "jurisprudência e doutrina precisam ser conferidas")
- Por argumento: `border-top: 1px solid #C4443F`, tag `A1` (13px, `#C4443F`), título 16px weight 400, fato 14px `max-width: 82ch`, e três linhas em grid `150px 1fr` — Previsão legal, Jurisprudência, Doutrina (label 9.5px uppercase, valor 13.5px)
- Edição: textareas por campo, "Excluir argumento" por bloco, "+ Novo argumento" no fim

### Rodapé do dossiê (clicável)
Grid de 4 colunas — Atualizado em, Versão, Marco da atualização, Responsável pela revisão — com `border-top: 1px solid #C4443F`, hover `#FBF0EE`, e dica em `#A6332F`: "Clique para ver o histórico de atualizações". Ao clicar, expande tabela `versão | data | marco | revisor` em ordem decrescente.

## 5.5 Modais
Fundo `rgba(32,30,29,0.6)`, caixa 560px, `background: #FFFFFF`, `border: 1px solid #C4443F`, `padding: 24px`, alinhada ao topo com `padding: 32px` da viewport.

- **Novo dossiê:** select de matéria + cliente + caso + nº do processo + responsável, com prévia do nome gerado (`border-left: 2px solid #C4443F`); "Criar e abrir" (sólido) e "Cancelar" (outline). Abre o dossiê em modo de edição com campos e FIRAC vazios
- **Importar autos:** texto explicativo, input de arquivo (`.pdf,.txt`), estados "Lendo {arquivo}…" / "Extraindo as informações dos autos…" / erro em bloco `#FBF0EE`, e "Fechar"

## 5.6 Versão impressa (A4)
Ver `Dossie Processual.dc.html`. Cabeçalho repetido com "Dossiê processual" + número em `#C4443F` à esquerda e a marca (26pt) à direita. Rodapé repetido em 4 colunas — Atualizado em, Versão/marco, Responsável pela revisão, Próxima revisão — mais uma linha de endereço do escritório em 7pt. Corpo em A4, margem 0.7in: resumo executivo, seção **01** Informações gerais + linha do tempo + FIRAC, **02** Estratégia (objetivo em bloco vermelho, tabela de próximos passos com coluna de tentativas, tabela de prazos), **03** Argumentos, e histórico de atualizações. Título em 27pt weight 300 ocupando 58% da largura. Corpo em 10–11pt. No backend, gerar via headless Chrome (Puppeteer/Playwright) a partir de um template server-side equivalente.

---

# Parte 6 — Comportamento e estados

- **Busca** é client-side no protótipo; no backend, endpoint com trigram/tsvector e debounce de ~250ms
- **Datas atrasadas** (`< hoje`) sempre em `#A6332F`, em lista, calendário e passos
- **Estados de carregamento** de IA: bloco `#FAF6F3` com `border-left: 3px solid #D4882F` e texto em português
- **Erros** em bloco `#FBF0EE` com `border-left: 3px solid #C4443F`, texto `#8F3226`
- **Foco de teclado:** `outline: 2px solid #C24A3B; outline-offset: 2px` — nunca o anel azul padrão
- **Hover** em linhas e botões outline: `#F4EEEA` ou `#FBF0EE`
- Nenhum canto arredondado em nenhum elemento
- Sem responsividade mobile no protótipo; a barra superior usa `flex-wrap`. Definir com o escritório se haverá uso em celular (provável para o calendário)

---

# Parte 7 — Design tokens

## Cores
| token | hex | uso |
|---|---|---|
| ground | `#FFFFFF` | fundo |
| texto | `#3E332D` | corpo |
| acento | `#C4443F` | réguas, botões primários, marcadores |
| acento escuro | `#A6332F` | texto em acento, hover de sólido, datas atrasadas |
| acento profundo | `#8F3226` | texto sobre tinta clara |
| âmbar | `#D4882F` | destaque de sugestões de IA |
| tinta clara | `#FBF0EE` | fundo de aviso e hover |
| tinta rosa | `#F2DAD3` | fills tintados |
| divisória fina | `#EBE1DA` | separadores de linha |
| borda de campo | `#DCD0C7` | inputs |
| neutro 700 | `#8C7F79` | labels |
| neutro 800 | `#5C514C` | texto secundário |
| neutro 200 | `#F4EEEA` | hover de linha |
| neutro 100 | `#FAF6F3` | fundo de input e de bloco |
| fora do mês | `#F0E9E5` | células inativas |
| desabilitado | `#B3A8A2` | |

## Tipografia
Archivo (Google Fonts, pesos 300/400/600). Escala usada: 34px H1 lista, 30/23px título de dossiê, 20px objetivo, 16px título de argumento, 15px H2 de seção, 14–14.5px corpo, 13.5px corpo secundário, 12–12.5px meta, 11–11.5px chips, 9.5–10px labels uppercase.
Pesos: 300 para display, 400 para títulos de seção, 600 para ênfase e labels.
`letter-spacing`: 0.18em na marca, 0.1–0.12em em labels uppercase, 0.08em em botões, 0.03–0.06em em display.

## Espaçamento
Escala de 4px: 4, 8, 12, 16, 24, 32, 48 (usada via `var(--space-1..8)` do design system Modernist).

## Raio e sombra
`border-radius: 0` em tudo. Sem sombras — a hierarquia vem das réguas.

---

# Parte 8 — Assets

- `assets/marca-rabelo-aguiar.png` — marca principal (usada na barra e no cabeçalho impresso)
- `assets/marca-ra.png` — monograma alternativo
- Ícones: Lucide (https://lucide.dev), se precisar

Endereço para o rodapé impresso: R. Arnóbio Marques, 253, Emp. Camilo Brito, Sala 1104 — Santo Amaro, Recife/PE, CEP 50100-130 · administracao@rabeloaguiar.adv.br · (81) 4141-5305

---

# Parte 9 — Dados de exemplo

`Painel de Dossies.dc.html` traz cinco dossiês fictícios completos, um por matéria (Cível, Trabalhista, Tributário, Empresarial, Família), com FIRAC, estratégia, passos com tentativas datadas, prazos e argumentos redigidos. Use-os como **seed de desenvolvimento e como especificação da profundidade de conteúdo esperada** em cada campo. São fictícios: nomes de partes, números de processo e magistrados foram inventados.

---

# Arquivos deste pacote

- `screenshots/` — capturas das telas do protótipo:
  - `01-lista-dossies.png` — lista com busca, ordenação e faixa de cor por responsável
  - `02-calendario-mes.png` — grade mensal com eventos coloridos e coluna de realizadas
  - `03-calendario-semana.png` — lista semanal em duas colunas
  - `04-dossie-aba1-gerais-firac.png` — etapa 1: campos gerais, linha do tempo e FIRAC
  - `05-dossie-aba2-estrategia.png` — etapa 2: objetivo, próximos passos e tentativas
  - `06-dossie-aba2-prazos-workflow.png` — prazos com o workflow de redação, correção e protocolo
  - `07-dossie-aba3-argumentos.png` — etapa 3: argumentos com embasamento
  - `08-modal-importar-autos.png` — modal de importação de autos

- `Painel de Dossies.dc.html` — protótipo completo do painel (lista, calendário, dossiê em três abas, importação, sugestões de IA). Contém os dados de exemplo no bloco de lógica
- `Dossie Processual.dc.html` — versão impressa em A4, referência para o gerador de PDF
- `doc-page.js`, `support.js` — runtime dos protótipos, **não portar**
- `assets/` — marca do escritório

## Ordem de implementação sugerida

1. Banco, usuários, autenticação, papéis, audit log
2. CRUD de dossiê com as três etapas e versionamento (`conclude-edit` + histórico)
3. Lista com busca e as duas ordenações
4. Passos, tentativas e a projeção do calendário
5. Prazos com o workflow de três etapas
6. Importação de autos com IA (extração de texto → JSON → revisão)
7. Sugestões de IA nas etapas 2 e 3
8. Geração de PDF
9. OCR e estratégia para autos volumosos
