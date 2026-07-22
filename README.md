# Movie Logger - Entrega Técnica

Aplicação de busca e avaliação de filmes integrada ao TMDB, com frontend em React + TypeScript, backend em FastAPI e execução completa via Docker Compose.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy
- Banco de dados: PostgreSQL no Docker e SQLite como fallback local
- Infraestrutura: Docker Compose

## Checklist do teste

- Busca de filmes via TMDB: implementado
- Exibição de pôster e título nos resultados: implementado
- Detalhe do filme com sinopse, data de lançamento e elenco: implementado como página dedicada
- Sistema de avaliação de 1 a 5, editável e deletável: implementado
- Página "Filmes Avaliados": implementado
- Estados de loading e tratamento de erro: implementado
- Execução com um único comando via Docker: implementado
- README com instruções locais e lista de features: implementado
- Uso de IA descrito na entrega: implementado

## Funcionalidades entregues

- Busca na TMDB com paginação e modo de scroll infinito
- Filtro por ano e gênero
- Ordenação por relevância, data, nota e título
- Página de detalhes do filme com pôster, sinopse, data de lançamento, elenco e nota do usuário
- Sistema de avaliação com nota de 1 a 5
- Edição da nota diretamente na página do filme
- Remoção da avaliação com confirmação
- Página "Filmes Avaliados" com título, pôster, nota e data da avaliação
- Autenticação com cadastro e login
- Sessão persistida em `localStorage`
- Cache em memória para busca e detalhes do TMDB
- Fallback local com filmes de exemplo quando `TMDB_API_KEY` não está configurada ou quando a TMDB falha
- Banner explícito na interface quando os dados vêm do fallback local
- Textos centralizados em `frontend/src/i18n/pt-BR.ts`

## Itens fora de escopo

Estas decisões não foram implementadas porque não eram obrigatórias para o teste ou porque aumentariam a complexidade sem melhorar o fluxo principal:

- Refresh token
- Revogação de sessão no servidor
- Recuperação de senha
- Verificação de e-mail
- Login social / OAuth
- Migrações formais com Alembic
- Suíte completa de integração end-to-end cobrindo todos os fluxos

## Como rodar com Docker

A aplicação sobe com um único comando:

```bash
docker compose up --build
```

Depois de subir:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Healthcheck: http://localhost:8000/health

Sem `TMDB_API_KEY`, a aplicação continua funcional com dados de exemplo e mostra um banner informando que os dados vêm do fallback local.
O `docker compose` também espera o backend ficar saudável antes de subir o frontend, o que reduz falhas de inicialização no primeiro boot.
As imagens de backend e frontend rodam sem `root`, e os diretórios de build usam `.dockerignore` para evitar contexto desnecessário.

## Como rodar localmente

### 1. Preparar variáveis de ambiente

O repositório inclui um arquivo base em `.env.example`. A forma mais simples é copiar esse arquivo para `.env` e ajustar o que for necessário:

```bash
cp .env.example .env
```

Variáveis mais importantes:

- `TMDB_API_KEY`: habilita a integração real com a TMDB
- `DATABASE_URL`: define o banco usado pelo backend
- `JWT_SECRET_KEY`: segredo do token JWT
- `JWT_ALGORITHM`: algoritmo do JWT
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: tempo de expiração do token
- `CORS_ORIGINS`: origens liberadas para o backend
- `TMDB_CACHE_TTL_SECONDS`: tempo de vida do cache da TMDB
- `TMDB_CACHE_MAX_ENTRIES`: limite de entradas do cache

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Em desenvolvimento, o frontend usa proxy para `http://localhost:8000` nas rotas `/api`.

## API principal

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

As respostas de busca e detalhe incluem o campo `source`, que permite distinguir dados reais da TMDB de dados vindos do fallback local:

- `source: "tmdb"` quando a API real responde com sucesso
- `source: "fixture"` quando o backend usa os filmes locais

## Testes automatizados

Há uma cobertura pequena, mas focada nos pontos mais sensíveis:

- fallback do TMDB com `source: "fixture"` e `source: "tmdb"`
- upsert de avaliação autenticada para garantir apenas uma linha por `(user_id, tmdb_id)`

Para executar:

```bash
cd backend
pytest tests -q
```

## Observações sobre a TMDB

- O frontend nunca chama a TMDB diretamente
- O backend decide se usa a API real ou os fixtures locais
- Quando a chave está ativa, o backend cacheia as respostas de busca e detalhe por processo
- O backend faz retry simples com backoff em falhas transitórias da TMDB antes de cair no fallback local
- Quando a chave não está ativa, o app continua navegável, mas os pôsteres dos filmes de exemplo são gerados localmente como placeholders

## Observações sobre autenticação

- A sessão é persistida em `localStorage`
- O frontend restaura a sessão ao carregar a aplicação e revalida o token com `GET /api/auth/me`
- Se uma rota protegida responder `401`, o estado local é limpo automaticamente
- Se a validação do boot falhar, a sessão local é descartada antes de a UI seguir adiante

## Documentação interna

- [docs/EXPLICACAO_TECNICA.md](docs/EXPLICACAO_TECNICA.md)

## Uso de IA

Utilizei IA como ferramenta para acelerar o desenvolvimento, sempre sob minha supervisão. O Codex foi responsável por gerar grande parte do código a partir das especificações que eu definia, como arquitetura, contratos de API e requisitos de cada funcionalidade. Também utilizei o Claude para discutir algumas decisões de implementação e revisar soluções específicas. Todas as decisões de arquitetura, escopo e validação final ficaram por minha conta. A IA foi utilizada como ferramenta de apoio ao desenvolvimento, enquanto todas as decisões de arquitetura, implementação e validação permaneceram sob minha responsabilidade.
