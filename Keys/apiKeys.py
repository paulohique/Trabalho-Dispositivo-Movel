# Simulação de API Keys com contador de uso
from flask import request, jsonify

from Main import app

api_keys = {
    "minha-chave-secreta-123": {"usos_restantes": 10, "ativa": True},
    "chave-expira-1vez": {"usos_restantes": 1, "ativa": True}
}


@app.before_request
def verificar_api_key():
    chave = request.headers.get('x-api-key')

    if not chave or chave not in api_keys:
        return jsonify({"erro": "API Key ausente ou inválida"}), 401

    info = api_keys[chave]

    if not info["ativa"] or info["usos_restantes"] <= 0:
        return jsonify({"erro": "API Key expirada ou inativa"}), 403

    # Decrementa usos
    info["usos_restantes"] -= 1

    if info["usos_restantes"] <= 0:
        info["ativa"] = False
