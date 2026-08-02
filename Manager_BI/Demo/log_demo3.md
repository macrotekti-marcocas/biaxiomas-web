# Registro Técnico de Desarrollos - Demo 3 (BPM, Catálogos & Alertas Odoo-style)

Este archivo contiene el resumen completo de los cambios de diseño, maquetación e interactividad implementados en la **Demo 3** de SONIC BI, emulando la interfaz moderna de Odoo.

---

## 1. Módulo del Catálogo de Plantillas (Flujo del Proceso)

*   **Rediseño de Cabecera:**
    *   Ubicación del título `"Plantillas de Procesos"` a la izquierda del subheader.
    *   Botón `"Nuevo"` externo en la esquina superior derecha junto al paginador responsivo (`1-5 / N < >`).
*   **Buscador Odoo-style (Centro):**
    *   Admite chips o tags dinámicos basados en filtros y grupos activos.
    *   Desplegable con 3 columnas:
        *   **Filtros:** "En Proceso", "En Pausa", "Terminadas", "Con Tareas Vencidas".
        *   **Agrupar por:** "Cliente" y "Creador / Capturista".
        *   **Favoritos:** Almacenamiento local persistente (`localStorage`) de combinaciones de filtros, incluyendo favoritos por defecto.
*   **Paginación y Agrupación:**
    *   Paginado real de 5 elementos en la tabla general.
    *   Agrupación dinámica que intercala filas divisorias de grupo con iconos de carpeta indicando la cantidad de elementos.

---

## 2. Diseñador de Flujos (BPM Designer)

*   **Estructuración Interna:**
    *   Botón `"Listado Plantillas"` en la parte izquierda superior con una diagonal para el folio de la plantilla (`PL-0001`).
    *   Desplazamiento del botón `"Nuevo"` a la derecha exterior.
    *   Paginación circular entre plantillas con flechas izquierda y derecha.
*   **Barra de Estado Odoo (Esquina Superior Derecha):**
    *   Barra interactiva con estados: `En Proceso`, `En Pausa` y `Terminada` con colores representativos activos y gris para los inactivos.
*   **Indicadores de SLA y Tiempos:**
    *   Ubicación de `"Fecha de Arranque"` y `"Tiempo Consumido"` (cronómetro dinámico) en el bloque superior derecho, justo debajo de la barra de estados.
*   **Márgenes Ajustados:**
    *   Márgenes negativos responsivos (`-mt-3 sm:-mt-5`) y reducción de espaciado vertical (`space-y-2.5`) para optimizar la visualización de la gráfica Gantt.

---

## 3. Historial de Actividades (Chatter Odoo-style)

*   **Dropdown "Acción":**
    *   Botón discreto de engrane `"Acción"` en el subheader del BPM Designer que despliega la opción de `"Historial"`.
*   **Drawer Lateral:**
    *   Panel oculto que se desliza desde el lado derecho con animaciones CSS (`activity-history-drawer`).
    *   Muestra una línea de tiempo del chatter estructurada por fechas con avatares de usuario y horas relativas.
*   **Registro Automatizado de Acciones:**
    *   Registra cambios de estado, formateando los cambios con el estilo tachado (ej. ~~En Proceso~~ → **Terminada**).
    *   Registra cambios en los parámetros y descripciones de las tareas tras su edición.

---

## 4. Estandarización de Catálogos (Nodos, Departamentos y Personal)

Aplicamos la misma estructura visual y de controles de Odoo a las vistas de administración:

*   **Catálogo de Nodos:**
    *   **Filtros:** Comercial, Campo, Soporte.
    *   **Agrupamiento:** Especialista Asignado.
*   **Departamentos:**
    *   **Filtros:** Con personal vs. Sin personal.
    *   **Agrupamiento:** Responsable del departamento.
*   **Personal:**
    *   **Filtros:** Comercial, Soporte / Campo, Control / Supervisor.
    *   **Agrupamiento:** Departamento Asignado.
*   **Paginación:**
    *   Paginación individual e independiente de a 5 filas por tabla.

---

