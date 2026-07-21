# Pixel Breeders - MVP

MVP da interface de busca e avaliação de filmes usando TMDB, com backend em Python, frontend em React + TypeScript e execução via Docker.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI
- Banco de dados: PostgreSQL no Docker, com fallback local em SQLite para desenvolvimento sem Docker
- Infraestrutura: Docker Compose

## Funcionalidades implementadas

- Busca de filmes via API do TMDB
- Listagem de resultados com pôster, título e sinopse curta
- Página de detalhes do filme com sinopse, data de lançamento e elenco
- Sistema de avaliação de 1 a 5
- Edição de avaliação existente
- Remoção de avaliação
- Página de filmes avaliados com título, pôster e nota do usuário
- Estados de loading e tratamento de erro
- Persistência das avaliações no banco
- Fallback local com fixtures caso `TMDB_API_KEY` não esteja configurada

## Funcionalidades não implementadas neste MVP

- Autenticação
- Paginação ou scroll infinito
- Filtro por gênero ou ano
- Cache dedicado
- Modal de detalhes, preferi página dedicada para reduzir complexidade do MVP

## Como rodar com Docker

1. Crie um arquivo `.env` na raiz do projeto com a chave da TMDB:
   ```env
   TMDB_API_KEY=sua_chave_aqui
   ```
   Se preferir, você pode partir do arquivo `.env.example` e completar os valores.
2. Suba a aplicação com Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Acesse os serviços:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - Health check: http://localhost:8000/health
4. Para reiniciar apenas o backend depois de mudar a `.env`, rode:
   ```bash
   docker compose up -d --force-recreate backend
   ```

### Como confirmar que a TMDB está ativa

- Se as buscas retornarem pôsteres em `image.tmdb.org`, o backend está usando a API real.
- Se aparecerem apenas filmes de demonstração como `The Matrix`, `Inception` e `Interstellar`, o backend entrou no fallback local.
- O fallback acontece automaticamente se `TMDB_API_KEY` estiver ausente ou se a API da TMDB estiver indisponível.

## Como rodar localmente

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="sqlite:///./pixel_breeders.db"
export TMDB_API_KEY="sua_chave_aqui"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend em desenvolvimento usa proxy para `http://localhost:8000` em `/api`.

### Observação sobre o arquivo `.env`

O backend lê variáveis do arquivo `.env` na raiz do projeto quando roda fora do Docker também. Para desenvolvimento local, mantenha `TMDB_API_KEY`, `DATABASE_URL` e `CORS_ORIGINS` coerentes com o ambiente que você está usando.

## API

- `GET /api/search?query=...`
- `GET /api/movies/{movie_id}`
- `GET /api/ratings`
- `POST /api/ratings`
- `PATCH /api/ratings/{movie_id}`
- `DELETE /api/ratings/{movie_id}`

## Observação sobre o TMDB

Se `TMDB_API_KEY` não estiver definida, o backend usa um conjunto local de filmes de demonstração para manter o MVP funcional.

## Problemas comuns

- Se o `docker compose` reclamar de permissão no socket do Docker, verifique se sua sessão atual está no grupo `docker` ou use `sudo` como alternativa.
- Se o build do frontend demorar bastante na primeira vez, isso é esperado porque ele precisa baixar as dependências do npm.

## Uso de IA

Este MVP foi scaffoldado com assistência de IA para acelerar a estrutura inicial, a organização dos arquivos e a geração de parte do código. As decisões de arquitetura, contratos de API e validação foram revisadas manualmente.
