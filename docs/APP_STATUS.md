# App Status

Resumo interno do estado atual do Pixel Breeders.

## O que já está entregue

- Busca de filmes no TMDB com paginação e scroll infinito
- Filtro por ano e gênero
- Página de detalhes do filme
- Sistema de avaliação de 1 a 5
- Upsert de avaliação para o mesmo `tmdb_id` por usuário, sem duplicar linhas no banco
- Página de filmes avaliados
- Cache em memória para busca e detalhes do TMDB
- Autenticação com cadastro, login, JWT e senha com `bcrypt`
- Sessão persistida em `localStorage`
- Rotas de avaliação protegidas por usuário
- Fallback local de filmes com campo `source` explícito (`tmdb` ou `fixture`)
- Testes automatizados pontuais com `pytest` cobrindo fallback do TMDB e upsert de avaliação autenticada

## O que ainda falta

- Refresh token e revogação de sessão no servidor
- Recuperação de senha
- Verificação de e-mail
- Login social/OAuth
- Migrações formais com Alembic
- Suíte completa de integração cobrindo todo o fluxo de autenticação, permissões por usuário e cenários adjacentes

## Observações de entrega

- O projeto foi mantido em FastAPI para preservar a arquitetura já implementada.
- O banco atual assume volume novo ou recriado quando a autenticação é ativada.
- As mensagens de erro da autenticação estão em português para melhorar a UX do teste.
- O frontend restaura a sessão a partir do `localStorage` e derruba a sessão apenas quando uma rota protegida responde `401`; não existe revalidação automática do token no boot.
