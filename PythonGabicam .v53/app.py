# app.py
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
import tempfile

# --- Configuração da Aplicação Flask ---
app = Flask(__name__)
DEBUG_FOLDER = 'debug_images'
os.makedirs(DEBUG_FOLDER, exist_ok=True)


# --- Funções Auxiliares de Processamento de Imagem ---

def ordenar_pontos(pontos):
    pontos_ret = np.zeros((4, 2), dtype="float32")
    soma = pontos.sum(axis=1)
    pontos_ret[0] = pontos[np.argmin(soma)]
    pontos_ret[2] = pontos[np.argmax(soma)]
    diff = np.diff(pontos, axis=1)
    pontos_ret[1] = pontos[np.argmin(diff)]
    pontos_ret[3] = pontos[np.argmax(diff)]
    return pontos_ret


def aplicar_perspectiva(imagem, pontos):
    pontos_ordenados = ordenar_pontos(pontos)

    (tl, tr, br, bl) = pontos_ordenados

    largura_A = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    largura_B = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    largura_max = max(int(largura_A), int(largura_B))

    altura_A = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    altura_B = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    altura_max = max(int(altura_A), int(altura_B))

    destino = np.array([
        [0, 0], [largura_max - 1, 0],
        [largura_max - 1, altura_max - 1], [0, altura_max - 1]
    ], dtype="float32")

    matriz = cv2.getPerspectiveTransform(pontos_ordenados, destino)
    imagem_warp = cv2.warpPerspective(imagem, matriz, (largura_max, altura_max))

    return imagem_warp


