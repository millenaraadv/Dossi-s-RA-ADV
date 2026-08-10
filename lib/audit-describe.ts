// Traduz uma linha de audit_log (entidade + ação + antes/depois) numa frase
// em português — "adicionou um prazo", "excluiu um passo", "alterou o item
// Rule no FIRAC". Puro e sem I/O: dá pra chamar tanto no servidor (rota) —
// hoje o único lugar que usa — quanto no client se algum dia fizer sentido.
import { formatarDataBr } from "@/lib/dates";

type Registro = Record<string, unknown> | null | undefined;

function campo<T = unknown>(obj: Registro, chave: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[chave] as T | undefined;
}

const FIRAC_NOME: Record<string, string> = {
  F: "Facts",
  I: "Issue",
  R: "Rule",
  A: "Application",
  C: "Conclusion",
};

const CAMPOS_GERAIS_LABEL: Record<string, string> = {
  cliente: "Cliente",
  caso: "Caso",
  numeroProcesso: "Nº do processo",
  materia: "Matéria",
  fase: "Fase e rito",
  responsavelId: "Profissional responsável",
  risco: "Risco/prognóstico",
  valorCausa: "Valor da causa",
  orgao: "Comarca/tribunal",
  juiz: "Magistrado",
  partes: "Partes",
  advogadoContrario: "Advogado contrário",
  resumo: "Resumo executivo",
  objetivo: "Objetivo",
  objetivoSecundario: "Objetivo secundário",
  linhaVermelha: "Linha vermelha",
};

