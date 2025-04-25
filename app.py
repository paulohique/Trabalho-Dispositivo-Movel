from flask import Flask
from Controllers.corrigir_controller import validar_api_key, corrigir

app = Flask(__name__)

@app.route('/corrigir', methods=['POST'])
def corrigir_view():
    return corrigir()

@app.before_request
def before_request():
    return validar_api_key()

if __name__ == '__main__':
    app.run(debug=True)
