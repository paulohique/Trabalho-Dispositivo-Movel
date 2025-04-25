from flask import jsonify


def resposta_view(data):
    return jsonify(data)
