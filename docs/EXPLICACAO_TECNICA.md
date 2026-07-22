# Explicação Técnica da Aplicação

Este documento descreve como a aplicação funciona de verdade, do ponto de vista de arquitetura, fluxo de dados e decisões de implementação. A intenção aqui é explicar o comportamento atual do repositório, não apenas a ideia do projeto.

## 1. Visão geral da arquitetura

A solução é dividida em dois blocos principais:

- `frontend`, construído em React + TypeScript + Vite
- `backend`, construído em FastAPI + SQLAlchemy

O backend concentra três responsabilidades:

1. servir a API própria da aplicação
2. integrar com a TMDB
3. proteger e persistir os dados de autenticação e avaliações

O frontend não chama a TMDB diretamente. Toda a integração externa passa pelo backend. Isso simplifica o controle de autenticação, padroniza os dados recebidos e permite um fallback local quando a TMDB não está disponível.

### Fluxo resumido

1. O usuário pesquisa um filme no frontend.
2. A página principal faz debounce da digitação e chama `GET /api/search`.
3. O backend decide se usa a TMDB real ou os fixtures locais.
4. O backend normaliza o retorno e devolve um formato estável para o frontend.
5. Ao abrir um filme, o frontend chama `GET /api/movies/{movie_id}`.
6. O backend busca detalhes e elenco, ou usa os dados locais.
7. Se houver token válido, o backend injeta `user_rating` nas respostas públicas.
8. As avaliações são persistidas em banco e acessadas por rotas protegidas com JWT.

## 2. Backend

### 2.1. Configuração e inicialização

As configurações ficam em `backend/app/core/config.py`. A aplicação lê variáveis do `.env` local, com defaults razoáveis para desenvolvimento.

Alguns exemplos de comportamento padrão:

- `DATABASE_URL` aponta para SQLite fora do Docker
- `TMDB_API_KEY` é opcional
- `JWT_SECRET_KEY` e `JWT_ALGORITHM` controlam a assinatura do token
- `TMDB_CACHE_TTL_SECONDS` e `TMDB_CACHE_MAX_ENTRIES` controlam o cache em memória

Em `backend/app/main.py`, a aplicação:

- instancia o `FastAPI`
- configura o CORS
- cria as tabelas com `Base.metadata.create_all(bind=engine)` no `lifespan`
- expõe `GET /health`
- registra as rotas de busca, filmes, avaliações e autenticação

O uso de `create_all` deixa o MVP simples de subir, sem migrações formais. Em uma base maior, isso normalmente evoluiria para Alembic.

### 2.2. Autenticação

A autenticação fica em `backend/app/core/security.py` e `backend/app/routers/auth.py`.

O fluxo é o seguinte:

- `normalize_username()` remove espaços e aplica `casefold()`
- `hash_password()` usa `bcrypt` para gerar o hash
- `verify_password()` compara a senha informada com o hash salvo
- `create_access_token()` gera um JWT com `sub`, `username`, `type`, `iat` e `exp`

O token é stateless. O backend não mantém sessão em memória.

As rotas de autenticação funcionam assim:

- `POST /api/auth/register`
  - valida `username` e `password`
  - normaliza o nome de usuário
  - verifica duplicidade
  - salva o usuário com senha hash
  - devolve token + usuário público

- `POST /api/auth/login`
  - normaliza o nome de usuário
  - busca o usuário
  - valida a senha
  - devolve token + usuário público

- `GET /api/auth/me`
  - exige token Bearer válido
  - retorna os dados públicos do usuário autenticado

O backend tem dois helpers importantes:

- `get_current_user()` para rotas protegidas, que retorna `401` se o token estiver ausente, inválido ou se o usuário não existir
- `get_current_user_optional()` para rotas públicas que podem enriquecer a resposta se o token existir

Isso permite que `GET /api/search` e `GET /api/movies/{movie_id}` continuem públicos, mas tragam `user_rating` quando o usuário estiver autenticado.

### 2.3. Modelo de dados

Os modelos ORM estão em `backend/app/models.py`.

#### `User`

Campos principais:

- `id`
- `username`
- `password_hash`
- `created_at`

Regras importantes:

- `username` é único
- a senha nunca é armazenada em texto puro
- o relacionamento com avaliações é `one-to-many`

#### `Rating`

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
- existe `UniqueConstraint("user_id", "tmdb_id")`
- existe um índice composto em `user_id` + `updated_at desc` para acelerar a listagem de avaliações do usuário

Essa restrição garante que um usuário não crie duas avaliações para o mesmo filme.

### 2.4. Rotas de avaliações

As avaliações são o estado persistente central do projeto.

#### `GET /api/ratings`

- retorna apenas as avaliações do usuário autenticado
- ordena por `updated_at desc`

