# 🎬 MegaStreamHD — Site de Streaming Completo

## 📁 Estrutura dos Ficheiros

```
streaming/
├── index.html      → Site principal (frontend público)
├── admin.html      → Painel de administração
├── style.css       → Estilos do site
├── admin.css       → Estilos do painel admin
├── app.js          → Lógica do site
├── admin.js        → Lógica do painel admin
├── data.js         → Base de dados (localStorage) + dados de exemplo
└── README.md       → Este ficheiro
```

## 🚀 Como Usar

1. **Abra `index.html`** num navegador (Chrome recomendado)
2. O site carrega automaticamente com dados de exemplo
3. Para o painel admin, acesse `admin.html`

## 🔐 Acesso ao Admin

- **URL:** `admin.html`
- **Usuário:** `admin`
- **Senha:** `admin123`

> ⚠️ Altere a senha em: Admin → Configurações

---

## ✨ Funcionalidades do Site Público

| Funcionalidade | Status |
|---|---|
| Hero slider com autoplay | ✅ |
| Seções de filmes/séries na home | ✅ |
| Filtro por gênero (Filmes e Séries) | ✅ |
| Paginação na listagem | ✅ |
| Ordenação (Recentes, Avaliados, A-Z) | ✅ |
| Página de detalhes do conteúdo | ✅ |
| Seleção de temporada + lista de episódios | ✅ |
| Player de vídeo (YouTube, Google Drive, .mp4) | ✅ |
| Busca em tempo real | ✅ |
| Navegação por tecla `/` para buscar | ✅ |
| Sistema de comentários | ✅ |
| Adicionar à lista pessoal | ✅ |
| Cadastro e login de usuários | ✅ |
| Botão de compartilhamento | ✅ |
| Formulário de pedidos de conteúdo | ✅ |
| Scroll to top | ✅ |
| Design responsivo (mobile) | ✅ |
| Seção "Veja também" | ✅ |

---

## 🛠️ Painel de Administração

| Funcionalidade | Status |
|---|---|
| Dashboard com estatísticas | ✅ |
| Adicionar / Editar / Remover Filmes | ✅ |
| Adicionar / Editar / Remover Séries | ✅ |
| Gerenciar Temporadas (adicionar, renomear, remover) | ✅ |
| Adicionar / Editar / Remover Episódios | ✅ |
| URL do vídeo por episódio | ✅ |
| Gerenciar Banner Hero | ✅ |
| Visualizar e responder Pedidos | ✅ |
| Listar e remover Usuários | ✅ |
| Configurações do site (nome, banner, senha) | ✅ |
| Busca de conteúdo nas tabelas | ✅ |
| Seleção de gêneros com checkboxes | ✅ |
| Atalho para ir direto aos episódios | ✅ |

---

## 📺 Suporte de Vídeo

O player suporta:
- **YouTube** — cole o link normal do YouTube
- **Google Drive** — cole o link de incorporação
- **Vídeo direto** — cole um link `.mp4` direto

> Dica: Para Google Drive, vá em Compartilhar → qualquer pessoa com o link → copie o link de incorporação.

---

## 🎨 Design

Inspirado e fiel ao design do **MegaFilmesHD**:
- Fundo escuro `#0b0b0b`
- Azul primário `#1a8cff`
- Badges DUB / HD nos cards
- Header fixo com menus dropdown por gênero
- Banner informativo superior
- Cards com hover effect e overlay de play
- Página de série com seletor de temporadas

---

## 💾 Armazenamento

Todos os dados são salvos no **localStorage** do navegador com o prefixo `mshd_`.

