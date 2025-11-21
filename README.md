# FiberNet Backend API

Backend Node.js/Express para integração do aplicativo FiberNet com GenieACS para gerenciamento de ONTs Huawei via TR-069/CWMP.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- GenieACS instalado e rodando
- ONTs Huawei configuradas para conectar no GenieACS

## 🚀 Instalação

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Porta do servidor
PORT=3000

# URL do GenieACS
GENIEACS_URL=http://localhost:7557
GENIEACS_USER=admin
GENIEACS_PASSWORD=admin

# API Key para autenticação
API_KEY=sua_chave_secreta_aqui
```

### 3. Iniciar o Servidor

**Modo Desenvolvimento:**
```bash
npm run dev
```

**Modo Produção:**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📡 Endpoints da API

### Health Check
```http
GET /health
```

### Informações da ONT
```http
GET /api/ont/:serialNumber/info
Headers:
  x-api-key: sua_api_key
```

**Resposta:**
```json
{
  "manufacturer": "Huawei",
  "model": "HG8245H5",
  "serialNumber": "HWTC12345678",
  "firmwareVersion": "V5R021C10S125",
  "uptime": 1234567,
  "temperature": 42,
  "opticalPower": {
    "rx": -18.5,
    "tx": 2.3
  }
}
```

### Dispositivos Conectados
```http
GET /api/ont/:serialNumber/devices
Headers:
  x-api-key: sua_api_key
```

**Resposta:**
```json
[
  {
    "id": "1",
    "name": "iPhone 13 Pro",
    "ipAddress": "192.168.1.100",
    "macAddress": "00:11:22:33:44:55",
    "connectionType": "wifi",
    "connected": true,
    "signalStrength": 92,
    "bandwidth": {
      "download": 120.5,
      "upload": 45.2
    }
  }
]
```

### Bloquear/Desbloquear Dispositivo
```http
POST /api/ont/:serialNumber/device/:macAddress/block
Headers:
  x-api-key: sua_api_key
  Content-Type: application/json

Body:
{
  "block": true
}
```

### Reiniciar ONT
```http
POST /api/ont/:serialNumber/reboot
Headers:
  x-api-key: sua_api_key
```

### Atualizar Dados da ONT
```http
POST /api/ont/:serialNumber/refresh
Headers:
  x-api-key: sua_api_key
```

### Listar Todas as ONTs
```http
GET /api/ont/list?manufacturer=Huawei&model=HG8245H5
Headers:
  x-api-key: sua_api_key
```

## 🔒 Segurança

### API Key Authentication

Todas as requisições devem incluir o header `x-api-key`:

```javascript
const response = await fetch('http://localhost:3000/api/ont/HWTC12345678/info', {
  headers: {
    'x-api-key': 'sua_api_key_aqui'
  }
});
```

### Rate Limiting

- 100 requisições por 15 minutos por IP (configurável via `.env`)
- Aumenta automaticamente em caso de tráfego legítimo alto

### CORS

Configure origens permitidas no `.env`:

```env
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081
```

## 🔧 Integração com GenieACS

### Parâmetros TR-069 Utilizados

#### Informações da ONT
- `DeviceID.Manufacturer`
- `DeviceID.ModelName`
- `DeviceID.SerialNumber`
- `DeviceID.SoftwareVersion`
- `Device.DeviceInfo.UpTime`
- `Device.DeviceInfo.Temperature`
- `Device.Optical.Interface.1.OpticalSignalLevel` (RX)
- `Device.Optical.Interface.1.TransmitOpticalLevel` (TX)

#### Dispositivos Conectados
- `Device.Hosts.Host.{i}.*` (Ethernet)
- `Device.WiFi.AccessPoint.{i}.AssociatedDevice.{i}.*` (WiFi)

#### Controles
- `Device.WiFi.AccessPoint.{i}.AssociatedDevice.{i}.Block` (Bloquear WiFi)
- `Device.DeviceInfo.Reboot` (Reiniciar)

## 🧪 Testes

### Testar com cURL

```bash
# Health Check
curl http://localhost:3000/health

# Informações da ONT
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/api/ont/HWTC12345678/info

# Dispositivos conectados
curl -H "x-api-key: sua_api_key" \
  http://localhost:3000/api/ont/HWTC12345678/devices

# Reiniciar ONT
curl -X POST -H "x-api-key: sua_api_key" \
  http://localhost:3000/api/ont/HWTC12345678/reboot
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to GenieACS"

1. Verifique se o GenieACS está rodando:
   ```bash
   curl http://localhost:7557/devices
   ```

2. Confirme a URL no `.env`:
   ```env
   GENIEACS_URL=http://localhost:7557
   ```

### Erro: "Device not found"

1. Liste todos os dispositivos no GenieACS:
   ```bash
   curl http://localhost:7557/devices
   ```

2. Verifique o serial number correto da ONT

### Logs

Os logs aparecem no console. Em produção, use um gerenciador de logs como PM2:

```bash
npm install -g pm2
pm2 start server.js --name fibernet-api
pm2 logs fibernet-api
```

## 📚 Recursos

- [GenieACS Documentation](https://github.com/genieacs/genieacs/wiki)
- [TR-069 Specification](https://www.broadband-forum.org/technical/download/TR-069.pdf)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

## 📄 Licença

MIT License - FiberNet Telecom
