# 🤖 FiberBot - Chatbot Inteligente com IA

## Visão Geral

O FiberBot é um assistente inteligente que:
- ✅ **Aprende hábitos** do cliente (horários, serviços favoritos)
- ✅ **Faz perguntas contextuais** para diagnosticar melhor
- ✅ **Analisa problemas de IPTV** verificando sinal óptico
- ✅ **Verifica instabilidades** no DownDetector em tempo real
- ✅ **Personaliza respostas** baseado no histórico do cliente

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      FiberBot                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐     ┌────────────────┐             │
│  │  aiService    │────▶│  OpenAI/       │             │
│  │               │     │  OnSpace AI    │             │
│  └───────────────┘     └────────────────┘             │
│          │                                             │
│          │                                             │
│          ▼                                             │
│  ┌───────────────┐     ┌────────────────┐             │
│  │ Customer      │────▶│  AsyncStorage  │             │
│  │ Profile       │     │  (Local)       │             │
│  └───────────────┘     └────────────────┘             │
│          │                                             │
│          │                                             │
│          ▼                                             │
│  ┌───────────────┐     ┌────────────────┐             │
│  │ DownDetector  │────▶│  External API  │             │
│  │ Service       │     └────────────────┘             │
│  └───────────────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Configuração

### Opção 1: OpenAI (Recomendado)

**Vantagens:**
- ✅ Respostas muito inteligentes e contextuais
- ✅ Aprende rápido com o cliente
- ✅ Melhor compreensão de linguagem natural

**Desvantagens:**
- ❌ Custo por uso (~$0.01 por 100 conversas)
- ❌ Requer chave de API

**Setup:**

1. Criar conta OpenAI: https://platform.openai.com/

2. Obter API Key: https://platform.openai.com/api-keys

3. Configurar no app:
```env
# .env
EXPO_PUBLIC_AI_PROVIDER=openai
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

4. Configurar no backend:
```env
# backend/.env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
```

**Custo Estimado:**
- Modelo: `gpt-4o-mini`
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- Média: ~300 tokens por conversa
- **~$0.01 por 100 conversas**

---

### Opção 3: Modo Básico (Sem IA)

**Vantagens:**
- ✅ Sem custo
- ✅ Funciona offline
- ✅ Sem dependências externas

**Desvantagens:**
- ❌ Não aprende hábitos
- ❌ Respostas menos inteligentes
- ❌ Perguntas genéricas

**Setup:**

```env
# .env
EXPO_PUBLIC_AI_PROVIDER=none
```

---

## Como Funciona

### 1. Aprendizado de Hábitos

O FiberBot armazena informações do cliente localmente:

```typescript
{
  userId: "user123",
  habits: [
    "Sempre assiste Netflix à noite",
    "Joga online todo dia às 20h"
  ],
  commonIssues: [
    "IPTV travando",
    "WiFi fraco no quarto"
  ],
  favoriteServices: [
    "Netflix",
    "Instagram",
    "YouTube"
  ],
  preferredContactTime: "20:00 - 22:00",
  interactions: 15
}
```

### 2. Perguntas Contextuais

**Exemplo sem IA:**
```
Usuário: "Meu IPTV está travando"
Bot: "Vou verificar seu sinal..."
```

**Exemplo com IA:**
```
Usuário: "Meu IPTV está travando"
Bot: "Entendi que o IPTV está travando. Qual serviço você está usando? 
     Netflix, YouTube, ou algum provedor de IPTV específico?"

Usuário: "Netflix"
Bot: "Vou analisar seu sinal e verificar se há problema no Netflix..."

[Análise de Sinal]
✅ Sinal: -18.5 dBm (Excelente)
✅ Conexão FiberNet: Perfeita

[Verificação DownDetector]
⚠️ Netflix apresenta instabilidade reportada por 1.2k usuários
📍 Principais problemas: Streaming travando (45%)
🔗 Mais detalhes: https://downdetector.com.br/fora-do-ar/netflix

Bot: "Seu sinal está perfeito! O problema é no servidor do Netflix.
     Recomendo aguardar a normalização do serviço."
```

### 3. Diagnóstico de IPTV

O FiberBot sempre segue este fluxo para IPTV:

```
1. Cliente reclama de IPTV
   ↓
2. Bot pergunta qual serviço
   ↓
3. Cliente informa (Netflix, YouTube, IPTV)
   ↓
4. Bot analisa sinal óptico
   ↓
5. Sinal bom (> -25 dBm)?
   ├─ SIM → Verifica DownDetector
   │         └─ Informa que problema é do serviço
   │
   └─ NÃO → Informa sinal ruim
             └─ Sugere reiniciar ONT
```

**Exemplo Prático:**

```
Usuário: "IPTV travando"

Bot: "Qual serviço de IPTV você está usando? 
     (Netflix, YouTube, IPTV próprio, etc.)"

