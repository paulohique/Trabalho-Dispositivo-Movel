from flask import Flask, request, jsonify
import cv2
import numpy as np
import tempfile
import os

app = Flask(__name__)

# === Função de correção de perspectiva ===
def four_point_transform(image, pts):
    pts = pts.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))

    return warped

# === Função aprimorada para corrigir gabarito ===
def corrigir_gabarito_v2(image_path, gabarito):
    image = cv2.imread(image_path)
    if image is None:
        return {"erro": "Imagem não encontrada"}

    original = image.copy()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    morph = cv2.morphologyEx(adaptive, cv2.MORPH_CLOSE, kernel, iterations=2)

    cnts, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    gabarito_contorno = None
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)
        if len(approx) == 4:
            gabarito_contorno = approx
            break

    if gabarito_contorno is None:
        return {"erro": "Contorno do gabarito não encontrado"}

    warped_color = four_point_transform(original, gabarito_contorno)
    warped_gray = cv2.cvtColor(warped_color, cv2.COLOR_BGR2GRAY)
    warped_thresh = cv2.adaptiveThreshold(
        warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )

    cnts, _ = cv2.findContours(warped_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bubble_contours = []

    for c in cnts:
        area = cv2.contourArea(c)
        perimeter = cv2.arcLength(c, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * (area / (perimeter * perimeter))
        if 100 < area < 1500 and 0.7 < circularity < 1.3:
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
        valores = []
        for idx, c in enumerate(row):
            mask = np.zeros(warped_thresh.shape, dtype="uint8")
            cv2.drawContours(mask, [c], -1, 255, -1)
            total = cv2.countNonZero(cv2.bitwise_and(warped_thresh, warped_thresh, mask=mask))
            valores.append((idx, total))

        valores.sort(key=lambda x: x[1], reverse=True)

        if len(valores) == 0 or valores[0][1] < 100:
            respostas.append('?')
        elif len(valores) == 1 or valores[0][1] > valores[1][1] * 1.5:
            respostas.append(chr(ord('A') + valores[0][0]))
        else:
            respostas.append('?')

    acertos = sum(1 for i in range(len(gabarito)) if i < len(respostas) and respostas[i] == gabarito[i])

    # Debug (opcional)
    debug_img = warped_color.copy()
    cv2.drawContours(debug_img, [c for row in grid for c in row], -1, (0, 255, 0), 1)
    cv2.imwrite("debug_corrigido.jpg", debug_img)

    return {
        "respostas_detectadas": respostas,
        "gabarito": gabarito,
        "acertos": acertos,
        "total_questoes": len(gabarito)
    }

# === Endpoint principal ===
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

    resultado = corrigir_gabarito_v2(tmp_path, gabarito)

    cv2.destroyAllWindows()
    os.unlink(tmp_path)

    return jsonify(resultado)

# === Execução local ===
if __name__ == '__main__':
    app.run(debug=True)