function listar(itens: string[]): string {
  if (itens.length === 0) return "";
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function descreverDossier(acao: string, antes: Registro, depois: Registro): string {
  if (acao === "criar") return "Criou o dossiê";
  if (acao === "arquivar") return "Arquivou o dossiê";
  if (acao === "concluir-edicao") {
    const etapa = campo<string>(depois, "etapa");
    const versao = campo<string>(depois, "versao");
    return `Concluiu a edição de "${etapa}" (versão ${versao})`;
  }
  if (acao === "atualizar-gerais") {
    const mudou = Object.keys(CAMPOS_GERAIS_LABEL).filter((k) => campo(antes, k) !== campo(depois, k));
    if (mudou.length === 0) return "Atualizou os dados gerais";
    return `Alterou ${listar(mudou.map((k) => CAMPOS_GERAIS_LABEL[k]))}`;
  }
  return "Atualizou o dossiê";
}

function descreverTimeline(): string {
  return "Atualizou a linha do tempo";
}

function descreverFirac(antes: Registro[], depois: Registro): string {
  const antesArr = Array.isArray(antes) ? antes : [];
  const porLetra = new Map<string, { paragrafo: string; ordem: number }[]>();
  for (const bloco of antesArr) {
    const letra = campo<string>(bloco, "letra");
    if (!letra) continue;
    const lista = porLetra.get(letra) ?? [];
    lista.push({ paragrafo: campo<string>(bloco, "paragrafo") ?? "", ordem: campo<number>(bloco, "ordem") ?? 0 });
    porLetra.set(letra, lista);
  }

  const alterados: string[] = [];
  for (const letra of ["F", "I", "R", "A", "C"]) {
    const antesTexto = (porLetra.get(letra) ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map((b) => b.paragrafo)
      .join("\n");
    const depoisTexto = (campo<string[]>(depois, letra.toLowerCase()) ?? []).join("\n");
    if (antesTexto !== depoisTexto) alterados.push(FIRAC_NOME[letra]);
  }

  if (alterados.length === 0) return "Atualizou o FIRAC";
  const plural = alterados.length > 1 ? "itens" : "item";
  return `Alterou ${plural} ${listar(alterados)} no FIRAC`;
}

function descreverArgumentos(antes: Registro[], depois: Registro[]): string {
  const antesArr = Array.isArray(antes) ? antes : [];
  const depoisArr = Array.isArray(depois) ? depois : [];
  const antesTitulos = antesArr.map((a) => campo<string>(a, "titulo") ?? "");
  const depoisTitulos = depoisArr.map((a) => campo<string>(a, "titulo") ?? "");

  const adicionados = depoisTitulos.filter((t) => !antesTitulos.includes(t));
  const removidos = antesTitulos.filter((t) => !depoisTitulos.includes(t));

  const partes: string[] = [];
  if (adicionados.length > 0) {
    partes.push(
      `adicionou o argumento "${adicionados[0]}"` +
        (adicionados.length > 1 ? ` e mais ${adicionados.length - 1}` : ""),
    );
  }
  if (removidos.length > 0) {
    partes.push(
      `removeu o argumento "${removidos[0]}"` + (removidos.length > 1 ? ` e mais ${removidos.length - 1}` : ""),
    );
  }
  if (partes.length === 0) return "Editou os argumentos";
  const [primeira, ...resto] = partes;
  return primeira.charAt(0).toUpperCase() + primeira.slice(1) + (resto.length ? "; " + resto.join("; ") : "");
}

function descreverStep(acao: string, antes: Registro, depois: Registro): string {
  if (acao === "criar") return `Adicionou o passo "${campo(depois, "acao")}"`;
  if (acao === "excluir") return `Excluiu o passo "${campo(antes, "acao")}"`;

  const acaoTexto = campo<string>(depois, "acao") ?? campo<string>(antes, "acao") ?? "";
  if (campo(antes, "concluido") !== campo(depois, "concluido")) {
    return campo(depois, "concluido") ? `Concluiu o passo "${acaoTexto}"` : `Reabriu o passo "${acaoTexto}"`;
  }
  if (campo(antes, "acao") !== campo(depois, "acao")) {
    return `Alterou a ação do passo de "${campo(antes, "acao")}" para "${campo(depois, "acao")}"`;
  }
  if (campo(antes, "responsavelId") !== campo(depois, "responsavelId")) {
    return `Alterou o responsável do passo "${acaoTexto}"`;
  }
  if (campo(antes, "proximaData") !== campo(depois, "proximaData")) {
    return `Alterou a data do passo "${acaoTexto}"`;
  }
  return `Editou o passo "${acaoTexto}"`;
}

function descreverTentativa(depois: Registro): string {
  const data = formatarDataBr(campo<string>(depois, "data") ?? null);
  return `Registrou uma tentativa em ${data}: "${campo(depois, "resultado")}"`;
}

function descreverPrazo(acao: string, antes: Registro, depois: Registro): string {
  if (acao === "criar") return `Adicionou o prazo "${campo(depois, "ato")}"`;
  if (acao === "excluir") return `Excluiu o prazo "${campo(antes, "ato")}"`;

  const ato = campo<string>(depois, "ato") ?? campo<string>(antes, "ato") ?? "";
  if (campo(antes, "redacaoOk") !== campo(depois, "redacaoOk")) {
    return campo(depois, "redacaoOk")
      ? `Marcou a redação como concluída no prazo "${ato}"`
      : `Reabriu a redação no prazo "${ato}"`;
  }
  if (campo(antes, "redacaoLink") !== campo(depois, "redacaoLink")) {
    return `Atualizou o link da minuta no prazo "${ato}"`;
  }
  if (campo(antes, "correcaoOk") !== campo(depois, "correcaoOk")) {
    return campo(depois, "correcaoOk")
      ? `Marcou a correção como concluída no prazo "${ato}"`
      : `Reabriu a correção no prazo "${ato}"`;
  }
  if (campo(antes, "correcaoPorId") !== campo(depois, "correcaoPorId")) {
    return `Definiu quem corrigiu o prazo "${ato}"`;
  }
  if (campo(antes, "protocoloOk") !== campo(depois, "protocoloOk")) {
    return campo(depois, "protocoloOk")
      ? `Marcou o protocolo como concluído no prazo "${ato}"`
      : `Reabriu o protocolo no prazo "${ato}"`;
  }
  if (campo(antes, "protocoloData") !== campo(depois, "protocoloData")) {
    return `Atualizou a data de protocolo do prazo "${ato}"`;
  }
  if (
    campo(antes, "ato") !== campo(depois, "ato") ||
    campo(antes, "contagem") !== campo(depois, "contagem") ||
    campo(antes, "dataTexto") !== campo(depois, "dataTexto")
  ) {
    return `Editou o prazo "${ato}"`;
  }
  return `Atualizou o prazo "${ato}"`;
}

export function describeAuditEntry(entry: {
  entidade: string;
  acao: string;
  antes?: unknown;
  depois?: unknown;
}): string {
  const { entidade, acao, antes, depois } = entry;

  switch (entidade) {
    case "dossiers":
      return descreverDossier(acao, antes as Registro, depois as Registro);
    case "timeline_entries":
      return descreverTimeline();
    case "firac_blocks":
      return descreverFirac((antes as Registro[]) ?? [], depois as Registro);
    case "arguments":
      return descreverArgumentos((antes as Registro[]) ?? [], (depois as Registro[]) ?? []);
    case "steps":
      return descreverStep(acao, antes as Registro, depois as Registro);
    case "step_attempts":
      return descreverTentativa(depois as Registro);
    case "deadlines":
      return descreverPrazo(acao, antes as Registro, depois as Registro);
    default:
      return `${acao} em ${entidade}`;
  }
}