Usuário: "Netflix"

Bot: [Analisa sinal = -18.5 dBm (Bom)]
     "Seu sinal está ótimo! Vou verificar se há problema no Netflix..."
     
     [Consulta DownDetector]
     ✅ Netflix funcionando normalmente
     
     "Não há instabilidade reportada no Netflix. 
     Pode ser problema temporário ou de cache.
     Tente fechar e abrir o app novamente."
```

**Outro Exemplo (Sinal Ruim):**

```
Usuário: "IPTV travando"

Bot: "Qual serviço de IPTV você está usando?"

Usuário: "YouTube"

Bot: [Analisa sinal = -28.0 dBm (Ruim)]
     
     📶 Sinal Óptico: -28.0 dBm (Abaixo do ideal)
     ⚠️ Seu sinal está fraco, o que pode causar travamento.
     
     💡 Recomendação:
     1. Reinicie o equipamento na aba "Conexão"
     2. Se persistir, abra um chamado técnico
     
     O problema não é do YouTube, é da sua conexão.
```

---

## Personalização do Prompt

O prompt do sistema pode ser customizado em `services/aiService.ts`:

```typescript
private buildSystemPrompt(profile, context): string {
  return `
Você é o FiberBot, assistente da FiberNet.

PERSONALIDADE:
- Sempre questionador e curioso
- Aprende hábitos do cliente
- Proativo em diagnosticar problemas

REGRAS DE DIAGNÓSTICO:
1. IPTV/Streaming travando:
   - SEMPRE pergunte qual serviço específico
   - Verifique o sinal óptico
   - Se sinal bom (> -25 dBm), pode ser problema do serviço
   - Sugira verificar no DownDetector

2. Internet lenta:
   - Pergunte qual dispositivo
   - Sugira teste de velocidade
   
...
  `;
}
```

---

## Testes

### Testar Aprendizado

```typescript
// No app, envie mensagens:
"Sempre assisto Netflix à noite"
"Jogo online todo dia às 20h"

// Depois feche e reabra o app
// O FiberBot deve lembrar:
"Olá novamente! Vi que você sempre assiste Netflix à noite 
e joga online todo dia às 20h. Como posso te ajudar hoje?"
```

### Testar Diagnóstico IPTV

```
Usuário: "IPTV travando"
Bot: "Qual serviço você está usando?"

Usuário: "Netflix"
Bot: [Verifica sinal + DownDetector]
     [Responde com diagnóstico completo]
```

### Testar DownDetector

```
Usuário: "Instagram não abre"
Bot: [Verifica DownDetector automaticamente]
     "⚠️ Instagram apresenta instabilidade..."
```

---

## Logs e Debug

### Habilitar Logs

```typescript
// services/aiService.ts
console.log('AI Response:', aiResponse);
console.log('Customer Profile:', profile);
```

### Ver Perfil do Cliente

```typescript
import { customerProfileService } from '@/services/customerProfileService';

const profile = await customerProfileService.getProfile(userId);
console.log(profile);
```

---

## Limitações

### Modo Básico (Sem IA)
- ❌ Não aprende hábitos (mas armazena perfil)
- ❌ Respostas genéricas
- ✅ DownDetector funciona
- ✅ Análise de sinal funciona

### Com IA
- ✅ Aprende hábitos
- ✅ Perguntas contextuais
- ✅ Diagnóstico inteligente
- ⚠️ Requer conexão internet
- ⚠️ Custo por uso (OpenAI)

---

## Roadmap

### v1.1 (Próxima versão)
- [ ] Integração com sinal real da ONT
- [ ] Histórico de conversas com busca
- [ ] Sugestões proativas (notificações)
- [ ] Análise de velocidade em tempo real

### v2.0 (Futuro)
- [ ] Multilingue (EN, ES)
- [ ] Voice input (fala → texto)
- [ ] Integração com WhatsApp
- [ ] Dashboard de analytics do chatbot

---

## Suporte

### Problemas Comuns

**IA não responde:**
1. Verifique API key
2. Verifique créditos OpenAI
3. Veja logs do console

**Não aprende hábitos:**
1. Verifique se `EXPO_PUBLIC_AI_PROVIDER` está configurado
2. Limpe cache: `AsyncStorage.clear()`

**DownDetector não funciona:**
1. Verifique `EXPO_PUBLIC_DOWNDETECTOR_API_KEY`
2. Fallback para mock data está ativo

---

## Contribuindo

Para adicionar novos recursos ao FiberBot:

1. **Novo serviço de IA:** Adicione em `services/aiService.ts`
2. **Nova regra de diagnóstico:** Edite `buildSystemPrompt()`
3. **Novo serviço DownDetector:** Adicione em `services/downDetectorService.ts`

---

## Licença

MIT License - FiberNet Telecom
