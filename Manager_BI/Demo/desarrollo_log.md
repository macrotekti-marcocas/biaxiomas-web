# Registro de Desarrollo y Arquitectura: SONICBI Demo
**Fecha de finalización:** Julio 2026
**Ubicación:** `C:\INVENTOR\SONIC_BI\Demo`

Este documento consolida todo el trabajo de desarrollo de software, diseño de interfaz (UI/UX) y arquitectura técnica implementada en el prototipo funcional (MVP) de **SONICBI**. 

---

## 1. Arquitectura Técnica y Stack Tecnológico
La demo está construida bajo una arquitectura de **Single Page Application (SPA)** sin dependencias de un servidor backend real, lo cual la hace ideal para demostraciones portátiles y ultrarrápidas.

* **Frontend Framework:** Vanilla JavaScript (ES6+), HTML5, y CSS3.
* **Sistema de Diseño (Styling):** **Tailwind CSS** (vía CDN) configurado con paletas de colores corporativos personalizados (`brand: blue`).
* **Visualización de Datos:** **Chart.js** implementado para crear gráficas responsivas e interactivas (Barras, Dona, Líneas, Radar, Araña).
* **Iconografía:** **Lucide Icons** para consistencia visual moderna y corporativa.
* **Persistencia de Datos:** Utilización exhaustiva del API de `localStorage` del navegador para simular una base de datos en tiempo real (estado de tareas, cotizaciones, configuraciones de RRHH y preferencias de tema).

---

## 2. Desarrollo de Módulos (Panel Administrativo - `index.html`)

El corazón de SONICBI, enfocado en el control interno y la orquestación operativa.

### 2.1. Dashboard Principal (Command Center)
* **KPIs Core:** Visualización dinámica de Cumplimiento Global (SLA), Eficiencia Operativa e Ingresos vs. Costos.
* **Motor de Alertas por IA:** Panel superior que inyecta notificaciones estructuradas simulando algoritmos de Machine Learning (ej. desviaciones de SLA o fallas críticas predictivas).

### 2.2. Inteligencia de Negocios (BI) / Creador de Reportes
* **Cruce de Silos:** Interfaz dinámica que permite seleccionar dimensiones operativas (ej. "Tiempo de Inducción") contra métricas financieras (ej. "Tasa de Errores") para dibujar una gráfica comparativa instantánea, demostrando la capacidad de cruzar datos de distintos departamentos.

### 2.3. CRM & Motor de Procesos de Negocio (BPM)
* **Gestor de Cotizaciones:** Generación y aprobación de presupuestos comerciales. Al aprobar una cotización, el sistema genera automáticamente el esquema operativo.
* **Diagrama de Gantt Interactivo:** Visualización cronológica de tareas interconectadas.
* **Bloqueos de Inteligencia Financiera:** Capacidad programada donde una deuda comercial (factura vencida en el CRM) bloquea *automáticamente* la asignación de tareas técnicas en campo (BPM), previniendo pérdida de capital.

### 2.4. Control de Compras e Inventario
* **Simulación OCR:** Interfaz que simula la lectura automatizada (PDF/Imagen) de facturas de proveedores y extrae partidas (ej. bobinas de fibra).
* **Gestor de Stock:** Integración para trasladar partidas aprobadas directamente al inventario físico. Cuadrícula de stock que calcula métricas predictivas de agotamiento.

### 2.5. Gestión de Talento (Recursos Humanos)
* **Expedientes Avanzados:** Base de datos del personal estructurada. Muestra certificaciones técnicas y un *Radar Chart* interactivo evaluando parámetros clave (Puntualidad, Velocidad, Trato al cliente).

### 2.6. Rastreador GPS y Operaciones de Campo
* **Mapa Simulado (Geofencing):** Panel dividido con un mapa vectorial/Canvas interactivo y una lista lateral que muestra la conectividad, batería y ubicación del personal desplegado.
* **Simulador Móvil (App Operador):** Un frame integrado que imita físicamente un smartphone (con *notch*). Permite a los técnicos ver sus tickets asignados y marcarlos como resueltos. Cualquier acción aquí actualiza bidireccionalmente el diagrama de Gantt del Dashboard.

---

## 3. Portal del Cliente (`index2.html`)

Un entorno Frontend completamente separado para que los clientes B2B (Corporativos) auto-gestionen sus servicios.

* **Diseño Limpio:** Adaptado con Tailwind CSS usando fondo claro corporativo para distinguirse del panel de ingeniería.
* **Mesa de Ayuda (Tickets):** Formulario para levantar incidencias que se reflejan en el CRM maestro.
* **Historial de Facturación:** Seguimiento de facturas pagadas y adeudadas.
* **Chatbot IA Integrado:** Ventana de soporte simulada que responde autónomamente dudas sobre estatus de red o asistencia comercial de Nivel 1.

---

## 4. Innovaciones de Experiencia de Usuario (UI/UX)

### 4.1. Asistente de Ventas Interactivo (Pitch Flotante)
Se desarrolló un motor global en JavaScript que detecta el atributo HTML `data-demo-guide`.
* **Comportamiento:** Al pasar el ratón sobre cualquier módulo, despliega un tooltip elegante explicando al cliente *qué* hace esa función, explicando acrónimos (SLA, OCR, MTTR) y aportando el **valor comercial / utilidad práctica**.
* **Lógica Anti-Estorbo:** El sistema fue programado para "recordar" qué tooltips ya se abrieron, previniendo que aparezcan constantemente y arruinen la fluidez de la presentación.

### 4.2. Tema Dinámico (Modo Claro / Oscuro)
* **Soporte Total Tailwind:** Todo el código CSS se refactorizó para usar clases `dark:` dinámicas.
* **Toggle Superior:** Botón físico que alterna `localStorage` y la clase `dark` del documento.
* **Gráficas Inteligentes:** Las instancias de Chart.js fueron interceptadas en código para que, al cambiar el tema, recalculen los colores de sus etiquetas y mallas divisorias, asegurando visibilidad perfecta (con colores unificados en Azul/Brand corporativo) bajo cualquier fondo.

---
*Este documento fue autogenerado como bitácora técnica de conclusión del MVP.*
