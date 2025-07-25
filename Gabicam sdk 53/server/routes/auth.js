const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/config');

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { matricula, senha } = req.body;

    // Buscar usuário
    const [users] = await db.query('SELECT * FROM usuarios WHERE matricula = ?', [matricula]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    // Remover senha do objeto de resposta
    const { senha: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const { matricula, nome, senha } = req.body;

    // Verificar se usuário já existe
    const [existingUsers] = await db.query('SELECT * FROM usuarios WHERE matricula = ?', [matricula]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Matrícula já cadastrada' });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir novo usuário
    await db.query(
      'INSERT INTO usuarios (matricula, nome, senha) VALUES (?, ?, ?)',
      [matricula, nome, hashedPassword]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 