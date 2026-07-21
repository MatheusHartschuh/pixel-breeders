# Explicação Técnica da Aplicação

Este documento descreve, em detalhes, como a aplicação Pixel Breeders funciona hoje, com foco em:

- consumo de API
- gerenciamento de estado no backend
- persistência e modelagem de dados
- tratamento de erros
- Docker e execução do projeto
- qualidade geral da implementação

O objetivo é deixar claro o fluxo real do código, não apenas a intenção do teste.

## 1. Visão geral da arquitetura

A solução é dividida em dois blocos principais:

- `frontend`, construído em React + TypeScript
- `backend`, construído em FastAPI + SQLAlchemy

O backend tem duas responsabilidades:

1. servir a API própria da aplicação, usada pelo frontend
2. integrar com a API pública do TMDB para pesquisa e detalhes de filmes

O frontend não conversa diretamente com o TMDB. Toda a comunicação externa passa pelo backend, o que centraliza autenticação, cache, normalização de dados e tratamento de falhas.

### Fluxo resumido

1. O usuário pesquisa um filme no frontend.
2. O frontend chama `GET /api/search`.
3. O backend consulta o TMDB ou os dados locais de fallback.
4. O backend normaliza a resposta e devolve um formato estável para o frontend.
5. Ao abrir um filme, o frontend chama `GET /api/movies/{movie_id}`.
6. O backend busca detalhes e elenco no TMDB, ou no fallback local.
7. Se o usuário estiver autenticado, o backend cruza o filme com as avaliações do usuário e injeta `user_rating` na resposta.
8. As avaliações são persistidas no banco e acessadas por rotas protegidas com JWT.

## 2. Consumo de API

### 2.1. Consumo da API interna no frontend

O frontend centraliza as chamadas HTTP em `frontend/src/api.ts`.

Essa camada faz algumas coisas importantes:

- adiciona o prefixo `/api` em todas as requisições
- injeta o token JWT no header `Authorization` quando existe sessão salva
- normaliza erros vindos do backend para uma mensagem amigável
- trata `204 No Content` sem tentar fazer `response.json()`

O wrapper principal é a função `request<T>()`. Ele:

1. lê o token salvo em `localStorage`
2. monta os headers
3. faz a requisição com `fetch`
4. se a resposta não for `ok`, lê a mensagem de erro e lança `Error`
5. converte a resposta em JSON quando houver corpo

Isso reduz repetição e mantém o comportamento uniforme em todas as chamadas.

### 2.2. Consumo da API própria

As funções exportadas em `frontend/src/api.ts` representam o contrato de uso da aplicação:

- `searchMovies()`
- `getMovie()`
- `getMe()`
- `login()`
- `register()`
- `listRatings()`
- `createRating()`
- `updateRating()`
- `deleteRating()`

O frontend usa essas funções diretamente nas páginas.

### 2.3. Consumo do TMDB no backend

O backend concentra a integração com o TMDB em `backend/app/services/tmdb.py`.

O cliente `TmdbClient` faz a chamada ao serviço externo via `httpx`, com timeout configurável. Ele possui dois modos:

- modo live, quando `TMDB_API_KEY` está configurada
- modo fallback, quando a chave não existe ou quando o TMDB falha

#### Busca de filmes

Para busca, o serviço decide entre:

- `/search/movie` quando existe texto de busca
- `/discover/movie` quando a busca textual está vazia e o usuário está filtrando por ano e/ou gênero

Depois da resposta da TMDB, o backend normaliza os campos e devolve um formato próprio:

- `id`
- `title`
- `overview`
- `release_date`
- `poster_url`
- `vote_average`
- `genre_ids`

Isso é importante porque o frontend não depende do shape bruto do TMDB.

#### Detalhes do filme

Para detalhes, o serviço chama `/movie/{movie_id}` com `append_to_response=credits`.

Com isso, o backend consegue devolver:

- dados do filme
- elenco
- pôster
- nota média

#### Fallback local

Se a API do TMDB estiver indisponível ou se `TMDB_API_KEY` não estiver definida, a aplicação continua funcional usando `backend/app/fixtures.py`.

Esse fallback é útil por três motivos:

- mantém o MVP executável sem chave externa
- evita bloqueio total em ambiente de avaliação
- facilita demonstração local e desenvolvimento

#### Cache da integração

O cliente TMDB usa cache em memória com TTL, por processo.

Características:

- cache separado para busca e detalhes
- expiração por tempo
- limite máximo de entradas
- cópias profundas para evitar efeitos colaterais acidentais
- lock de thread para evitar corrida entre requisições concorrentes

Na prática, isso reduz chamadas repetidas quando o usuário refaz a mesma busca, navega entre páginas ou reabre um filme já consultado.

## 3. Gerenciamento de estado no backend

No backend, o estado da aplicação é dividido em três camadas:

### 3.1. Estado persistido

É o estado durável, gravado no banco:

- usuários
- avaliações de filmes

Esse é o estado que sobrevive a reinício da aplicação.

