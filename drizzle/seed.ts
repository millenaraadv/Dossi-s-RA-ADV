/**
 * Seed de desenvolvimento: cria os 6 usuários da equipe (auth.users via Admin
 * API + public.users) e os 5 dossiês fictícios completos do protótipo
 * ("Painel de Dossies.dc.html"), com toda a profundidade de conteúdo esperada
 * (campos específicos, linha do tempo, FIRAC, passos com tentativas, prazos,
 * argumentos e a versão inicial no histórico).
 *
 * Idempotente para usuários (não duplica por email). Destrutivo para dados de
 * dossiê: apaga e recria as 5 fictícias a cada execução — só rode contra um
 * banco de desenvolvimento.
 *
 * Papéis confirmados com o escritório:
 *   Ítalo Nascimento, Geovanna Rabelo               → sócios advogados
 *   Gabriel Silveira, Amanda Lopes                   → advogados
 *   Millena Frias                                    → advogada com acesso total
 *     (papel "advogado_dev" — mesmo nível de socio/admin, sem usar o rótulo
 *     "sócia", já que ela não é sócia do escritório)
 *   Hermelinda Rabelo                                → administrativo (papel "admin":
 *     usuários/configuração, sem acesso a conteúdo de dossiê — por isso o caso
 *     "Metalúrgica Aurora", que no protótipo original era dela, foi reatribuído
 *     a Geovanna Rabelo neste seed)
 *
 * Rodar com: npm run db:seed
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { inArray } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const {
  users,
  dossiers,
  dossierFields,
  timelineEntries,
  firacBlocks,
  steps,
  stepAttempts,
  deadlines,
  argumentsTable,
  dossierVersions,
} = schema;

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Papel = "socio" | "advogado" | "estagiario" | "admin" | "advogado_dev";

const TEAM: { nome: string; email: string; papel: Papel; cor: string }[] = [
  { nome: "Millena Frias", email: "millena@rabeloaguiar.adv.br", papel: "advogado_dev", cor: "#C4443F" },
  { nome: "Gabriel Silveira", email: "gabriel@rabeloaguiar.adv.br", papel: "advogado", cor: "#7FA084" },
  { nome: "Amanda Lopes", email: "amanda@rabeloaguiar.adv.br", papel: "advogado", cor: "#D4882F" },
  { nome: "Hermelinda Rabelo", email: "hermelinda@rabeloaguiar.adv.br", papel: "admin", cor: "#8F3226" },
  { nome: "Geovanna Rabelo", email: "geovanna@rabeloaguiar.adv.br", papel: "socio", cor: "#4E6B57" },
  { nome: "Ítalo Nascimento", email: "italo@rabeloaguiar.adv.br", papel: "socio", cor: "#9A5F1C" },
];

// Senha padrão pedida pelo escritório para todas as contas de seed — trocar
// antes de usar em produção real (não é uma senha forte, é de conveniência
// para o período de testes internos).
const DEFAULT_PASSWORD = "RAadv@1104";

function brToIso(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && created.user) return created.user.id;

  if (error && !/already.*registered/i.test(error.message)) {
    throw error;
  }

  // Já existe — localizar pelo email e forçar a senha padrão, para manter o
  // seed idempotente e reprodutível.
  let page = 1;
  for (;;) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { password });
      if (updateError) throw updateError;
      return found.id;
    }
    if (data.users.length === 0) throw new Error(`Usuário ${email} não encontrado nem criado.`);
    page += 1;
  }
}

async function seedTeam(): Promise<Record<string, string>> {
  const emailToId: Record<string, string> = {};

  for (const membro of TEAM) {
    const id = await ensureAuthUser(membro.email, DEFAULT_PASSWORD);
    emailToId[membro.nome] = id;

    await db
      .insert(users)
      .values({ id, nome: membro.nome, email: membro.email, papel: membro.papel, cor: membro.cor, ativo: true })
      .onConflictDoUpdate({
        target: users.id,
        set: { nome: membro.nome, papel: membro.papel, cor: membro.cor, ativo: true },
      });
  }

  console.log(`\nContas com a senha padrão "${DEFAULT_PASSWORD}":`);
  for (const membro of TEAM) console.log(`  ${membro.email}`);
  console.log("");

  return emailToId;
}

type SeedDossier = {
  cliente: string;
  caso: string;
  proc: string;
  materia: (typeof schema.materiaEnum.enumValues)[number];
  fase: string;
  responsavel: string;
  risco: (typeof schema.riscoEnum.enumValues)[number];
  valor: string;
  orgao: string;
  juiz: string;
  partes: string;
  contraria: string;
  atualizacao: string;
  versao: string;
  marco: string;
  revisor: string;
  resumo: string;
  especificos: { label: string; valor: string }[];
  timeline: { data: string; ato: string }[];
  firac: { f: string[]; i: string[]; r: string[]; a: string[]; c: string[] };
  objetivo: string;
  objetivoSec: string;
  linhaVermelha: string;
  passos: {
    acao: string;
    responsavel: string;
    proximaData: string;
    concluido: boolean;
    tentativas: { data: string; resultado: string }[];
  }[];
  prazos: { ato: string; contagem: string; data: string }[];
  argumentos: { tag: string; titulo: string; fato: string; legal: string; juris: string; doutrina: string }[];
};

const DOSSIES: SeedDossier[] = [
  {
    cliente: "Metalúrgica Aurora",
    caso: "Cobrança Belveder",
    proc: "5001234-56.2025.8.24.0023",
    materia: "Cível",
    fase: "Sentença publicada — prazo de apelação",
    responsavel: "Geovanna Rabelo",
    risco: "Favorável — êxito provável",
    valor: "R$ 1.612.400,00 (atualizado 07/2026)",
    orgao: "3ª Vara Cível da Comarca de Florianópolis/SC — TJSC",
    juiz: "Dr. Aurélio Sant'Anna Prado",
    partes: "Metalúrgica Aurora Ltda. (autora) × Construtora Belveder S/A (ré)",
    contraria: "Dr. Márcio Teixeira Vasques — OAB/SC 41.220",
    atualizacao: "07/08/2026",
    versao: "v4",
    marco: "Sentença de 1º grau",
    revisor: "Geovanna Rabelo",
    resumo:
      "Cobrança de R$ 1,48 milhão referente a seis parcelas de contrato de fornecimento de estruturas metálicas. As catorze entregas foram recebidas sem ressalva e a perícia afastou atraso e desconformidade. A ré sustenta exceção de contrato não cumprido, sem prova de descumprimento anterior. A sentença acolheu o principal, mas fixou os juros da citação e negou lucros cessantes. Estratégia atual: apelação parcial em dois pontos e acordo com a condenação como alavanca.",
    especificos: [
      { label: "Objeto do contrato", valor: "Fornecimento de estruturas metálicas — obra Edifício Belveder Norte" },
      { label: "Provisão / risco estimado", valor: "Ativo provável de R$ 1,35 mi; risco de insolvência da ré em monitoramento" },
    ],
    timeline: [
      { data: "14/03/2025", ato: "Distribuição da ação de cobrança c/c indenização" },
      { data: "12/06/2025", ato: "Audiência de conciliação infrutífera" },
      { data: "18/09/2025", ato: "Contestação: exceção de contrato não cumprido e alegação de desconformidade" },
      { data: "03/04/2026", ato: "Laudo pericial contábil e documental (ev. 62) favorável à autora" },
      { data: "22/07/2026", ato: "Sentença de procedência parcial: principal deferido, juros da citação, lucros cessantes negados" },
    ],
    firac: {
      f: [
        "Em 08/01/2024 as partes celebraram contrato de fornecimento de estruturas metálicas para a obra do Edifício Belveder Norte, com preço global de R$ 2.100.000,00 e pagamento em doze parcelas vinculadas ao cronograma de entregas.",
        "A autora entregou integralmente os lotes 1 a 14, todos com canhoto assinado por preposto da ré e sem registro de recusa técnica. A ré pagou as seis primeiras parcelas e interrompeu os pagamentos a partir de 10/2024, remanescendo R$ 1.480.000,00 em aberto.",
        "Em fevereiro de 2025 a ré atribuiu a inadimplência a atrasos de entrega e a divergências de espessura de chapa. A perícia (ev. 62) não confirmou atraso relevante nem desconformidade técnica.",
      ],
      i: [
        "A ré pode opor exceção de contrato não cumprido para suspender o pagamento das parcelas 7 a 12, alegando atraso e desconformidade das entregas?",
        "Subsidiariamente: de que marco incidem correção e juros de mora, e há dano indenizável além do valor das parcelas vencidas?",
      ],
      r: [
        "Código Civil, art. 476: a exceção de contrato não cumprido só socorre quem já cumpriu a própria obrigação. Art. 389: o inadimplemento sujeita o devedor a perdas e danos, juros, correção e honorários. Art. 397: nas obrigações com termo certo, a mora se constitui pelo simples vencimento.",
        "CPC, art. 373, II: cabe ao réu provar os fatos impeditivos, modificativos ou extintivos do direito do autor.",
      ],
      a: [
        "A prova documental demonstra entrega integral e recebimento sem ressalva. Os canhotos assinados esvaziam a alegação de desconformidade, que surgiu quatro meses depois da última entrega e às vésperas do vencimento das parcelas em aberto.",
        "A perícia apurou atraso médio de 3,2 dias, dentro da tolerância da cláusula 7.2, e espessura de chapa na faixa especificada. Sem descumprimento anterior da autora, falta à ré o pressuposto do art. 476.",
        "O ônus do fato impeditivo era da ré, que não o desincumbiu. A mora, decorrente do termo contratual, dispensa interpelação e fixa os juros desde cada vencimento.",
      ],
      c: [
        "A tese da autora é sólida quanto ao principal. A sentença condenou a ré a R$ 1.480.000,00 com correção pelo IPCA e juros de 1% ao mês, mas fixou o termo inicial na citação e rejeitou os lucros cessantes por falta de prova.",
        "Recomenda-se apelação parcial limitada a dois pontos: termo inicial da mora e lucros cessantes. O núcleo condenatório deve ser preservado e usado como alavanca de acordo.",
      ],
    },
    objetivo:
      "Converter a condenação de primeiro grau em recebimento efetivo até dezembro de 2026, preferencialmente por acordo de no mínimo R$ 1,35 milhão à vista ou em até seis parcelas com garantia real.",
    objetivoSec: "Recuperar o termo inicial dos juros (de 10/2024, não da citação) — diferença estimada de R$ 118 mil.",
    linhaVermelha: "Não aceitar acordo abaixo de R$ 1,1 milhão nem parcelamento superior a doze meses sem garantia.",
    passos: [
      { acao: "Protocolar apelação parcial: termo inicial da mora e lucros cessantes, com preparo recolhido", responsavel: "Gabriel Silveira", proximaData: "2026-08-19", concluido: false, tentativas: [] },
      { acao: "Diligência na vara para conferir a certidão de intimação e a contagem do prazo recursal", responsavel: "Ítalo Nascimento", proximaData: "2026-08-12", concluido: false, tentativas: [{ data: "2026-07-28", resultado: "Servidor pediu retorno após a juntada da certidão" }] },
      { acao: "Acordo extrajudicial com a diretoria financeira da ré, com cálculo atualizado da condenação", responsavel: "Geovanna Rabelo", proximaData: "2026-09-03", concluido: false, tentativas: [{ data: "2025-11-06", resultado: "Proposta de R$ 900 mil em 24 parcelas — recusada" }, { data: "2026-05-14", resultado: "Ré pediu prazo até a sentença" }, { data: "2026-08-04", resultado: "Nova sinalização de interesse após a condenação" }] },
      { acao: "Despacho com o relator após a distribuição no TJSC, sustentando preferência de julgamento", responsavel: "Geovanna Rabelo", proximaData: "2026-09-24", concluido: false, tentativas: [] },
      { acao: "Pesquisa patrimonial da ré (imóveis, veículos e recebíveis de obra) para instruir execução", responsavel: "Ítalo Nascimento", proximaData: "2026-07-30", concluido: true, tentativas: [{ data: "2026-07-30", resultado: "Duas execuções fiscais ativas; um imóvel livre em Palhoça" }] },
    ],
    prazos: [
      { ato: "Apelação da parte da sentença que fixou juros da citação", contagem: "15 dias úteis", data: "19/08/2026" },
      { ato: "Contrarrazões, se a ré apelar", contagem: "15 dias úteis", data: "a contar da intimação" },
      { ato: "Atualização do cálculo para fins de acordo", contagem: "interno", data: "31/08/2026" },
    ],
    argumentos: [
      { tag: "A1", titulo: "A autora entregou tudo o que devia, e a ré recebeu sem ressalva", fato: "Catorze lotes entregues, catorze canhotos assinados por preposto da ré, nenhuma recusa técnica à época. A alegação de desconformidade surgiu apenas em fevereiro de 2025, depois de quatro parcelas vencidas.", legal: "CC, arts. 476 e 477; CPC, art. 373, II. Cláusulas 4.1 e 7.2 do contrato.", juris: "Orientação consolidada do STJ de que a exceptio non adimpleti contractus exige descumprimento anterior e proporcional da outra parte. A conferir e citar os precedentes atualizados de STJ e TJSC antes do protocolo.", doutrina: "Orlando Gomes, Contratos, sobre os limites da exceção de contrato não cumprido; Judith Martins-Costa, A boa-fé no direito privado, quanto ao comportamento contraditório da ré." },
      { tag: "A2", titulo: "A perícia afastou o atraso e a desconformidade técnica", fato: "O laudo do ev. 62 apurou atraso médio de 3,2 dias, dentro da tolerância contratual, e espessura de chapa na faixa especificada. A ré não impugnou o laudo por assistente técnico próprio.", legal: "CPC, arts. 464 a 480 (prova técnica) e art. 371 (persuasão racional).", juris: "Precedentes que exigem elemento concreto para o juiz se afastar da conclusão pericial. A conferir e citar.", doutrina: "Cândido Rangel Dinamarco, Instituições de Direito Processual Civil, sobre valoração da prova técnica." },
      { tag: "A3", titulo: "A mora é ex re: os juros correm de cada vencimento, não da citação", fato: "As parcelas tinham data certa de vencimento prevista em contrato. A sentença fixou o termo inicial na citação, o que reduz a condenação em cerca de R$ 118 mil. É o principal ponto da apelação.", legal: "CC, arts. 389, 394, 395, 397, caput, e 407.", juris: "Súmula 163 do STF (mora do vencimento na obrigação com termo). Complementar com precedentes atuais do STJ sobre mora ex re em obrigação contratual líquida.", doutrina: "Agostinho Alvim, Da inexecução das obrigações e suas consequências, sobre mora ex re e mora ex persona." },
      { tag: "A4", titulo: "A interrupção dos pagamentos gerou dano além do valor das parcelas", fato: "A autora recorreu a capital de giro bancário para manter a produção e recusou dois pedidos por falta de caixa. A sentença rejeitou o pedido por insuficiência de prova; a apelação deve reforçar o nexo com os contratos de crédito e a contabilidade juntada.", legal: "CC, arts. 402 e 403 (danos emergentes e lucros cessantes por efeito direto e imediato).", juris: "Entendimento de que lucros cessantes exigem prova de lucro razoavelmente esperado, não de expectativa hipotética. A conferir e citar.", doutrina: "Sergio Cavalieri Filho, Programa de Responsabilidade Civil, sobre a extensão do dano contratual." },
    ],
  },
  {
    cliente: "Panificadora Trigo Real",
    caso: "Reclamação J. Moreira",
    proc: "0010234-77.2025.5.12.0002",
    materia: "Trabalhista",
    fase: "Instrução — audiência una designada",
    responsavel: "Gabriel Silveira",
    risco: "Incerto — prova em disputa",
    valor: "R$ 214.000,00",
    orgao: "2ª Vara do Trabalho de Florianópolis/SC — TRT-12",
    juiz: "Juíza Dra. Renata Bittencourt Lyra",
    partes: "Jonas Moreira (reclamante) × Panificadora Trigo Real Ltda. (reclamada, nossa cliente)",
    contraria: "Dra. Priscila Andrade Fontes — OAB/SC 33.907",
    atualizacao: "24/07/2026",
    versao: "v3",
    marco: "Designação da audiência una",
    revisor: "Gabriel Silveira",
    resumo:
      "Ex-padeiro pede horas extras, intervalo intrajornada e adicional noturno de três anos de contrato. Há controle de ponto eletrônico regular em quase todo o período, com lacuna de quatro meses em 2023. O risco concentra-se nessa lacuna e na prova oral sobre a jornada real. Estratégia: sustentar a validade do ponto, restringir o pedido à lacuna e negociar acordo na audiência dentro do teto autorizado pela cliente.",
    especificos: [
      { label: "Período contratual", valor: "02/2021 a 11/2024 — padeiro, jornada 6x1" },
      { label: "Provisão / risco estimado", valor: "Provisão de R$ 62.000,00; teto de acordo autorizado: R$ 45.000,00" },
    ],
    timeline: [
      { data: "09/12/2025", ato: "Ajuizamento da reclamação" },
      { data: "27/02/2026", ato: "Defesa com juntada dos controles de ponto e recibos" },
      { data: "15/05/2026", ato: "Réplica: reclamante alega ponto britânico e coação no registro" },
      { data: "24/07/2026", ato: "Audiência una designada para 09/09/2026" },
    ],
    firac: {
      f: [
        "O reclamante trabalhou como padeiro de 02/2021 a 11/2024 em jornada 6x1, com registro eletrônico de ponto.",
        "Os cartões apresentam variação natural de horários e pagamento de horas extras em folha. Entre 03/2023 e 06/2023 há lacuna de registro, atribuída pela cliente a falha no equipamento.",
      ],
      i: ["A lacuna de quatro meses no controle de ponto inverte o ônus da prova quanto a toda a jornada ou apenas ao período sem registro?"],
      r: ["CLT, art. 74, § 2º; Súmula 338, I, do TST: a ausência injustificada dos controles de jornada gera presunção relativa da jornada alegada, elidível por prova em contrário."],
      a: [
        "A presunção da Súmula 338 é relativa e limitada ao período sem registro. Nos demais 32 meses os cartões são regulares, com variação de horários, o que afasta a tese de ponto britânico.",
        "Para os quatro meses, a prova oral dos dois padeiros do mesmo turno e o volume de produção registrado podem delimitar a jornada efetiva.",
      ],
      c: ["Exposição realista concentrada na lacuna: cerca de R$ 55 a 70 mil. Acordo na audiência una é a via preferível, dentro do teto de R$ 45 mil."],
    },
    objetivo: "Encerrar o processo em acordo na audiência una de 09/09/2026 por até R$ 45.000,00, sem reconhecimento de jornada para os demais períodos.",
    objetivoSec: "Se não houver acordo, limitar a condenação ao período de 03 a 06/2023.",
    linhaVermelha: "Não aceitar acordo que reconheça jornada habitual além da lacuna nem que sirva de precedente para os outros dois processos da cliente.",
    passos: [
      { acao: "Arrolar as duas testemunhas do turno e preparar a prova de produção do período", responsavel: "Gabriel Silveira", proximaData: "2026-08-21", concluido: false, tentativas: [] },
      { acao: "Levantar com a cliente o laudo de manutenção do relógio de ponto de 2023", responsavel: "Ítalo Nascimento", proximaData: "2026-08-14", concluido: false, tentativas: [{ data: "2026-06-19", resultado: "TI da cliente não localizou o registro de chamado" }] },
      { acao: "Sondar proposta de acordo com a patrona do reclamante antes da audiência", responsavel: "Gabriel Silveira", proximaData: "2026-08-28", concluido: false, tentativas: [{ data: "2026-04-02", resultado: "Pedido de R$ 120 mil — inviável" }] },
      { acao: "Audiência una de instrução e julgamento", responsavel: "Gabriel Silveira", proximaData: "2026-09-09", concluido: false, tentativas: [] },
    ],
    prazos: [
      { ato: "Rol de testemunhas", contagem: "até 5 dias antes da audiência", data: "02/09/2026" },
      { ato: "Juntada de documentos complementares", contagem: "interno", data: "28/08/2026" },
    ],
    argumentos: [
      { tag: "A1", titulo: "Os controles de ponto são válidos em 32 dos 36 meses", fato: "Os cartões mostram variação de horários, marcações de intervalo e pagamento de horas extras em folha, o que afasta a alegação de jornada britânica ou de registro coagido.", legal: "CLT, art. 74, § 2º; CPC, art. 373, I, aplicado subsidiariamente.", juris: "Súmula 338, III, do TST: os cartões que registram horários variáveis geram presunção de veracidade, a ser elidida por prova em contrário.", doutrina: "Maurício Godinho Delgado, Curso de Direito do Trabalho, sobre distribuição do ônus da prova da jornada." },
      { tag: "A2", titulo: "A presunção da lacuna alcança só o período sem registro", fato: "A falha do equipamento entre março e junho de 2023 está circunscrita a quatro meses e não contamina os cartões anteriores e posteriores.", legal: "CLT, art. 74, § 2º.", juris: "Súmula 338, I, do TST, com a leitura de que a presunção é relativa. Localizar precedentes do TRT-12 no mesmo sentido.", doutrina: "Homero Batista Mateus da Silva, CLT Comentada, sobre limites da inversão do ônus." },
    ],
  },
  {
    cliente: "Transportes Costa Verde",
    caso: "Créditos de PIS e COFINS",
    proc: "5009876-12.2024.4.04.7200",
    materia: "Tributário",
    fase: "Apelação distribuída no TRF-4",
    responsavel: "Amanda Lopes",
    risco: "Favorável com reservas",
    valor: "R$ 3.740.000,00",
    orgao: "1ª Vara Federal de Florianópolis/SC — TRF-4",
    juiz: "Juiz Federal Dr. Tomás Aguiar Vilela",
    partes: "Transportes Costa Verde Ltda. × União (Fazenda Nacional)",
    contraria: "Procuradoria-Regional da Fazenda Nacional da 4ª Região",
    atualizacao: "30/06/2026",
    versao: "v5",
    marco: "Distribuição da apelação",
    revisor: "Amanda Lopes",
    resumo:
      "Ação para excluir valores da base de cálculo do PIS e da COFINS e recuperar o indébito dos cinco anos anteriores. A sentença acolheu a exclusão, mas restringiu a compensação e negou parte do período. Discute-se agora, em apelação, o alcance temporal e a forma de aproveitamento dos créditos. Estratégia: preservar a tese principal, ampliar o período e habilitar a compensação administrativa o quanto antes.",
    especificos: [
      { label: "Tributos discutidos", valor: "PIS e COFINS — competências de 01/2019 a 12/2023" },
      { label: "Provisão / risco estimado", valor: "Crédito provável de R$ 2,6 mi; parte controvertida de R$ 1,1 mi" },
    ],
    timeline: [
      { data: "11/09/2024", ato: "Distribuição da ação com pedido de tutela" },
      { data: "28/11/2024", ato: "Tutela deferida em parte para suspender a exigibilidade" },
      { data: "19/02/2026", ato: "Sentença de procedência parcial" },
      { data: "30/06/2026", ato: "Apelação da cliente e da Fazenda distribuídas no TRF-4" },
    ],
    firac: {
      f: [
        "A cliente recolheu PIS e COFINS incluindo na base valores que não compõem receita própria, no período de 01/2019 a 12/2023.",
        "A sentença reconheceu a exclusão a partir de 2020 e determinou compensação apenas depois do trânsito em julgado.",
      ],
      i: ["O período reconhecido deve alcançar 2019, e a habilitação do crédito pode ser requerida antes do trânsito em julgado?"],
      r: ["CTN, arts. 165 a 168 (repetição do indébito) e art. 170-A (compensação após trânsito em julgado); Lei 9.430/1996, art. 74."],
      a: [
        "O prazo quinquenal contado do ajuizamento alcança as competências de 2019, ponto em que a sentença foi mais restritiva que a própria tese acolhida.",
        "A vedação do art. 170-A não impede a habilitação prévia do crédito, apenas o encontro de contas, o que permite ganhar tempo no procedimento administrativo.",
      ],
      c: ["A tese principal está segura. A apelação deve recuperar 2019 e a instrução administrativa pode ser preparada em paralelo."],
    },
    objetivo: "Confirmar a exclusão em segundo grau com o período ampliado para 2019 e ter o crédito habilitado para compensação no primeiro semestre de 2027.",
    objetivoSec: "Manter a suspensão da exigibilidade sobre as competências vincendas.",
    linhaVermelha: "Não transigir em transação tributária que exija renúncia ao período de 2019 sem desconto equivalente.",
    passos: [
      { acao: "Memoriais ao relator no TRF-4 com planilha do período de 2019", responsavel: "Amanda Lopes", proximaData: "2026-08-25", concluido: false, tentativas: [] },
      { acao: "Preparar pedido de habilitação prévia do crédito na Receita Federal", responsavel: "Amanda Lopes", proximaData: "2026-09-15", concluido: false, tentativas: [] },
      { acao: "Reunião com a contabilidade da cliente para fechar a memória de cálculo", responsavel: "Gabriel Silveira", proximaData: "2026-08-18", concluido: false, tentativas: [{ data: "2026-05-22", resultado: "Faltavam SPEDs de 2019; cliente ficou de recuperar" }] },
    ],
    prazos: [
      { ato: "Contrarrazões à apelação da Fazenda", contagem: "30 dias", data: "27/08/2026" },
      { ato: "Memoriais ao relator", contagem: "antes da sessão", data: "a designar" },
    ],
    argumentos: [
      { tag: "A1", titulo: "O quinquênio contado do ajuizamento alcança as competências de 2019", fato: "A ação foi distribuída em 11/09/2024; a repetição alcança os pagamentos indevidos dos cinco anos anteriores, incluindo todo o exercício de 2019.", legal: "CTN, arts. 165, I, e 168, I; LC 118/2005, art. 3º.", juris: "Jurisprudência consolidada sobre o termo inicial da prescrição quinquenal na repetição de indébito. A conferir e citar.", doutrina: "Paulo de Barros Carvalho, Curso de Direito Tributário, sobre prescrição do indébito." },
      { tag: "A2", titulo: "A habilitação do crédito pode ser requerida antes do trânsito em julgado", fato: "A vedação legal alcança o encontro de contas, não o procedimento de habilitação, que é meramente instrutório.", legal: "CTN, art. 170-A; Lei 9.430/1996, art. 74; IN RFB sobre habilitação de crédito decorrente de decisão judicial.", juris: "Precedentes que distinguem habilitação e compensação efetiva. A conferir e citar.", doutrina: "Hugo de Brito Machado, Curso de Direito Tributário, sobre compensação tributária." },
    ],
  },
  {
    cliente: "Café Serra Azul",
    caso: "Dissolução parcial de sociedade",
    proc: "5003321-08.2026.8.24.0023",
    materia: "Empresarial",
    fase: "Contestação apresentada — perícia a designar",
    responsavel: "Geovanna Rabelo",
    risco: "Incerto — prova em disputa",
    valor: "R$ 890.000,00",
    orgao: "1ª Vara Empresarial da Comarca de Florianópolis/SC",
    juiz: "Juiz de Direito Dr. Nelson Kraemer Filho",
    partes: "Café Serra Azul Ltda. e sócios remanescentes × Ricardo Vilanova (sócio retirante)",
    contraria: "Dr. Eduardo Pacheco Lins — OAB/SC 28.114",
    atualizacao: "12/06/2026",
    versao: "v2",
    marco: "Contestação apresentada",
    revisor: "Gabriel Silveira",
    resumo:
      "Sócio retirante pretende apuração de haveres por valor de mercado, com goodwill, enquanto o contrato social prevê balanço de determinação com critério patrimonial. A disputa central é o critério e a data-base da apuração. Estratégia: fazer prevalecer a cláusula contratual, fixar a data-base na notificação e conduzir a perícia com assistente técnico próprio.",
    especificos: [
      { label: "Participação do retirante", valor: "24% das quotas — ingresso em 2016" },
      { label: "Provisão / risco estimado", valor: "Diferença entre critérios: R$ 310.000,00" },
    ],
    timeline: [
      { data: "04/02/2026", ato: "Notificação de retirada pelo sócio" },
      { data: "18/03/2026", ato: "Distribuição da ação de dissolução parcial" },
      { data: "12/06/2026", ato: "Contestação: prevalência da cláusula de balanço de determinação" },
    ],
    firac: {
      f: [
        "O retirante notificou a saída em 04/02/2026, após dez anos de sociedade, e pede haveres calculados por valor de mercado com goodwill.",
        "A cláusula 12 do contrato social prevê apuração por balanço de determinação, a valor patrimonial contábil ajustado, pago em vinte e quatro parcelas.",
      ],
      i: ["Prevalece o critério contratual de apuração de haveres ou o valor de mercado pretendido pelo retirante?"],
      r: ["CC, art. 1.031; CPC, arts. 604 e 606: o contrato social rege a apuração; na omissão, aplica-se o valor patrimonial em balanço de determinação."],
      a: [
        "Havendo cláusula expressa e não abusiva, ela prevalece — o CPC só admite critério judicial na omissão do contrato.",
        "A data-base deve ser a da notificação, momento em que a resolução do vínculo se opera para o sócio retirante.",
      ],
      c: ["A posição da cliente é defensável quanto ao critério, com exposição concentrada em eventuais ajustes de reavaliação de imóveis."],
    },
    objetivo: "Fazer prevalecer a apuração por balanço de determinação com data-base em 04/02/2026 e pagamento parcelado conforme o contrato.",
    objetivoSec: "Evitar inclusão de goodwill e de fundo de comércio na base de cálculo.",
    linhaVermelha: "Não aceitar pagamento à vista que comprometa o capital de giro da sociedade.",
    passos: [
      { acao: "Indicar assistente técnico contábil e formular quesitos", responsavel: "Geovanna Rabelo", proximaData: "2026-08-20", concluido: false, tentativas: [] },
      { acao: "Reunião com sócios remanescentes sobre proposta de saída negociada", responsavel: "Geovanna Rabelo", proximaData: "2026-09-01", concluido: false, tentativas: [{ data: "2026-07-10", resultado: "Sócios abertos a parcelamento em 24 meses" }] },
    ],
    prazos: [{ ato: "Quesitos e assistente técnico", contagem: "15 dias da decisão de saneamento", data: "20/08/2026" }],
    argumentos: [
      { tag: "A1", titulo: "A cláusula contratual de apuração é válida e prevalece", fato: "O contrato social de 2016, assinado pelo próprio retirante, fixa balanço de determinação a valor patrimonial ajustado e pagamento em vinte e quatro parcelas.", legal: "CC, art. 1.031; CPC, arts. 604 e 606.", juris: "Precedentes que reconhecem a prevalência do critério contratual de apuração de haveres. A conferir e citar.", doutrina: "Modesto Carvalhosa, Comentários ao Código Civil, sobre resolução da sociedade em relação a um sócio." },
      { tag: "A2", titulo: "A data-base é a da notificação de retirada", fato: "A retirada se operou com a notificação de 04/02/2026, e não com a citação, o que exclui resultados posteriores da base de cálculo.", legal: "CC, art. 1.029; CPC, art. 605, II.", juris: "A conferir e citar precedentes sobre data-base na retirada imotivada.", doutrina: "Erasmo Valladão A. e N. França, sobre resolução parcial de sociedade." },
    ],
  },
  {
    cliente: "R. A. Nogueira",
    caso: "Divórcio e partilha",
    proc: "5004455-90.2026.8.24.0023",
    materia: "Família e sucessões",
    fase: "Inicial protocolada — audiência de mediação",
    responsavel: "Millena Frias",
    risco: "Favorável com reservas",
    valor: "R$ 1.250.000,00",
    orgao: "2ª Vara de Família da Comarca de Florianópolis/SC",
    juiz: "Juíza de Direito Dra. Cláudia Reis Amorim",
    partes: "R. A. Nogueira × M. S. Nogueira",
    contraria: "Dra. Letícia Barbosa Duarte — OAB/SC 45.302",
    atualizacao: "28/07/2026",
    versao: "v1",
    marco: "Abertura do dossiê após protocolo",
    revisor: "Millena Frias",
    resumo:
      "Divórcio consensual quanto ao vínculo e à guarda compartilhada, litigioso quanto à partilha de um imóvel adquirido na constância do casamento com recursos de doação recebida por um dos cônjuges. Discute-se a sub-rogação de bem particular. Estratégia: comprovar a origem dos recursos e resolver a partilha em mediação, preservando o acordo de guarda já alinhado.",
    especificos: [
      { label: "Regime de bens", valor: "Comunhão parcial — casamento em 2014" },
      { label: "Provisão / risco estimado", valor: "Imóvel controvertido avaliado em R$ 780.000,00" },
    ],
    timeline: [
      { data: "16/07/2026", ato: "Protocolo da inicial de divórcio com pedido de partilha" },
      { data: "28/07/2026", ato: "Designação de audiência de mediação para 22/09/2026" },
    ],
    firac: {
      f: [
        "O casamento ocorreu em 2014 sob comunhão parcial. Em 2018 foi adquirido imóvel em nome de ambos, com recursos de doação recebida por nosso cliente de seus pais, documentada em escritura.",
        "Há consenso quanto ao divórcio, à guarda compartilhada e aos alimentos dos filhos.",
      ],
      i: ["O imóvel adquirido com recursos de doação a um dos cônjuges integra a partilha ou é bem particular por sub-rogação?"],
      r: ["CC, art. 1.659, I e II: excluem-se da comunhão os bens recebidos por doação e os sub-rogados em seu lugar."],
      a: [
        "A escritura de doação e o extrato da transferência permitem rastrear os recursos até a aquisição, caracterizando sub-rogação de bem particular.",
        "A titularidade conjunta na matrícula não altera a natureza do recurso empregado, mas exige prova documental do fluxo.",
      ],
      c: ["A tese é sustentável com a prova bancária; a mediação é a via mais rápida, com compensação em bens de menor valor."],
    },
    objetivo: "Homologar em mediação o divórcio com guarda compartilhada e reconhecimento do imóvel como bem particular, com compensação de até R$ 90.000,00.",
    objetivoSec: "Preservar integralmente o acordo já alinhado sobre convivência e alimentos.",
    linhaVermelha: "Não vincular a discussão patrimonial ao regime de convivência com os filhos.",
    passos: [
      { acao: "Reunir extratos de 2018 que rastreiam a doação até a aquisição do imóvel", responsavel: "Millena Frias", proximaData: "2026-08-26", concluido: false, tentativas: [{ data: "2026-07-24", resultado: "Banco entregou apenas 2019 em diante; pedido reiterado" }] },
      { acao: "Audiência de mediação", responsavel: "Millena Frias", proximaData: "2026-09-22", concluido: false, tentativas: [] },
    ],
    prazos: [{ ato: "Juntada da prova bancária antes da mediação", contagem: "interno", data: "15/09/2026" }],
    argumentos: [
      { tag: "A1", titulo: "O imóvel é bem particular por sub-rogação de doação", fato: "A doação de R$ 520.000,00 recebida em 2018 foi integralmente empregada na aquisição do imóvel, quatro dias após o crédito.", legal: "CC, art. 1.659, I e II.", juris: "Precedentes sobre sub-rogação de bens particulares na comunhão parcial. A conferir e citar.", doutrina: "Paulo Lôbo, Direito Civil — Famílias, sobre bens excluídos da comunhão." },
    ],
  },
];

async function seedDossies(emailToId: Record<string, string>) {
  const existentes = await db.select({ id: dossiers.id }).from(dossiers);
  if (existentes.length > 0) {
    await db.delete(dossiers).where(
      inArray(dossiers.id, existentes.map((d) => d.id)),
    );
  }

  for (const d of DOSSIES) {
    const responsavelId = emailToId[d.responsavel];
    const revisorId = emailToId[d.revisor];
    if (!responsavelId || !revisorId) {
      throw new Error(`Responsável/revisor sem usuário correspondente: ${d.responsavel} / ${d.revisor}`);
    }

    const [dossie] = await db
      .insert(dossiers)
      .values({
        cliente: d.cliente,
        caso: d.caso,
        numeroProcesso: d.proc,
        nome: `${d.cliente} - ${d.caso} - Proc. ${d.proc}`,
        materia: d.materia,
        fase: d.fase,
        responsavelId,
        risco: d.risco,
        valorCausa: d.valor,
        orgao: d.orgao,
        juiz: d.juiz,
        partes: d.partes,
        advogadoContrario: d.contraria,
        resumo: d.resumo,
        objetivo: d.objetivo,
        objetivoSecundario: d.objetivoSec,
        linhaVermelha: d.linhaVermelha,
        versao: d.versao,
        marco: d.marco,
        revisorId,
        atualizadoEm: `${brToIso(d.atualizacao)}T12:00:00Z`,
      })
      .returning({ id: dossiers.id });

    await db.insert(dossierFields).values(
      d.especificos.map((e, i) => ({ dossierId: dossie.id, label: e.label, valor: e.valor, ordem: i })),
    );

    await db.insert(timelineEntries).values(
      d.timeline.map((t, i) => ({
        dossierId: dossie.id,
        dataTexto: t.data,
        data: brToIso(t.data),
        ato: t.ato,
        ordem: i,
      })),
    );

    const firacRows: { letra: "F" | "I" | "R" | "A" | "C"; paragrafo: string; ordem: number }[] = [];
    (["f", "i", "r", "a", "c"] as const).forEach((letra) => {
      d.firac[letra].forEach((paragrafo, i) =>
        firacRows.push({ letra: letra.toUpperCase() as "F" | "I" | "R" | "A" | "C", paragrafo, ordem: i }),
      );
    });
    await db.insert(firacBlocks).values(firacRows.map((r) => ({ dossierId: dossie.id, ...r })));

    for (let i = 0; i < d.passos.length; i++) {
      const p = d.passos[i];
      const passoResponsavelId = emailToId[p.responsavel];
      const [step] = await db
        .insert(steps)
        .values({
          dossierId: dossie.id,
          acao: p.acao,
          responsavelId: passoResponsavelId ?? null,
          proximaData: p.proximaData,
          concluido: p.concluido,
          ordem: i,
        })
        .returning({ id: steps.id });

      if (p.tentativas.length > 0) {
        await db.insert(stepAttempts).values(
          p.tentativas.map((t) => ({ stepId: step.id, data: t.data, resultado: t.resultado })),
        );
      }
    }

    await db.insert(deadlines).values(
      d.prazos.map((p, i) => ({
        dossierId: dossie.id,
        ato: p.ato,
        contagem: p.contagem,
        dataTexto: p.data,
        ordem: i,
      })),
    );

    await db.insert(argumentsTable).values(
      d.argumentos.map((a, i) => ({
        dossierId: dossie.id,
        tag: a.tag,
        titulo: a.titulo,
        fato: a.fato,
        previsaoLegal: a.legal,
        jurisprudencia: a.juris,
        doutrina: a.doutrina,
        ordem: i,
      })),
    );

    await db.insert(dossierVersions).values({
      dossierId: dossie.id,
      versao: d.versao,
      data: brToIso(d.atualizacao),
      marco: d.marco,
      revisorId,
      etapa: null,
    });

    console.log(`  ${d.cliente} - ${d.caso} (${d.versao})`);
  }
}

async function main() {
  console.log("Criando/atualizando a equipe...");
  const emailToId = await seedTeam();

  console.log("Recriando os 5 dossiês fictícios...");
  await seedDossies(emailToId);

  console.log("\nSeed concluído.");
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
