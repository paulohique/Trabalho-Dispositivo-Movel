import mysql.connector
from flask import request, jsonify

def verificar_api_key():
    chave = request.headers.get('api-key')

    if not chave:
        return jsonify({"erro": "API Key ausente"}), 401

    try:
        # Conectar ao banco de dados
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='gabicam'
        )
        cursor = conn.cursor(dictionary=True)

        # Corrigir consulta SQL passando o parâmetro de forma segura
        cursor.execute("SELECT * FROM api_keys WHERE chave = %s", (chave,))
        result = cursor.fetchone()

        if not result:
            return jsonify({"erro": "API Key inválida"}), 401

        if not result['ativa'] or result['usos_restantes'] <= 0:
            return jsonify({"erro": "API Key expirada ou inativa"}), 403

        # Atualizar contador de uso
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
