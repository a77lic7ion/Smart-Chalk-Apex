CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE content (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  curriculum VARCHAR(255),
  standard VARCHAR(255),
  grade VARCHAR(255),
  subject VARCHAR(255),
  sourceId VARCHAR(255),
  createdAt BIGINT
);

INSERT INTO users (email, password) VALUES ('Admin@smartchalk.co.za', 'password');