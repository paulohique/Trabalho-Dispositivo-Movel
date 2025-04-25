from flask import Flask, request, jsonify
import cv2
import numpy as np
import tempfile
import os
from Keys.apiKeys import verificar_api_key

app = Flask(__name__)

# === Função para processar imagem e verificar acertos ===
def corrigir_gabarito(image_path, gabarito):
    image = cv2.imread(image_path)
    if image is None:
        return {"erro": "Imagem não encontrada"}

    original = image.copy()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    gabarito_contorno = None
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            gabarito_contorno = approx
            break

    if gabarito_contorno is None:
        return {"erro": "Contorno do gabarito não encontrado"}

    x, y, w, h = cv2.boundingRect(gabarito_contorno)
    roi = thresh[y:y+h, x:x+w]
    roi_color = original[y:y+h, x:x+w]

    cnts, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bubble_contours = []

    for c in cnts:
        bx, by, bw, bh = cv2.boundingRect(c)
        aspect_ratio = bw / float(bh)
        if 15 < bw < 50 and 15 < bh < 50 and 0.8 < aspect_ratio < 1.2:
            bubble_contours.append(c)

    def sort_contours(cnts, rows=10, cols=5):
        cnts = sorted(cnts, key=lambda c: cv2.boundingRect(c)[1])
        grid = []
        for i in range(0, len(cnts), cols):
            row = sorted(cnts[i:i + cols], key=lambda c: cv2.boundingRect(c)[0])
            if len(row) == cols:
                grid.append(row)
        return grid

    grid = sort_contours(bubble_contours)
    respostas = []

    for row in grid:
        max_val = 0
        marcada = None
        for idx, c in enumerate(row):
            mask = np.zeros(roi.shape, dtype="uint8")
            cv2.drawContours(mask, [c], -1, 255, -1)
            total = cv2.countNonZero(cv2.bitwise_and(roi, roi, mask=mask))

            if total > max_val:
                max_val = total
                marcada = idx

        respostas.append(chr(ord('A') + marcada) if marcada is not None else '?')

    acertos = 0
    for i in range(len(gabarito)):
        if i < len(respostas) and respostas[i] == gabarito[i]:
            acertos += 1

    return {
        "respostas_detectadas": respostas,
        "gabarito": gabarito,
        "acertos": acertos,
        "total_questoes": len(gabarito)
    }

# === Rota principal ===
@app.route('/corrigir', methods=['POST'])
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


@app.before_request
def validar_api_key():
    resultado = verificar_api_key()
    if resultado:
        return resultado



if __name__ == '__main__':
    app.run(debug=True)