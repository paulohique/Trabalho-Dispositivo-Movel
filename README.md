
# 📘 API de Correção de Gabaritos - Gabicam

A **Gabicam** é uma API desenvolvida em Python com Flask que realiza a **correção automática de gabaritos a partir de imagens** enviadas via formulário. Ideal para digitalizar e corrigir provas objetivas de forma automatizada.

---

## 🚀 Como funciona

Você envia uma imagem do gabarito preenchido (com marcações feitas, por exemplo, por alunos) e uma string com o gabarito oficial. A API detecta as respostas marcadas e retorna:

- Respostas detectadas
- Gabarito enviado
- Quantidade de acertos
- Total de questões

---

## 📦 Requisitos

- Python 3.8+
- Pip

## 🛠️ Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/paulohique/Trabalho-Dispositivo-Movel.git
cd Trabalho-Dispositivo-Movel
pip install -r requirements.txt
```

Crie o arquivo `requirements.txt` com:

```
flask
opencv-python
numpy
flasgger
```

---

## ▶️ Executando a API

```bash
python app.py
```

A API estará acessível em: `http://localhost:5000`

Acesse a documentação Swagger em: [http://localhost:5000/apidocs](http://localhost:5000/apidocs)

---

## 📩 Endpoint

### `POST /corrigir`

Corrige uma imagem de gabarito enviada via formulário.

#### 🔸 Formulário (`multipart/form-data`):

| Parâmetro | Tipo    | Obrigatório | Descrição                                  |
|-----------|---------|-------------|--------------------------------------------|
| imagem    | Arquivo | Sim         | Imagem com as respostas marcadas (JPG/PNG) |
| gabarito  | Texto   | Sim         | Ex: `ABCDEACDAB`                           |

#### 🔹 Exemplo de resposta (HTTP 200):

```json
{
  "respostas_detectadas": ["A", "B", "C", "D", "E", "A", "C", "D", "A", "B"],
  "gabarito": ["A", "B", "C", "D", "E", "A", "C", "D", "A", "B"],
  "acertos": 10,
  "total_questoes": 10
}
```

#### 🔸 Resposta de erro (HTTP 400):

```json
{ "erro": "Imagem não enviada" }
```

---

## 📚 Documentação Swagger

Você pode visualizar e testar a API através da interface Swagger em:

📎 [`http://localhost:5000/apidocs`](http://localhost:5000/apidocs)

---

## 🧠 Tecnologias Utilizadas

- Python
- Flask
- OpenCV
- Flasgger (Swagger UI)
- NumPy

---

## 📌 TODO

- [ ] Adicionar suporte a múltiplas folhas
- [ ] Validação visual do gabarito
- [ ] Deploy em nuvem com render/heroku/vercel

---

## 👨‍💻 Autor

Feito com 💻 por [Paulo Henrique e Matheus Bomtempo](https://github.com/paulohique)