### 3.2. Estado de sessão

A aplicação usa JWT como mecanismo de autenticação.

O token é gerado em `backend/app/core/security.py` com informações como:

- `sub` com o id do usuário
- `username`
- `type = access`
- `iat`
- `exp`

O backend não mantém sessão em memória no servidor. O estado da sessão fica no token e no banco. Isso simplifica a arquitetura e torna a autenticação stateless.

### 3.3. Estado temporário

Existem também estados transitórios, mantidos apenas em memória:

- cache de respostas da TMDB
- sessão de requisição via SQLAlchemy `SessionLocal`

Esses estados não são a fonte da verdade da aplicação. Eles servem apenas para eficiência e para isolar cada request.

### 3.4. Ciclo da sessão no backend

As rotas de autenticação funcionam assim:

- `POST /api/auth/register`
  - valida `username` e `password`
  - normaliza o nome de usuário
  - verifica se já existe conta com o mesmo nome
  - salva o usuário com senha com hash bcrypt
  - devolve token + dados públicos do usuário

- `POST /api/auth/login`
  - normaliza o nome de usuário
  - busca o usuário no banco
  - valida a senha com bcrypt
  - devolve token + dados públicos do usuário

- `GET /api/auth/me`
  - lê o token Bearer
  - valida e decodifica o JWT
  - carrega o usuário do banco
  - devolve os dados públicos do usuário

### 3.5. Relação entre backend e frontend no estado de login

O frontend salva a sessão em `localStorage` por meio de `frontend/src/auth/storage.ts`.

Depois do login:

1. o token é salvo localmente
2. o usuário é colocado no estado global do `AuthProvider`
3. as requisições seguintes passam a enviar `Authorization: Bearer <token>`

Quando a página carrega, o `AuthProvider` valida a sessão chamando `/api/auth/me`.

Se o token estiver vencido ou inválido, a sessão é limpa e o usuário é deslogado automaticamente.

## 4. Banco de dados

### 4.1. Tecnologia e modelo

O projeto usa SQLAlchemy ORM.

Os modelos principais estão em `backend/app/models.py`:

- `User`
- `Rating`

### 4.2. Tabela `users`

Campos principais:

- `id`
- `username`
- `password_hash`
- `created_at`

Regras importantes:

- `username` é único
- `password` nunca é armazenada em texto puro
- o relacionamento com avaliações é `one-to-many`

### 4.3. Tabela `ratings`

Campos principais:

- `id`
- `user_id`
- `tmdb_id`
- `title`
- `poster_url`
- `overview`
- `release_date`
- `rating`
- `created_at`
- `updated_at`

Regras importantes:

- existe `ForeignKey` para `users.id`
- há `ondelete="CASCADE"`
- existe `UniqueConstraint` em `(user_id, tmdb_id)`

Esse índice único evita que o mesmo usuário crie avaliações duplicadas para o mesmo filme.

### 4.4. Estratégia de persistência

O banco é inicializado com `Base.metadata.create_all(bind=engine)` no startup da aplicação.

Isso significa:

- as tabelas são criadas automaticamente quando não existem
- não há migrações formais com Alembic neste MVP

Para um teste técnico ou MVP, isso acelera a entrega. Em um projeto maior, a evolução natural seria migrar para um fluxo de migrations versionadas.

### 4.5. Banco no Docker e fallback local

No Docker, o projeto usa PostgreSQL.

Fora do Docker, o backend pode usar SQLite via `DATABASE_URL` local.

Isso deixa o desenvolvimento mais simples, mas mantém o ambiente principal mais próximo de produção quando a aplicação sobe com `docker compose`.

## 5. Rotas de avaliações

As avaliações são o núcleo do estado do usuário.

### `GET /api/ratings`

- retorna apenas as avaliações do usuário autenticado
- ordena por `updated_at desc`

### `POST /api/ratings`

- cria uma nova avaliação
- ou atualiza a avaliação existente para o mesmo `tmdb_id`

Essa decisão evita duplicidade e simplifica a UX, porque o usuário pode salvar a nota sem precisar pensar se o filme já foi avaliado.

### `PATCH /api/ratings/{tmdb_id}`

- altera somente a nota
- mantém os demais dados do filme

### `DELETE /api/ratings/{tmdb_id}`

- remove a avaliação do usuário

Todas essas rotas exigem autenticação.

## 6. Tratamento de erros

### 6.1. No backend

O backend usa erros HTTP explícitos com mensagens em português, o que deixa a resposta previsível e fácil de exibir no frontend.

Exemplos de cenários:

- `401 Unauthorized` quando o token é ausente, inválido ou expirado
- `403/409` em conflitos de cadastro
- `404` quando o filme ou a avaliação não existe
- validação de entrada via Pydantic para `username`, `password` e nota de 1 a 5

Também existem mensagens customizadas para ajudar o usuário final a entender o problema sem precisar decodificar mensagens técnicas.

### 6.2. No frontend

