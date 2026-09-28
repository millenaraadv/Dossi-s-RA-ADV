"""
Backup semanal dos dossiês ativos para o Google Drive, com histórico de
versões.

Loga no sistema com a conta de serviço "Backup automático" (papel
estagiario — só leitura, nunca edita nada). Para cada dossiê ativo,
compara a versão atual (campo "versao" do dossiê — o mesmo "v1, v2, v3…"
que aparece no rodapé do sistema, incrementado só quando alguém clica em
"Concluir edição") com a versão registrada no arquivo já salvo no Drive.

- Sem mudança de versão: não baixa PDF nem toca no Drive (rápido).
- Com mudança: baixa o PDF novo, renomeia o arquivo atual para um nome de
  arquivo, e sobe o PDF novo com o nome "limpo" (sem sufixo) — assim quem
  abre a pasta sempre vê a versão vigente com o nome normal, e as versões
  anteriores ficam arquivadas ao lado, nunca apagadas.

Não usa o conteúdo do PDF para detectar mudança: o PDF é gerado de novo a
cada chamada e sempre traz um carimbo de data/hora de geração diferente
mesmo quando nada no dossiê mudou, o que tornaria qualquer comparação de
bytes ou hash inútil (sempre "mudou").

Precisa ser um Drive COMPARTILHADO (não uma pasta comum do "Meu Drive"):
contas de serviço do Google não têm cota de armazenamento própria e não
conseguem criar arquivo novo fora de um Drive compartilhado (erro
"Service Accounts do not have storage quota").

Executado por .github/workflows/backup-dossies-drive.yml.
"""

import json
import os
import time

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

APP_BASE = "https://dossies.rabeloaguiar.adv.br"
DRIVE_ID = "0AMpqu1jxy2HcUk9PVA"  # Drive compartilhado "Dossiês — Backup"

# O app roda no plano Free do Render, que "dorme" após um tempo ocioso — a
# primeira requisição depois disso (quase sempre a deste backup semanal, que
# não tem por que rodar mais vezes) pode demorar bem mais que o normal para
# responder enquanto o servidor "acorda". Timeout folgado + novas tentativas
# nas chamadas ao app evitam falhar por causa disso.
TENTATIVAS = 3
ESPERA_BASE_S = 20


def com_retentativas(descricao: str, chamada):
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            return chamada()
        except requests.exceptions.RequestException as erro:
            if tentativa == TENTATIVAS:
                raise
            espera = ESPERA_BASE_S * tentativa
            print(f"  {descricao} falhou ({erro}); tentativa {tentativa}/{TENTATIVAS}, de novo em {espera}s…")
            time.sleep(espera)


def login() -> requests.Session:
    def tentar():
        sessao = requests.Session()
        resposta = sessao.post(
            f"{APP_BASE}/api/auth/login",
            json={
                "email": os.environ["BACKUP_APP_EMAIL"],
                "senha": os.environ["BACKUP_APP_PASSWORD"],
            },
            timeout=90,
        )
        resposta.raise_for_status()
        return sessao

    return com_retentativas("Login", tentar)


def listar_dossies(sessao: requests.Session) -> list[dict]:
    def tentar():
        resposta = sessao.get(f"{APP_BASE}/api/dossiers", timeout=60)
        resposta.raise_for_status()
        return resposta.json()["itens"]

    return com_retentativas("Listar dossiês", tentar)


def buscar_dossier(sessao: requests.Session, dossier_id: str) -> dict:
    def tentar():
        resposta = sessao.get(f"{APP_BASE}/api/dossiers/{dossier_id}", timeout=60)
        resposta.raise_for_status()
        return resposta.json()

    return com_retentativas(f"Buscar dossiê {dossier_id}", tentar)


def baixar_pdf(sessao: requests.Session, dossier_id: str) -> bytes:
    def tentar():
        resposta = sessao.get(f"{APP_BASE}/api/dossiers/{dossier_id}/pdf", timeout=90)
        resposta.raise_for_status()
        return resposta.content

    return com_retentativas(f"Baixar PDF {dossier_id}", tentar)


def montar_servico_drive():
    info = json.loads(os.environ["GDRIVE_SA_KEY_JSON"])
    credenciais = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive"]
    )
    return build("drive", "v3", credentials=credenciais)


def nome_base_arquivo(nome_dossie: str) -> str:
    # "/" quebraria a interpretação de caminho da API do Drive.
    return nome_dossie.replace("/", "-")[:200]


def buscar_arquivo_vigente(drive, nome: str) -> dict | None:
    """Arquivo com o nome "limpo" (sem sufixo de versão) — é sempre único,
    já que os arquivados sempre têm o sufixo "(vN - aaaa-mm-dd)"."""
    nome_escapado = nome.replace("'", "\\'")
    query = f"'{DRIVE_ID}' in parents and name = '{nome_escapado}' and trashed = false"
    resultado = (
        drive.files()
        .list(
            q=query,
            fields="files(id, properties)",
            corpora="drive",
            driveId=DRIVE_ID,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        )
        .execute()
    )
    arquivos = resultado.get("files", [])
    return arquivos[0] if arquivos else None


def arquivar_versao_anterior(drive, arquivo_existente: dict, nome_base: str) -> None:
    propriedades = arquivo_existente.get("properties") or {}
    versao_antiga = propriedades.get("versao", "versao-desconhecida")
    data_antiga = (propriedades.get("atualizadoEm") or "data-desconhecida")[:10]
    novo_nome = f"{nome_base} ({versao_antiga} - {data_antiga}).pdf"
    drive.files().update(
        fileId=arquivo_existente["id"],
        body={"name": novo_nome},
        supportsAllDrives=True,
    ).execute()
    print(f"  Versão anterior arquivada como: {novo_nome}")


def main() -> None:
    sessao = login()
    dossies = listar_dossies(sessao)
    drive = montar_servico_drive()

    print(f"{len(dossies)} dossiês ativos encontrados.")

    for item in dossies:
        nome_base = nome_base_arquivo(item["nome"])
        nome_vigente = f"{nome_base}.pdf"

        detalhe = buscar_dossier(sessao, item["id"])
        versao_atual = detalhe["versao"]
        atualizado_em_atual = detalhe["atualizadoEm"]

        arquivo_existente = buscar_arquivo_vigente(drive, nome_vigente)
        versao_salva = (arquivo_existente or {}).get("properties", {}).get("versao")

        if arquivo_existente and versao_salva == versao_atual:
            print(f"Sem mudança ({versao_atual}): {nome_base}")
            continue

        conteudo = baixar_pdf(sessao, item["id"])
        caminho_temp = f"/tmp/{item['id']}.pdf"
        with open(caminho_temp, "wb") as arquivo:
            arquivo.write(conteudo)
        media = MediaFileUpload(caminho_temp, mimetype="application/pdf")

        if arquivo_existente:
            arquivar_versao_anterior(drive, arquivo_existente, nome_base)

        drive.files().create(
            body={
                "name": nome_vigente,
                "parents": [DRIVE_ID],
                "properties": {"versao": versao_atual, "atualizadoEm": atualizado_em_atual},
            },
            media_body=media,
            supportsAllDrives=True,
        ).execute()
        print(f"Nova versão salva ({versao_atual}): {nome_base}")

        os.remove(caminho_temp)

    print("Backup concluído.")


if __name__ == "__main__":
    main()
