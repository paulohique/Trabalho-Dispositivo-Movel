# Bem-vindo ao GabiCam

Este é um projeto [Expo](https://expo.dev) criado com [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

O **GabiCam** é um aplicativo React Native para capturar, corrigir e gerenciar provas escolares de forma automatizada, utilizando reconhecimento óptico de marcação (OCR).

---

## Novidades e Características

- **Login**: Login com funcionamento rapido e facil com entrada com matricula e senha criptografada.
- **Thumbnails persistentes**: As miniaturas das provas são salvas e exibidas corretamente mesmo após fechar e reabrir o app.
- **Gerenciamento local**: Todo o armazenamento de provas, imagens e resultados é feito localmente usando AsyncStorage e FileSystem, sem dependência de nuvem.
- **Fluxo completo de correção**: Crie provas, cadastre gabaritos, capture fotos, corrija automaticamente e visualize resultados, tudo em poucos toques.
- **Configurações avançadas**: Limpe provas, imagens ou todos os dados do app facilmente pela tela de configurações.
- **Interface moderna**: Ícones, cores e fontes padronizadas para uma experiência agradável.

---

## Características Técnicas

- **React Native + Expo**: Projeto criado com Expo, facilitando o desenvolvimento multiplataforma (Android, iOS e Web).
- **Roteamento por arquivos**: Utiliza o Expo Router para navegação baseada em arquivos.
- **Persistência local**: Usa AsyncStorage para dados estruturados e Expo FileSystem para imagens.
- **OCR via API externa**: O reconhecimento das respostas é feito por uma API de OCR customizada.
- **Componentização**: Telas e componentes reutilizáveis, como o HeaderPadrao.
- **Estilo e UI**: Utiliza StyleSheet do React Native, ícones Feather e LinearGradient para visuais modernos.
- **Sem dependências de nuvem**: Não utiliza Firebase, Google Cloud ou outros serviços externos para autenticação ou storage.
- **Pronto para integração futura**: Resultados podem ser salvos na nuvem para exportação em Excel ou visualização em dashboards.

---

## URLs e Endpoints para Configuração

Para que o app funcione corretamente, você deve configurar a URL da API de correção OCR. Procure pelas seguintes linhas nos arquivos de tela:

```typescript
const API_URL = 'http://sua-url-api:5000/corrigir';
```

**Arquivos onde você deve alterar a URL:**
- `app/(tabs)/CorrecaoScreen.tsx`
- `app/(tabs)/TesteScreen.tsx`
- (Se houver outros arquivos que usam OCR, procure por `API_URL`)

**O que a API deve aceitar:**
- Receber uma imagem (formato JPEG recomendado) e o gabarito da prova.
- Retornar um JSON com os campos: `acertos`, `total`, `nota`, `respostas_detectadas`.

**Exemplo de payload enviado:**
```json
{
  "imagem": <arquivo>,
  "gabarito": "ABCDEABCDE"
}
```

**Exemplo de resposta esperada:**
```json
{
  "acertos": 8,
  "total": 10,
  "nota": 8.0,
  "respostas_detectadas": ["A", "B", "C", ...]
}
```

Se você quiser salvar resultados na nuvem futuramente, basta implementar endpoints adicionais na sua API e adaptar as funções de salvamento do app.

---

## Fluxo do Usuário

1. **Login**
   - Acesso rápido com login (apenas um clique para entrar).

2. **Tela Inicial**
   - Quatro botões principais: Criar Prova, Tirar Foto, Corrigir Provas, Configurações.

3. **Criar Prova**
   - Informe o nome da prova e crie um novo gabarito.
   - Cadastre as respostas corretas (A, B, C, D, E) para cada questão.

4. **Capturar Foto**
   - Selecione a prova e o nome do aluno.
   - Use a câmera ou galeria para capturar a folha de respostas.
   - As imagens são salvas localmente e associadas à prova.

5. **Corrigir Provas**
   - Veja todas as provas e suas imagens associadas.
   - Inicie a correção automática (OCR) e visualize nota, acertos e detalhes.
   - Salve os resultados e veja o histórico de correções.
   - Salvar os resultados para que seja persistido na nuvem e futuramente tratado em excel e interfaces visuais.

6. **Configurações**
   - Limpe provas, imagens ou todos os dados do app.
   - Acesse funções de teste e depuração.

---

## Funcionalidades Detalhadas

- **Criação de Provas**: Crie quantas provas quiser, cada uma com seu próprio gabarito.
- **Cadastro de Gabarito**: Defina as respostas corretas de cada questão de forma simples e visual.
- **Captura de Imagens**: Use a câmera do dispositivo ou selecione imagens da galeria. As imagens são salvas de forma persistente.
- **Correção Automática**: O app envia a imagem para uma API de OCR, que retorna os acertos, nota e detalhes da correção.
- **Visualização de Resultados**: Veja o histórico de correções, notas e estatísticas de cada prova/aluno.
- **Gerenciamento de Dados**: Limpe provas, imagens ou todos os dados do app facilmente.
- **Thumbnails Persistentes**: As miniaturas das provas são exibidas mesmo após fechar e reabrir o app.
- **Header Padronizado**: Navegação consistente em todas as telas.

---

## Armazenamento de Dados

- **AsyncStorage**: Armazena informações de provas, gabaritos e resultados.
- **FileSystem**: Armazena imagens capturadas de forma persistente.
- **Chaves de armazenamento:**
  - `@GabaritoApp:provas` - Provas, gabaritos e caminhos das imagens
  - `@GabaritoApp:imagens` - Imagens capturadas e resultados das correções
- Utilitários em `app/utils/storageUtils.ts` para facilitar operações de leitura, escrita e limpeza.

---

## FAQ

**1. Preciso de internet para usar o app?**
- Apenas para a etapa de correção automática (OCR). As demais funções funcionam offline.

**2. As imagens das provas somem quando fecho o app?**
- Não! As imagens são salvas de forma persistente no dispositivo.

**3. Posso usar em mais de um dispositivo?**
- Os dados são locais. Para sincronização entre dispositivos, seria necessário implementar uma API própria.

**4. O app usa Firebase?**
- Não. Toda a lógica de autenticação e armazenamento é local.

**5. Como limpar todos os dados?**
- Use a tela de configurações para limpar provas, imagens ou todos os dados do app.

---

## Como Iniciar o Projeto

### 1. Iniciar o App Mobile (Expo)

No diretório raiz do projeto, execute:
```bash
npm install
npx expo start
```
- Use o QR Code para abrir no seu dispositivo com o Expo Go, ou escolha rodar no emulador Android/iOS.

### 2. Iniciar o Backend Node.js (Server)

Se o projeto possuir um backend Node.js (por exemplo, para autenticação, provas, etc), acesse a pasta `server` e rode:
```bash
cd server
npm install
npm start
```
- O servidor geralmente roda em `http://localhost:5000` ou porta definida no código.

### 3. Iniciar a API Flask (OCR - app.py)

Se você utiliza uma API Flask para OCR, acesse a pasta onde está o `app.py` e rode:
```bash
cd <gabarito-ocr>
# (Recomenda-se usar um ambiente virtual Python)
# python -m venv venv
# source venv/bin/activate  (Linux/macOS)
# venv\Scripts\activate  (Windows)
pip install -r requirements.txt
python app.py
```
- Por padrão, a API Flask roda em `http://localhost:5000` ou na porta definida em `app.py`.
- Certifique-se de que a porta da API Flask não conflita com a do backend Node.js.

### 4. Configurar URLs no App

No código do app, altere as variáveis `API_URL` para apontar para o endereço correto da sua API Flask (OCR) e, se necessário, do backend Node.js.

---