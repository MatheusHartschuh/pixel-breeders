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
- Autenticação com cadastro/login via JWT
- Página de filmes avaliados com título, pôster e nota do usuário autenticado
- Estados de loading e tratamento de erro
- Persistência das avaliações no banco por usuário
- Fallback local com fixtures quando `TMDB_API_KEY` não está configurada ou a TMDB falha, com origem explícita (`source`) e banner de aviso no frontend
- Paginação e scroll infinito na listagem principal
- Filtro por ano e gênero na busca
- Cache em memória com TTL para busca e detalhes do TMDB

## Funcionalidades não implementadas neste MVP

- Modal de detalhes, preferi página dedicada para reduzir complexidade do MVP
- Refresh token e revogação de sessão no servidor
- Recuperação de senha, verificação de e-mail e login social
- Migrações formais com Alembic
- Suíte completa de integração cobrindo todos os fluxos críticos, incluindo autenticação end-to-end e permissões por usuário

## Documentação interna

Para um resumo rápido do estado atual da base e dos pontos que ainda faltam, veja também:

- [docs/APP_STATUS.md](/home/matheuspalavrasapplicado/Documentos/Backup%20Manual/pixel-breeders/docs/APP_STATUS.md)

## Testes automatizados

Há uma cobertura pequena e intencionalmente focada em dois comportamentos que são fáceis de quebrar sem perceber:

- fallback de fixtures com o campo `source` nas rotas de busca e detalhe, cobrindo tanto `fixture` quanto `tmdb`
- upsert de avaliação autenticada, garantindo uma única linha por `(user_id, tmdb_id)` e a nota mais recente

Esses testes ficam em `backend/tests/` e usam `pytest` com `TestClient` do FastAPI. Eles isolam o banco com SQLite de teste e fazem monkeypatch do cliente TMDB para não haver rede real.

Arquivos cobertos hoje:

- `backend/tests/test_fallback.py`
- `backend/tests/test_ratings.py`

Para executar:

```bash
cd backend
pytest tests -q
```

Uma suíte completa de integração ficou fora do escopo por tempo.

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
5. Se você já tinha rodado a versão anterior do projeto, recrie o volume do banco antes do primeiro boot da autenticação:
   ```bash
   docker compose down -v
   docker compose up --build
   ```

### Como confirmar que a TMDB está ativa

- As respostas de `GET /api/search` e `GET /api/movies/{movie_id}` incluem `source: "tmdb"` quando vêm da API real e `source: "fixture"` quando vêm do fallback local.
- Quando o fallback está ativo, o frontend exibe um banner visível de dados de exemplo.
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
export DATABASE_URL="sqlite:///./pixel_breeders_auth.db"
export JWT_SECRET_KEY="uma_chave_forte"
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

O backend lê variáveis do arquivo `.env` na raiz do projeto quando roda fora do Docker também. Para desenvolvimento local, mantenha `TMDB_API_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY` e `CORS_ORIGINS` coerentes com o ambiente que você está usando.

Você também pode ajustar o cache do TMDB com:

- `TMDB_CACHE_TTL_SECONDS` para controlar por quanto tempo as respostas ficam em memória
- `TMDB_CACHE_MAX_ENTRIES` para limitar quantas entradas o cache mantém por processo
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` para ajustar a expiração do token

## API

- `GET /api/search?query=...`
- `GET /api/movies/{movie_id}`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/ratings`
- `POST /api/ratings`
- `PATCH /api/ratings/{movie_id}`
- `DELETE /api/ratings/{movie_id}`

As rotas de avaliação exigem `Authorization: Bearer <token>`.
As respostas de busca e detalhe incluem o campo `source`, que permite distinguir dados reais da TMDB de dados de exemplo.

## Observação sobre o TMDB

Se `TMDB_API_KEY` não estiver definida, o backend usa um conjunto local de filmes de demonstração para manter o MVP funcional. O mesmo fallback também é usado quando a chamada à TMDB falha por timeout, indisponibilidade ou outro erro HTTP.

Esse fallback existe para robustez de desenvolvimento e para não quebrar o fluxo do app quando a integração externa estiver indisponível. Ele não substitui o consumo real da API da TMDB, que continua sendo o comportamento esperado para avaliação do projeto.

As respostas de busca e detalhe trazem o campo `source` para deixar explícita a origem do dado:

- `source: "tmdb"` quando a integração externa respondeu com sucesso
- `source: "fixture"` quando o backend precisou cair nos dados locais

Quando a chave estiver ativa, o backend cacheia respostas de busca e detalhes em memória por processo. Isso reduz chamadas repetidas ao TMDB durante navegação, paginação e reabertura dos mesmos filmes.

## Problemas comuns

- Se o `docker compose` reclamar de permissão no socket do Docker, verifique se sua sessão atual está no grupo `docker` ou use `sudo` como alternativa.
- Se o build do frontend demorar bastante na primeira vez, isso é esperado porque ele precisa baixar as dependências do npm.

## Uso de IA

Este MVP foi scaffoldado com assistência de IA para acelerar a estrutura inicial, a organização dos arquivos e a geração de parte do código. As decisões de arquitetura, contratos de API e validação foram revisadas manualmente.
