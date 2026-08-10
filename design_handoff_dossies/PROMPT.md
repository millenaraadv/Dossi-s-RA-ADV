# Prompt de abertura para o Claude Code

Cole o texto abaixo na primeira mensagem, com este pacote (`design_handoff_dossies/`) dentro da pasta do projeto.

---

Este é um projeto novo, sem código ainda. Vamos construir um sistema interno de dossiês processuais para um escritório de advocacia brasileiro (Rabelo Aguiar Advocacia, seis pessoas, entre 30 e 150 processos ativos).

Leia `design_handoff_dossies/README.md` inteiro antes de escrever qualquer código — ele traz o modelo de dados completo, os endpoints, a especificação visual com valores exatos de cor e tipografia, e a ordem de implementação sugerida.

Os arquivos `.dc.html` do pacote são **protótipos de referência visual**, feitos em um runtime proprietário. Não porte esse runtime nem copie o HTML: leia-os como especificação e recrie as telas na stack abaixo. O bloco de lógica de `Painel de Dossies.dc.html` contém cinco dossiês fictícios completos — use como seed de desenvolvimento e como referência da profundidade de conteúdo esperada em cada campo. As capturas em `screenshots/` mostram cada tela renderizada.

## Stack

- Next.js (App Router) + TypeScript
- Supabase: Postgres, Auth (sessão em cookie httpOnly) e Storage para os PDFs dos autos
- Prisma ou Drizzle para o schema e as migrações, com SQL puro onde a consulta exigir (busca textual, projeção do calendário)
- Tailwind para o estilo, com os tokens do README declarados como variáveis CSS
- IA via API da Anthropic (Claude, modelo `claude-sonnet-4-5`), chamada exclusivamente no servidor

## Como quero trabalhar

Antes de codar, monte o projeto e me apresente: a estrutura de pastas, o schema completo do banco e as decisões de arquitetura que pretende tomar. Aguarde meu OK.

Depois siga a ordem de implementação do README item a item, parando ao fim de cada um para eu revisar:

1. Banco, usuários, autenticação, papéis, audit log
2. CRUD de dossiê com as três etapas e versionamento
3. Lista com busca e as duas ordenações
4. Passos, tentativas e a projeção do calendário
5. Prazos com o workflow de três etapas
6. Importação de autos com IA
7. Sugestões de IA nas etapas 2 e 3
8. Geração de PDF
9. OCR e estratégia para autos volumosos

## Regras não negociáveis do domínio

- Chamadas de IA só no servidor; nenhuma chave de API exposta ao cliente.
- O prompt de sugestão de argumentos **proíbe** citar número de precedente — a IA descreve a tese jurisprudencial e escreve "a conferir" no lugar da citação. Citação falsa em peça protocolada é falta grave.
- Na importação de autos, campo que a IA não encontrou entra como "não localizado nos autos" e aparece no aviso de conferência. A IA nunca preenche número de processo, data, valor ou nome por inferência.
- Toda alteração de dossiê, prazo e argumento grava no audit log com autor e timestamp.
- O calendário é projeção de `steps` e `step_attempts`, não uma tabela própria: editar um passo no dossiê muda o calendário na hora.
- Dados de clientes e partes são sensíveis (LGPD): TLS obrigatório, storage privado, logs sem conteúdo de peça.

## O que vou providenciar quando você pedir

- Projeto Supabase (URL, chave anônima e chave de serviço)
- Chave da API da Anthropic

---

## Depois do item 1

Quando o primeiro item estiver de pé, peça a ele para rodar as migrações e o seed com os cinco dossiês fictícios, e confira o login com as seis contas da equipe antes de seguir.
