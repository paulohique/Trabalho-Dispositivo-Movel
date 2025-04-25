import mysql.connector
from flask import request, jsonify

def verificar_api_key():
    chave = request.headers.get('x-api-key')

    if not chave:
        return jsonify({"erro": "API Key ausente"}), 401

    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='Gabicam'
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM apiKeys WHERE chave = %s", (chave,))
        result = cursor.fetchone()

        if not result:
            return jsonify({"erro": "API Key inválida"}), 401

        if not result['ativa'] or result['usos_restantes'] <= 0:
            return jsonify({"erro": "API Key expirada ou inativa"}), 403

        # Atualiza contador de uso
        cursor.execute(
            "UPDATE api_keys SET usos_restantes = usos_restantes - 1 WHERE id = %s",
            (result['id'],)
        )
        conn.commit()

    except Exception as e:
        return jsonify({"erro": "Erro no servidor: " + str(e)}), 500

    finally:
        cursor.close()
        conn.close()