#### `POST /api/ratings`

- cria uma nova avaliação
- ou atualiza a existente para o mesmo `tmdb_id`

Essa rota funciona como um upsert manual. O backend procura um registro existente para `(user_id, tmdb_id)`; se encontrar, atualiza os dados do filme e a nota. Se não encontrar, cria um novo registro.

#### `PATCH /api/ratings/{tmdb_id}`

- altera apenas a nota
- mantém os demais dados do filme

#### `DELETE /api/ratings/{tmdb_id}`

- remove a avaliação do usuário autenticado

As rotas protegidas usam `get_current_user()`, então um token inválido ou expirado derruba o acesso com `401`.

### 2.5. Integração com a TMDB

A integração fica concentrada em `backend/app/services/tmdb.py`.

O cliente `TmdbClient` usa `httpx.Client` síncrono com timeout configurável. Ele trabalha em dois modos:

- live, quando `TMDB_API_KEY` existe
- fallback, quando não existe chave ou quando a TMDB falha

O serviço expõe dois canais principais:

- busca de filmes
- detalhes do filme

#### Busca de filmes

O método `search_movies()` decide a estratégia com base no contexto:

- quando não existe `TMDB_API_KEY`, ele cai imediatamente nos fixtures locais
- quando a query está vazia, ele usa `/discover/movie`
- quando a query existe e a ordenação é de relevância, ele usa `/search/movie`
- quando há filtros de gênero ou uma ordenação que exige consistência global, ele busca todas as páginas e ordena localmente

Esse comportamento é importante porque a TMDB pagina os resultados, mas o projeto precisa permitir filtros e ordenações que façam sentido para a interface.

As respostas são normalizadas para um formato próprio:

- `id`
- `title`
- `overview`
- `release_date`
- `poster_url`
- `vote_average`
- `genre_ids`

O frontend não depende do shape bruto da TMDB.

#### Detalhes do filme

`get_movie_details()` consulta `/movie/{movie_id}` com `append_to_response=credits`. Isso permite devolver, em uma única chamada:

- dados do filme
- elenco
- pôster
- nota média

O elenco é limitado aos primeiros 10 membros para manter a interface legível.

#### Cache

O cliente usa cache em memória com TTL, separado para busca e detalhe.

Características:

- cache por processo
- expiração por tempo
- limite máximo de entradas
- cópias profundas para evitar efeitos colaterais
- `RLock` para concorrência segura entre requisições

Na prática, isso reduz chamadas repetidas quando o usuário pesquisa a mesma coisa, troca de página ou reabre um filme já consultado.

#### Retry simples

Antes de desistir da TMDB, o cliente tenta novamente algumas vezes em falhas transitórias, como timeout, erro de conexão, `429` e `5xx`.

Características desse retry:

- número pequeno de tentativas
- backoff exponencial curto
- logging explícito de cada nova tentativa
- fallback local apenas depois de esgotar as tentativas

Esse comportamento melhora a robustez sem mascarar falhas permanentes.

#### Fallback local

Se a TMDB estiver indisponível ou a chave não estiver configurada, a aplicação continua funcionando com `backend/app/fixtures.py`.

Os fixtures:

- mantêm o MVP executável sem dependência externa
- permitem demonstração local
- cobrem busca, paginação, filtros e detalhes

As respostas trazem `source` para deixar a origem explícita:

- `source: "tmdb"` quando a API real respondeu com sucesso
- `source: "fixture"` quando o backend usou os dados locais

Esse campo também é usado pelo frontend para exibir um banner de aviso quando o fallback está ativo.

### 2.6. Tratamento de erros

O backend usa erros HTTP explícitos e mensagens em português.

Exemplos:

- `401 Unauthorized` quando o token está ausente, inválido ou expirou
- `404` quando o filme ou a avaliação não existe
- `409` quando há conflito de cadastro
- validação de entrada via Pydantic para `username`, `password` e nota de 1 a 5

O objetivo é manter o contrato previsível para o frontend.

## 3. Frontend

### 3.1. Estrutura geral e navegação

O app principal fica em `frontend/src/App/index.tsx`.

Ele usa `BrowserRouter` e define as rotas:

- `/` para busca
- `/movie/:movieId` para detalhes do filme
- `/rated` para a lista de filmes avaliados
- `/settings` para preferências visuais
- `/login` e `/register` para autenticação

A navegação lateral mostra o usuário atual quando há sessão salva e oferece links de login/cadastro quando não há.

Os botões e links passam por um componente `Button` que funciona tanto como `<button>` quanto como `<Link>`, o que reduz duplicação de markup.

### 3.2. Sessão e camada de API

A camada de API está em `frontend/src/api.ts`.

Ela concentra todas as chamadas HTTP e faz três coisas importantes:

