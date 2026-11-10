DROP DATABASE IF EXISTS saepvision;
CREATE DATABASE saepvision CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saepvision;

CREATE TABLE tb_usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  nome_usuario VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  imagem_usuario VARCHAR(255) NOT NULL,
  tipo ENUM('usuario','fotografo') NOT NULL DEFAULT 'usuario',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE tb_publicacao (
  id_publicacao INT AUTO_INCREMENT PRIMARY KEY,
  titulo_imagem VARCHAR(150) NOT NULL,
  local_foto VARCHAR(150) NOT NULL,
  id_usuario INT NOT NULL,
  url_fotografia VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tb_curtida (
  id_curtida INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_publicacao INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_curtida (id_usuario, id_publicacao),
  FOREIGN KEY (id_usuario) REFERENCES tb_usuario(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_publicacao) REFERENCES tb_publicacao(id_publicacao) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Dados do arquivo tb_usuario.csv
INSERT INTO tb_usuario (id_usuario,nome,nome_usuario,email,senha,imagem_usuario,tipo,created_at,updated_at) VALUES
(1,'fotografo1','fotografo_1','fotografo1@email.com','123456','fotografo1.jpg','fotografo','2025-03-25 12:40:08','2025-03-25 12:40:08'),
(2,'fotografo2','fotografo_2','fotografo2@gmail.com','123456','fotografo2.jpg','fotografo','2025-03-25 12:42:56','2025-03-25 12:42:56'),
(3,'fotografo3','fotografo_3','fotografo3@gmail.com','123456','fotografo3.jpg','fotografo','2025-03-25 12:45:44','2025-03-25 12:45:44'),
(4,'usuario1','usuario_1','usuario1@gmail.com','123456','usuario1.jpg','usuario','2025-03-25 12:48:32','2025-03-25 12:48:32'),
(5,'usuario2','usuario_2','usuario2@gmail.com','123456','usuario2.jpg','usuario','2025-03-25 12:51:20','2025-03-25 12:51:20'),
(6,'usuario3','usuario_3','usuario3@gmail.com','123456','usuario3.jpg','usuario','2025-03-25 12:54:08','2025-03-25 12:54:08');

INSERT INTO tb_publicacao (titulo_imagem,local_foto,id_usuario,url_fotografia) VALUES
('Foto 1','Rio de Janeiro',1,'fotografias/foto1.jpg'),
('Foto 2','Salvador',1,'fotografias/foto2.jpg'),
('Foto 3','São Paulo',1,'fotografias/foto3.jpg'),
('Foto 4','Recife',2,'fotografias/foto4.jpg'),
('Foto 5','Florianópolis',2,'fotografias/foto5.jpg'),
('Foto 6','Brasília',2,'fotografias/foto6.jpg'),
('Foto 7','Manaus',3,'fotografias/foto7.jpg'),
('Foto 8','Fortaleza',3,'fotografias/foto8.jpg'),
('Foto 9','Curitiba',3,'fotografias/foto9.jpg');

INSERT INTO tb_curtida (id_usuario,id_publicacao) VALUES
(4,1),(5,1),(6,1),(2,1),(4,2),(5,3),(1,4),(4,4),(6,5),(5,7),(4,8),(3,9);
