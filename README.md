# 🎮 Fortnite Backend

Backend API para gerenciamento de usuários, cosméticos e inventário do Fortnite, desenvolvido com Node.js, TypeScript e Firebase Firestore.

---

## Instruções para Rodar Localmente

### Pré-requisitos

- **Node.js** (versão 16+)
- **npm** ou **yarn** instalado
- Arquivo de credenciais Firebase (`banco-users-firebase-adminsdk-fbsvc-7ef36fcf4c.json`) na raiz do projeto

### Passos para Instalação e Execução

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Execute em modo desenvolvimento**
   ```bash
   npm run dev
   ```
   A API estará disponível em `http://localhost:4000`

3. **Build para produção**
   ```bash
   npm run build
   npm start
   ```

### Configuração do Firebase

criar um arquivo .env e adicionar:
FIREBASE_SERVICE_ACCOUNT_PATH = ".\banco-users-firebase-adminsdk-fbsvc-7ef36fcf4c.json"

---

## Tecnologias Utilizadas

| **Node.js** |
| **TypeScript** |
| **Express** |
| **Firebase Admin SDK** |

---

## Decisões Técnicas Relevantes

### 1. **Stack: Node.js + TypeScript + Express**
   - **Justificativa**: Oferece performance, tipagem segura e ecossistema maduro
   - **Benefício**: Reduz bugs em tempo de compilação, melhor experiência de desenvolvimento

### 2. **Firebase Firestore como Banco de Dados**
   - **Justificativa**: Banco NoSQL gerenciado, serverless, com autenticação integrada
   - **Benefício**: Escalabilidade automática, sem necessidade de gerenciar servidor de BD

### 3. **Padrão MVC com Separação de Camadas**
   ```
   Routes → Controllers → Services → Firebase
   ```
   - **Justificativa**: Separação de responsabilidades clara
   - **Benefício**: Código mais testável, manutenível e escalável

### 4. **Autenticação via Firebase Admin SDK**
   - **Justificativa**: Segurança integrada do Firebase, gerenciamento centralizado
   - **Benefício**: Reduz complexidade, permite autenticação sem servidor dedicado

### 5. **Bcrypt para Hash de Senhas**
   - **Justificativa**: Algoritmo seguro com salt automático
   - **Benefício**: Proteção contra ataques de força bruta

### 6. **Suporte a Importação via Excel (xlsx)**
   - **Justificativa**: Facilita importação em massa de dados (cosméticos, inventário)
   - **Benefício**: Simplifica alimentação inicial do banco sem queries SQL

### 7. **CORS Permissivo em Desenvolvimento**
   - **Justificativa**: Facilita testes com frontend local
   - **Observação**: Em produção, configurar origens específicas

### 8. **Variáveis de Ambiente com dotenv**
   - **Justificativa**: Separação entre configuração e código
   - **Benefício**: Mesmo código roda em dev, staging e produção com diferentes configs

---