1. adiciona o prefixo `/api`
2. injeta o token JWT do `localStorage`, se existir
3. normaliza mensagens de erro para algo legível no frontend

O wrapper `request<T>()`:

- lê o token salvo
- monta os headers
- envia a requisição
- trata `204 No Content` sem tentar parsear JSON
- lê `detail`, `message` e `msg` ao montar a mensagem de erro

Isso evita repetição em todas as páginas.

A sessão em si é gerenciada por `frontend/src/auth/AuthProvider.tsx` e `frontend/src/auth/storage.ts`.

Detalhes importantes:

- a sessão é lida de `localStorage` no estado inicial do provider
- login e cadastro persistem `{ token, user }`
- logout remove a sessão
- `isCheckingSession` sinaliza a validação assíncrona da sessão no boot

Quando o provider encontra uma sessão salva, ele chama `GET /api/auth/me` no carregamento inicial para confirmar se o token continua válido.
Se a validação falhar, o estado local é limpo antes de o app seguir como autenticado.

Ou seja, a aplicação restaura a sessão local imediatamente, mas também a revalida no boot para evitar confiar cegamente no `localStorage`.

Os utilitários de navegação em `frontend/src/lib/navigation.ts` evitam open redirect e loops entre `/login` e `/register`.

### 3.3. Página principal

`frontend/src/pages/HomePage.tsx` concentra a busca de filmes.

O fluxo visual é este:

- o usuário digita no campo de busca
- o texto passa por debounce de 320 ms
- o valor final vira `query`
- a página chama `searchMovies()` com query, página, ano, gênero e ordenação

Alguns detalhes importantes da interface:

- a busca só dispara com 2 caracteres ou mais, exceto quando há filtros de ano/gênero
- o ano aceita apenas dígitos e precisa ficar entre 1900 e 2100
- o gênero é selecionado em um componente customizado de lista
- a ordenação usa `SegmentedControl`
- há dois modos de navegação:
  - paginação
  - scroll infinito

A sincronização com a URL também é intencional:

- `q` guarda a busca
- `year` guarda o ano
- `genre` guarda o gênero
- `mode` guarda a navegação
- `sort` guarda a ordenação

Isso torna a tela compartilhável e fácil de revisar.

#### Estado da busca

A página trabalha com uma pequena máquina de estados:

- `loading`
- `typing`
- `success`
- `empty`
- `error`

Além disso, usa `AbortController` para cancelar requisições antigas quando o usuário muda a busca ou os filtros rapidamente.

#### Paginação e scroll infinito

Quando o modo é paginação, a interface usa `PaginationControls`.

Quando o modo é scroll infinito:

- um `IntersectionObserver` observa um sentinela no fim da lista
- o botão "Carregar mais" fica disponível como fallback manual

#### Banner de origem dos dados

Se a resposta vem com `source: "fixture"`, a página mostra `DataSourceBanner`.

Esse banner deixa explícito que os resultados exibidos estão vindo dos dados locais e não da TMDB real.

#### Resumo dos filtros

A página também monta tokens visuais com os filtros ativos, deixando claro para o usuário o que está refinando a lista.

### 3.4. Página de detalhes do filme

`frontend/src/pages/MoviePage.tsx` faz a leitura de `movieId` da rota e carrega os dados de `GET /api/movies/{movieId}`.

Enquanto a requisição acontece, a interface mostra `MovieDetailSkeleton`.

Se o ID for inválido ou o filme não puder ser carregado, a tela cai em um `EmptyState` com botão de voltar.

#### O que a tela exibe

O componente `MovieDetailView` mostra:

- pôster
- título
- ano de lançamento
- nota média da TMDB
- sinopse
- elenco
- módulo de avaliação do usuário

#### Avaliação

O módulo de avaliação trabalha assim:

- se o usuário não estiver autenticado, a tela mostra um CTA para login
- se o usuário estiver autenticado e ainda não tiver nota, ele escolhe de 1 a 5 estrelas e salva
- se já existir nota, ele pode editar e salvar de novo
- se quiser remover, a ação passa por confirmação

O comportamento de salvar é simples:

- se `movie.user_rating` existe, a aplicação chama `updateRating()`
- se não existe, chama `createRating()`

Depois do salvamento, a UI atualiza o estado local sem precisar refazer o fetch completo.

#### Autenticação no fluxo do filme

Quando o usuário tenta avaliar sem estar logado, a aplicação abre `AuthPromptModal`.

Esse modal:

- bloqueia o scroll do fundo
- fecha com `Escape` ou clique fora
- preserva o `nextPath` para devolver o usuário ao mesmo filme depois do login ou cadastro

Se uma requisição protegida responder `401`, a tela faz logout, limpa o estado e volta a mostrar o prompt de autenticação.

