# Servidor GabiCam

Este é o servidor backend para o aplicativo GabiCam.

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure o banco de dados MySQL:
- Crie um banco de dados chamado `gabicam_db`
- Execute o seguinte SQL para criar as tabelas:

```sql
CREATE DATABASE IF NOT EXISTS gabicam_db;
USE gabicam_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gabarito JSON,
    nota_por_questao DECIMAL(5,2) DEFAULT 1.00,
    media_geral FLOAT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS imagens_provas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prova_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nome_aluno VARCHAR(100) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendente', 'em_analise', 'corrigido') DEFAULT 'pendente',
    acertos INT DEFAULT 0,
    total_questoes INT DEFAULT 0,
    nota DECIMAL(4,2) DEFAULT 0.00,
    FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Triggers para atualizar a média geral da prova automaticamente
DELIMITER $$
CREATE TRIGGER atualizar_media_geral_after_insert
AFTER INSERT ON imagens_provas
FOR EACH ROW
BEGIN
  UPDATE provas
  SET media_geral = (
    SELECT AVG(nota)
    FROM imagens_provas
    WHERE prova_id = NEW.prova_id
  )
  WHERE id = NEW.prova_id;
END$$

CREATE TRIGGER atualizar_media_geral_after_update
AFTER UPDATE ON imagens_provas
FOR EACH ROW
BEGIN
  UPDATE provas
  SET media_geral = (
    SELECT AVG(nota)
    FROM imagens_provas
    WHERE prova_id = NEW.prova_id
  )
  WHERE id = NEW.prova_id;
END$$

CREATE TRIGGER atualizar_media_geral_after_delete
AFTER DELETE ON imagens_provas
FOR EACH ROW
BEGIN
  UPDATE provas
  SET media_geral = (
    SELECT AVG(nota)
    FROM imagens_provas
    WHERE prova_id = OLD.prova_id
  )
  WHERE id = OLD.prova_id;
END$$
DELIMITER ;

-- As triggers acima garantem que o campo media_geral da tabela provas estará sempre atualizado automaticamente sempre que um resultado for inserido, atualizado ou removido em imagens_provas. 