## 5. Alertas de SLA en Tiempo Real

Homologamos la sección de alertas siguiendo los mismos lineamientos visuales y de interacción:

*   **Eliminación de Elementos Obsoletos:**
    *   Se eliminó la barra de filtros original (botones de estado antiguos y checkbox "Ver tareas en otros estados").
    *   Se retiraron las columnas **Inicio - Fin**, **Descripción** y **Acciones** de la tabla.
    *   Se reubicó el texto de la descripción justo debajo del nombre de la actividad/tarea para aprovechar mejor el espacio horizontal y mostrar más información sin truncar.
*   **Controles Odoo-style:**
    *   **Universo de Tareas Completo por Defecto:** Al no haber ningún filtro de estado marcado, la tabla lista el 100% de las tareas de todas las plantillas activas. Se removió la opción redundante de "Ver otros estados" del buscador.
    *   **Filtros de Estado Reactivos:** Permite aislar registros que estén únicamente en estado **Vencidos**, **Por Vencer** o **Por Reincidencia** al marcar su respectivo checkbox.
    *   **Agrupamiento Dinámico:** Por Cliente o Responsable (con cabeceras grupales y conteo).
    *   **Favoritos:** Almacenamiento local persistente (`localStorage`).
    *   **Paginación Real:** Bloques de 20 registros controlados por chevrons `< >`.
*   **Ajuste de Margen:**
    *   Reducción de margen superior (`-mt-3 sm:-mt-5`) alineado con el resto del dashboard.

## 6. Centro de Notificaciones (Campana)

Reemplazamos el botón de Recorrido Simulado por una Campana de Notificaciones interactiva al estilo de Odoo:
*   **Eventos Notificados en Caliente:**
    *   **Creación de Plantilla:** Cuando se genera un nuevo flujo de proceso en el modelador visual.
    *   **Alerta del Portal del Cliente:** Cuando el cliente reporta una nueva falla desde el portal ([index2.html](file:///C:/INVENTOR/SONIC_BI/Manager_BI/Demo/index2.html)), creando un ticket y una tarea inicial.
    *   **Aceptación de Tarea:** Cuando un técnico acepta la tarea asignada desde su pantalla móvil.
    *   **Cambio a Por Vencer:** Cuando el SLA restante de una tarea entra en el rango del último 25% de su tiempo.
    *   **Cambio a Vencido:** Cuando una tarea excede su tiempo de SLA programado.
    *   **Completado de Tarea:** Cuando un técnico finaliza un ticket/tarea.
    *   **Mensajes de Chat:** Respuestas tanto en el chat de DM del backoffice como en el simulador móvil.
*   **Interacciones y Navegación Inteligente:**
    *   Un globo rojo sobre la campana muestra el número de notificaciones no leídas de manera animada.
    *   Al dar clic en una notificación, se marca como leída y redirige automáticamente a la pestaña correspondiente: las alertas y creación de plantillas (incluyendo los reportes del portal) cargan el proceso específico y abren el **Diseñador BPM**, mientras que los chats e inicios de tareas te abren la conversación del técnico implicado.
    *   Incluye opciones para "Marcar todo como leído" y "Borrar todas".
    *   Sincronizado multi-ventana a través de `localStorage`.

---

## 7. Archivos Principales Afectados

*   **[index3.html](file:///C:/INVENTOR/SONIC_BI/Manager_BI/Demo/index3.html):** Centro de notificaciones, buscador Odoo-style en las 5 listas, Acción dropdown, chatter.
*   **[app3.js](file:///C:/INVENTOR/SONIC_BI/Manager_BI/Demo/app3.js):** Lógica del centro de notificaciones (campana), filtrado reactivo de alertas, paginación, log de chatter y chat de comunicación.
*   **[index2.html](file:///C:/INVENTOR/SONIC_BI/Manager_BI/Demo/index2.html) y [app2.js](file:///C:/INVENTOR/SONIC_BI/Manager_BI/Demo/app2.js):** Envío de reportes por el cliente inyectando plantillas y disparando notificaciones sincronizadas.