def processar_gabarito(filepath, gabarito_correto):
    """Processa a imagem e compara com o gabarito fornecido"""

    # Criar nome único para debug baseado no timestamp
    import time
    debug_prefix = f"debug_{int(time.time())}"

    imagem_original = cv2.imread(filepath)
    if imagem_original is None:
        return {"erro": "Não foi possível ler a imagem"}

    # Salvar imagem original
    cv2.imwrite(os.path.join(DEBUG_FOLDER, f'{debug_prefix}_01_original.png'), imagem_original)

    cinza = cv2.cvtColor(imagem_original, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(cinza, (5, 5), 0)
    binaria_inicial = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # Salvar imagem binária inicial
    cv2.imwrite(os.path.join(DEBUG_FOLDER, f'{debug_prefix}_02_binaria.png'), binaria_inicial)

    contornos, _ = cv2.findContours(binaria_inicial, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    candidatos_circulares = []
    for c in contornos:
        area = cv2.contourArea(c)
        (x, y, w, h) = cv2.boundingRect(c)
        aspect_ratio = w / float(h)
        if 100 < area < 20000 and 0.8 <= aspect_ratio <= 1.2:
            candidatos_circulares.append(c)

    if len(candidatos_circulares) < 4:
        return {"erro": f"Candidatos circulares insuficientes: {len(candidatos_circulares)} encontrados"}

    todos_os_centros = np.array(
        [[cv2.moments(c)['m10'] / cv2.moments(c)['m00'], cv2.moments(c)['m01'] / cv2.moments(c)['m00']] for c in
         candidatos_circulares if cv2.moments(c)['m00'] > 0],
        dtype="float32"
    )

    if len(todos_os_centros) < 4:
        return {"erro": "Não foi possível calcular o centro dos candidatos"}

    soma = todos_os_centros.sum(axis=1)
    indice_tl, indice_br = np.argmin(soma), np.argmax(soma)
    diff = np.diff(todos_os_centros, axis=1)
    indice_tr, indice_bl = np.argmin(diff), np.argmax(diff)

    pontos_np = np.array([todos_os_centros[indice_tl], todos_os_centros[indice_tr], todos_os_centros[indice_br],
                          todos_os_centros[indice_bl]], dtype="float32")

    gabarito_alinhado = aplicar_perspectiva(cinza, pontos_np)
    _, gabarito_binario = cv2.threshold(gabarito_alinhado, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Salvar gabarito alinhado
    cv2.imwrite(os.path.join(DEBUG_FOLDER, f'{debug_prefix}_03_alinhado.png'), gabarito_alinhado)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    gabarito_processado = cv2.dilate(gabarito_binario, kernel, iterations=1)
    gabarito_processado = cv2.morphologyEx(gabarito_processado, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Salvar gabarito processado
    cv2.imwrite(os.path.join(DEBUG_FOLDER, f'{debug_prefix}_04_processado.png'), gabarito_processado)

    # --- LÓGICA DE DETECÇÃO DE BOLHAS ---
    contornos_bolhas, _ = cv2.findContours(gabarito_processado.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidatos_bolhas = []
    if contornos_bolhas:
        for c in contornos_bolhas:
            (x, y, w, h) = cv2.boundingRect(c)
            area = cv2.contourArea(c)
            if area > 150 and w > 8 and h > 8 and 0.5 <= (w / h) <= 2.0:
                candidatos_bolhas.append(c)

    if len(candidatos_bolhas) < 50:
        candidatos_bolhas = []
        for c in contornos_bolhas:
            (x, y, w, h) = cv2.boundingRect(c)
            area = cv2.contourArea(c)
            if area > 100 and w > 5 and h > 5:
                candidatos_bolhas.append(c)

    if len(candidatos_bolhas) < 50:
        return {"erro": f"Não foi possível identificar as 50 bolhas. Encontradas: {len(candidatos_bolhas)}"}

    candidatos_bolhas.sort(key=cv2.contourArea, reverse=True)
    bolhas_finais = candidatos_bolhas[:50]

    info_bolhas = []
    for c in bolhas_finais:
        (x, y, w, h) = cv2.boundingRect(c)
        cx = x + w // 2
        cy = y + h // 2
        info_bolhas.append({'contorno': c, 'x': x, 'y': y, 'cx': cx, 'cy': cy, 'w': w, 'h': h})

    info_bolhas.sort(key=lambda b: (b['cy'], b['cx']))

    altura_media = np.mean([b['h'] for b in info_bolhas])
    limiar_y = altura_media * 0.8

    linhas = []
    linha_atual = [info_bolhas[0]]
    y_referencia = info_bolhas[0]['cy']

    for i in range(1, len(info_bolhas)):
        bolha = info_bolhas[i]
        if abs(bolha['cy'] - y_referencia) > limiar_y:
            linha_atual.sort(key=lambda b: b['cx'])
            linhas.append(linha_atual)
            linha_atual = [bolha]
            y_referencia = bolha['cy']
        else:
            linha_atual.append(bolha)

    linha_atual.sort(key=lambda b: b['cx'])
    linhas.append(linha_atual)

    if len(linhas) > 10:
        linhas = linhas[:10]
    elif len(linhas) < 10:
        while len(linhas) < 10:
            linhas.append([])

    respostas_detectadas = []
    mapa_alternativas = {0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E'}

    # Criar imagem de debug para análise
    debug_analise = cv2.cvtColor(gabarito_processado, cv2.COLOR_GRAY2BGR)

    for i in range(10):
        if i < len(linhas) and len(linhas[i]) >= 5:
            linha_bolhas = linhas[i][:5]
            pixels_nao_zeros = []

            for j, info in enumerate(linha_bolhas):
                bolha = info['contorno']
                mascara = np.zeros(gabarito_processado.shape, dtype="uint8")
                cv2.drawContours(mascara, [bolha], -1, 255, -1)
                regiao = cv2.bitwise_and(gabarito_processado, gabarito_processado, mask=mascara)
                contagem = cv2.countNonZero(regiao)
                pixels_nao_zeros.append(contagem)

                # Adicionar contagem na imagem de debug
                cv2.putText(debug_analise, str(contagem),
                            (info['x'], info['y'] - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            if pixels_nao_zeros:
                maior_contagem = max(pixels_nao_zeros)
                media_pixels = np.mean(pixels_nao_zeros)
                limiar_marcacao = max(400, media_pixels * 1.5)

                if maior_contagem > limiar_marcacao:
                    indice_marcado = pixels_nao_zeros.index(maior_contagem)
                    respostas_detectadas.append(mapa_alternativas.get(indice_marcado, "?"))

                    # Marcar a bolha selecionada com retângulo vermelho
                    info_selecionada = linha_bolhas[indice_marcado]
                    cv2.rectangle(debug_analise,
                                  (info_selecionada['x'], info_selecionada['y']),
                                  (info_selecionada['x'] + info_selecionada['w'],
                                   info_selecionada['y'] + info_selecionada['h']),
                                  (0, 0, 255), 2)
                else:
                    respostas_detectadas.append("?")
            else:
                respostas_detectadas.append("?")
        else:
            respostas_detectadas.append("?")

    # Salvar imagem de análise com as respostas detectadas
    cv2.imwrite(os.path.join(DEBUG_FOLDER, f'{debug_prefix}_05_analise_respostas.png'), debug_analise)

    # Calcular acertos
    acertos = 0
    for i in range(min(len(gabarito_correto), len(respostas_detectadas))):
        if respostas_detectadas[i] == gabarito_correto[i]:
            acertos += 1

    return {
        "respostas_detectadas": respostas_detectadas,
        "gabarito": gabarito_correto,
        "acertos": acertos,
        "total_questoes": len(gabarito_correto),
        "percentual_acerto": round((acertos / len(gabarito_correto)) * 100, 2)
    }


# --- Rota da API ---

@app.route('/corrigir', methods=['POST'])
def corrigir():
    """Endpoint para corrigir gabarito"""

    # Validar entrada
    if 'imagem' not in request.files:
        return jsonify({"erro": "Imagem não enviada"}), 400

    if 'gabarito' not in request.form:
        return jsonify({"erro": "Gabarito não enviado"}), 400

    # Processar gabarito
    gabarito_str = request.form['gabarito'].upper().strip()
    gabarito = list(gabarito_str)

    if len(gabarito) != 10:
        return jsonify({"erro": "O gabarito deve ter exatamente 10 respostas"}), 400

    # Validar que todas as respostas são A, B, C, D ou E
    for resposta in gabarito:
        if resposta not in ['A', 'B', 'C', 'D', 'E']:
            return jsonify({"erro": f"Resposta inválida: {resposta}. Use apenas A, B, C, D ou E"}), 400

    # Salvar imagem temporariamente
    imagem = request.files['imagem']
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        imagem.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Processar gabarito
        resultado = processar_gabarito(tmp_path, gabarito)

        # Garantir que o OpenCV liberou recursos
        cv2.destroyAllWindows()

        # Remover arquivo temporário
        os.unlink(tmp_path)

        # Retornar resultado
        if "erro" in resultado:
            return jsonify(resultado), 400

        return jsonify(resultado), 200

    except Exception as e:
        # Limpar em caso de erro
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return jsonify({"erro": f"Erro ao processar imagem: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health():
    """Endpoint para verificar se a API está funcionando"""
    return jsonify({"status": "ok", "message": "API de correção de gabarito funcionando"}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)