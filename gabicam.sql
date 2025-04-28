-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 29/04/2025 às 01:07
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `gabicam`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `api_keys`
--

CREATE TABLE `api_keys` (
  `id` int(11) NOT NULL,
  `chave` varchar(255) NOT NULL,
  `ativa` tinyint(1) DEFAULT 1,
  `usos_restantes` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `api_keys`
--

INSERT INTO `api_keys` (`id`, `chave`, `ativa`, `usos_restantes`) VALUES
(1, 'minha-chave-secreta-123', 1, 5),
(2, 'chave-expira-rapido', 1, 2);

-- --------------------------------------------------------

--
-- Estrutura para tabela `provas`
--

CREATE TABLE `provas` (
  `id` int(11) NOT NULL,
  `nome_aluno` varchar(255) NOT NULL,
  `acertos` int(11) NOT NULL,
  `total_questoes` int(11) NOT NULL,
  `data_envio` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `provas`
--

INSERT INTO `provas` (`id`, `nome_aluno`, `acertos`, `total_questoes`, `data_envio`) VALUES
(4, 'João Da Silva', 10, 10, '2025-04-25 19:52:04'),
(5, 'João Da Silva', 10, 10, '2025-04-25 19:54:59'),
(6, 'João Da Silva', 10, 10, '2025-04-25 20:26:21'),
(7, 'João Da Silva', 10, 10, '2025-04-28 20:05:17');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `api_keys`
--
ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chave` (`chave`);

--
-- Índices de tabela `provas`
--
ALTER TABLE `provas`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `provas`
--
ALTER TABLE `provas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