O frontend faz duas camadas de tratamento:

1. tratamento de resposta HTTP no wrapper `request()`
2. tratamento visual nos componentes de página

O parser de erro em `frontend/src/api.ts` tenta extrair:

- `detail`
- `message`
- `msg`

Isso permite que a aplicação mostre mensagens úteis mesmo quando o backend responde em formatos ligeiramente diferentes.

### 6.3. Cancelamento de requisições

As buscas de filmes usam `AbortController`.

Isso evita efeitos colaterais comuns como:

- resposta antiga sobrescrever uma busca mais nova
- atualizações de estado após desmontagem do componente

Esse cuidado aparece principalmente na página principal, onde o usuário pode digitar rápido, mudar filtros ou alternar entre paginação e scroll infinito.

### 6.4. Fallback em falhas externas

Se a TMDB falhar, o backend volta para os fixtures locais.

Se uma avaliação protegida receber token inválido, o frontend faz logout automático.

Ou seja, o sistema tenta degradar de forma controlada em vez de quebrar de maneira abrupta.

## 7. Docker

### 7.1. Estrutura do `docker-compose.yml`

O Compose sobe três serviços:

- `db`
- `backend`
- `frontend`

#### `db`

- usa `postgres:16-alpine`
- persiste em volume nomeado `pgdata_auth`
- expõe healthcheck com `pg_isready`

#### `backend`

- builda a imagem a partir de `backend/Dockerfile`
- conecta no PostgreSQL via `DATABASE_URL`
- recebe `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` e `TMDB_API_KEY`
- expõe a porta `8000`

#### `frontend`

- builda a imagem a partir de `frontend/Dockerfile`
- serve o app final com Nginx
- expõe a porta `3000`

### 7.2. Backend Dockerfile

O backend roda em `python:3.10-slim`.

O fluxo é simples:

1. instala dependências
2. copia o código
3. inicia `uvicorn app.main:app`

Isso é apropriado para uma API FastAPI pequena e direta.

### 7.3. Frontend Dockerfile

O frontend usa multi-stage build:

1. imagem Node para instalar dependências e gerar `dist`
2. imagem Nginx para servir os arquivos estáticos

Isso reduz o tamanho da imagem final e melhora a distribuição.

### 7.4. Reverse proxy no Nginx

O arquivo `frontend/nginx.conf` faz proxy de `/api/` para o backend:

- navegador acessa a mesma origem do frontend
- chamadas para `/api/...` são encaminhadas internamente ao serviço `backend:8000`
- o backend fica escondido atrás do Nginx no ambiente final

Esse desenho simplifica CORS e deixa a experiência mais parecida com produção.

### 7.5. Execução em um comando

A aplicação atende ao requisito de subir tudo com um comando:

```bash
docker compose up --build
```

Depois disso:

- frontend em `http://localhost:3000`
- backend em `http://localhost:8000`
- healthcheck em `http://localhost:8000/health`

## 8. Qualidade geral da aplicação

### 8.1. Pontos fortes

- Separação clara entre frontend, backend e integração externa
- Contratos tipados no frontend e schemas validados no backend
- Autenticação funcional com JWT e hash de senha
- Persistência real no banco, com avaliação por usuário
- Cache em memória para reduzir chamadas ao TMDB
- Fallback local para manter o app útil sem dependência externa
- Estados de loading e empty state em fluxos importantes
- Estrutura de UI reutilizável com componentes como `Page`, `Panel`, `EmptyState`, `SectionHeader` e `Button`
- Busca com debounce e cancelamento de requisições
- Filtro por ano e gênero
- Paginação e scroll infinito

### 8.2. Boas decisões de implementação

#### Normalização de dados

O backend traduz a resposta do TMDB para um formato próprio. Isso protege o frontend de mudanças pontuais na API externa.

#### Sessão simples e previsível

A aplicação evita servidor de sessão. O JWT é suficiente para o escopo do MVP e reduz complexidade.

#### UX com feedback explícito

O usuário vê:

- loading skeletons
- mensagens de erro
- estado vazio
- indicação de avaliação já salva

#### Componentização

Os componentes de layout e UI tornam a interface consistente e reduzem repetição.

### 8.3. Limitações atuais

Alguns pontos ainda estão fora do escopo atual:

- não há migrations formais com Alembic
- não há refresh token
- não há revogação de sessão no servidor
- não há recuperação de senha
- não há login social
- não há suíte automatizada de testes cobrindo o fluxo inteiro

Esses itens não impedem o MVP de funcionar, mas são evoluções naturais para uma versão mais madura.

## 9. Conclusão

A aplicação está organizada de forma coerente para um MVP de avaliação de filmes:

- o frontend concentra a experiência do usuário
- o backend protege os dados e integra com o TMDB
- o banco armazena estado persistente por usuário
- o Docker entrega um ambiente executável e reproduzível

O resultado é uma base simples de entender, mas com decisões técnicas suficientes para sustentar autenticação, busca externa, persistência e boa experiência de uso.
