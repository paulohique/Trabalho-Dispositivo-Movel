from flask import Flask, request, jsonify
import cv2
import tempfile
import os
from datetime import datetime

import mysql.connector

from Models.gabarito_model import corrigir_gabarito



def submeter_prova():
    if 'nome' not in request.form:
        return jsonify({"erro": "Nome do aluno não enviado"}), 400

    if 'imagem' not in request.files:
        return jsonify({"erro": "Imagem não enviada"}), 400

    if 'gabarito' not in request.form:
        return jsonify({"erro": "Gabarito não enviado"}), 400

    nome = request.form['nome']
    gabarito_str = request.form['gabarito'].upper()
    gabarito = list(gabarito_str)
    imagem = request.files['imagem']

    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        imagem.save(tmp.name)
        tmp_path = tmp.name

    resultado = corrigir_gabarito(tmp_path, gabarito)

    cv2.destroyAllWindows()
    os.unlink(tmp_path)

    if "erro" in resultado:
        return jsonify(resultado), 400

    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='gabicam'
        )
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO provas (nome_aluno, acertos, total_questoes, data_envio)
            VALUES (%s, %s, %s, %s)
        """, (
            nome,
            resultado['acertos'],
            resultado['total_questoes'],
            datetime.now()
        ))

        conn.commit()
    except Exception as e:
        return jsonify({"erro": "Erro ao salvar no banco de dados: " + str(e)}), 500
    finally:
        cursor.close()
        conn.close()


    #Simplifica o resultado obtido pelo gabarito

    return jsonify({
        "nome": nome,
        "acertos": resultado['acertos'],
        "data": datetime.now()
    }), 200




