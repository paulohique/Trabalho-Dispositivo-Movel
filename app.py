from flask import Flask
from Controllers.corrigir_controller import validar_api_key, corrigir
from Models.prova_model import submeter_prova

app = Flask(__name__)

#Corrigir apenas a prova, sem "nome".
@app.route('/corrigir', methods=['POST'])
def corrigir_view():
    return corrigir()


@app.before_request
def before_request():
    return validar_api_key()

#Chamada API para corrigir com o "nome", e "Data" persistindo no BD.
@app.route('/submeter_prova', methods=['POST'])
def submeter_view():
    return submeter_prova()


if __name__ == '__main__':
    app.run(debug=True)
