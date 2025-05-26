from flask import Flask, request, jsonify
import cv2
import numpy as np
import tempfile
import os
from math import sqrt, atan2, degrees

app = Flask(__name__)


class GabaritoProcessor:
    def __init__(self):
        self.min_contour_area = 50
        self.max_contour_area = 2000
        self.reference_points = []

    def encontrar_pontos_referencia(self, image):
        """
        Encontra pontos pretos de referência na imagem para alinhamento
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Threshold mais agressivo para detectar pontos pretos
        _, thresh = cv2.threshold(gray, 80, 255, cv2.THRESH_BINARY_INV)

        # Operações morfológicas para limpar a imagem
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # Encontrar contornos
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filtrar contornos circulares (pontos de referência) - PARÂMETROS AJUSTADOS
        pontos_referencia = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if 100 < area < 1500:  # Área maior para pontos maiores
                # Verificar se é aproximadamente circular
                perimeter = cv2.arcLength(contour, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    if circularity > 0.6:  # Bem circular
                        # Verificar tamanho mínimo
                        x, y, w, h = cv2.boundingRect(contour)
                        if min(w, h) > 10:  # Tamanho mínimo
                            # Calcular centro do contorno
                            M = cv2.moments(contour)
                            if M["m00"] != 0:
                                cx = int(M["m10"] / M["m00"])
                                cy = int(M["m01"] / M["m00"])
                                pontos_referencia.append((cx, cy))

        print(f"Pontos de referência detectados: {len(pontos_referencia)}")

        # Ordenar pontos: top-left, top-right, bottom-left, bottom-right
        if len(pontos_referencia) >= 4:
            pontos_referencia = sorted(pontos_referencia, key=lambda p: p[1])  # Por Y
            top_points = sorted(pontos_referencia[:2], key=lambda p: p[0])  # Top por X
            bottom_points = sorted(pontos_referencia[-2:], key=lambda p: p[0])  # Bottom por X

            return [top_points[0], top_points[1], bottom_points[0], bottom_points[1]]

        return []

    def corrigir_perspectiva(self, image, pontos_ref):
        """
        Corrige a perspectiva da imagem usando os pontos de referência
        """
        if len(pontos_ref) != 4:
            return image

        # Pontos de origem (detectados na imagem)
        src_points = np.array(pontos_ref, dtype=np.float32)

        # Calcular dimensões do retângulo destino
        width = max(
            np.linalg.norm(np.array(pontos_ref[1]) - np.array(pontos_ref[0])),
            np.linalg.norm(np.array(pontos_ref[3]) - np.array(pontos_ref[2]))
        )
        height = max(
            np.linalg.norm(np.array(pontos_ref[2]) - np.array(pontos_ref[0])),
            np.linalg.norm(np.array(pontos_ref[3]) - np.array(pontos_ref[1]))
        )

        # Pontos de destino (retângulo perfeito)
        dst_points = np.array([
            [0, 0],
            [width, 0],
            [0, height],
            [width, height]
        ], dtype=np.float32)

        # Calcular matriz de transformação
        matrix = cv2.getPerspectiveTransform(src_points, dst_points)

        # Aplicar correção de perspectiva
        corrected = cv2.warpPerspective(image, matrix, (int(width), int(height)))

        return corrected

    def preprocessar_imagem(self, image):
        """
        Aplica pré-processamento avançado na imagem
        """
        # Converter para escala de cinza
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Equalização de histograma adaptativa
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Filtro bilateral para reduzir ruído mantendo bordas
        filtered = cv2.bilateralFilter(enhanced, 9, 75, 75)

        # Gaussian blur suave
        blurred = cv2.GaussianBlur(filtered, (3, 3), 0)

        # Threshold adaptativo
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Operações morfológicas para limpar
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)

        return cleaned

    def detectar_grade_questoes(self, image, num_questoes=10, num_alternativas=5):
        """
        Detecta automaticamente a grade de questões no formato tradicional
        """
        processed = self.preprocessar_imagem(image)

        # Encontrar contornos
        contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filtrar contornos que podem ser bolhas de resposta
        bubble_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            # Ajustar range para detectar círculos maiores do gabarito tradicional
            if 80 < area < 1200:  # Range maior para círculos de 24px
                # Verificar formato circular
                perimeter = cv2.arcLength(contour, True)
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    if circularity > 0.3:  # Mais tolerante para círculos
                        x, y, w, h = cv2.boundingRect(contour)
                        aspect_ratio = w / float(h)
                        # Mais tolerante para formas circulares
                        if 0.4 < aspect_ratio < 1.6 and min(w, h) > 12:  # Tamanho mínimo maior
                            bubble_contours.append(contour)

        if len(bubble_contours) < num_questoes * num_alternativas * 0.7:
            print(f"Poucos círculos detectados: {len(bubble_contours)}")
            return []

        # Organizar contornos em grade baseado no layout tradicional
        bubbles_with_pos = []
        for contour in bubble_contours:
            x, y, w, h = cv2.boundingRect(contour)
            center_x = x + w // 2
            center_y = y + h // 2
            bubbles_with_pos.append((contour, center_x, center_y, area))

        # Agrupar por linhas (questões) com tolerância ajustada
        bubbles_with_pos.sort(key=lambda x: x[2])  # Ordenar por Y

        questoes = []
        tolerance = 25  # Tolerância menor para layout mais compacto

        i = 0
        while i < len(bubbles_with_pos) and len(questoes) < num_questoes:
            current_y = bubbles_with_pos[i][2]
            linha_atual = []

            # Coletar todas as bolhas na mesma linha
            while i < len(bubbles_with_pos) and abs(bubbles_with_pos[i][2] - current_y) < tolerance:
                linha_atual.append(bubbles_with_pos[i])
                i += 1

            # Ordenar por X (alternativas A, B, C, D, E)
            linha_atual.sort(key=lambda x: x[1])

            # Filtrar por proximidade horizontal (remover outliers)
            if len(linha_atual) >= num_alternativas:
                # Calcular espaçamento médio
                espacamentos = []
                for j in range(len(linha_atual) - 1):
                    espacamentos.append(linha_atual[j + 1][1] - linha_atual[j][1])

                if espacamentos:
                    espacamento_medio = np.median(espacamentos)
                    linha_filtrada = []

                    # Adicionar primeira bolha
                    linha_filtrada.append(linha_atual[0])

                    # Filtrar bolhas com espaçamento consistente
                    for j in range(1, len(linha_atual)):
                        if j < len(linha_atual):
                            dist_anterior = linha_atual[j][1] - linha_filtrada[-1][1]
                            if 0.5 * espacamento_medio < dist_anterior < 2.0 * espacamento_medio:
                                linha_filtrada.append(linha_atual[j])

                    # Adicionar se tiver exatamente 5 alternativas
                    if len(linha_filtrada) == num_alternativas:
                        questoes.append([bubble[0] for bubble in linha_filtrada])

        print(f"Questões detectadas: {len(questoes)}")
        return questoes

    def detectar_marcacao(self, image, contour):
        """
        Detecta se uma bolha está marcada usando múltiplas técnicas - AJUSTADO
        """
        # Criar máscara para a bolha
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        cv2.drawContours(mask, [contour], -1, 255, -1)

        # Extrair região da bolha
        x, y, w, h = cv2.boundingRect(contour)
        roi = image[y:y + h, x:x + w]
        mask_roi = mask[y:y + h, x:x + w]

        # Método 1: Contagem de pixels preenchidos
        filled_pixels = cv2.countNonZero(cv2.bitwise_and(roi, roi, mask=mask_roi))
        total_pixels = cv2.countNonZero(mask_roi)
        fill_ratio = filled_pixels / total_pixels if total_pixels > 0 else 0

        # Método 2: Análise de densidade central (área maior)
        center_x, center_y = w // 2, h // 2
        center_size = max(3, min(w, h) // 4)  # Área central proporcional
        center_region = roi[max(0, center_y - center_size):center_y + center_size,
                        max(0, center_x - center_size):center_x + center_size]
        center_density = np.mean(center_region) if center_region.size > 0 else 0

        # Método 3: Detecção de bordas internas
        edges = cv2.Canny(roi, 50, 150)
        edge_density = np.sum(edges) / (w * h)

        # Combinar critérios - AJUSTADO para círculos maiores
        is_marked = (
                fill_ratio > 0.25 or  # 25% preenchido (mais tolerante)
                center_density > 120 or  # Centro escuro
                (fill_ratio > 0.12 and center_density > 80)  # Combinação mais tolerante
        )

        return is_marked, fill_ratio

    def processar_gabarito(self, image_path, gabarito_correto):
        """
        Função principal para processar o gabarito
        """
        try:
            # Carregar imagem
            image = cv2.imread(image_path)
            if image is None:
                return {"erro": "Não foi possível carregar a imagem"}

            original = image.copy()

            # 1. Encontrar pontos de referência
            pontos_ref = self.encontrar_pontos_referencia(image)

            if len(pontos_ref) >= 4:
                # 2. Corrigir perspectiva
                image = self.corrigir_perspectiva(image, pontos_ref)
                print(f"Perspectiva corrigida usando {len(pontos_ref)} pontos de referência")
            else:
                print("Pontos de referência não encontrados, processando sem correção de perspectiva")

            # 3. Detectar grade de questões
            num_questoes = len(gabarito_correto)
            grade_questoes = self.detectar_grade_questoes(image, num_questoes, 5)

            if not grade_questoes:
                return {"erro": "Não foi possível detectar a grade de questões"}

            # 4. Processar cada questão
            respostas_detectadas = []
            confiancas = []

            processed_image = self.preprocessar_imagem(image)

            for i, questao in enumerate(grade_questoes):
                marcacoes = []
                for j, bolha in enumerate(questao):
                    is_marked, confidence = self.detectar_marcacao(processed_image, bolha)
                    marcacoes.append((j, confidence, is_marked))

                # Encontrar a alternativa com maior confiança de marcação
                marcacoes_validas = [m for m in marcacoes if m[2]]  # Apenas marcadas

                if marcacoes_validas:
                    # Pegar a com maior confiança
                    melhor_marcacao = max(marcacoes_validas, key=lambda x: x[1])
                    resposta = chr(ord('A') + melhor_marcacao[0])
                    confiancas.append(melhor_marcacao[1])
                else:
                    resposta = '?'  # Não detectou marcação
                    confiancas.append(0.0)

                respostas_detectadas.append(resposta)

            # 5. Calcular resultado
            acertos = 0
            detalhes = []

            for i in range(len(gabarito_correto)):
                if i < len(respostas_detectadas):
                    correto = respostas_detectadas[i] == gabarito_correto[i]
                    if correto:
                        acertos += 1

                    detalhes.append({
                        "questao": i + 1,
                        "detectada": respostas_detectadas[i],
                        "correta": gabarito_correto[i],
                        "acertou": correto,
                        "confianca": round(confiancas[i] if i < len(confiancas) else 0, 2)
                    })

            return {
                "respostas_detectadas": respostas_detectadas,
                "gabarito": gabarito_correto,
                "acertos": acertos,
                "total_questoes": len(gabarito_correto),
                "percentual": round((acertos / len(gabarito_correto)) * 100, 1),
                "detalhes": detalhes,
                "pontos_referencia_encontrados": len(pontos_ref) >= 4,
                "questoes_detectadas": len(grade_questoes)
            }

        except Exception as e:
            return {"erro": f"Erro durante o processamento: {str(e)}"}


# Instância global do processador
processor = GabaritoProcessor()


@app.route('/corrigir', methods=['POST'])
def corrigir():
    if 'imagem' not in request.files:
        return jsonify({"erro": "Imagem não enviada"}), 400

    if 'gabarito' not in request.form:
        return jsonify({"erro": "Gabarito não enviado"}), 400

    gabarito_str = request.form['gabarito'].upper()
    gabarito = list(gabarito_str)
    imagem = request.files['imagem']

    # Salvar imagem temporariamente
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    temp_filename = temp_file.name
    temp_file.close()

    try:
        imagem.save(temp_filename)
        resultado = processor.processar_gabarito(temp_filename, gabarito)
    finally:
        # Limpar arquivo temporário
        try:
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
        except Exception as e:
            print(f"Erro ao remover arquivo temporário: {e}")

    return jsonify(resultado)


@app.route('/', methods=['GET'])
def index():
    return """
    <html>
    <head>
        <title>API Avançada de Correção de Gabarito</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; text-align: center; }
            .info { background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            form { margin-top: 20px; background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
            label { display: block; margin-top: 15px; font-weight: bold; }
            input[type="file"], input[type="text"] { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 3px; }
            button { margin-top: 15px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 3px; font-size: 16px; }
            button:hover { background-color: #45a049; }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
            .feature { background-color: #f0f8ff; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
        </style>
    </head>
    <body>
        <h1>🎯 Sistema Avançado de Correção de Gabarito</h1>

        <div class="info">
            <h3>🚀 Melhorias Implementadas:</h3>
            <div class="features">
                <div class="feature">
                    <h4>📍 Pontos de Referência</h4>
                    <p>Detecta automaticamente pontos pretos na imagem para alinhamento preciso</p>
                </div>
                <div class="feature">
                    <h4>🔧 Correção de Perspectiva</h4>
                    <p>Corrige automaticamente distorções e inclinações da imagem</p>
                </div>
                <div class="feature">
                    <h4>🎯 Detecção Inteligente</h4>
                    <p>Algoritmo aprimorado para detectar marcações com maior precisão</p>
                </div>
                <div class="feature">
                    <h4>📊 Análise Detalhada</h4>
                    <p>Fornece confiança e detalhes sobre cada questão processada</p>
                </div>
            </div>
        </div>

        <form action="/corrigir" method="post" enctype="multipart/form-data">
            <label for="imagem">📷 Imagem do gabarito:</label>
            <input type="file" name="imagem" id="imagem" accept="image/*" required>
            <small>Dica: Para melhores resultados, inclua 4 pontos pretos nos cantos da área do gabarito</small>

            <label for="gabarito">✅ Gabarito correto (ex: ABCDEABCDE):</label>
            <input type="text" name="gabarito" id="gabarito" placeholder="Digite as respostas corretas..." required>
            <small>Use apenas letras A, B, C, D, E</small>

            <button type="submit">🔍 Analisar Gabarito</button>
        </form>

        <div class="info">
            <h3>📋 Como usar:</h3>
            <ol>
                <li>Tire uma foto do gabarito preenchido</li>
                <li>Se possível, marque 4 pontos pretos nos cantos da área de questões</li>
                <li>Digite o gabarito correto (apenas letras A-E)</li>
                <li>Clique em "Analisar Gabarito" para ver os resultados</li>
            </ol>
        </div>
    </body>
    </html>
    """


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)