#### Remoção da avaliação

A exclusão usa `ConfirmDialog`, que também bloqueia o scroll e exige confirmação explícita.

Isso evita remoções acidentais.

### 3.5. Página de filmes avaliados

`frontend/src/pages/RatedPage.tsx` lista as avaliações do usuário autenticado com `GET /api/ratings`.

Se não houver sessão, a tela mostra um estado convidando o usuário a entrar ou criar conta.

Se houver sessão:

- a página busca as avaliações
- mostra um resumo com quantidade, média e última entrada
- renderiza os filmes em cards
- permite remover cada avaliação

Os cards reutilizam `MovieCard`, mas recebem `ratingDate` e uma ação adicional de remoção.

Quando o usuário apaga uma avaliação, a lista local é filtrada sem refetch imediato.

### 3.6. Componentes reutilizáveis

Alguns componentes ajudam a manter a UI consistente:

- `MovieCard`: card clicável com pôster, título, ano, nota TMDB e nota do usuário
- `MoviePoster`: renderiza a imagem real, ou um placeholder SVG com monograma quando não há pôster
- `RatingStars`: mostra estrelas lidas ou interativas
- `GenreSelect`: lista customizada com comportamento de dropdown
- `PaginationControls`: prev/next e salto direto para página
- `SegmentedControl`: alternância entre modos e ordenações
- `DataSourceBanner`: avisa quando os dados vêm do fallback local
- `ConfirmDialog` e `AuthPromptModal`: modais acessíveis com portal
- `Page`, `Panel`, `EmptyState`, `SectionHeader`: blocos de layout reutilizáveis

O `MoviePoster` merece destaque: quando não existe pôster disponível, ele gera um `data:image/svg+xml` com monograma e cores derivadas do título. Isso deixa o fallback visualmente mais elegante do que um simples retângulo vazio.

## 4. Docker e execução

O `docker-compose.yml` sobe três serviços:

- `db`
- `backend`
- `frontend`

### `db`

- usa `postgres:16-alpine`
- persiste em volume nomeado
- expõe healthcheck com `pg_isready`

### `backend`

- gera a imagem a partir de `backend/Dockerfile`
- recebe `DATABASE_URL` apontando para o PostgreSQL do Compose
- expõe um healthcheck em `GET /health`, usado pelo Compose para confirmar que a API já subiu
- roda como usuário não-root (`app`)
- expõe a porta `8000`

### `frontend`

- gera a imagem a partir de `frontend/Dockerfile`
- usa Nginx para servir os arquivos estáticos
- faz proxy de `/api/` para o backend
- espera o backend estar saudável antes de iniciar
- roda como usuário não-root (`nginx`)
- expõe a porta `3000`

Esse desenho permite que o navegador fale com a mesma origem em produção, o que simplifica a experiência final e reduz problemas de CORS.

Os dois contextos de build também usam `.dockerignore` para cortar artefatos locais, caches e arquivos que não precisam entrar no build.

### Execução em um comando

A aplicação inteira sobe com:

```bash
docker compose up --build
```

## 5. Testes e validação

A base tem uma suíte pequena, mas bem focada, em `backend/tests/`.

### `test_fallback.py`

- valida que a busca e o detalhe retornam `source: "fixture"` quando a TMDB não está disponível
- valida que o mesmo fluxo responde `source: "tmdb"` quando o cliente é mockado para sucesso

### `test_ratings.py`

- cria um usuário com JWT válido
- faz `POST /api/ratings` duas vezes para o mesmo `tmdb_id`
- confirma que apenas uma linha persiste no banco
- confirma que a nota mais recente é a que fica salva

Os testes usam `pytest`, `TestClient` do FastAPI e SQLite temporário isolado por teste.

Na validação atual do repositório, o frontend também compila com `npm run build`.

## 6. Limitações e decisões assumidas

Algumas escolhas foram intencionais para manter o escopo do MVP enxuto:

- os detalhes do filme foram entregues como página dedicada, não como modal; o requisito aceita as duas abordagens
- não há refresh token
- não há revogação de sessão no servidor
- não há recuperação de senha
- não há verificação de e-mail
- não há login social
- não há migrações formais com Alembic
- não há suíte completa de integração end-to-end
Nenhum desses pontos impede a entrega atual de cumprir o objetivo do teste.

## 7. Conclusão

A aplicação ficou organizada com uma separação clara entre apresentação, estado de sessão, persistência e integração externa.

Os principais fluxos pedidos pelo teste estão cobertos:

- busca
- detalhe
- avaliação
- lista de filmes avaliados
- autenticação
- paginação / scroll infinito
- filtros
- cache

O resultado é uma base enxuta, explicável e funcional para o escopo do teste.
