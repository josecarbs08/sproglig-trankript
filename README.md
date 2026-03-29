# Sproglig Transkript

Una aplicación web avanzada diseñada para la transcripción en vivo y pensada para la enseñanza/aprendizaje de idiomas (Alemán y Español). Creada con una estética minimalista ("Light Theme") orientada a la concentración, permite capturar audio del micrófono en tiempo real, generar resúmenes automáticos usando IA, y exportarlos fácilmente o sincronizarlos en la nube.

## ✨ Características Principales

- **Transcripción en Tiempo Real:** Reconocimiento de voz continuo (Speech-To-Text) ideal para dictados, clases o conversaciones.
- **Soporte Bilingüe Veloz:** Alterna entre Alemán (`de-DE`) y Español (`es-MX`) al instante, sin recargar la página.
- **Diseño Premium Minimalista:** Interfaz limpia sin distracciones, centrada plenamente en el contenido.
- **Minireproductor (Picture in Picture):** Activa el modo PiP para mantener una pequeña ventana con los últimos fragmentos de texto 항상 visible sobre otras aplicaciones.
- **Auto-guardado & Supabase:** Evita pérdidas de datos con auto-guardado local y sincronización con tu base de datos Supabase.
- **Resúmenes Modulares:** Soporta la lógica para generar resúmenes condensados que luego pueden ser exportados de manera estructurada.
- **Exportación Versátil:** Guarda tus sesiones como Texto plano (.txt), Markdown (.md) o JSON optimizado para pasarlo directamente a **Notion**.


## ⌨️ Atajos de Teclado y Control Global

El proyecto está diseñado para funcionar de manera ágil sin usar el ratón. 
Dentro de la aplicación (cuando la pestaña está activa), tienes los siguientes atajos:

- `Alt + 1` → Cambia el idioma a **Alemán** (verás un destello azul en el botón).
- `Alt + 2` → Cambia el idioma a **Español** (verás un destello azul en el botón).
- `Espacio` → Pausa o reanuda la grabación (solo si no estás escribiendo en algún input).

### 🔌 Extensión de Chrome (Atajos Globales)

Sproglig Transkript incluye una extensión para Chrome/Brave/Edge que te permite usar los atajos de idioma y pausa **sin importar en qué pestaña estés navegando**. Si estás leyendo un PDF en otra pestaña, puedes presionar `Alt+1` para que empiece a escuchar en alemán.

**Cómo instalar la Extensión en tu navegador:**
1. Abre tu navegador y ve a la ruta de extensiones (en Chrome/Brave: `chrome://extensions`).
2. Activa el **"Modo de desarrollador"** (Developer mode) en la esquina superior derecha.
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta **`extension`** que se encuentra *dentro* del código de este proyecto.

¡Listo! Notarás que la app detecta la extensión y lanzará una notificación visual ('Extensión conectada'). 
Los atajos globales son:
- `Alt + 1` → Cambiar a Alemán.
- `Alt + 2` → Cambiar a Español.
- `Alt + Espacio` → Iniciar/Pausar la transcripción desde cualquier lado.


## 🚀 Instalación y Despliegue Local

Asegúrate de tener Node.js instalado en tu computadora.

1. **Clonar e instalar dependencias:**
   Descarga el código y abre una terminal en la carpeta principal. Luego corre:
   ```bash
   npm install
   ```

2. **Configurar Entorno (Variables Secretas):**
   - Crea un archivo llamado `.env` en la raíz de tu proyecto (junto a `package.json`).
   - Añade tus claves secretas conectando el ID de tu proyecto actual en Supabase:
     ```env
     VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
     VITE_SUPABASE_ANON_KEY=tu_token_anon_aqui
     ```
   > [!WARNING]  
   > El archivo `.env` ya está protegido en el `.gitignore`. Nunca compartas tus contraseñas reales ni las subas a un repositorio público.

3. **Ejecutar la app:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador y permite los permisos de Micrófono cuando se te solicite.

## 🛠️ Stack Tecnológico

- HTML5, CSS3, JavaScript Vanilla
- Vite (Empaquetador y Servidor para entorno local)
- Web Speech API (Motor nativo del navegador)
- Supabase Serverless SDK (Persistencia)
- Chrome Extensions API (Atajos globales mediante Message Passing)
