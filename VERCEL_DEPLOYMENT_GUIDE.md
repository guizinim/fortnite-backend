# 🚀 Guia de Deployment no Vercel

## ✅ O que foi feito no Backend

1. **Refatorado para Vercel Serverless**
   - `src/index.ts` agora exporta a Express app (não faz `listen()` em produção)
   - Criado `api/index.ts` como entry point do Vercel
   - Atualizado `vercel.json` com configuração serverless

2. **Dependências atualizadas**
   - Substituído `bcrypt` por `bcryptjs` (sem binários nativos)
   - Adicionado suporte a Firebase Admin SDK com credenciais via env var

3. **Build local testado**
   - `npm run build` compila com sucesso
   - Código TypeScript convertido para JavaScript

## 📋 Configuração no Vercel Dashboard

### Passo 1: Conectar GitHub (já feito?)
- Vercel → Import Project
- Selecione: `guizinim/fortnite-backend`
- Clique em "Import"

### Passo 2: Adicionar Variável de Ambiente Crítica
1. Vá para **Settings → Environment Variables**
2. Clique em **"Add New"**
3. Preencha:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Cole o JSON inteiro do seu `.env` local (a chave privada completa do Firebase)
   - **Environments**: Selecione `Production` (mínimo)
4. Clique em **"Save"**

### Passo 3: Deploy
- Você pode:
  - **Opção A**: Clicar em **"Deployments"** → redeploy automático
  - **Opção B**: Fazer um novo push no GitHub `main` → redeploy automático
  - **Opção C**: Usar o Deploy Hook (se tiver criado)

### Passo 4: Verificar Deployment
1. Vá para **Deployments** e acompanhe o build
2. Após build completar, teste o endpoint:
   ```
   https://fortnite-backend-m97v.vercel.app/health
   ```
3. Se retornar `{"status":"ok"}`, ✅ backend está rodando!

## 🔗 URLs Importantes

- **Backend Production**: `https://fortnite-backend-m97v.vercel.app`
- **Endpoints da API**:
  - Health Check: `GET /health`
  - Register: `POST /api/auth/register`
  - Login: `POST /api/auth/login`
  - Users: `GET /api/users`, `POST /api/users`, etc.

## 🐛 Troubleshooting

### Se o deploy falhar:
1. Vá para **Deployments** → clique no deploy falhado
2. Abra a aba **"Logs"** e procure por erros
3. Principais culpados:
   - ❌ `FIREBASE_SERVICE_ACCOUNT_JSON` não configurada
   - ❌ JSON malformado (copiar com comentários)
   - ❌ Variável não salva corretamente

### Se tiver erro `SyntaxError: Unexpected token '#'`:
- A variável `FIREBASE_SERVICE_ACCOUNT_JSON` tem comentários
- Copie **APENAS** o JSON, sem linhas começadas com `#` ou `//`

### Se tiver erro `CORS blocked`:
- Frontend e backend estão em domínios diferentes
- Isso é esperado e o CORS já está configurado: `cors({ origin: true, credentials: true })`

## 📝 Para o Frontend

Use estas URLs para chamar o backend:

```javascript
const API_URL = 'https://fortnite-backend-m97v.vercel.app';

// Exemplo: Login
fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'senha123' })
})
```

## 🔐 Segurança

✅ Credenciais Firebase NÃO estão no GitHub
✅ Credenciais armazenadas apenas no Vercel (variáveis de ambiente)
✅ `.env` local está em `.gitignore`

---

**Próximo Passo**: Configure a variável `FIREBASE_SERVICE_ACCOUNT_JSON` no Vercel e faça o deploy!
