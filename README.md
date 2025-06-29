# N8N Webhook Scheduler

Una aplicación completa para programar y ejecutar webhooks desde n8n con interfaz web moderna.

## 🚀 Características

- **Recepción de webhooks desde n8n** - Endpoint REST para recibir datos de programación
- **Programación automática** - Ejecuta webhooks en fecha y hora específicas
- **Interfaz web moderna** - Dashboard completo con React y Tailwind CSS
- **Base de datos SQLite** - Almacenamiento persistente de webhooks y logs
- **Sistema de reintentos** - Reintenta webhooks fallidos automáticamente
- **Logs detallados** - Seguimiento completo de todas las ejecuciones
- **Modo oscuro** - Interfaz adaptable con tema claro/oscuro

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd n8n-webhook-scheduler
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp server/.env.example server/.env
```

4. **Iniciar en modo desarrollo**
```bash
npm run dev
```

Esto iniciará:
- Frontend en `http://localhost:5173`
- Backend en `http://localhost:3001`

## 🔧 Configuración en n8n

### 1. Crear workflow en n8n

1. Abre n8n y crea un nuevo workflow
2. Agrega los nodos necesarios para tu lógica
3. Al final, agrega un nodo **"HTTP Request"**

### 2. Configurar el nodo HTTP Request

**Configuración:**
- **Method:** `POST`
- **URL:** `http://localhost:3001/api/webhooks/receive`
- **Headers:** `Content-Type: application/json`

**Body (JSON):**
```json
{
  "name": "Mi Campaña",
  "scheduledDate": "2024-01-25",
  "scheduledTime": "16:00",
  "webhookUrl": "https://tu-webhook-destino.com",
  "message": "¡Hola! Este es mi mensaje",
  "leads": [
    {
      "name": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "phone": "+34 600 123 456",
      "company": "Mi Empresa"
    }
  ],
  "tags": ["campaña", "enero"],
  "maxRetries": 3
}
```

## 📡 API Endpoints

### Recibir webhook desde n8n
```
POST /api/webhooks/receive
```

### Obtener todos los webhooks
```
GET /api/webhooks
```

### Ejecutar webhook manualmente
```
POST /api/webhooks/:id/execute
```

### Eliminar webhook
```
DELETE /api/webhooks/:id
```

### Obtener logs
```
GET /api/webhooks/logs/all
```

### Obtener estadísticas
```
GET /api/webhooks/stats/summary
```

## 🗂️ Estructura del Proyecto

```
├── src/                    # Frontend React
│   ├── components/         # Componentes React
│   ├── hooks/             # Custom hooks
│   ├── types/             # Tipos TypeScript
│   └── api/               # Servicios API
├── server/                # Backend Node.js
│   ├── routes/            # Rutas Express
│   ├── services/          # Servicios de negocio
│   ├── database/          # Configuración BD
│   └── utils/             # Utilidades
└── package.json
```

## 🔄 Flujo de Trabajo

1. **n8n envía datos** → `POST /api/webhooks/receive`
2. **Backend valida y guarda** → Base de datos SQLite
3. **Scheduler verifica** → Cada minuto busca webhooks pendientes
4. **Ejecuta webhook** → Envía datos al URL destino
5. **Registra resultado** → Logs de éxito/error

## 🚀 Producción

### 1. Build del proyecto
```bash
npm run build
```

### 2. Iniciar servidor
```bash
npm start
```

### 3. Variables de entorno
```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://tu-dominio.com
```

## 🔧 Configuración Avanzada

### Scheduler
El sistema verifica webhooks pendientes cada minuto. Puedes ajustar esto modificando el cron job en `server/index.js`.

### Reintentos
Los webhooks fallidos se reintentan automáticamente según `maxRetries`. El estado cambia a `failed` después de agotar los reintentos.

### Timeout
Los webhooks tienen un timeout de 30 segundos por defecto. Configurable en `server/services/webhookExecutor.js`.

## 📊 Monitoreo

- **Dashboard** - Vista general de webhooks y estadísticas
- **Logs** - Historial detallado de ejecuciones
- **Estados** - pending, sent, failed, cancelled

## 🛡️ Seguridad

- Validación de datos de entrada
- Sanitización de URLs
- Headers de seguridad con Helmet
- CORS configurado
- Timeouts para prevenir colgados

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.