Para resetar os dados: abra o console do navegador e execute:
```javascript
Object.keys(localStorage).filter(k => k.startsWith('mshd_')).forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## 🔧 Para Produção

Para usar em produção real, substitua o `localStorage` por:
- **Firebase Firestore** (grátis, fácil)
- **Supabase** (PostgreSQL grátis)
- **Backend Node.js + MongoDB**
O código JavaScript está organizado de forma modular para facilitar essa migração.

## 🔌 Configuração com Firebase (Firestore + Auth)

1. Crie um projeto no Firebase Console: https://console.firebase.google.com/
2. Habilite Firestore (modo de produção ou teste conforme preferir).
3. Habilite Authentication → Email/Password.
4. Copie as credenciais do Firebase (config object) e crie `firebase-config.js` na raiz do projeto com o conteúdo de exemplo:

```javascript
// firebase-config.js — NÃO comite este arquivo
const firebaseConfig = {
	apiKey: "YOUR_API_KEY",
	authDomain: "YOUR_PROJECT.firebaseapp.com",
	projectId: "YOUR_PROJECT",
	storageBucket: "YOUR_PROJECT.appspot.com",
	messagingSenderId: "...",
	appId: "...",
};

// SDKs via CDN são carregados em index.html/admin.html
```

5. Crie um usuário admin no Firebase Console (Authentication → Users) antes de remover o admin local.
6. Crie um documento em Firestore para conceder privilégios de administrador:

	- No Firestore, crie a coleção `admins` e adicione um documento com ID igual ao `uid` do usuário admin (obtido no painel Authentication). O documento pode estar vazio ou conter metadados, por exemplo `{ role: 'admin' }`.

	- Exemplo: `admins/{uid}` → `{ role: 'admin', email: 'seu@exemplo.com' }`.
6. Ao abrir o site, `data.js` tenta sincronizar com Firestore automaticamente se as credenciais estiverem presentes.

## Verificação de E-mail (Recomendado)

Este projeto exige verificação de e-mail para usuários públicos. Fluxo implementado:

- Ao registrar, o sistema envia um e-mail de verificação automaticamente.
- Usuários não verificados não conseguem manter sessão — serão desconectados e instruídos a verificar o e-mail.

Certifique-se de configurar o provedor de e-mail em Authentication → Templates e verificar que o domínio do remetente esteja autorizado.

## 🚀 Deploy no Netlify

1. Crie um repositório Git e faça push do projeto (exceto `firebase-config.js`).
2. Conecte o repositório no Netlify e configure o deploy (branch principal).
3. `netlify.toml` já está incluído e há um script de build que gera `supabase-config.js` a partir das variáveis de ambiente.
4. Defina as variáveis de ambiente no painel Netlify: `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
5. O repositório inclui `scripts/generate-supabase-config.sh` que gera `supabase-config.js` durante o build. Não comite chaves no código-fonte.

## 🔁 Migração para Supabase (passos rápidos)

1. Crie um projeto no Supabase e copie o `SUPABASE_URL` e a `anon` (publishable) key.
2. No SQL Editor do Supabase, execute `supabase-schema.sql` (está neste repositório) para criar tabelas e políticas RLS.
3. Crie um admin inicial executando no SQL Editor:

```sql
INSERT INTO public.admins (id, email, role) VALUES ('<USER_ID>', '<EMAIL>', 'admin');
```

4. No Netlify, adicione as variáveis de ambiente do site:

`SUPABASE_URL` = https://pqspqlrbjojuriqqmigt.supabase.co
`SUPABASE_ANON_KEY` = sb_publishable_f_0cKsxEfLg2RyBvV8YXyQ_DKxCQ4Oz

5. O deploy do Netlify executará `scripts/generate-supabase-config.sh` (via `netlify.toml`) que gera `supabase-config.js` em tempo de build usando as variáveis acima. Não comite a `service_role` key no frontend — use-a somente em backend/Functions.

Se quiser, eu executo os passos de atualização de `admin.js` e `create_admin.html` (já atualizei) e gero instruções completas para o painel Supabase.

## ⚠️ Segurança

- Não comite `firebase-config.js` em repositórios públicos. Está listado em `.gitignore`.
- Crie o usuário admin no Firebase Console antes de remover senhas locais.
- Reforce regras do Firestore para permitir apenas leitura pública e restrição de escrita para administradores (usar `uid` checks).
 - Reforce regras do Firestore para permitir apenas leitura pública e restrição de escrita para administradores (usar `uid` checks). Exemplo de regra básica:

```json
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /admins/{uid} {
			allow read: if request.auth != null && request.auth.uid == uid;
			allow write: if false; // crie via Console apenas
		}
		match /{document=**} {
			allow read: if true;
			allow write: if request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
		}
	}
}
```

