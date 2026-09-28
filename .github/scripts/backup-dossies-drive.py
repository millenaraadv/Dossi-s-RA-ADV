"""
Backup semanal dos dossiês ativos para o Google Drive.

Loga no sistema com a conta de serviço "Backup automático" (papel
estagiario — só leitura, nunca edita nada), baixa o PDF de cada dossiê
ativo e sobe/atualiza cada um na pasta do Drive. Atualiza (não duplica)
quando já existe um arquivo com o mesmo nome na pasta.

Executado por .github/workflows/backup-dossies-drive.yml.
"""

import json
import os

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

APP_BASE = "https://dossies.rabeloaguiar.adv.br"
FOLDER_ID = "11BDZ0m85C_MQJ82AH3HszYqEgp-QJL-_"


def login() -> requests.Session:
    sessao = requests.Session()
    resposta = sessao.post(
        f"{APP_BASE}/api/auth/login",
        json={
            "email": os.environ["BACKUP_APP_EMAIL"],
            "senha": os.environ["BACKUP_APP_PASSWORD"],
        },
        timeout=30,
    )
    resposta.raise_for_status()
    return sessao


def listar_dossies(sessao: requests.Session) -> list[dict]:
    resposta = sessao.get(f"{APP_BASE}/api/dossiers", timeout=30)
    resposta.raise_for_status()
    return resposta.json()["itens"]


def baixar_pdf(sessao: requests.Session, dossier_id: str) -> bytes:
    resposta = sessao.get(f"{APP_BASE}/api/dossiers/{dossier_id}/pdf", timeout=60)
    resposta.raise_for_status()
    return resposta.content


def montar_servico_drive():
    info = json.loads(os.environ["GDRIVE_SA_KEY_JSON"])
    credenciais = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive"]
    )
    return build("drive", "v3", credentials=credenciais)


def nome_arquivo(nome_dossie: str) -> str:
    # "/" quebraria a interpretação de caminho da API do Drive.
    return nome_dossie.replace("/", "-")[:200] + ".pdf"


def encontrar_existente(drive, nome: str) -> str | None:
    nome_escapado = nome.replace("'", "\\'")
    query = f"'{FOLDER_ID}' in parents and name = '{nome_escapado}' and trashed = false"
    resultado = drive.files().list(q=query, fields="files(id)").execute()
    arquivos = resultado.get("files", [])
    return arquivos[0]["id"] if arquivos else None


def main() -> None:
    sessao = login()
    dossies = listar_dossies(sessao)
    drive = montar_servico_drive()

    print(f"{len(dossies)} dossiês ativos encontrados.")

    for dossie in dossies:
        nome = nome_arquivo(dossie["nome"])
        conteudo = baixar_pdf(sessao, dossie["id"])

        caminho_temp = f"/tmp/{dossie['id']}.pdf"
        with open(caminho_temp, "wb") as arquivo:
            arquivo.write(conteudo)

        media = MediaFileUpload(caminho_temp, mimetype="application/pdf")
        existente_id = encontrar_existente(drive, nome)

        if existente_id:
            drive.files().update(fileId=existente_id, media_body=media).execute()
            print(f"Atualizado: {nome}")
        else:
            drive.files().create(
                body={"name": nome, "parents": [FOLDER_ID]},
                media_body=media,
            ).execute()
            print(f"Criado: {nome}")

        os.remove(caminho_temp)

    print("Backup concluído.")


if __name__ == "__main__":
    main()
