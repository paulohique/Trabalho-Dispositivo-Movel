const mysql = require('mysql2/promise');

console.log('Iniciando configuração do banco de dados...');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gabicam_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Testar conexão
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  });

module.exports = pool; 