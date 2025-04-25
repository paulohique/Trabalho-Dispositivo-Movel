from flask import request, jsonify
import tempfile
import os
import cv2
from Models.gabarito_model import corrigir_gabarito
from Models.api_key_model import verificar_api_key


#Correção da Prova
def corrigir():
    if 'imagem' not in request.files:
        return jsonify({"erro": "Imagem não enviada"}), 400

    if 'gabarito' not in request.form:
        return jsonify({"erro": "Gabarito não enviado"}), 400

    gabarito_str = request.form['gabarito'].upper()
    gabarito = list(gabarito_str)

    imagem = request.files['imagem']
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        imagem.save(tmp.name)
        tmp_path = tmp.name

    resultado = corrigir_gabarito(tmp_path, gabarito)

    # Garante que o OpenCV liberou qualquer recurso
    cv2.destroyAllWindows()
    os.unlink(tmp_path)

    return jsonify(resultado)

def validar_api_key():
    resultado = verificar_api_key()
    if resultado:
        return resultado
