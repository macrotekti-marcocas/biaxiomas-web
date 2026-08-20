// Datos de las plantillas y flujos de procesos de la demo (ordenados por más nuevos primero)
// Datos de las plantillas y flujos de procesos de la demo (ordenados por más nuevos primero)
let templatesData = [];

// Alertas iniciales
let alertsData = [];

// --- DATOS RELACIONALES: DEPARTAMENTOS Y PERSONAL ---
let departmentsList = [];

let employeesList = [];
let channelsList = [];
let clientsList = [];

// Catálogo dinámico de especialistas sincronizado
let specialistsCatalog = [];
function syncSpecialistsCatalog() {
    specialistsCatalog = ["Sin Asignar", ...employeesList.map(e => `${e.name} (${e.role})`)];
}

// Listado de Estados Dinámicos / Personalizados
let statusesList = [
    "Pendiente",
    "Creado",
    "Por vencer",
    "Vencido",
    "Reincidencia Potencial",
    "Completado"
];

let selectedTemplateId = null;
let activeFilter = 'all';
let currentMobileScreen = 'list'; 
let opexSavedValue = 0.00;
let highlightedTaskId = null;
let reassigningAlertId = null;

// Variables de estado del Simulador Móvil
let currentMobileTech = "Técnico de Campo";
let mobileFilterActive = "Hoy"; // 'Hoy', 'Mañana', 'Semana'
let mobileDetailsTab = "details"; // 'details', 'falla'
let selectedMobileTaskId = null;
let selectedMobileTemplateId = null;
let mobileIsMenuOpen = false;
let mobileChatMessages = [];
let mobileTimerInterval = null;
let mobileTimerSeconds = 0;
let isTemplateExecutionPaused = false;
let activeTemplateElapsedSeconds = 0;

// Variables de estado para el buscador de Odoo y paginación
let tplListCurrentPage = 0;
const tplListPageSize = 50;
let odooFavorites = [];

let nodesListCurrentPage = 0;
const nodesListPageSize = 5;
let nodesFavorites = [];

let deptsListCurrentPage = 0;
const deptsListPageSize = 5;
let deptsFavorites = [];

let empsListCurrentPage = 0;
const empsListPageSize = 5;
let empsFavorites = [];

let alertsListCurrentPage = 0;
const alertsListPageSize = 20;
let alertsFavorites = [];

let notifications = [];

// Si hay token JWT, limpiar el estado local simulado anterior para forzar la sincronización con el servidor real
if (localStorage.getItem('sonicbi_token')) {
    localStorage.removeItem('bpms-state-sync');
    localStorage.removeItem('odoo_favorites');
    localStorage.removeItem('nodes_favorites');
    localStorage.removeItem('depts_favorites');
    localStorage.removeItem('emps_favorites');
    localStorage.removeItem('sales-orders-sync');
}

// Cargar estado inicial desde localStorage si ya existe, de lo contrario sincronizarlo
try {
    const savedState = localStorage.getItem("bpms-state-sync");
    let isValid = false;
    if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed && typeof parsed === 'object') {
            if (parsed.templatesData && Array.isArray(parsed.templatesData)) {
                templatesData = parsed.templatesData;
            }
            if (parsed.alertsData && Array.isArray(parsed.alertsData)) {
                alertsData = parsed.alertsData;
            }
            if (parsed.employeesList && Array.isArray(parsed.employeesList)) {
                employeesList = parsed.employeesList;
            }
            if (parsed.departmentsList && Array.isArray(parsed.departmentsList)) {
                departmentsList = parsed.departmentsList;
            }
            if (parsed.nodeLibraryList && Array.isArray(parsed.nodeLibraryList)) {
                nodeLibraryList = parsed.nodeLibraryList;
            }
            if (parsed.isTemplateExecutionPaused !== undefined) {
                isTemplateExecutionPaused = parsed.isTemplateExecutionPaused;
            }
            if (parsed.activeTemplateElapsedSeconds !== undefined) {
                activeTemplateElapsedSeconds = parsed.activeTemplateElapsedSeconds;
            }
            if (parsed.notifications && Array.isArray(parsed.notifications)) {
                notifications = parsed.notifications;
            }
            isValid = true;
        }
    }
    
    if (!isValid) {
        localStorage.setItem("bpms-state-sync", JSON.stringify({
            templatesData: templatesData,
            alertsData: alertsData,
            employeesList: employeesList,
            departmentsList: departmentsList,
            nodeLibraryList: nodeLibraryList,
            isTemplateExecutionPaused: false,
            activeTemplateElapsedSeconds: 0,
            timestamp: Date.now()
        }));
    }
} catch (e) {
    console.warn("No se pudo inicializar la persistencia desde localStorage:", e);
}

// Paginación de Tareas
let catalogPage = 1;
const catalogPageSize = 5;
let catalogFilteredTasks = [];

// Paginación de Plantillas
let tplCatalogPage = 1;
const tplCatalogPageSize = 3;
let tplCatalogFiltered = [];

// --- MODELADOR VISUAL DE SECUENCIAS CON PROPIEDADES PREDETERMINADAS ---
let nodeLibraryList = [
    { name: "Reporte Inicial", assigned: "Capturista (Backoffice)", timeVal: 1, unit: "dia", status: "Creado", observaciones: "Contacto inicial y registro de la solicitud del cliente." },
    { name: "Diagnóstico Técnico", assigned: "Tec. Juan Pérez (Campo)", timeVal: 2, unit: "hora", status: "Pendiente", observaciones: "Verificación de la falla y diagnóstico de causa raíz predictiva." },
    { name: "Gestión Comercial", assigned: "Lic. Ana Gómez (Comercial)", timeVal: 2, unit: "dia", status: "Pendiente", observaciones: "Elaboración de presupuesto y cotización del soporte." },
    { name: "Visita en Campo", assigned: "Tec. Juan Pérez (Campo)", timeVal: 1, unit: "dia", status: "Pendiente", observaciones: "Desplazamiento del especialista asignado al domicilio." },
    { name: "Pruebas e Integración", assigned: "Ing. Carlos Mendoza (Especialista)", timeVal: 1, unit: "hora", status: "Pendiente", observaciones: "Pruebas de conectividad y calibración del equipo." },
    { name: "Cierre y Firma", assigned: "Lic. Ana Gómez (Comercial)", timeVal: 30, unit: "min", status: "Pendiente", observaciones: "Obtención de firma digital de conformidad en simulador." }
];

let constructorAddedNodes = [];
let selectedConstructorNodeId = null;
let isBuilderEditMode = false;
let editingTemplateId = null;

// Estado de Edición de la sección de Catálogos / Nodos / Depts
let editingCatalogNodeIndex = null;
let editingDeptIndex = null;
let editingEmpIndex = null;

// Edición Rápida (Gantt)
let quickEditingTaskId = null;

async function cargarDatosDesdeBackend() {
    const token = localStorage.getItem('sonicbi_token');
    if (!token) return;

    try {
        // Cargar Catálogos
        const catRes = await fetch('/api/bpm/catalogs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (catRes.ok) {
            const catalogs = await catRes.json();
            employeesList = catalogs.employees || [];
            departmentsList = catalogs.departments || [];
            nodeLibraryList = catalogs.nodes || [];
            if (catalogs.statuses && Array.isArray(catalogs.statuses)) {
                catalogs.statuses.forEach(st => {
                    if (st && !statusesList.includes(st)) statusesList.push(st);
                });
            }
        }

        // Cargar Plantillas
        const tplRes = await fetch('/api/bpm/templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tplRes.ok) {
            templatesData = await tplRes.json();
        }

        // Cargar Notificaciones
        const notifRes = await fetch('/api/comms/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (notifRes.ok) {
            notifications = await notifRes.json();
        }

        // Cargar Canales de Chat
        const channelsRes = await fetch('/api/comms/channels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (channelsRes.ok) {
            channelsList = await channelsRes.json();
        }

        // Cargar Clientes
        const clientsRes = await fetch('/api/bpm/clients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (clientsRes.ok) {
            clientsList = await clientsRes.json();
            syncSalesClientsCatalog();
        }

        // Cargar Productos de la DB
        const productsRes = await fetch('/api/bpm/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (productsRes.ok) {
            salesProductsCatalog = await productsRes.json();
        }

        // Cargar Cotizaciones de la DB
        const salesOrdersRes = await fetch('/api/bpm/sales-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (salesOrdersRes.ok) {
            salesOrdersData = await salesOrdersRes.json();
        }
        syncStatusesWithCatalog();
        syncSpecialistsCatalog();
        renderPrioritariasAlerts();
        applyAlertsFilters();
        applyOdooFilters();
        applyNodesFilters();
        applyDeptsFilters();
        applyEmpsFilters();
        initDropdowns();
        renderNotifications();
        renderMobileScreen();
        
        // Re-renderizar chat sidebar dinámico
        renderCommChannels();
        renderCommDMs();
        
        if (selectedTemplateId) {
            loadTemplate(selectedTemplateId);
        }
        
    } catch (e) {
        console.error("Error al cargar datos desde el backend:", e);
    }
}

let socket = null;
function iniciarWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("WebSocket evento recibido:", data);
            
            await cargarDatosDesdeBackend();

            // Auto-desplegar la campanita de notificaciones al recibir un nuevo ticket/alerta
            if (data.event === 'notification_added') {
                const notif = data.notification;
                if (notif && typeof showSalesNotification === 'function') {
                    showSalesNotification(notif.title, "info");
                }
                const dropdownMenu = document.getElementById("notifications-dropdown-menu");
                if (dropdownMenu) {
                    dropdownMenu.classList.remove("hidden");
                }
            }

            // Reactividad en caliente para el chat del administrador
            if (data.event === 'chat_message' && data.message) {
                const msg = data.message;
                const currentUserName = localStorage.getItem('sonicbi_usuario') ? JSON.parse(localStorage.getItem('sonicbi_usuario')).nombre : 'Mitchell Admin';
                
                let isMatch = false;
                if (activeChatTarget) {
                    if (activeChatTarget.type === 'channel' && msg.chatType === 'channel') {
                        isMatch = activeChatTarget.name.toLowerCase() === msg.chatTarget.toLowerCase();
                    } else if (activeChatTarget.type === 'dm' && msg.chatType === 'dm') {
                        const targetClean = activeChatTarget.name.trim().toLowerCase();
                        const msgTargetClean = msg.chatTarget.trim().toLowerCase();
                        const msgSenderClean = msg.sender.trim().toLowerCase();
                        isMatch = targetClean === msgTargetClean || targetClean === msgSenderClean;
                    }
                }
                
                if (isMatch) {
                    const token = localStorage.getItem('sonicbi_token');
                    fetch(`/api/comms/chat/history?chatType=${activeChatTarget.type}&chatTarget=${encodeURIComponent(activeChatTarget.name)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(res => res.json())
                    .then(messages => {
                        renderChatHistory(messages);
                    });
                } else if (msg.sender !== currentUserName && !msg.sender.includes(currentUserName)) {
                    showSalesNotification(`Nuevo mensaje de @${msg.sender} en ${msg.chatType === 'channel' ? '#' : '@'}${msg.chatTarget}: "${msg.text}"`, "info");
                }
            }

            // Eventos del Cotizador Interactivo
            if (data.type === 'QUOTE_VIEWED') {
                if (typeof showSalesNotification === 'function') {
                    showSalesNotification(`👁️ El cliente ${data.client || ''} está visualizando la cotización ${data.orderId} ahora mismo.`, "info");
                }
                if (typeof currentSalesOrder !== 'undefined' && currentSalesOrder && currentSalesOrder.id === data.orderId && typeof loadVendorInteractions === 'function') {
                    loadVendorInteractions();
                }
            } else if (data.type === 'QUOTE_OPTIONS_CHANGED') {
                if (typeof showSalesNotification === 'function') {
                    showSalesNotification(`🔄 El cliente recalculó opciones en la cotización ${data.orderId}.`, "info");
                }
                if (typeof currentSalesOrder !== 'undefined' && currentSalesOrder && currentSalesOrder.id === data.orderId) {
                    currentSalesOrder.total = data.total;
                    if (typeof calculateSalesTotals === 'function') calculateSalesTotals();
                }
            } else if (data.type === 'QUOTE_SIGNED') {
                if (typeof showSalesNotification === 'function') {
                    showSalesNotification(`🎉 ¡Trato cerrado! El cliente ${data.client || ''} firmó la cotización ${data.orderId}. Convertido en Pedido de Venta.`, "success");
                }
                if (typeof currentSalesOrder !== 'undefined' && currentSalesOrder && currentSalesOrder.id === data.orderId) {
                    currentSalesOrder.state = "Pedido de venta";
                    if (typeof updateSalesPipelineVisuals === 'function') updateSalesPipelineVisuals("Pedido de venta");
                    if (typeof toggleSalesFormLock === 'function') toggleSalesFormLock(true);
                }
                const token = localStorage.getItem('sonicbi_token');
                fetch('/api/bpm/sales-orders', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(res => res.json())
                    .then(orders => { salesOrdersData = orders; if (typeof renderSalesTable === 'function') renderSalesTable(); });
            } else if (data.type === 'QUOTE_NEW_CHAT_MESSAGE' && data.remitente === 'Cliente') {
                if (typeof showSalesNotification === 'function') {
                    showSalesNotification(`💬 Mensaje del cliente en cotización ${data.orderId}: "${data.mensaje}"`, "info");
                }
                const dot = document.getElementById("vendor-chat-dot");
                if (dot) dot.classList.remove("hidden");
                if (typeof currentSalesOrder !== 'undefined' && currentSalesOrder && currentSalesOrder.id === data.orderId && typeof loadVendorChatComments === 'function') {
                    loadVendorChatComments();
                }
            }
        } catch (e) {
            console.error("Error en mensaje WebSocket:", e);
        }
    };

    socket.onclose = () => {
        console.log("WebSocket cerrado. Reintentando en 3s...");
        setTimeout(iniciarWebSocket, 3000);
    };
}

// ==========================================
// VISUALIZADOR DE EVIDENCIAS Y FIRMA
// ==========================================

window.openEvidenceModal = function(taskId) {
    console.log('[Evidence] openEvidenceModal called with taskId:', taskId, 'type:', typeof taskId);
    console.log('[Evidence] templatesData length:', templatesData ? templatesData.length : 'undefined');
    
    if (!templatesData || templatesData.length === 0) {
        console.warn('[Evidence] templatesData is empty or undefined');
        return;
    }
    
    let task = null;
    for (let tpl of templatesData) {
        if (tpl.tasks) {
            task = tpl.tasks.find(t => String(t.id) === String(taskId));
            if (task) {
                console.log('[Evidence] Found task:', task.name, 'evidencePhotos:', task.evidencePhotos ? task.evidencePhotos.length : 0, 'signature:', !!task.clientSignature);
                break;
            }
        }
    }
    
    if (!task) {
        console.warn('[Evidence] Task not found for id:', taskId);
        return;
    }

    const modal = document.getElementById('evidence-modal');
    const body = document.getElementById('evidence-modal-body');
    const subtitle = document.getElementById('evidence-modal-subtitle');
    
    if (!modal || !body) {
        console.warn('[Evidence] Modal elements not found in DOM');
        return;
    }

    subtitle.textContent = `Evidencias de la tarea: ${task.name}`;
    
    let html = "";
    
    const evidencePhotos = task.evidencePhotos || [];
    if (evidencePhotos.length > 0) {
        html += `<h4 class="font-bold text-slate-700 text-xs mb-3 border-b border-slate-200 pb-2">Fotografías (${evidencePhotos.length})</h4>`;
        html += `<div class="grid grid-cols-2 md:grid-cols-3 gap-3">`;
        evidencePhotos.forEach((photoBase64, idx) => {
            html += `
                <div class="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                    <img src="${photoBase64}" class="w-full h-auto max-h-48 object-contain rounded" alt="Evidencia ${idx+1}"/>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<p class="text-xs text-slate-500 italic">No hay fotografías registradas.</p>`;
    }

    if (task.clientSignature) {
        html += `<h4 class="font-bold text-slate-700 text-xs mb-3 mt-6 border-b border-slate-200 pb-2">Firma de Conformidad</h4>`;
        html += `
            <div class="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm p-4 flex justify-center h-48">
                <img src="${task.clientSignature}" class="h-full w-auto object-contain" alt="Firma del Cliente"/>
            </div>
        `;
    }

    body.innerHTML = html;

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modal.querySelector('.transform').classList.remove('scale-95');
    
    console.log('[Evidence] Modal opened successfully');
};

window.closeEvidenceModal = function() {
    const modal = document.getElementById('evidence-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('evidence-modal-body').innerHTML = '';
    }, 300);
};

async function ensureUserSession() {
    let token = localStorage.getItem('sonicbi_token');
    let usuarioStr = localStorage.getItem('sonicbi_usuario');

    if (!token || !usuarioStr) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@sonicbi.com',
                    password: 'admin123'
                })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('sonicbi_token', data.token);
                localStorage.setItem('sonicbi_usuario', JSON.stringify(data.usuario));
            }
        } catch (e) {
            console.error("Error al autenticar sesión por defecto:", e);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Asegurar sesión activa con token JWT
    await ensureUserSession();

    // 2. Iniciar carga asíncrona de datos desde la base de datos
    await cargarDatosDesdeBackend();
    
    // 3. Iniciar lógica de roles y permisos
    await initRBAC();
    
    // 4. Conectar WebSocket
    iniciarWebSocket();

    lucide.createIcons();
    updateTimeDisplay();
    initAlertsFavorites();
    initOdooFavorites();
    initNodesFavorites();
    initDeptsFavorites();
    initEmpsFavorites();
    startMobileGlobalClock();
    initSalesView();
    initComm();
    
    // Escuchar cambios de storage para sincronizar multi-ventana
    window.addEventListener("storage", handleStorageEventSync);

    // Cerrar dropdown de Odoo al hacer click fuera
    document.addEventListener("click", handleOdooClickOutside);
});

// Reloj
function updateTimeDisplay() {
    const timeDisplay = document.getElementById("current-time-display");
    if (timeDisplay) {
        const now = new Date();
        timeDisplay.innerText = now.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Alternar tabs y controlar visibilidad del Submenú de BPM (Nodos, Departamentos, Personal)
function switchTab(tabId) {
    const sections = ['view-loading', 'view-dashboard', 'view-alerts', 'view-bpmn', 'view-bpmn-designer', 'view-catalog-nodes', 'view-departments', 'view-personal', 'view-sales', 'view-sales-detail', 'view-clients', 'view-products', 'view-comm', 'view-config'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.style.display = '';
    }

    document.querySelectorAll(".nav-link").forEach(btn => {
        btn.classList.remove("bg-brand-50", "text-brand-500");
        btn.classList.add("text-slate-600");
    });

    document.querySelectorAll(".nav-link-sub").forEach(btn => {
        btn.classList.remove("bg-brand-50", "text-brand-500");
        btn.classList.add("text-slate-500");
    });

    const bpmnSubmenu = document.getElementById("bpmn-submenu");
    if (tabId === 'bpmn' || tabId === 'bpmn-designer' || tabId === 'catalog-nodes' || tabId === 'departments' || tabId === 'personal') {
        if (bpmnSubmenu) bpmnSubmenu.classList.remove('hidden');
        
        if (tabId === 'bpmn') {
            const activeBtn = document.getElementById(`btn-bpmn`);
            if (activeBtn) activeBtn.classList.add("bg-brand-50", "text-brand-500");
            renderTemplatesListView();
        } else if (tabId === 'bpmn-designer') {
            const activeBtn = document.getElementById(`btn-bpmn`);
            if (activeBtn) activeBtn.classList.add("bg-brand-50", "text-brand-500");
            loadTemplate(selectedTemplateId);
        } else if (tabId === 'catalog-nodes') {
            const activeSubBtn = document.getElementById(`btn-catalog-nodes`);
            if (activeSubBtn) activeSubBtn.classList.add("bg-brand-50", "text-brand-500");
            renderCatalogNodesView();
        } else if (tabId === 'departments') {
            const activeSubBtn = document.getElementById(`btn-departments`);
            if (activeSubBtn) activeSubBtn.classList.add("bg-brand-50", "text-brand-500");
            renderDepartmentsView();
        } else if (tabId === 'personal') {
            const activeSubBtn = document.getElementById(`btn-personal`);
            if (activeSubBtn) activeSubBtn.classList.add("bg-brand-50", "text-brand-500");
            renderPersonalView();
        }
    } else {
        if (bpmnSubmenu) bpmnSubmenu.classList.add('hidden');
        
        const activeTabId = (tabId === 'sales-detail') ? 'sales' : tabId;
        const activeBtn = document.getElementById(`btn-${activeTabId}`);
        if (activeBtn) {
            activeBtn.classList.add("bg-brand-50", "text-brand-500");
            activeBtn.classList.remove("text-slate-600");
        }
        
        if (tabId === 'clients') {
            const parentBtn = document.getElementById('btn-sales');
            if (parentBtn) {
                parentBtn.classList.add("bg-brand-50", "text-brand-500");
                parentBtn.classList.remove("text-slate-600");
            }
            renderClientsView();
        }

        if (tabId === 'products') {
            const parentBtn = document.getElementById('btn-sales');
            if (parentBtn) {
                parentBtn.classList.add("bg-brand-50", "text-brand-500");
                parentBtn.classList.remove("text-slate-600");
            }
            renderProductsView();
        }
        
        // Cargar datos especiales si es view-config
        if (tabId === 'config' && typeof loadAllRolePermissions === 'function') {
            loadAllRolePermissions();
            // Default sub-tab to roles
            switchConfigSubTab('roles');
        }

        if (tabId === 'dashboard') {
            renderDashboard();
        }
    }

    const viewTitle = document.getElementById("view-title");
    const viewSubtitle = document.getElementById("view-subtitle");
    const viewBadge = document.getElementById("view-badge");

    const subtitles = {
        'dashboard': 'Resumen operativo y anomalías críticas',
        'alerts': 'Seguimiento de compromisos de nivel de servicio en tiempo real',
        'bpmn': 'Modelado visual y asignación de tareas operativas.',
        'bpmn-designer': 'Modelado visual y asignación de tareas operativas.',
        'catalog-nodes': 'Biblioteca de tareas y actividades estandarizadas',
        'departments': 'Gestión de áreas y departamentos del proyecto',
        'personal': 'Administración de especialistas y técnicos de campo',
        'sales': 'Seguimiento de cotizaciones, presupuestos y órdenes de venta',
        'sales-detail': 'Edición y creación de cotizaciones de cliente',
        'clients': 'Catálogo de clientes, condiciones comerciales y accesos al portal',
        'comm': 'Centro de comunicaciones unificado (Omnicanal) con técnicos de campo',
        'config': 'Ajustes globales y roles del sistema'
    };
    if (viewTitle) {
        const titles = {
            'dashboard': 'Dashboard',
            'alerts': 'Alertas de SLA en Tiempo Real',
            'bpmn': 'Flujo del Proceso',
            'bpmn-designer': 'Diseñador de Flujos (BPM)',
            'catalog-nodes': 'Nodos', 
            'departments': 'Departamentos',
            'personal': 'Personal',
            'sales': 'Ventas - Cotizaciones',
            'sales-detail': 'Ventas - Cotización Detalle',
            'clients': 'Ventas - Clientes',
            'comm': 'Comunicaciones',
            'config': 'Configuración'
        };
        viewTitle.innerText = titles[tabId] || 'Manager Project';
        if (viewSubtitle) {
            viewSubtitle.classList.remove('hidden');
            viewSubtitle.innerText = subtitles[tabId] || '';
        }
        if (viewBadge) {
            if (tabId === 'bpmn' || tabId === 'bpmn-designer') {
                viewBadge.classList.remove('hidden');
            } else {
                viewBadge.classList.add('hidden');
            }
        }
    }

    lucide.createIcons();
    closeMobileSidebarIfOpen();
}

function toggleSidebarMenu() {
    const sidebar = document.getElementById("desktop-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar && backdrop) {
        const isHidden = sidebar.classList.contains("-translate-x-full");
        if (isHidden) {
            sidebar.classList.remove("-translate-x-full");
            sidebar.classList.add("translate-x-0");
            backdrop.classList.remove("hidden");
        } else {
            sidebar.classList.add("-translate-x-full");
            sidebar.classList.remove("translate-x-0");
            backdrop.classList.add("hidden");
        }
    }
}

function closeMobileSidebarIfOpen() {
    const sidebar = document.getElementById("desktop-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar && window.innerWidth < 1024 && !sidebar.classList.contains("-translate-x-full")) {
        sidebar.classList.add("-translate-x-full");
        sidebar.classList.remove("translate-x-0");
        if (backdrop) backdrop.classList.add("hidden");
    }
}

// Navegación bidireccional desde alertas al Diseñador de Flujos (BPM)
function navigateToTaskBpm(templateId, taskId) {
    // 1. Marcar la tarea a resaltar ANTES de cargar la plantilla
    highlightedTaskId = taskId;
    // 2. Setear la plantilla activa
    selectedTemplateId = templateId;
    // 3. switchTab('bpmn-designer') internamente llama loadTemplate(selectedTemplateId),
    //    lo que desplegará la plantilla con todas sus tareas ya resaltadas
    switchTab('bpmn-designer');
    // 4. Scroll suave hacia la fila resaltada
    setTimeout(() => {
        const rowEl = document.querySelector(".border-l-brand-500");
        if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

// Alertas prioritarias
function renderPrioritariasAlerts() {
    const container = document.getElementById("alerts-prioritarias-container");
    if (!container) return;
    container.innerHTML = "";

    const prioritarias = alertsData.filter(alert => alert.status === 'Vencido' || alert.status === 'Por vencer' || alert.status === 'Reincidencia Potencial');

    if (prioritarias.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic">No hay alertas críticas prioritarias activas.</p>`;
        return;
    }

    prioritarias.forEach(alert => {
        let alertStyle = "bg-amber-50 border-amber-200 text-amber-900";
        let iconName = "clock";
        let iconColorClass = "text-amber-600";
        
        if (alert.status === 'Vencido') {
            alertStyle = "bg-red-50 border-red-200 text-red-900";
            iconName = "alert-circle";
            iconColorClass = "text-accent-500";
        } else if (alert.status === 'Reincidencia Potencial') {
            alertStyle = "bg-red-100 border-red-300 text-red-900 animate-pulse";
            iconName = "alert-triangle";
            iconColorClass = "text-accent-600";
        }

        container.innerHTML += `
            <div class="flex items-start p-3.5 rounded-lg border ${alertStyle}">
                <i data-lucide="${iconName}" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${iconColorClass}"></i>
                <div class="flex-1">
                    <p class="text-sm font-semibold leading-snug">
                        <button onclick="navigateToTaskBpm('${alert.templateId}', ${alert.id})" class="text-left font-bold text-brand-500 hover:text-brand-700 hover:underline focus:outline-none transition-all">
                            ${alert.activity}
                        </button>
                        <span class="text-slate-400 font-normal">(${alert.client})</span>
                    </p>
                    <p class="text-xs text-slate-600 mt-1">${alert.description} | <span class="font-bold">${alert.timeRemaining}</span></p>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
    renderDashboard();
}

function renderDashboard() {
    // 1. Recopilar todas las tareas de templates y alertas
    let allTasks = [];
    const addedIds = new Set();
    
    // De templatesData
    templatesData.forEach(tpl => {
        const tplFolio = getTemplateFolio ? getTemplateFolio(tpl) : (tpl.id || "");
        const folioVal = getFolioNumericValue ? getFolioNumericValue(tplFolio) : 0;
        if (tpl.tasks && Array.isArray(tpl.tasks)) {
            tpl.tasks.forEach(t => {
                if (!addedIds.has(t.id)) {
                    addedIds.add(t.id);
                    
                    // SLA remaining calculation in seconds
                    let timeRemainingStr = t.timeRemaining || "En espera";
                    let remainingSecs = 0;
                    if (t.status !== 'Completado') {
                        const elapsed = getTaskElapsedTimeInSeconds ? getTaskElapsedTimeInSeconds(tpl, t) : 0;
                        remainingSecs = ((t.duration || 1) * 24 * 60 * 60) - elapsed;
                        timeRemainingStr = formatRemainingTime ? formatRemainingTime(remainingSecs, elapsed > 0) : timeRemainingStr;
                    } else {
                        timeRemainingStr = "Finalizado";
                    }

                    allTasks.push({
                        id: t.id,
                        name: t.name,
                        templateName: tpl.name,
                        templateFolio: tplFolio,
                        folioValue: folioVal,
                        client: tpl.client || "Cliente General",
                        assigned: t.assigned || "Sin Asignar",
                        description: t.description || t.observaciones || "Sin descripción",
                        status: t.status === 'Creado' ? 'Pendiente' : t.status,
                        timeRemaining: timeRemainingStr,
                        remainingSecs: remainingSecs,
                        urgencia: t.urgencia || 'Media',
                        templateId: tpl.id
                    });
                }
            });
        }
    });

    // De alertsData (por si hay alertas huérfanas o iniciales sueltas)
    if (alertsData && Array.isArray(alertsData)) {
        alertsData.forEach(a => {
            if (!addedIds.has(a.id)) {
                addedIds.add(a.id);
                allTasks.push({
                    id: a.id,
                    name: a.activity,
                    templateName: a.templateName,
                    templateFolio: a.templateFolio,
                    folioValue: a.folioValue || (getFolioNumericValue ? getFolioNumericValue(a.templateFolio) : 0),
                    client: a.client || "Cliente General",
                    assigned: a.assigned || "Sin Asignar",
                    description: a.description || "Sin descripción",
                    status: a.status,
                    timeRemaining: a.timeRemaining,
                    remainingSecs: a.status === 'Vencido' ? -1 : 999999,
                    urgencia: a.urgencia || 'Media',
                    templateId: a.templateId
                });
            }
        });
    }

    // 2. Calcular estadísticas (Top row)
    const openTasks = allTasks.filter(t => t.status !== 'Completado');
    const pendingTasks = allTasks.filter(t => t.status === 'Pendiente' || t.status === 'Creado');
    const dueTodayTasks = allTasks.filter(t => t.status !== 'Completado' && t.remainingSecs > 0 && t.remainingSecs <= 24 * 60 * 60);
    const overdueTasks = allTasks.filter(t => t.status === 'Vencido' || (t.status !== 'Completado' && t.remainingSecs <= 0));
    const warningTasks = allTasks.filter(t => t.status === 'Por vencer');
    const criticalTasks = allTasks.filter(t => t.status === 'Vencido' || t.status === 'Reincidencia Potencial' || (t.status !== 'Completado' && t.remainingSecs <= 0));

    // Inyectar contadores en cabecera
    const eOpen = document.getElementById("dash-stat-open");
    const ePending = document.getElementById("dash-stat-pending");
    const eDueToday = document.getElementById("dash-stat-duetoday");
    const eOverdue = document.getElementById("dash-stat-overdue");
    const eWarning = document.getElementById("dash-alert-warning");
    const eCritical = document.getElementById("dash-alert-critical");

    if (eOpen) eOpen.textContent = openTasks.length;
    if (ePending) ePending.textContent = pendingTasks.length;
    if (eDueToday) eDueToday.textContent = dueTodayTasks.length;
    if (eOverdue) eOverdue.textContent = overdueTasks.length;
    if (eWarning) eWarning.textContent = warningTasks.length;
    if (eCritical) eCritical.textContent = criticalTasks.length;

    // 3. Cumplimiento de SLA general
    const totalCount = allTasks.length || 1;
    const compliantCount = allTasks.length - overdueTasks.length;
    const compliancePercent = Math.round((compliantCount / totalCount) * 100);

    const eCompPercent = document.getElementById("dash-compliance-percent");
    const eCompPercentVal = document.getElementById("dash-compliance-percent-val");
    const eCompRatio = document.getElementById("dash-compliance-ratio");
    const eCompProgress = document.getElementById("dash-compliance-progress-bar");

    if (eCompPercent) eCompPercent.textContent = `${compliancePercent}%`;
    if (eCompPercentVal) eCompPercentVal.textContent = `${compliancePercent}%`;
    if (eCompRatio) eCompRatio.textContent = `${compliantCount} de ${allTasks.length} tareas`;
    if (eCompProgress) eCompProgress.style.width = `${compliancePercent}%`;

    // Procesos Completados
    const totalTpls = templatesData.length;
    const completedTpls = templatesData.filter(tpl => tpl.tasks && tpl.tasks.length > 0 && tpl.tasks.every(tk => tk.status === 'Completado')).length;
    const processPercent = totalTpls > 0 ? Math.round((completedTpls / totalTpls) * 100) : 0;

    const eProcPercent = document.getElementById("dash-process-percent");
    const eProcRatio = document.getElementById("dash-process-ratio");
    const eProcProgress = document.getElementById("dash-process-progress-bar");

    if (eProcPercent) eProcPercent.textContent = `${processPercent}%`;
    if (eProcRatio) eProcRatio.textContent = `${completedTpls} de ${totalTpls} procesos`;
    if (eProcProgress) eProcProgress.style.width = `${processPercent}%`;

    // 4. Indicadores circulares (Gauges)
    // Gauge 1: SLA Cumplido
    const p1 = compliancePercent;
    const g1 = document.getElementById("dash-gauge-1");
    const gVal1 = document.getElementById("dash-gauge-val-1");
    if (g1) g1.style.strokeDashoffset = 163 - (163 * p1 / 100);
    if (gVal1) gVal1.textContent = `${p1}%`;

    // Gauge 2: Plantillas en Proceso
    const activeTpls = templatesData.filter(tpl => !tpl.isPaused && tpl.tasks && tpl.tasks.some(tk => tk.status !== 'Completado')).length;
    const p2 = Math.round((activeTpls / (totalTpls || 1)) * 100);
    const g2 = document.getElementById("dash-gauge-2");
    const gVal2 = document.getElementById("dash-gauge-val-2");
    if (g2) g2.style.strokeDashoffset = 163 - (163 * p2 / 100);
    if (gVal2) gVal2.textContent = `${p2}%`;

    // Gauge 3: Por Vencer
    const p3 = Math.round((warningTasks.length / totalCount) * 100);
    const g3 = document.getElementById("dash-gauge-3");
    const gVal3 = document.getElementById("dash-gauge-val-3");
    if (g3) g3.style.strokeDashoffset = 163 - (163 * p3 / 100);
    if (gVal3) gVal3.textContent = `${p3}%`;

    // Gauge 4: Vencidas
    const p4 = Math.round((overdueTasks.length / totalCount) * 100);
    const g4 = document.getElementById("dash-gauge-4");
    const gVal4 = document.getElementById("dash-gauge-val-4");
    if (g4) g4.style.strokeDashoffset = 163 - (163 * p4 / 100);
    if (gVal4) gVal4.textContent = `${p4}%`;

    // 5. Tareas Críticas y Vencidas (Tabla)
    const criticalList = allTasks.filter(t => t.status === 'Vencido' || t.status === 'Por vencer' || t.status === 'Reincidencia Potencial' || t.remainingSecs <= 0);
    criticalList.sort((a, b) => {
        const severity = { 'Vencido': 3, 'Reincidencia Potencial': 2, 'Por vencer': 1 };
        return (severity[b.status] || 0) - (severity[a.status] || 0) || a.remainingSecs - b.remainingSecs;
    });

    const topCritical = criticalList.slice(0, 5);
    const eCritCount = document.getElementById("dash-critical-count");
    if (eCritCount) eCritCount.textContent = criticalList.length;

    const criticalTableBody = document.getElementById("dash-critical-table-body");
    if (criticalTableBody) {
        criticalTableBody.innerHTML = "";
        if (topCritical.length === 0) {
            criticalTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-4 text-center text-slate-400 italic">No hay tareas críticas ni vencidas.</td>
                </tr>
            `;
        } else {
            topCritical.forEach(t => {
                const techName = t.assigned || "Sin Asignar";
                const initials = techName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
                
                let priorityBadge = "";
                if (t.urgencia === 'Alta' || t.status === 'Vencido') {
                    priorityBadge = `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-150">Alta</span>`;
                } else if (t.urgencia === 'Media' || t.status === 'Por vencer') {
                    priorityBadge = `<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-150">Media</span>`;
                } else {
                    priorityBadge = `<span class="px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">Baja</span>`;
                }

                let slaClass = "text-slate-655 font-semibold";
                if (t.status === 'Vencido' || t.remainingSecs <= 0) {
                    slaClass = "text-rose-600 font-bold animate-pulse";
                } else if (t.status === 'Por vencer') {
                    slaClass = "text-amber-600 font-semibold";
                }

                criticalTableBody.innerHTML += `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                        <td class="py-3 pr-2">
                            <div class="font-bold text-slate-800">
                                <button onclick="navigateToTaskBpm('${t.templateId}', ${t.id})" class="text-left font-bold text-brand-500 hover:text-brand-700 hover:underline focus:outline-none transition-all">
                                    ${t.name}
                                </button>
                            </div>
                            <div class="text-[10px] text-slate-400 font-medium">${t.templateName} (${t.client})</div>
                        </td>
                        <td class="py-3 pr-2">
                            <div class="flex items-center gap-1.5">
                                <div class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
                                    ${initials}
                                </div>
                                <span class="text-slate-600 truncate max-w-[80px]">${techName.split(" ")[0]}</span>
                            </div>
                        </td>
                        <td class="py-3 pr-2 text-center">${priorityBadge}</td>
                        <td class="py-3 text-right ${slaClass}">${t.timeRemaining}</td>
                    </tr>
                `;
            });
        }
    }

    // 6. Alertas Recientes (Lista)
    const recentAlertsList = document.getElementById("dash-recent-alerts-list");
    if (recentAlertsList) {
        recentAlertsList.innerHTML = "";
        const topNotifs = notifications ? notifications.slice(0, 5) : [];
        if (topNotifs.length === 0) {
            recentAlertsList.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">No hay alertas ni actividades recientes.</p>`;
        } else {
            topNotifs.forEach(n => {
                let badgeType = "Warning";
                let badgeClass = "bg-amber-50 text-amber-700 border border-amber-250";
                if (n.type === 'vencido') {
                    badgeType = "Critical";
                    badgeClass = "bg-rose-50 text-rose-700 border border-rose-250 animate-pulse font-bold";
                } else if (n.type === 'completado' || n.type === 'confirm') {
                    badgeType = "Info";
                    badgeClass = "bg-blue-50 text-blue-700 border border-blue-250";
                }

                recentAlertsList.innerHTML += `
                    <div class="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <p class="text-xs text-slate-700 leading-relaxed flex-1">${n.title}</p>
                        <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider shrink-0 ${badgeClass}">${badgeType}</span>
                    </div>
                `;
            });
        }
    }

    // 7. Carga de Trabajo de Técnicos (Tabla)
    const techTableBody = document.getElementById("dash-technicians-table-body");
    if (techTableBody) {
        techTableBody.innerHTML = "";
        const workload = {};
        
        if (employeesList && Array.isArray(employeesList)) {
            employeesList.forEach(e => {
                workload[e.name] = { active: 0, completed: 0, role: e.role || "Técnico" };
            });
        }
        workload["Sin Asignar"] = { active: 0, completed: 0, role: "N/A" };
        
        allTasks.forEach(t => {
            let assigned = t.assigned || "Sin Asignar";
            if (assigned.includes(" (")) {
                assigned = assigned.split(" (")[0];
            }
            if (!workload[assigned]) {
                workload[assigned] = { active: 0, completed: 0, role: "Técnico" };
            }
            if (t.status === 'Completado') {
                workload[assigned].completed++;
            } else {
                workload[assigned].active++;
            }
        });

        if (workload["Sin Asignar"].active === 0 && workload["Sin Asignar"].completed === 0) {
            delete workload["Sin Asignar"];
        }

        const workloadArray = Object.keys(workload).map(name => ({
            name: name,
            role: workload[name].role,
            active: workload[name].active,
            completed: workload[name].completed
        }));
        
        workloadArray.sort((a, b) => b.active - a.active || b.completed - a.completed);

        if (workloadArray.length === 0) {
            techTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="py-4 text-center text-slate-400 italic">No hay datos de personal técnico.</td>
                </tr>
            `;
        } else {
            workloadArray.forEach(tech => {
                techTableBody.innerHTML += `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                        <td class="py-3 pr-2 flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-655 flex items-center justify-center font-bold text-xs shadow-sm border border-slate-200/50">
                                <i data-lucide="user" class="w-3.5 h-3.5"></i>
                            </div>
                            <div>
                                <div class="font-bold text-slate-800">${tech.name}</div>
                                <div class="text-[10px] text-slate-400 font-medium">${tech.role}</div>
                            </div>
                        </td>
                        <td class="py-3 pr-2 text-center text-slate-700 font-bold">${tech.active}</td>
                        <td class="py-3 text-right text-emerald-600 font-bold">${tech.completed}</td>
                    </tr>
                `;
            });
        }
    }

    // Dibujar los iconos Lucide
    if (lucide && lucide.createIcons) {
        lucide.createIcons();
    }
}

// Alertas de tabla
// Alertas de tabla
function renderAlertsTable() {
    applyAlertsFilters();
}

function initAlertsFavorites() {
    const saved = localStorage.getItem("alerts_favorites");
    if (saved) {
        alertsFavorites = JSON.parse(saved);
    } else {
        alertsFavorites = [];
    }
}

function renderAlertsFavoritesList() {
    const container = document.getElementById("alerts-favorites-list");
    if (!container) return;
    if (alertsFavorites.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic">No hay favoritos guardados</div>`;
        return;
    }
    container.innerHTML = alertsFavorites.map((fav, index) => {
        return `
            <div class="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded select-none">
                <button onclick="applyAlertsFavoriteByIndex(${index})" class="flex-1 text-left hover:text-brand-500 truncate text-slate-700">
                    ${fav.name}
                </button>
                <button onclick="deleteAlertsFavorite(${index})" class="text-red-500 hover:text-red-755 text-xs font-bold focus:outline-none">
                    ×
                </button>
            </div>
        `;
    }).join("");
}

function applyAlertsFavoriteByIndex(index) {
    const fav = alertsFavorites[index];
    if (fav) {
        document.getElementById("filter-alert-vencido").checked = !!fav.filters.vencido;
        document.getElementById("filter-alert-porvencer").checked = !!fav.filters.porvencer;
        document.getElementById("filter-alert-reincidencia").checked = !!fav.filters.reincidencia;
        document.getElementById("filter-alert-others").checked = !!fav.filters.others;
        const radios = document.getElementsByName("group-alerts");
        radios.forEach(r => { if (r.value === fav.groupBy) r.checked = true; });
        applyAlertsFilters();
        closeAlertsSearchDropdown();
    }
}

function deleteAlertsFavorite(index) {
    alertsFavorites.splice(index, 1);
    localStorage.setItem("alerts_favorites", JSON.stringify(alertsFavorites));
    renderAlertsFavoritesList();
}

function saveAlertsFavorite() {
    const nameInput = document.getElementById("new-alert-favorite-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Por favor, ingresa un nombre para el favorito.");
        return;
    }
    const filters = {
        vencido: document.getElementById("filter-alert-vencido")?.checked || false,
        porvencer: document.getElementById("filter-alert-porvencer")?.checked || false,
        reincidencia: document.getElementById("filter-alert-reincidencia")?.checked || false,
        others: document.getElementById("filter-alert-others")?.checked || false
    };
    let groupByVal = "none";
    document.getElementsByName("group-alerts").forEach(r => { if (r.checked) groupByVal = r.value; });
    alertsFavorites.push({ name, filters, groupBy: groupByVal });
    localStorage.setItem("alerts_favorites", JSON.stringify(alertsFavorites));
    if (nameInput) nameInput.value = "";
    renderAlertsFavoritesList();
}

function toggleAlertsSearchDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("alerts-search-dropdown");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderAlertsFavoritesList();
            lucide.createIcons();
        }
    }
}

function showAlertsSearchDropdown() {
    const el = document.getElementById("alerts-search-dropdown");
    if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        renderAlertsFavoritesList();
        lucide.createIcons();
    }
}

function closeAlertsSearchDropdown() {
    const el = document.getElementById("alerts-search-dropdown");
    if (el) el.classList.add("hidden");
}

function removeAlertsTag(actionId) {
    if (actionId === 'search') {
        const inp = document.getElementById("alerts-search-input");
        if (inp) inp.value = "";
    } else if (actionId.startsWith('filter-')) {
        const chk = document.getElementById(actionId);
        if (chk) chk.checked = false;
    } else if (actionId === 'group-none') {
        const radios = document.getElementsByName("group-alerts");
        radios.forEach(r => { if (r.value === 'none') r.checked = true; });
    }
    applyAlertsFilters();
}

function getFolioNumericValue(folioStr) {
    if (!folioStr) return 0;
    const match = String(folioStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function applyAlertsFilters() {
    const searchInp = document.getElementById("alerts-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkVencido = document.getElementById("filter-alert-vencido")?.checked;
    const chkPorVencer = document.getElementById("filter-alert-porvencer")?.checked;
    const chkReincidencia = document.getElementById("filter-alert-reincidencia")?.checked;
    
    let groupByVal = "none";
    document.getElementsByName("group-alerts").forEach(r => { if (r.checked) groupByVal = r.value; });
    
    // Chips
    const tagsContainer = document.getElementById("alerts-search-tags");
    if (tagsContainer) {
        let tagsHtml = "";
        if (searchText) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] select-none">
                    "${searchText}"
                    <button onclick="removeAlertsTag('search')" class="hover:text-slate-950 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkVencido) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-red-50 text-red-755 font-semibold px-2 py-0.5 rounded border border-red-150 text-[10px] select-none">
                    Vencidos
                    <button onclick="removeAlertsTag('filter-alert-vencido')" class="hover:text-red-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkPorVencer) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-amber-50 text-amber-755 font-semibold px-2 py-0.5 rounded border border-amber-150 text-[10px] select-none">
                    Por Vencer
                    <button onclick="removeAlertsTag('filter-alert-porvencer')" class="hover:text-amber-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkReincidencia) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-orange-50 text-orange-755 font-semibold px-2 py-0.5 rounded border border-orange-150 text-[10px] select-none">
                    Por Reincidencia
                    <button onclick="removeAlertsTag('filter-alert-reincidencia')" class="hover:text-orange-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (groupByVal !== 'none') {
            const label = groupByVal === 'client' ? 'Cliente' : 'Responsable';
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-teal-50 text-teal-755 font-semibold px-2 py-0.5 rounded border border-teal-150 text-[10px] select-none">
                    Agrupado: ${label}
                    <button onclick="removeAlertsTag('group-none')" class="hover:text-teal-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        tagsContainer.innerHTML = tagsHtml;
    }
    
    // 1. Recopilar origen de datos: ¡Siempre todas las tareas de todas las plantillas!
    let sourceData = [];
    const addedIds = new Set();
    
    templatesData.forEach(tpl => {
        const tplFolio = getTemplateFolio(tpl);
        const folioVal = getFolioNumericValue(tplFolio);
        tpl.tasks.forEach(t => {
            if (!addedIds.has(t.id)) {
                addedIds.add(t.id);
                
                let badgeColor = "bg-slate-150 text-slate-650 border border-slate-200";
                if (t.status === 'Completado') {
                    badgeColor = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                } else if (t.status === 'Pendiente' || t.status === 'Creado') {
                    badgeColor = "bg-slate-100 text-slate-600 border border-slate-200";
                } else if (t.status === 'Vencido') {
                    badgeColor = "bg-red-105 text-red-800 border border-red-200 animate-pulse font-bold";
                } else if (t.status === 'Por vencer') {
                    badgeColor = "bg-amber-100 text-amber-850 border border-amber-200";
                } else if (t.status === 'Reincidencia Potencial') {
                    badgeColor = "bg-accent-500 text-white animate-pulse";
                }
                
                sourceData.push({
                    id: t.id,
                    activity: t.name,
                    templateName: tpl.name,
                    templateFolio: tplFolio,
                    folioValue: folioVal,
                    client: tpl.client || "Cliente General",
                    assigned: t.assigned || "Sin Asignar",
                    description: t.description || t.observaciones || "Sin descripción",
                    startFin: t.dateRange || "Fecha de ejecución",
                    timeRemaining: t.timeRemaining || (t.status === 'Completado' ? 'Finalizado' : 'En espera'),
                    status: t.status === 'Creado' ? 'Pendiente' : t.status,
                    badgeColor: badgeColor,
                    templateId: tpl.id
                });
            }
        });
    });

    // Añadir alertas iniciales sueltas que no residan en las plantillas activas
    alertsData.forEach(a => {
        if (!addedIds.has(a.id)) {
            addedIds.add(a.id);
            if (a.folioValue === undefined) {
                a.folioValue = getFolioNumericValue(a.templateFolio);
            }
            sourceData.push(a);
        }
    });

    // 2. Ordenar por número de Folio de mayor a menor (el folio último/más alto va primero)
    sourceData.sort((a, b) => (b.folioValue || 0) - (a.folioValue || 0));

    // 3. Calcular SLA en caliente para tareas no completadas
    sourceData.forEach(item => {
        if (item.status === 'Completado') {
            item.timeRemaining = "Finalizado";
            item.badgeColor = "bg-emerald-100 text-emerald-800 border border-emerald-200";
            return;
        }
        
        const tpl = templatesData.find(t => t.id === item.templateId);
        const task = tpl ? tpl.tasks.find(tk => tk.id === item.id) : null;
        if (tpl && task) {
            const elapsed = getTaskElapsedTimeInSeconds(tpl, task);
            const remaining = (task.duration * 24 * 60 * 60) - elapsed;
            item.timeRemaining = formatRemainingTime(remaining, elapsed > 0);
            
            if (!tpl.isPaused && task.status !== 'Reincidencia Potencial' && task.status !== 'Creado' && task.status !== 'Completado') {
                const totalDuration = (task.duration || 1) * 24 * 60 * 60;
                const tplFolio = getTemplateFolio(tpl);
                const clientName = tpl.client || "Cliente General";
                if (remaining <= 0) {
                    if (task.status !== 'Vencido') {
                        addNotification(`SLA Excedido (Vencido): Tarea "${task.name.replace(/^\d+\.\s*/, "")}" en plantilla [${tplFolio}] "${tpl.name}" (Cliente: ${clientName})`, 'vencido', { templateId: tpl.id });
                    }
                    task.status = 'Vencido';
                    task.color = 'bg-red-500 border border-red-300 text-white';
                    item.status = 'Vencido';
                    item.badgeColor = "bg-red-105 text-red-800 border border-red-200 animate-pulse font-bold";
                } else if (remaining / totalDuration <= 0.25 && elapsed > 0) {
                    if (task.status !== 'Por vencer') {
                        addNotification(`SLA Por vencer: Tarea "${task.name.replace(/^\d+\.\s*/, "")}" en plantilla [${tplFolio}] "${tpl.name}" (Cliente: ${clientName})`, 'porvencer', { templateId: tpl.id });
                    }
                    task.status = 'Por vencer';
                    task.color = 'bg-amber-500 border border-amber-300 text-white';
                    item.status = 'Por vencer';
                    item.badgeColor = "bg-amber-100 text-amber-850 border border-amber-200";
                } else if (elapsed > 0 && task.status === 'Pendiente') {
                    task.status = 'En Proceso';
                    task.color = 'bg-blue-500 text-white';
                    item.status = 'En Proceso';
                    item.badgeColor = "bg-blue-100 text-blue-800 border border-blue-200";
                }
            }
        }
    });
    
    // 4. Filtrar por texto (cliente, tarea, responsable, folio, plantilla)
    let filtered = sourceData.filter(alert => {
        if (searchText) {
            const query = searchText.toLowerCase();
            const actMatch = (alert.activity || "").toLowerCase().includes(query);
            const cliMatch = (alert.client || "").toLowerCase().includes(query);
            const assMatch = (alert.assigned || "").toLowerCase().includes(query);
            const descMatch = (alert.description || "").toLowerCase().includes(query);
            const tplMatch = (alert.templateName || "").toLowerCase().includes(query);
            const folioMatch = (alert.templateFolio || "").toLowerCase().includes(query);
            if (!actMatch && !cliMatch && !assMatch && !descMatch && !tplMatch && !folioMatch) return false;
        }
        
        if (chkVencido || chkPorVencer || chkReincidencia) {
            let match = false;
            if (chkVencido && alert.status === 'Vencido') match = true;
            if (chkPorVencer && alert.status === 'Por vencer') match = true;
            if (chkReincidencia && alert.status === 'Reincidencia Potencial') match = true;
            if (!match) return false;
        }
        return true;
    });
    
    // 5. Paginación
    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / alertsListPageSize) - 1);
    if (alertsListCurrentPage > maxPage) alertsListCurrentPage = maxPage;
    
    const startIdx = totalCount === 0 ? 0 : alertsListCurrentPage * alertsListPageSize;
    const endIdx = Math.min(startIdx + alertsListPageSize, totalCount);
    
    const paginationLabel = document.getElementById("alerts-pagination-label");
    if (paginationLabel) {
        paginationLabel.innerText = totalCount === 0 ? "0 / 0" : `${startIdx + 1}-${endIdx} / ${totalCount}`;
    }
    
    const paginated = filtered.slice(startIdx, endIdx);
    renderAlertsListTableContent(paginated, groupByVal);

    // Actualizar badges globales
    const activeCount = sourceData.filter(a => a.status !== 'Completado' && a.status !== 'Resuelto').length;
    const badgeAlertsCount = document.getElementById("badge-alerts-count");
    if (badgeAlertsCount) {
        badgeAlertsCount.innerText = activeCount;
    }
    const kpiAlertsCount = document.getElementById("kpi-alerts-count");
    if (kpiAlertsCount) {
        kpiAlertsCount.innerText = activeCount;
    }
}

function navigateAlertsList(direction) {
    const searchInp = document.getElementById("alerts-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    const chkVencido = document.getElementById("filter-alert-vencido")?.checked;
    const chkPorVencer = document.getElementById("filter-alert-porvencer")?.checked;
    const chkReincidencia = document.getElementById("filter-alert-reincidencia")?.checked;
    
    let sourceData = [];
    const addedIds = new Set();
    
    templatesData.forEach(tpl => {
        const tplFolio = getTemplateFolio(tpl);
        const folioVal = getFolioNumericValue(tplFolio);
        tpl.tasks.forEach(t => {
            if (!addedIds.has(t.id)) {
                addedIds.add(t.id);
                sourceData.push({
                    id: t.id,
                    activity: t.name,
                    templateName: tpl.name,
                    templateFolio: tplFolio,
                    folioValue: folioVal,
                    client: tpl.client || "Cliente General",
                    assigned: t.assigned || "Sin Asignar",
                    description: t.description || t.observaciones || "Sin descripción",
                    status: t.status,
                    templateId: tpl.id
                });
            }
        });
    });

    alertsData.forEach(a => {
        if (!addedIds.has(a.id)) {
            addedIds.add(a.id);
            if (a.folioValue === undefined) {
                a.folioValue = getFolioNumericValue(a.templateFolio);
            }
            sourceData.push(a);
        }
    });

    sourceData.sort((a, b) => (b.folioValue || 0) - (a.folioValue || 0));

    let filtered = sourceData.filter(alert => {
        if (searchText) {
            const query = searchText.toLowerCase();
            const actMatch = (alert.activity || "").toLowerCase().includes(query);
            const cliMatch = (alert.client || "").toLowerCase().includes(query);
            const assMatch = (alert.assigned || "").toLowerCase().includes(query);
            const descMatch = (alert.description || "").toLowerCase().includes(query);
            const tplMatch = (alert.templateName || "").toLowerCase().includes(query);
            const folioMatch = (alert.templateFolio || "").toLowerCase().includes(query);
            if (!actMatch && !cliMatch && !assMatch && !descMatch && !tplMatch && !folioMatch) return false;
        }
        if (chkVencido || chkPorVencer || chkReincidencia) {
            let match = false;
            if (chkVencido && alert.status === 'Vencido') match = true;
            if (chkPorVencer && alert.status === 'Por vencer') match = true;
            if (chkReincidencia && alert.status === 'Reincidencia Potencial') match = true;
            if (!match) return false;
        }
        return true;
    });

    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / alertsListPageSize) - 1);
    
    if (direction === 'prev') {
        alertsListCurrentPage--;
        if (alertsListCurrentPage < 0) alertsListCurrentPage = maxPage;
    } else if (direction === 'next') {
        alertsListCurrentPage++;
        if (alertsListCurrentPage > maxPage) alertsListCurrentPage = 0;
    }
    
    applyAlertsFilters();
}

function renderAlertsListTableContent(alerts, groupBy) {
    const tbody = document.getElementById("alerts-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const getRowHtml = (alert) => {
        const folioBadge = alert.templateFolio ? `<span class="bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">${alert.templateFolio}</span>` : "";
        const tplNameHtml = alert.templateName ? `<div class="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap"><span class="text-slate-700 font-semibold">${alert.templateName}</span>${folioBadge}</div>` : "";

        return `
            <tr class="hover:bg-slate-50 transition-colors text-sm text-slate-650 border-b border-slate-100">
                <td class="px-6 py-4 font-semibold">
                    <button onclick="navigateToTaskBpm('${alert.templateId}', ${alert.id})" class="text-left font-bold text-brand-500 hover:text-brand-700 hover:underline focus:outline-none transition-all">
                        ${alert.activity}
                    </button>
                    ${tplNameHtml}
                    <div class="text-[11px] text-slate-450 font-normal mt-0.5 leading-normal max-w-[380px] break-words">
                        ${alert.description || "Sin descripción"}
                    </div>
                </td>
                <td class="px-6 py-4 font-semibold text-xs text-slate-600">${alert.client}</td>
                <td class="px-6 py-4 flex items-center gap-2 mt-1">
                    <button onclick="sendBuzzToTech('${alert.assigned.replace(/'/g, "\\'")}', '${alert.activity.replace(/'/g, "\\'")}', event)" class="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm border border-red-200 shrink-0 hover:scale-105 active:scale-95" title="Enviar Zumbido (Alerta manual al móvil)">
                        <i data-lucide="bell" class="w-3.5 h-3.5 animate-pulse"></i>
                    </button>
                    <span class="font-semibold text-xs text-slate-700">${alert.assigned}</span>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-700 text-xs font-mono">${alert.timeRemaining}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${alert.badgeColor}">
                        ${alert.status}
                    </span>
                </td>
            </tr>
        `;
    };

    if (alerts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-400 text-xs font-semibold">No hay alertas de SLA que coincidan con la búsqueda.</td>
            </tr>
        `;
        return;
    }

    if (groupBy === 'none') {
        alerts.forEach(a => {
            tbody.innerHTML += getRowHtml(a);
        });
    } else {
        const groups = {};
        alerts.forEach(a => {
            const key = groupBy === 'client' ? a.client : a.assigned;
            const groupKey = key || "Sin Especificar";
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(a);
        });
        
        Object.keys(groups).forEach(key => {
            const groupAlerts = groups[key];
            const label = groupBy === 'client' ? `Cliente: ${key}` : `Responsable: ${key}`;
            tbody.innerHTML += `
                <tr class="bg-slate-50/70 border-y border-slate-200/60 font-semibold text-slate-700 select-none">
                    <td colspan="5" class="px-6 py-2.5 text-xs flex items-center gap-1.5">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>${label} <span class="text-slate-400 font-normal">(${groupAlerts.length} alertas)</span></span>
                    </td>
                </tr>
            `;
            groupAlerts.forEach(a => {
                tbody.innerHTML += getRowHtml(a);
            });
        });
    }

    lucide.createIcons();
}

// Registrar globalmente
window.toggleAlertsSearchDropdown = toggleAlertsSearchDropdown;
window.showAlertsSearchDropdown = showAlertsSearchDropdown;
window.closeAlertsSearchDropdown = closeAlertsSearchDropdown;
window.removeAlertsTag = removeAlertsTag;
window.applyAlertsFilters = applyAlertsFilters;
window.navigateAlertsList = navigateAlertsList;
window.saveAlertsFavorite = saveAlertsFavorite;
window.applyAlertsFavoriteByIndex = applyAlertsFavoriteByIndex;
window.deleteAlertsFavorite = deleteAlertsFavorite;
window.initAlertsFavorites = initAlertsFavorites;

// Modal Reasignación
function openReasignModal(alertId) {
    reassigningAlertId = alertId;
    
    // Buscar el id de la plantilla correspondiente
    let templateId = selectedTemplateId;
    const alert = alertsData.find(a => a.id === alertId);
    if (alert && alert.templateId) {
        templateId = alert.templateId;
    } else {
        templatesData.forEach(tpl => {
            const task = tpl.tasks.find(tk => tk.id === alertId);
            if (task) {
                templateId = tpl.id;
            }
        });
    }

    const select = document.getElementById("select-specialist");
    if (select) {
        select.innerHTML = employeesList.map(e => {
            const availData = getEmployeeAvailabilityForAnchor(e.name, templateId);
            const availText = availData ? ` (${formatHoursToHHMM(availData.minAvail)} disp.)` : "";
            return `<option value="${e.name} (${e.role})">${e.name} (${e.role})${availText}</option>`;
        }).join('');
    }
    document.getElementById("modal-reasign").classList.remove("hidden");
}

function closeReasignModal() {
    document.getElementById("modal-reasign").classList.add("hidden");
}

function confirmReasign() {
    const newAssigned = document.getElementById("select-specialist").value;
    
    // 1. Actualizar en alertsData
    const alert = alertsData.find(a => a.id === reassigningAlertId);
    if (alert) {
        alert.assigned = newAssigned;
        alert.status = "Verificado";
        alert.badgeColor = "bg-emerald-100 text-emerald-800";
        alert.timeRemaining = "Reasignado a Nivel 2";
    }
    
    // 2. Actualizar en templatesData (Gantt)
    let foundTemplate = null;
    let foundTask = null;
    templatesData.forEach(tpl => {
        const task = tpl.tasks.find(tk => tk.id === reassigningAlertId);
        if (task) {
            task.assigned = newAssigned;
            task.status = "Verificado";
            foundTemplate = tpl;
            foundTask = task;
        }
    });

    if (foundTemplate && foundTask) {
        const token = localStorage.getItem('sonicbi_token');
        fetch(`/api/bpm/tasks/${foundTask.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(foundTask)
        })
        .then(res => {
            if (res.ok) {
                cargarDatosDesdeBackend();
            }
        });
    }
    
    closeReasignModal();
    renderAlertsTable();
    renderPrioritariasAlerts();
    syncStateToStorage();
}

function sendBuzzToTech(techName, taskName, event) {
    if (event) event.stopPropagation();
    
    // Emitir por WebSocket al backend para transmitir al celular físico
    if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            event: 'buzz_tech',
            techName: techName,
            taskName: taskName
        }));
        if (typeof showSalesNotification === 'function') {
            showSalesNotification(`Zumbido de alerta enviado al dispositivo móvil de: ${techName}`, "success");
        }
    } else {
        alert("El WebSocket no está conectado. El zumbido no se pudo transmitir.");
    }
}

// Sincronización completa de estado de base de datos a localStorage
function syncStateToStorage() {
    try {
        localStorage.setItem("bpms-state-sync", JSON.stringify({
            templatesData: templatesData,
            alertsData: alertsData,
            employeesList: employeesList,
            departmentsList: departmentsList,
            nodeLibraryList: nodeLibraryList,
            isTemplateExecutionPaused: isTemplateExecutionPaused,
            activeTemplateElapsedSeconds: activeTemplateElapsedSeconds,
            notifications: notifications,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn("Error al sincronizar estado hacia localStorage:", e);
    }
}

// Manejar eventos de storage entrantes desde otras ventanas
function handleStorageEventSync(event) {
    if (event.key === "bpms-state-sync" && event.newValue) {
        try {
            const data = JSON.parse(event.newValue);
            templatesData = data.templatesData;
            alertsData = data.alertsData;
            isTemplateExecutionPaused = data.isTemplateExecutionPaused;
            activeTemplateElapsedSeconds = data.activeTemplateElapsedSeconds;
            
            if (data.employeesList) employeesList = data.employeesList;
            if (data.departmentsList) departmentsList = data.departmentsList;
            if (data.nodeLibraryList) nodeLibraryList = data.nodeLibraryList;
            if (data.notifications) {
                notifications = data.notifications;
                renderNotifications();
            }
            
            // Refrescar vistas del administrador
            renderAlertsTable();
            renderPrioritariasAlerts();
            initDropdowns();
            renderPersonalView();
            renderDepartmentsView();
            renderCatalogNodesView();
            renderCommDMs();
            
            if (selectedTemplateId) {
                loadTemplate(selectedTemplateId);
            }
            
            // Refrescar vista del móvil
            renderMobileScreen();
        } catch (e) {
            console.error("Error al sincronizar estado entrante:", e);
        }
    }
    
    if (event.key === "mobile-buzz-trigger" && event.newValue) {
        try {
            const data = JSON.parse(event.newValue);
            executeLocalBuzz(data.techName, data.taskName);
        } catch (e) {
            console.error("Error al procesar zumbido remoto:", e);
        }
    }
}

// --- DROPDOWNS: PLANTILLAS Y TAREAS ---

function initDropdowns() {
    const tplList = document.getElementById("template-list-items");
    if (tplList) {
        const topTemplates = templatesData.slice(0, 3);
        let tplHtml = topTemplates.map(tpl => `
            <a href="#" onclick="selectTemplateFromMenu('${tpl.id}')" class="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-brand-500 font-semibold transition-all">
                ${tpl.name} <span class="block text-[9px] text-slate-400 font-normal">Creado: ${tpl.createdDate}</span>
            </a>
        `).join('');

        tplHtml += `
            <div class="p-2 bg-slate-50 border-t border-slate-100">
                <button onclick="openTemplateCatalogModal()" class="w-full bg-brand-500 hover:bg-brand-600 text-white text-center py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1">
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    MAS / VER TODAS LAS PLANTILLAS
                </button>
            </div>
        `;
        tplList.innerHTML = tplHtml;
    }

    const allTasks = [];
    templatesData.forEach(tpl => {
        tpl.tasks.forEach(t => {
            allTasks.push({ ...t, templateId: tpl.id, templateName: tpl.name });
        });
    });

    allTasks.sort((a, b) => {
        const priority = { "Vencido": 1, "Por vencer": 2, "Reincidencia Potencial": 3, "Completado": 4, "Pendiente": 5 };
        return (priority[a.status] || 9) - (priority[b.status] || 9);
    });

    const topTasks = allTasks.slice(0, 4);

    const taskList = document.getElementById("task-list-items");
    if (taskList) {
        let dropdownHtml = topTasks.map(t => {
            let badgeClass = "bg-slate-100 text-slate-500";
            if (t.status === 'Vencido') badgeClass = "bg-red-100 text-red-700 font-bold";
            else if (t.status === 'Por vencer') badgeClass = "bg-amber-100 text-amber-700 font-bold";
            else if (t.status === 'Reincidencia Potencial') badgeClass = "bg-accent-500 text-white font-bold";
            
            return `
                <a href="#" onclick="selectTaskFromMenu('${t.templateId}', ${t.id})" class="block px-4 py-2.5 hover:bg-slate-100 border-b border-slate-50 transition-all">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-slate-800 truncate">${t.name}</span>
                        <span class="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider ${badgeClass}">${t.status}</span>
                    </div>
                    <span class="block text-[9px] text-slate-400 mt-0.5">Pertenece a: ${t.templateName}</span>
                </a>
            `;
        }).join('');

        dropdownHtml += `
            <div class="p-2 bg-slate-50 border-t border-slate-100">
                <button onclick="openTaskCatalogModal()" class="w-full bg-brand-500 hover:bg-brand-600 text-white text-center py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1">
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    MAS / VER CATÁLOGO COMPLETO
                </button>
            </div>
        `;
        taskList.innerHTML = dropdownHtml;
    }
}

function toggleTemplateDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("template-dropdown");
    dropdown.classList.toggle("hidden");
    document.getElementById("task-dropdown").classList.add("hidden");
}

function toggleTaskDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("task-dropdown");
    dropdown.classList.toggle("hidden");
    document.getElementById("template-dropdown").classList.add("hidden");
}

function selectTemplateFromMenu(templateId) {
    document.getElementById("template-dropdown").classList.add("hidden");
    highlightedTaskId = null;
    loadTemplate(templateId);
}

function selectTaskFromMenu(templateId, taskId) {
    document.getElementById("task-dropdown").classList.add("hidden");
    highlightedTaskId = taskId;
    loadTemplate(templateId);
}

// --- MODAL: CATÁLOGO DE PLANTILLAS ---

function openTemplateCatalogModal() {
    document.getElementById("template-dropdown").classList.add("hidden");
    document.getElementById("modal-template-catalog").classList.remove("hidden");
    tplCatalogPage = 1;
    document.getElementById("tpl-catalog-search-input").value = "";
    searchCatalogTemplates();
}

function closeTemplateCatalogModal() {
    document.getElementById("modal-template-catalog").classList.add("hidden");
}

function searchCatalogTemplates() {
    const query = document.getElementById("tpl-catalog-search-input").value.toLowerCase();
    tplCatalogFiltered = templatesData.filter(t => {
        return t.name.toLowerCase().includes(query) || t.createdDate.includes(query);
    });
    renderTplCatalogPage();
}

function renderTplCatalogPage() {
    const tbody = document.getElementById("tpl-catalog-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const totalRecords = tplCatalogFiltered.length;
    const totalPages = Math.ceil(totalRecords / tplCatalogPageSize) || 1;

    if (tplCatalogPage > totalPages) tplCatalogPage = totalPages;
    if (tplCatalogPage < 1) tplCatalogPage = 1;

    const startIdx = (tplCatalogPage - 1) * tplCatalogPageSize;
    const endIdx = Math.min(startIdx + tplCatalogPageSize, totalRecords);
    
    const pageTemplates = tplCatalogFiltered.slice(startIdx, endIdx);

    if (pageTemplates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400 italic">No se encontraron plantillas.</td></tr>`;
    } else {
        tbody.innerHTML = pageTemplates.map(t => {
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-semibold text-slate-800">${t.name}</td>
                    <td class="px-4 py-3 text-center text-slate-700 font-semibold">
                        ${t.client || 'Cliente General'}
                    </td>
                    <td class="px-4 py-3 text-slate-500 font-mono">${t.createdDate}</td>
                    <td class="px-4 py-3 text-center font-bold text-slate-700">${t.tasks.length}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="selectTemplateFromCatalog('${t.id}')" class="bg-brand-500 hover:bg-brand-600 text-white text-[10px] px-2.5 py-1 rounded font-semibold transition-all">
                            Cargar Hitos
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById("tpl-catalog-pagination-info").innerText = totalRecords > 0 
        ? `Mostrando ${startIdx + 1}-${endIdx} de ${totalRecords} plantillas`
        : `Mostrando 0 de 0 plantillas`;
        
    document.getElementById("btn-tpl-prev").disabled = (tplCatalogPage === 1);
    document.getElementById("btn-tpl-next").disabled = (tplCatalogPage === totalPages);

    lucide.createIcons();
}

function tplCatalogPrevPage() {
    if (tplCatalogPage > 1) {
        tplCatalogPage--;
        renderTplCatalogPage();
    }
}

function tplCatalogNextPage() {
    tplCatalogPage++;
    renderTplCatalogPage();
}

function selectTemplateFromCatalog(templateId) {
    closeTemplateCatalogModal();
    highlightedTaskId = null;
    loadTemplate(templateId);
    
    const template = templatesData.find(t => t.id === templateId);
    if (template) {
        alert(`Plantilla "${template.name}" cargada correctamente en el Gantt.`);
    }
}

// --- MODAL: CATÁLOGO DE TAREAS ---

function openTaskCatalogModal() {
    document.getElementById("task-dropdown").classList.add("hidden");
    document.getElementById("modal-task-catalog").classList.remove("hidden");
    catalogPage = 1;
    document.getElementById("catalog-search-input").value = "";
    document.getElementById("catalog-filter-status").value = "all";
    searchCatalogTasks();
}

function closeTaskCatalogModal() {
    document.getElementById("modal-task-catalog").classList.add("hidden");
}

function searchCatalogTasks() {
    const query = document.getElementById("catalog-search-input").value.toLowerCase();
    const statusFilter = document.getElementById("catalog-filter-status").value;
    
    const allTasks = [];
    templatesData.forEach(tpl => {
        tpl.tasks.forEach(t => {
            allTasks.push({ ...t, templateId: tpl.id, templateName: tpl.name });
        });
    });

    catalogFilteredTasks = allTasks.filter(t => {
        const matchesQuery = t.name.toLowerCase().includes(query) || t.templateName.toLowerCase().includes(query);
        const matchesStatus = (statusFilter === 'all' || t.status === statusFilter);
        return matchesQuery && matchesStatus;
    });

    catalogFilteredTasks.sort((a, b) => {
        const priority = { "Vencido": 1, "Por vencer": 2, "Reincidencia Potencial": 3, "Completado": 4, "Pendiente": 5 };
        return (priority[a.status] || 9) - (priority[b.status] || 9);
    });

    renderCatalogPage();
}

function renderCatalogPage() {
    const tbody = document.getElementById("catalog-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const totalRecords = catalogFilteredTasks.length;
    const totalPages = Math.ceil(totalRecords / catalogPageSize) || 1;

    if (catalogPage > totalPages) catalogPage = totalPages;
    if (catalogPage < 1) catalogPage = 1;

    const startIdx = (catalogPage - 1) * catalogPageSize;
    const endIdx = Math.min(startIdx + catalogPageSize, totalRecords);
    
    const pageTasks = catalogFilteredTasks.slice(startIdx, endIdx);

    if (pageTasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400 italic">No se encontraron tareas.</td></tr>`;
    } else {
        tbody.innerHTML = pageTasks.map(t => {
            let badgeClass = "bg-slate-100 text-slate-500 border-slate-200";
            if (t.status === 'Vencido') badgeClass = "bg-red-50 text-red-700 border-red-200 font-bold";
            else if (t.status === 'Por vencer') badgeClass = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
            else if (t.status === 'Reincidencia Potencial') badgeClass = "bg-red-100 text-red-800 border-red-300 font-bold";
            else if (t.status === 'Completado') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-semibold text-slate-800">${t.name}</td>
                    <td class="px-4 py-3 text-slate-500">${t.templateName}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 rounded border text-[9px] uppercase tracking-wider ${badgeClass}">${t.status}</span>
                    </td>
                    <td class="px-4 py-3 font-medium text-slate-400 font-mono text-[10px]">${t.dateRange}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="selectTaskFromCatalog('${t.templateId}', ${t.id})" class="bg-brand-500 hover:bg-brand-600 text-white text-[10px] px-2.5 py-1 rounded font-semibold transition-all">
                            Cargar Flujo
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById("catalog-pagination-info").innerText = totalRecords > 0 
        ? `Mostrando ${startIdx + 1}-${endIdx} de ${totalRecords} tareas`
        : `Mostrando 0 de 0 tareas`;
        
    document.getElementById("btn-catalog-prev").disabled = (catalogPage === 1);
    document.getElementById("btn-catalog-next").disabled = (catalogPage === totalPages);

    lucide.createIcons();
}

function catalogPrevPage() {
    if (catalogPage > 1) {
        catalogPage--;
        renderCatalogPage();
    }
}

function catalogNextPage() {
    catalogPage++;
    renderCatalogPage();
}

function selectTaskFromCatalog(templateId, taskId) {
    closeTaskCatalogModal();
    highlightedTaskId = taskId;
    loadTemplate(templateId);
}

// Formateador de horas decimales a formato "Xhrs Ymin"
function formatHoursToHHMM(hoursDecimal) {
    if (isNaN(hoursDecimal) || hoursDecimal === null || hoursDecimal === undefined || hoursDecimal <= 0) return "0hrs 0min";
    const hours = Math.floor(hoursDecimal);
    const minutes = Math.round((hoursDecimal - hours) * 60);
    if (minutes === 60) {
        return `${hours + 1}hrs 0min`;
    }
    return `${hours}hrs ${minutes}min`;
}

// Ayudante para extraer de forma segura el nombre del empleado del formato "Nombre (Rol)"
function getEmployeeNameFromAssigned(assigned) {
    if (!assigned || assigned === "Sin Asignar") return "Sin Asignar";
    const found = employeesList.find(emp => assigned.startsWith(emp.name));
    if (found) return found.name;
    return assigned.split(' (')[0].trim();
}

// --- LÓGICA DE DETECCIÓN Y MAPEO DE SOBRECARGA DE TRABAJO ---
function getEmployeeWorkloadMap(excludeTaskId = null, mockTask = null) {
    const workloadMap = {}; // Key: "Name|YYYY-MM-DD", Value: hours

    function addLoad(assigned, startDateStr, startTimeStr, duration, daysText) {
        const assigneeName = getEmployeeNameFromAssigned(assigned);
        if (!assigneeName || assigneeName === "Sin Asignar") return;

        let pointer = new Date(`${startDateStr}T${startTimeStr}`);
        const taskStart = new Date(pointer);
        const durHours = duration * 24;
        pointer.setTime(pointer.getTime() + durHours * 60 * 60 * 1000);
        const taskEnd = new Date(pointer);

        let taskHours = 8; 
        if (daysText.includes("min")) {
            taskHours = parseInt(daysText) / 60;
        } else if (daysText.includes("hora")) {
            taskHours = parseInt(daysText);
        } else {
            taskHours = parseFloat(daysText) * 8; // 1 día de Gantt equivale a un turno de 8 horas
        }

        const spannedDates = [];
        let d = new Date(taskStart);
        d.setHours(0,0,0,0);
        let endD = new Date(taskEnd);
        endD.setHours(0,0,0,0);
        while (d <= endD) {
            spannedDates.push(d.toISOString().split('T')[0]);
            d.setDate(d.getDate() + 1);
        }

        const hoursPerDay = taskHours / Math.max(1, spannedDates.length);
        spannedDates.forEach(dateStr => {
            const key = `${assigneeName}|${dateStr}`;
            workloadMap[key] = (workloadMap[key] || 0) + hoursPerDay;
        });
    }

    templatesData.forEach(tpl => {
        // Si estamos editando esta plantilla en el constructor, omitimos sus tareas guardadas viejas
        if (isBuilderEditMode && tpl.id === editingTemplateId) {
            return;
        }

        const startDateStr = tpl.startDate || "2026-07-06";
        const startTimeStr = tpl.startTime || "09:00";
        let currentStartDay = 0;

        tpl.tasks.forEach(task => {
            let pointer = new Date(`${startDateStr}T${startTimeStr}`);
            pointer.setTime(pointer.getTime() + currentStartDay * 24 * 60 * 60 * 1000);
            const taskStartDateStr = pointer.toISOString().split('T')[0];
            const taskStartTimeStr = pointer.toTimeString().split(' ')[0].substring(0, 5);

            if (task.id === excludeTaskId) {
                if (mockTask) {
                    addLoad(mockTask.assigned, taskStartDateStr, taskStartTimeStr, mockTask.duration, mockTask.daysText);
                }
            } else {
                addLoad(task.assigned, taskStartDateStr, taskStartTimeStr, task.duration, task.daysText);
            }
            currentStartDay += task.duration;
        });
    });

    // Inyectar dinámicamente la carga de los nodos del constructor si está visible
    const builderModal = document.getElementById("modal-create-template");
    const isBuilderVisible = builderModal && !builderModal.classList.contains("hidden");
    if (isBuilderVisible && constructorAddedNodes.length > 0) {
        const tplStartDateInput = document.getElementById("new-template-start-date");
        const tplStartTimeInput = document.getElementById("new-template-start-time");
        const startDateStr = tplStartDateInput ? (tplStartDateInput.value || "2026-07-06") : "2026-07-06";
        const startTimeStr = tplStartTimeInput ? (tplStartTimeInput.value || "09:00") : "09:00";

        let currentStartDay = 0;
        constructorAddedNodes.forEach(node => {
            let pointer = new Date(`${startDateStr}T${startTimeStr}`);
            pointer.setTime(pointer.getTime() + currentStartDay * 24 * 60 * 60 * 1000);
            const nodeStartDateStr = pointer.toISOString().split('T')[0];
            const nodeStartTimeStr = pointer.toTimeString().split(' ')[0].substring(0, 5);

            if (node.id === excludeTaskId) {
                if (mockTask) {
                    addLoad(mockTask.assigned, nodeStartDateStr, nodeStartTimeStr, mockTask.duration, mockTask.daysText);
                }
            } else {
                addLoad(node.assigned, nodeStartDateStr, nodeStartTimeStr, node.duration, node.durationText);
            }
            currentStartDay += node.duration;
        });
    }

    return workloadMap;
}

// Obtener disponibilidad exacta de un empleado en el rango de fechas de una tarea
function getEmployeeAvailabilityForTask(assigneeVal, durationVal, unitVal, excludeTaskId = null, isBuilder = false) {
    const name = getEmployeeNameFromAssigned(assigneeVal);
    if (!name || name === "Sin Asignar") return null;

    const emp = employeesList.find(e => e.name === name);
    const limit = emp ? (emp.workHours || 8) : 8;

    let taskHours = 8;
    let daysEquiv = durationVal;
    if (unitVal === 'min') {
        daysEquiv = durationVal / 1440;
        taskHours = durationVal / 60;
    } else if (unitVal === 'hora') {
        daysEquiv = durationVal / 24;
        taskHours = durationVal;
    } else {
        taskHours = durationVal * 8;
    }

    const workload = getEmployeeWorkloadMap(excludeTaskId, null);

    let startDateStr = "2026-07-06";
    let startTimeStr = "09:00";
    let offsetDays = 0;

    if (isBuilder) {
        const nodeIdx = constructorAddedNodes.findIndex(n => n.id === selectedConstructorNodeId);
        for (let i = 0; i < nodeIdx; i++) {
            offsetDays += constructorAddedNodes[i].duration;
        }
        const tplStartDateInput = document.getElementById("new-template-start-date");
        const tplStartTimeInput = document.getElementById("new-template-start-time");
        if (tplStartDateInput) startDateStr = tplStartDateInput.value;
        if (tplStartTimeInput) startTimeStr = tplStartTimeInput.value;
    } else {
        const template = templatesData.find(t => t.id === selectedTemplateId);
        if (template) {
            startDateStr = template.startDate || "2026-07-06";
            startTimeStr = template.startTime || "09:00";
            const task = template.tasks.find(t => t.id === excludeTaskId);
            if (task) {
                offsetDays = task.startDay;
            }
        }
    }

    let pointer = new Date(`${startDateStr}T${startTimeStr}`);
    pointer.setTime(pointer.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const taskStart = new Date(pointer);
    const durHours = daysEquiv * 24;
    pointer.setTime(pointer.getTime() + durHours * 60 * 60 * 1000);
    const taskEnd = new Date(pointer);

    const spannedDates = [];
    let d = new Date(taskStart);
    d.setHours(0,0,0,0);
    let endD = new Date(taskEnd);
    endD.setHours(0,0,0,0);
    while (d <= endD) {
        spannedDates.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
    }

    let minAvail = limit;
    let maxAssignedOther = 0;
    spannedDates.forEach(dateStr => {
        const key = `${name}|${dateStr}`;
        const hoursOther = workload[key] || 0;
        const avail = limit - hoursOther;
        if (avail < minAvail) {
            minAvail = avail;
        }
        if (hoursOther > maxAssignedOther) {
            maxAssignedOther = hoursOther;
        }
    });

    const requiredPerHour = taskHours / Math.max(1, spannedDates.length);
    const isOverloaded = requiredPerHour > minAvail;

    return {
        name,
        limit,
        spannedDates,
        minAvail: Math.max(0, minAvail),
        requiredPerHour,
        isOverloaded,
        maxAssignedOther,
    };
}

// Obtener disponibilidad fija para la fecha de arranque del proyecto (evita cambiar de tarea a tarea)
function getEmployeeAvailabilityForAnchor(employeeName, templateIdOrDate) {
    const emp = employeesList.find(e => e.name === employeeName);
    const limit = emp ? (emp.workHours || 8) : 8;

    let anchorDateStr = "2026-07-06";
    if (templateIdOrDate) {
        if (templateIdOrDate.includes("-")) {
            anchorDateStr = templateIdOrDate;
        } else {
            const template = templatesData.find(t => t.id === templateIdOrDate);
            anchorDateStr = template ? (template.startDate || "2026-07-06") : "2026-07-06";
        }
    }

    // Calcular el mapa general de ocupación sin excluir ninguna tarea
    const workload = getEmployeeWorkloadMap(null, null);
    const key = `${employeeName}|${anchorDateStr}`;
    const hoursUsed = workload[key] || 0;
    
    const minAvail = limit - hoursUsed;
    const isOverloaded = hoursUsed > limit;

    return {
        name: employeeName,
        limit,
        minAvail: Math.max(0, minAvail),
        isOverloaded,
        totalRequired: 0
    };
}

// Validar en el modal de Edición Rápida de Hitos
function checkQuickEditOverload() {
    const assigned = document.getElementById("quick-task-assigned").value;
    const assigneeName = getEmployeeNameFromAssigned(assigned);
    
    const alertDiv = document.getElementById("quick-edit-overload-alert");
    const msgDiv = document.getElementById("quick-edit-overload-msg");
    if (!alertDiv || !msgDiv) return;

    if (assigneeName === "Sin Asignar") {
        alertDiv.classList.add("hidden");
        return;
    }

    const durationVal = parseFloat(document.getElementById("quick-task-duration").value) || 1;
    const unit = document.getElementById("quick-task-unit").value;

    const availData = getEmployeeAvailabilityForTask(assigned, durationVal, unit, quickEditingTaskId, false);
    if (!availData) {
        alertDiv.classList.add("hidden");
        return;
    }

    alertDiv.classList.remove("hidden");
    if (availData.isOverloaded) {
        alertDiv.className = "p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-semibold flex items-start gap-2";
        msgDiv.innerHTML = `<div><strong>⚠️ Alerta de Sobrecarga:</strong> ${availData.name} supera su límite diario de ${availData.limit} hrs.</div>` +
            `<div class="mt-1 font-normal text-[10px]">` +
            `• Horas disponibles: <strong>${formatHoursToHHMM(availData.minAvail)}</strong><br>` +
            `• Horas requeridas por esta tarea: <strong>${formatHoursToHHMM(availData.totalRequired)}</strong>` +
            `</div>`;
    } else {
        alertDiv.className = "p-3 bg-emerald-50 border border-emerald-250 text-emerald-850 text-xs rounded-lg font-semibold flex items-start gap-2";
        msgDiv.innerHTML = `<div><strong>✅ Especialista Disponible:</strong> ${availData.name} tiene capacidad para esta tarea.</div>` +
            `<div class="mt-1 font-normal text-[10px]">` +
            `• Horas disponibles hoy: <strong>${formatHoursToHHMM(availData.minAvail)}</strong><br>` +
            `• Horas a ocupar: <strong>${formatHoursToHHMM(availData.totalRequired)}</strong>` +
            `</div>`;
    }
    lucide.createIcons();
}

// Validar si el especialista seleccionado tiene sobrecarga de tiempo en el constructor de plantillas
function checkBuilderNodeOverload() {
    const assignedSelect = document.getElementById("catalog-modal-node-assigned") || document.querySelector("#node-properties-panel select") || document.getElementById("quick-task-assigned");
    if (!assignedSelect) return null;
    const nodeAssigned = assignedSelect.value;
    const name = getEmployeeNameFromAssigned(nodeAssigned);
    if (name === "Sin Asignar") return null;

    const timeValEl = document.getElementById("catalog-modal-node-timeval") || document.querySelector("#node-properties-panel input[type='number']");
    const unitEl = document.getElementById("catalog-modal-node-unit") || document.querySelector("#node-properties-panel select[onchange*='unit']");
    
    const timeVal = timeValEl ? parseFloat(timeValEl.value) || 1 : 1;
    const unit = unitEl ? unitEl.value : "dia";

    const availData = getEmployeeAvailabilityForTask(nodeAssigned, timeVal, unit, selectedConstructorNodeId, true);
    return availData;
}

function renderCatalogNodesView() {
    applyNodesFilters();
}

function initNodesFavorites() {
    const saved = localStorage.getItem("nodes_favorites");
    if (saved) {
        nodesFavorites = JSON.parse(saved);
    } else {
        nodesFavorites = [];
    }
}

function renderNodesFavoritesList() {
    const container = document.getElementById("nodes-favorites-list");
    if (!container) return;
    if (nodesFavorites.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic">No hay favoritos guardados</div>`;
        return;
    }
    container.innerHTML = nodesFavorites.map((fav, index) => {
        return `
            <div class="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded select-none">
                <button onclick="applyNodesFavoriteByIndex(${index})" class="flex-1 text-left hover:text-brand-500 truncate text-slate-700">
                    ${fav.name}
                </button>
                <button onclick="deleteNodesFavorite(${index})" class="text-red-500 hover:text-red-750 text-xs font-bold focus:outline-none">
                    ×
                </button>
            </div>
        `;
    }).join("");
}

function applyNodesFavoriteByIndex(index) {
    const fav = nodesFavorites[index];
    if (fav) {
        document.getElementById("filter-node-comercial").checked = !!fav.filters.comercial;
        document.getElementById("filter-node-campo").checked = !!fav.filters.campo;
        document.getElementById("filter-node-soporte").checked = !!fav.filters.soporte;
        const radios = document.getElementsByName("group-nodes");
        radios.forEach(r => { if (r.value === fav.groupBy) r.checked = true; });
        applyNodesFilters();
        closeNodesSearchDropdown();
    }
}

function deleteNodesFavorite(index) {
    nodesFavorites.splice(index, 1);
    localStorage.setItem("nodes_favorites", JSON.stringify(nodesFavorites));
    renderNodesFavoritesList();
}

function saveNodesFavorite() {
    const nameInput = document.getElementById("new-node-favorite-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Por favor, ingresa un nombre para el favorito.");
        return;
    }
    const filters = {
        comercial: document.getElementById("filter-node-comercial")?.checked || false,
        campo: document.getElementById("filter-node-campo")?.checked || false,
        soporte: document.getElementById("filter-node-soporte")?.checked || false
    };
    let groupByVal = "none";
    document.getElementsByName("group-nodes").forEach(r => { if (r.checked) groupByVal = r.value; });
    nodesFavorites.push({ name, filters, groupBy: groupByVal });
    localStorage.setItem("nodes_favorites", JSON.stringify(nodesFavorites));
    if (nameInput) nameInput.value = "";
    renderNodesFavoritesList();
}

function toggleNodesSearchDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("nodes-search-dropdown");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderNodesFavoritesList();
            lucide.createIcons();
        }
    }
}

// Funciones globales para evitar errores en onclick
window.toggleNodesSearchDropdown = toggleNodesSearchDropdown;
window.showNodesSearchDropdown = showNodesSearchDropdown;
window.closeNodesSearchDropdown = closeNodesSearchDropdown;
window.removeNodesTag = removeNodesTag;
window.applyNodesFilters = applyNodesFilters;
window.navigateNodesList = navigateNodesList;
window.saveNodesFavorite = saveNodesFavorite;
window.applyNodesFavoriteByIndex = applyNodesFavoriteByIndex;
window.deleteNodesFavorite = deleteNodesFavorite;

function showNodesSearchDropdown() {
    const el = document.getElementById("nodes-search-dropdown");
    if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        renderNodesFavoritesList();
        lucide.createIcons();
    }
}

function closeNodesSearchDropdown() {
    const el = document.getElementById("nodes-search-dropdown");
    if (el) el.classList.add("hidden");
}

function removeNodesTag(actionId) {
    if (actionId === 'search') {
        const inp = document.getElementById("nodes-search-input");
        if (inp) inp.value = "";
    } else if (actionId.startsWith('filter-')) {
        const chk = document.getElementById(actionId);
        if (chk) chk.checked = false;
    } else if (actionId === 'group-none') {
        const radios = document.getElementsByName("group-nodes");
        radios.forEach(r => { if (r.value === 'none') r.checked = true; });
    }
    applyNodesFilters();
}

function applyNodesFilters() {
    const searchInp = document.getElementById("nodes-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkComercial = document.getElementById("filter-node-comercial")?.checked;
    const chkCampo = document.getElementById("filter-node-campo")?.checked;
    const chkSoporte = document.getElementById("filter-node-soporte")?.checked;
    
    let groupByVal = "none";
    document.getElementsByName("group-nodes").forEach(r => { if (r.checked) groupByVal = r.value; });
    
    // Chips
    const tagsContainer = document.getElementById("nodes-search-tags");
    if (tagsContainer) {
        let tagsHtml = "";
        if (searchText) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] select-none">
                    "${searchText}"
                    <button onclick="removeNodesTag('search')" class="hover:text-slate-950 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkComercial) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-blue-50 text-blue-750 font-semibold px-2 py-0.5 rounded border border-blue-150 text-[10px] select-none">
                    Comercial
                    <button onclick="removeNodesTag('filter-node-comercial')" class="hover:text-blue-950 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkCampo) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-amber-50 text-amber-750 font-semibold px-2 py-0.5 rounded border border-amber-150 text-[10px] select-none">
                    Campo
                    <button onclick="removeNodesTag('filter-node-campo')" class="hover:text-amber-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkSoporte) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-purple-50 text-purple-755 font-semibold px-2 py-0.5 rounded border border-purple-150 text-[10px] select-none">
                    Soporte
                    <button onclick="removeNodesTag('filter-node-soporte')" class="hover:text-purple-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (groupByVal !== 'none') {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-teal-50 text-teal-755 font-semibold px-2 py-0.5 rounded border border-teal-150 text-[10px] select-none">
                    Agrupado: Asignación
                    <button onclick="removeNodesTag('group-none')" class="hover:text-teal-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        tagsContainer.innerHTML = tagsHtml;
    }
    
    // Filtrar
    const filtered = nodeLibraryList.filter(node => {
        if (searchText) {
            const nameMatch = node.name.toLowerCase().includes(searchText);
            const assignedMatch = (node.assigned || "").toLowerCase().includes(searchText);
            const obsMatch = (node.observaciones || "").toLowerCase().includes(searchText);
            if (!nameMatch && !assignedMatch && !obsMatch) return false;
        }
        if (chkComercial || chkCampo || chkSoporte) {
            let match = false;
            if (chkComercial && (node.assigned || "").includes("Comercial")) match = true;
            if (chkCampo && (node.assigned || "").includes("Campo")) match = true;
            if (chkSoporte && (node.assigned || "").includes("Soporte")) match = true;
            if (!match) return false;
        }
        return true;
    });
    
    // Paginación
    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / nodesListPageSize) - 1);
    if (nodesListCurrentPage > maxPage) nodesListCurrentPage = maxPage;
    
    const startIdx = totalCount === 0 ? 0 : nodesListCurrentPage * nodesListPageSize;
    const endIdx = Math.min(startIdx + nodesListPageSize, totalCount);
    
    const paginationLabel = document.getElementById("nodes-pagination-label");
    if (paginationLabel) {
        paginationLabel.innerText = totalCount === 0 ? "0 / 0" : `${startIdx + 1}-${endIdx} / ${totalCount}`;
    }
    
    const paginated = filtered.slice(startIdx, endIdx);
    renderNodesListTableContent(paginated, groupByVal);
}

function navigateNodesList(direction) {
    const searchInp = document.getElementById("nodes-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    const chkComercial = document.getElementById("filter-node-comercial")?.checked;
    const chkCampo = document.getElementById("filter-node-campo")?.checked;
    const chkSoporte = document.getElementById("filter-node-soporte")?.checked;
    
    const filtered = nodeLibraryList.filter(node => {
        if (searchText) {
            const nameMatch = node.name.toLowerCase().includes(searchText);
            const assignedMatch = (node.assigned || "").toLowerCase().includes(searchText);
            if (!nameMatch && !assignedMatch) return false;
        }
        if (chkComercial || chkCampo || chkSoporte) {
            let match = false;
            if (chkComercial && (node.assigned || "").includes("Comercial")) match = true;
            if (chkCampo && (node.assigned || "").includes("Campo")) match = true;
            if (chkSoporte && (node.assigned || "").includes("Soporte")) match = true;
            if (!match) return false;
        }
        return true;
    });

    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / nodesListPageSize) - 1);
    
    if (direction === 'prev') {
        nodesListCurrentPage--;
        if (nodesListCurrentPage < 0) nodesListCurrentPage = maxPage;
    } else if (direction === 'next') {
        nodesListCurrentPage++;
        if (nodesListCurrentPage > maxPage) nodesListCurrentPage = 0;
    }
    
    applyNodesFilters();
}

function renderNodesListTableContent(nodes, groupBy) {
    const tbody = document.getElementById("catalog-nodes-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const getRowHtml = (node) => {
        const index = nodeLibraryList.findIndex(n => n.name === node.name);
        let statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
        if (node.status === 'Creado' || node.status === 'Completado') statusBadge = "bg-brand-50 text-brand-700 border-brand-100";
        else if (node.status === 'Por vencer') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
        else if (node.status === 'Vencido' || node.status === 'Reincidencia Potencial') statusBadge = "bg-red-50 text-red-700 border-red-200";
        
        const durationText = `${node.timeVal} ${node.unit === 'dia' ? (node.timeVal == 1 ? 'día' : 'días') : node.unit === 'hora' ? (node.timeVal == 1 ? 'hora' : 'horas') : 'minutos'}`;
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <span class="font-bold text-slate-800 block text-xs">${node.name}</span>
                    <span class="text-[10px] text-slate-400 truncate max-w-[340px] block" title="${node.observaciones}">${node.observaciones || 'Sin descripción'}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                        <span class="font-semibold text-slate-700 text-xs">${node.assigned}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-center font-mono text-[11px] text-slate-650 font-bold">${durationText}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded border text-[9px] font-bold ${statusBadge}">${node.status}</span>
                </td>
                <td class="px-4 py-3 text-right space-x-1.5">
                    <button onclick="openCatalogNodeModal(${index})" class="text-brand-500 hover:text-brand-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Editar
                    </button>
                    <button onclick="deleteCatalogNode(${index})" class="text-red-500 hover:text-red-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    };

    if (nodes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-400 text-xs font-semibold">No se encontraron nodos con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    if (groupBy === 'none') {
        nodes.forEach(n => {
            tbody.innerHTML += getRowHtml(n);
        });
    } else {
        const groups = {};
        nodes.forEach(n => {
            const key = n.assigned || "Sin Especificar";
            if (!groups[key]) groups[key] = [];
            groups[key].push(n);
        });
        
        Object.keys(groups).forEach(key => {
            const groupNodes = groups[key];
            tbody.innerHTML += `
                <tr class="bg-slate-50/70 border-y border-slate-200/60 font-semibold text-slate-700 select-none">
                    <td colspan="5" class="px-4 py-2.5 text-xs flex items-center gap-1.5">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>Asignado: ${key} <span class="text-slate-400 font-normal">(${groupNodes.length} nodos)</span></span>
                    </td>
                </tr>
            `;
            groupNodes.forEach(n => {
                tbody.innerHTML += getRowHtml(n);
            });
        });
    }

    lucide.createIcons();
}

function renderTemplatesListView() {
    applyOdooFilters();
}

function initOdooFavorites() {
    const saved = localStorage.getItem("odoo_favorites");
    if (saved) {
        odooFavorites = JSON.parse(saved);
    } else {
        odooFavorites = [
            { name: "En Proceso y Pausa", filters: { proceso: true, pausa: true, terminada: false, retraso: false }, groupBy: "none", isDefault: false },
            { name: "Por Cliente", filters: { proceso: false, pausa: false, terminada: false, retraso: false }, groupBy: "client", isDefault: false }
        ];
        localStorage.setItem("odoo_favorites", JSON.stringify(odooFavorites));
    }
    
    // Aplicar favorito predeterminado si existe
    const defaultFav = odooFavorites.find(f => f.isDefault);
    if (defaultFav) {
        setTimeout(() => {
            loadOdooFavoriteObject(defaultFav);
        }, 50);
    }
}

function loadOdooFavoriteObject(fav) {
    const chkProceso = document.getElementById("filter-tpl-proceso");
    const chkPausa = document.getElementById("filter-tpl-pausa");
    const chkTerminada = document.getElementById("filter-tpl-terminada");
    const chkRetraso = document.getElementById("filter-tpl-retraso");
    
    if (chkProceso) chkProceso.checked = !!fav.filters.proceso;
    if (chkPausa) chkPausa.checked = !!fav.filters.pausa;
    if (chkTerminada) chkTerminada.checked = !!fav.filters.terminada;
    if (chkRetraso) chkRetraso.checked = !!fav.filters.retraso;
    
    const radios = document.getElementsByName("group-tpl");
    radios.forEach(r => {
        if (r.value === fav.groupBy) r.checked = true;
    });
    
    applyOdooFilters();
}

function renderOdooFavoritesList() {
    const container = document.getElementById("odoo-favorites-list");
    if (!container) return;
    
    if (odooFavorites.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic">No hay favoritos guardados</div>`;
        return;
    }
    
    container.innerHTML = odooFavorites.map((fav, index) => {
        const starIcon = fav.isDefault ? "★" : "☆";
        const starColorClass = fav.isDefault ? "text-amber-500 font-bold" : "text-slate-400";
        return `
            <div class="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded select-none">
                <button onclick="applyOdooFavoriteByIndex(${index})" class="flex-1 text-left hover:text-brand-500 truncate font-medium text-slate-700">
                    ${fav.name}
                </button>
                <div class="flex items-center gap-1">
                    <button onclick="toggleOdooFavoriteDefault(${index})" class="${starColorClass} text-xs focus:outline-none hover:text-amber-600" title="Marcar como predeterminado">
                        ${starIcon}
                    </button>
                    <button onclick="deleteOdooFavorite(${index})" class="text-red-500 hover:text-red-700 text-xs focus:outline-none" title="Eliminar favorito">
                        ×
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function applyOdooFavoriteByIndex(index) {
    const fav = odooFavorites[index];
    if (fav) {
        loadOdooFavoriteObject(fav);
        closeOdooSearchDropdown();
    }
}

function toggleOdooFavoriteDefault(index) {
    const isCurrentlyDefault = odooFavorites[index].isDefault;
    odooFavorites.forEach(f => f.isDefault = false);
    odooFavorites[index].isDefault = !isCurrentlyDefault;
    localStorage.setItem("odoo_favorites", JSON.stringify(odooFavorites));
    renderOdooFavoritesList();
}

function deleteOdooFavorite(index) {
    odooFavorites.splice(index, 1);
    localStorage.setItem("odoo_favorites", JSON.stringify(odooFavorites));
    renderOdooFavoritesList();
}

function saveOdooFavorite() {
    const nameInput = document.getElementById("new-favorite-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Por favor, ingresa un nombre para el favorito.");
        return;
    }
    
    const chkProceso = document.getElementById("filter-tpl-proceso");
    const chkPausa = document.getElementById("filter-tpl-pausa");
    const chkTerminada = document.getElementById("filter-tpl-terminada");
    const chkRetraso = document.getElementById("filter-tpl-retraso");
    
    let groupByVal = "none";
    const radios = document.getElementsByName("group-tpl");
    radios.forEach(r => {
        if (r.checked) groupByVal = r.value;
    });
    
    const isDefault = !!document.getElementById("favorite-default-chk")?.checked;
    
    if (isDefault) {
        odooFavorites.forEach(f => f.isDefault = false);
    }
    
    odooFavorites.push({
        name: name,
        filters: {
            proceso: chkProceso ? chkProceso.checked : false,
            pausa: chkPausa ? chkPausa.checked : false,
            terminada: chkTerminada ? chkTerminada.checked : false,
            retraso: chkRetraso ? chkRetraso.checked : false
        },
        groupBy: groupByVal,
        isDefault: isDefault
    });
    
    localStorage.setItem("odoo_favorites", JSON.stringify(odooFavorites));
    if (nameInput) nameInput.value = "";
    const chkDefault = document.getElementById("favorite-default-chk");
    if (chkDefault) chkDefault.checked = false;
    
    renderOdooFavoritesList();
    alert("Búsqueda guardada en favoritos.");
}

function toggleOdooSearchDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("odoo-search-dropdown");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderOdooFavoritesList();
            lucide.createIcons();
        }
    }
}

function showOdooSearchDropdown() {
    const el = document.getElementById("odoo-search-dropdown");
    if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        renderOdooFavoritesList();
        lucide.createIcons();
    }
}

function closeOdooSearchDropdown() {
    const el = document.getElementById("odoo-search-dropdown");
    if (el) el.classList.add("hidden");
}

function handleOdooClickOutside(event) {
    // Plantillas
    const dropdown = document.getElementById("odoo-search-dropdown");
    const container = document.getElementById("odoo-search-container");
    if (dropdown && container && !dropdown.contains(event.target) && !container.contains(event.target)) {
        closeOdooSearchDropdown();
    }
    
    // Nodos
    const nodesDropdown = document.getElementById("nodes-search-dropdown");
    const nodesContainer = document.getElementById("nodes-search-container");
    if (nodesDropdown && nodesContainer && !nodesDropdown.contains(event.target) && !nodesContainer.contains(event.target)) {
        closeNodesSearchDropdown();
    }

    // Depts
    const deptsDropdown = document.getElementById("depts-search-dropdown");
    const deptsContainer = document.getElementById("depts-search-container");
    if (deptsDropdown && deptsContainer && !deptsDropdown.contains(event.target) && !deptsContainer.contains(event.target)) {
        closeDeptsSearchDropdown();
    }

    // Emps
    const empsDropdown = document.getElementById("emps-search-dropdown");
    const empsContainer = document.getElementById("emps-search-container");
    if (empsDropdown && empsContainer && !empsDropdown.contains(event.target) && !empsContainer.contains(event.target)) {
        closeEmpsSearchDropdown();
    }

    // Action Dropdown
    const actionDropdown = document.getElementById("action-dropdown-menu");
    const actionContainer = document.getElementById("action-dropdown-container");
    if (actionDropdown && actionContainer && !actionDropdown.contains(event.target) && !actionContainer.contains(event.target)) {
        closeActionDropdown();
    }

    // Alertas
    const alertsDropdown = document.getElementById("alerts-search-dropdown");
    const alertsContainer = document.getElementById("alerts-search-container");
    if (alertsDropdown && alertsContainer && !alertsDropdown.contains(event.target) && !alertsContainer.contains(event.target)) {
        closeAlertsSearchDropdown();
    }

    // Notifications Dropdown
    const notificationsDropdown = document.getElementById("notifications-dropdown-menu");
    const notificationsContainer = document.getElementById("notifications-dropdown-container");
    if (notificationsDropdown && notificationsContainer && !notificationsDropdown.contains(event.target) && !notificationsContainer.contains(event.target)) {
        closeNotificationsDropdown();
    }
}

function removeOdooTag(actionId) {
    if (actionId === 'search') {
        const inp = document.getElementById("odoo-search-input");
        if (inp) inp.value = "";
    } else if (actionId.startsWith('filter-')) {
        const chk = document.getElementById(actionId);
        if (chk) chk.checked = false;
    } else if (actionId === 'group-none') {
        const radios = document.getElementsByName("group-tpl");
        radios.forEach(r => {
            if (r.value === 'none') r.checked = true;
        });
    }
    applyOdooFilters();
}

function applyOdooFilters() {
    const searchInp = document.getElementById("odoo-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkProceso = document.getElementById("filter-tpl-proceso")?.checked;
    const chkPausa = document.getElementById("filter-tpl-pausa")?.checked;
    const chkTerminada = document.getElementById("filter-tpl-terminada")?.checked;
    const chkRetraso = document.getElementById("filter-tpl-retraso")?.checked;
    
    let groupByVal = "none";
    const radios = document.getElementsByName("group-tpl");
    radios.forEach(r => {
        if (r.checked) groupByVal = r.value;
    });
    
    // Renderizar Tags / Chips
    const tagsContainer = document.getElementById("odoo-search-tags");
    if (tagsContainer) {
        let tagsHtml = "";
        
        if (searchText) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] select-none">
                    "${searchText}"
                    <button onclick="removeOdooTag('search')" class="hover:text-slate-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkProceso) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-150 text-[10px] select-none">
                    En Proceso
                    <button onclick="removeOdooTag('filter-tpl-proceso')" class="hover:text-blue-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkPausa) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded border border-amber-150 text-[10px] select-none">
                    En Pausa
                    <button onclick="removeOdooTag('filter-tpl-pausa')" class="hover:text-amber-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkTerminada) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-150 text-[10px] select-none">
                    Terminadas
                    <button onclick="removeOdooTag('filter-tpl-terminada')" class="hover:text-emerald-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkRetraso) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded border border-red-150 text-[10px] select-none">
                    Retrasadas
                    <button onclick="removeOdooTag('filter-tpl-retraso')" class="hover:text-red-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (groupByVal !== 'none') {
            const groupName = groupByVal === 'client' ? 'Cliente' : 'Creador';
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-purple-50 text-purple-750 font-semibold px-2 py-0.5 rounded border border-purple-150 text-[10px] select-none">
                    Agrupado: ${groupName}
                    <button onclick="removeOdooTag('group-none')" class="hover:text-purple-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        
        tagsContainer.innerHTML = tagsHtml;
    }
    
    // Filtrar plantillas
    const filteredTemplates = templatesData.filter(template => {
        if (searchText) {
            const nameMatch = template.name.toLowerCase().includes(searchText);
            const clientMatch = (template.client || "").toLowerCase().includes(searchText);
            const creatorMatch = (template.createdBy || "").toLowerCase().includes(searchText);
            if (!nameMatch && !clientMatch && !creatorMatch) return false;
        }
        
        const tasksCount = template.tasks ? template.tasks.length : 0;
        const lastTask = tasksCount > 0 ? template.tasks[tasksCount - 1] : null;
        const isLastTaskCompleted = lastTask && lastTask.status === "Completado";
        const completedTasksCount = template.tasks ? template.tasks.filter(t => t.status === "Completado").length : 0;
        const isTerminada = (tasksCount > 0 && completedTasksCount === tasksCount) || isLastTaskCompleted;
        const hasVencidas = template.tasks ? template.tasks.some(t => t.status === "Vencido" || t.status === "Reincidencia Potencial") : false;
        
        let matchesStatus = true;
        if (chkProceso || chkPausa || chkTerminada || chkRetraso) {
            matchesStatus = false;
            if (chkProceso && (!isTerminada && !template.isPaused)) matchesStatus = true;
            if (chkPausa && template.isPaused) matchesStatus = true;
            if (chkTerminada && isTerminada) matchesStatus = true;
            if (chkRetraso && hasVencidas) matchesStatus = true;
        }
        
        return matchesStatus;
    });

    // Paginación
    const totalCount = filteredTemplates.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / tplListPageSize) - 1);
    if (tplListCurrentPage > maxPage) {
        tplListCurrentPage = maxPage;
    }
    
    const startIdx = totalCount === 0 ? 0 : tplListCurrentPage * tplListPageSize;
    const endIdx = Math.min(startIdx + tplListPageSize, totalCount);
    
    const paginationLabel = document.getElementById("tpl-pagination-label");
    if (paginationLabel) {
        paginationLabel.innerText = totalCount === 0 ? "0 / 0" : `${startIdx + 1}-${endIdx} / ${totalCount}`;
    }
    
    const paginatedTemplates = filteredTemplates.slice(startIdx, endIdx);
    renderTemplatesListTableContent(paginatedTemplates, groupByVal);
}

function navigateTemplatesList(direction) {
    const searchInp = document.getElementById("odoo-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkProceso = document.getElementById("filter-tpl-proceso")?.checked;
    const chkPausa = document.getElementById("filter-tpl-pausa")?.checked;
    const chkTerminada = document.getElementById("filter-tpl-terminada")?.checked;
    const chkRetraso = document.getElementById("filter-tpl-retraso")?.checked;
    
    const filteredTemplates = templatesData.filter(template => {
        if (searchText) {
            const nameMatch = template.name.toLowerCase().includes(searchText);
            const clientMatch = (template.client || "").toLowerCase().includes(searchText);
            if (!nameMatch && !clientMatch) return false;
        }
        
        const tasksCount = template.tasks ? template.tasks.length : 0;
        const lastTask = tasksCount > 0 ? template.tasks[tasksCount - 1] : null;
        const isLastTaskCompleted = lastTask && lastTask.status === "Completado";
        const completedTasksCount = template.tasks ? template.tasks.filter(t => t.status === "Completado").length : 0;
        const isTerminada = (tasksCount > 0 && completedTasksCount === tasksCount) || isLastTaskCompleted;
        const hasVencidas = template.tasks ? template.tasks.some(t => t.status === "Vencido" || t.status === "Reincidencia Potencial") : false;
        
        let matchesStatus = true;
        if (chkProceso || chkPausa || chkTerminada || chkRetraso) {
            matchesStatus = false;
            if (chkProceso && (!isTerminada && !template.isPaused)) matchesStatus = true;
            if (chkPausa && template.isPaused) matchesStatus = true;
            if (chkTerminada && isTerminada) matchesStatus = true;
            if (chkRetraso && hasVencidas) matchesStatus = true;
        }
        
        return matchesStatus;
    });

    const totalCount = filteredTemplates.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / tplListPageSize) - 1);

    if (direction === 'prev') {
        tplListCurrentPage--;
        if (tplListCurrentPage < 0) tplListCurrentPage = maxPage;
    } else if (direction === 'next') {
        tplListCurrentPage++;
        if (tplListCurrentPage > maxPage) tplListCurrentPage = 0;
    }

    applyOdooFilters();
}

function renderTemplatesListTableContent(templates, groupBy) {
    const tbody = document.getElementById("templates-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const getRowHtml = (template, isGrouped = false) => {
        const tasksCount = template.tasks ? template.tasks.length : 0;
        const startDateVal = template.startDate || "Sin fecha";
        const startTimeVal = template.startTime || "";
        const formattedStart = `${startDateVal} ${startTimeVal}`.trim();
        
        const completedTasksCount = template.tasks ? template.tasks.filter(t => t.status === "Completado").length : 0;
        const lastTask = tasksCount > 0 ? template.tasks[tasksCount - 1] : null;
        const isLastTaskCompleted = lastTask && lastTask.status === "Completado";
        const isTerminada = (tasksCount > 0 && completedTasksCount === tasksCount) || isLastTaskCompleted;

        let tplStatusText = "En Proceso";
        let tplStatusClass = "bg-blue-50 text-blue-700 border-blue-150";
        
        if (isTerminada) {
            tplStatusText = "Terminada";
            tplStatusClass = "bg-emerald-50 text-emerald-700 border-emerald-150";
        } else if (template.isPaused) {
            tplStatusText = "En Pausa";
            tplStatusClass = "bg-amber-50 text-amber-700 border-amber-150";
        }

        const vencidasCount = template.tasks ? template.tasks.filter(t => t.status === "Vencido" || t.status === "Reincidencia Potencial").length : 0;
        const porVencerCount = template.tasks ? template.tasks.filter(t => t.status === "Por vencer").length : 0;

        let warningIconsHTML = "";
        if (porVencerCount > 0) {
            const countText = porVencerCount > 1 ? ` ${porVencerCount}` : "";
            warningIconsHTML += `
                <span class="inline-flex items-center gap-0.5 text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 text-[9px] font-bold shrink-0" title="${porVencerCount} tareas por vencer">
                    <i data-lucide="alert-triangle" class="w-2.5 h-2.5"></i>${countText}
                </span>
            `;
        }
        if (vencidasCount > 0) {
            const countText = vencidasCount > 1 ? ` ${vencidasCount}` : "";
            warningIconsHTML += `
                <span class="inline-flex items-center gap-0.5 text-red-600 bg-red-50 border border-red-200 rounded px-1 text-[9px] font-bold shrink-0" title="${vencidasCount} tareas vencidas">
                    <i data-lucide="alert-circle" class="w-2.5 h-2.5"></i>${countText}
                </span>
            `;
        }

        const tplFolio = getTemplateFolio(template);

        return `
            <tr class="hover:bg-slate-50 transition-colors cursor-pointer ${isGrouped ? 'bg-slate-50/20' : ''}" onclick="selectTemplateAndOpenDesigner('${template.id}')">
                <td class="px-4 py-3 font-mono font-bold text-xs text-brand-600 shrink-0 ${isGrouped ? 'pl-8' : ''}">
                    ${isGrouped ? '<span class="text-slate-400 font-semibold mr-1">↳</span>' : ''}${tplFolio}
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="layers" class="w-4 h-4 text-brand-500 shrink-0"></i>
                        <div>
                            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span class="font-bold text-slate-800 text-xs hover:text-brand-500 transition-colors">${template.name}</span>
                                <span class="px-1.5 py-0.2 text-[8px] font-bold rounded border ${tplStatusClass}">${tplStatusText}</span>
                                ${warningIconsHTML}
                            </div>
                            <span class="text-[10px] text-slate-500 truncate max-w-[340px] block" title="${template.generalObservations || ''}">${template.generalObservations || 'Sin observaciones'}</span>
                            <div class="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                                <i data-lucide="check-square" class="w-3 h-3 text-slate-400"></i> ${tasksCount} tareas
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="font-semibold text-slate-700 text-xs">${template.client || 'Sin Especificar'}</span>
                </td>
                <td class="px-4 py-3 text-center font-mono text-[11px] text-slate-600 font-bold">${formattedStart}</td>
                <td class="px-4 py-3 text-center text-slate-500 text-xs">${template.createdBy || 'Capturista'}</td>
                <td class="px-4 py-3 text-right" onclick="event.stopPropagation()">
                    <button onclick="deleteTemplate('${template.id}')" class="text-red-500 hover:text-red-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    };

    if (templates.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-slate-400 text-xs font-semibold">No se encontraron plantillas con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    if (groupBy === 'none') {
        templates.forEach(t => {
            tbody.innerHTML += getRowHtml(t);
        });
    } else {
        const groups = {};
        templates.forEach(t => {
            const key = t[groupBy] || "Sin Especificar";
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        Object.keys(groups).forEach(key => {
            const groupTemplates = groups[key];
            const groupHeaderLabel = groupBy === 'client' ? `Cliente: ${key}` : `Creado por: ${key}`;
            tbody.innerHTML += `
                <tr class="bg-brand-50/60 border-y border-brand-100/70 font-bold text-brand-700 select-none">
                    <td colspan="6" class="px-4 py-2.5 text-xs flex items-center gap-1.5">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5 text-brand-600"></i>
                        <span>${groupHeaderLabel} <span class="text-brand-600/80 font-semibold">(${groupTemplates.length} plantillas)</span></span>
                    </td>
                </tr>
            `;
            groupTemplates.forEach(t => {
                tbody.innerHTML += getRowHtml(t, true);
            });
        });
    }

    lucide.createIcons();
}

function selectTemplateAndOpenDesigner(templateId) {
    selectedTemplateId = templateId;
    switchTab('bpmn-designer');
}

async function deleteTemplate(templateId) {
    if (!confirm("¿Está seguro de que desea eliminar esta plantilla de proceso y todas sus tareas?")) return;
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch(`/api/bpm/templates/${templateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const idx = templatesData.findIndex(t => t.id === templateId);
            if (idx !== -1) {
                templatesData.splice(idx, 1);
                if (selectedTemplateId === templateId) {
                    selectedTemplateId = templatesData.length > 0 ? templatesData[0].id : null;
                }
                syncStateToStorage();
                renderTemplatesListView();
                if (selectedTemplateId) {
                    loadTemplate(selectedTemplateId);
                } else {
                    const activeTplLabel = document.getElementById("active-template-name-label");
                    if (activeTplLabel) activeTplLabel.innerText = "Sin Plantillas";
                }
            }
            alert("Plantilla eliminada exitosamente.");
        } else {
            alert("Error al eliminar la plantilla de la base de datos.");
        }
    } catch (e) {
        console.error("Error al borrar plantilla:", e);
        alert("Error de conexión al eliminar la plantilla.");
    }
}

function renderTemplateStatusStepbar() {
    const container = document.getElementById("template-status-stepbar");
    if (!container) return;

    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) {
        container.innerHTML = "";
        return;
    }

    const totalTasks = template.tasks ? template.tasks.length : 0;
    const lastTask = totalTasks > 0 ? template.tasks[totalTasks - 1] : null;
    const isLastTaskCompleted = lastTask && lastTask.status === "Completado";
    const completedTasksCount = template.tasks ? template.tasks.filter(t => t.status === "Completado").length : 0;

    let currentState = "proceso";
    if ((totalTasks > 0 && completedTasksCount === totalTasks) || isLastTaskCompleted) {
        currentState = "terminada";
    } else if (template.isPaused) {
        currentState = "pausa";
    }

    const states = [
        { id: "proceso", label: "En Proceso", activeClass: "active-proceso" },
        { id: "pausa", label: "En Pausa", activeClass: "active-pausa" },
        { id: "terminada", label: "Terminada", activeClass: "active-terminada" }
    ];

    let html = "";
    states.forEach(st => {
        const isActive = st.id === currentState;
        const className = `odoo-step-btn ${isActive ? st.activeClass : ''}`;
        html += `
            <button onclick="changeTemplateStatusStep('${st.id}')" class="${className}">
                ${st.label}
            </button>
        `;
    });

    container.innerHTML = html;
}

function changeTemplateStatusStep(newState) {
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const totalTasks = template.tasks ? template.tasks.length : 0;
    const completedTasksCount = template.tasks ? template.tasks.filter(t => t.status === "Completado").length : 0;
    let oldStateId = "proceso";
    if (totalTasks > 0 && completedTasksCount === totalTasks) {
        oldStateId = "terminada";
    } else if (template.isPaused) {
        oldStateId = "pausa";
    }

    if (oldStateId === newState) return;

    const getLabel = (st) => {
        if (st === 'proceso') return "En Proceso";
        if (st === 'pausa') return "En Pausa";
        if (st === 'terminada') return "Terminada";
        return st;
    };

    if (newState === 'pausa') {
        template.isPaused = true;
        if (!template.pausedAt) {
            template.pausedAt = Date.now();
        }
        isTemplateExecutionPaused = true;
        logTemplateActivity(template.id, "Etapa cambiada", `${getLabel(oldStateId)} → ${getLabel(newState)}`);
    } else if (newState === 'proceso') {
        if (template.pausedAt) {
            const pausedDuration = Date.now() - template.pausedAt;
            template.accumulatedPausedMs = (template.accumulatedPausedMs || 0) + pausedDuration;
            template.pausedAt = null;
        }
        template.isPaused = false;
        isTemplateExecutionPaused = false;
        logTemplateActivity(template.id, "Etapa cambiada", `${getLabel(oldStateId)} → ${getLabel(newState)}`);
    } else if (newState === 'terminada') {
        if (confirm("¿Desea marcar todas las tareas de esta plantilla como completadas?")) {
            template.tasks.forEach(task => {
                task.status = "Completado";
                task.color = "bg-brand-500 text-white";
                task.completedTime = new Date().toLocaleString('es-ES');
            });
            template.isPaused = false;
            isTemplateExecutionPaused = false;
            // Desactivar totalmente la recurrencia
            template.recurrenceType = 'disabled';
            template.nextExecution = null;
            logTemplateActivity(template.id, "Etapa cambiada", `${getLabel(oldStateId)} → ${getLabel(newState)}`);
        } else {
            return;
        }
    }

    // Persistir el cambio de pausa / estado al servidor
    const token = localStorage.getItem('sonicbi_token');
    fetch(`/api/bpm/templates/${template.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(template)
    }).catch(e => console.error("Error al persistir estado de plantilla desde Kanban:", e));

    loadTemplate(selectedTemplateId);
    renderMobileScreen();
    syncStateToStorage();
}

function getTemplateFolio(template) {
    if (!template) return "";
    if (template.code && template.code.startsWith("PL-")) return template.code;
    if (!template.folio) {
        const idx = templatesData.findIndex(t => t.id === template.id);
        const num = idx !== -1 ? templatesData.length - idx : 1;
        template.folio = "PL-" + String(num).padStart(4, '0');
        template.code = template.folio;
    }
    return template.folio;
}

function checkAndFinishTemplateIfLastTaskCompleted(template) {
    if (!template || !template.tasks || template.tasks.length === 0) return false;
    
    const lastTask = template.tasks[template.tasks.length - 1];
    const isLastTaskCompleted = (lastTask && lastTask.status === 'Completado');
    const allTasksCompleted = template.tasks.every(t => t.status === 'Completado');
    
    if (isLastTaskCompleted || allTasksCompleted) {
        const oldStateLabel = template.isPaused ? "En Pausa" : "En Proceso";
        template.isPaused = false;
        
        logTemplateActivity(template.id, "Etapa cambiada", `${oldStateLabel} → Terminada (Última tarea completada)`);
        
        const token = localStorage.getItem('sonicbi_token');
        fetch(`/api/bpm/templates/${template.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(template)
        }).catch(e => console.error("Error al actualizar plantilla a Terminada:", e));
        
        const tplFolio = getTemplateFolio(template);
        addNotification(`Proceso Finalizado: La plantilla [${tplFolio}] "${template.name}" ha pasado automáticamente a estado Terminada.`, 'completado', { templateId: template.id });
        return true;
    }
    return false;
}

function navigateTemplate(direction) {
    if (templatesData.length === 0) return;
    const currentIdx = templatesData.findIndex(t => t.id === selectedTemplateId);
    if (currentIdx === -1) return;

    let targetIdx = currentIdx;
    if (direction === 'prev') {
        targetIdx = currentIdx - 1;
        if (targetIdx < 0) targetIdx = templatesData.length - 1;
    } else if (direction === 'next') {
        targetIdx = currentIdx + 1;
        if (targetIdx >= templatesData.length) targetIdx = 0;
    }

    selectedTemplateId = templatesData[targetIdx].id;
    loadTemplate(selectedTemplateId);
}

async function persistCustomStatus(statusName) {
    if (!statusName || typeof statusName !== 'string') return;
    const nameTrimmed = statusName.trim();
    if (!nameTrimmed) return;

    if (!statusesList.includes(nameTrimmed)) {
        statusesList.push(nameTrimmed);
    }
    try {
        localStorage.setItem("sonicbi_custom_statuses", JSON.stringify(statusesList));
    } catch(e) {}

    const token = localStorage.getItem('sonicbi_token');
    if (!token) return;

    try {
        await fetch('/api/bpm/statuses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: nameTrimmed })
        });
    } catch(e) {
        console.error("Error al persistir estado personalizado en backend:", e);
    }
}

function syncStatusesWithCatalog() {
    try {
        const saved = localStorage.getItem("sonicbi_custom_statuses");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                parsed.forEach(st => {
                    if (st && !statusesList.includes(st)) statusesList.push(st);
                });
            }
        }
    } catch(e) {}

    if (Array.isArray(nodeLibraryList)) {
        nodeLibraryList.forEach(n => {
            if (n.status && !statusesList.includes(n.status)) {
                statusesList.push(n.status);
            }
        });
    }

    if (Array.isArray(templatesData)) {
        templatesData.forEach(tpl => {
            if (Array.isArray(tpl.tasks)) {
                tpl.tasks.forEach(tk => {
                    if (tk.status && !statusesList.includes(tk.status)) {
                        statusesList.push(tk.status);
                    }
                });
            }
        });
    }
}

function openCatalogNodeModal(index = null) {
    editingCatalogNodeIndex = index;
    const titleEl = document.getElementById("catalog-node-modal-title");
    const submitBtn = document.getElementById("catalog-node-modal-submit-btn");

    const nameInput = document.getElementById("catalog-modal-node-name");
    const assignedSelect = document.getElementById("catalog-modal-node-assigned");
    const timevalInput = document.getElementById("catalog-modal-node-timeval");
    const unitSelect = document.getElementById("catalog-modal-node-unit");
    const statusSelect = document.getElementById("catalog-modal-node-status");
    const obsTextarea = document.getElementById("catalog-modal-node-obs");

    const situationSelect = document.getElementById("catalog-modal-node-situation");

    if (!titleEl || !nameInput || !assignedSelect || !timevalInput || !unitSelect || !statusSelect || !obsTextarea) return;

    syncSpecialistsCatalog();
    syncStatusesWithCatalog();

    assignedSelect.innerHTML = specialistsCatalog.map(spec => {
        return `<option value="${spec}">${spec}</option>`;
    }).join('');

    statusSelect.innerHTML = statusesList.map(st => {
        return `<option value="${st}">${st}</option>`;
    }).join('');

    if (index !== null) {
        const node = nodeLibraryList[index];
        titleEl.innerText = "Editar Nodo Estándar: " + node.name;
        submitBtn.innerText = "Actualizar Nodo";
        nameInput.value = node.name;
        assignedSelect.value = node.assigned || "Sin Asignar";
        timevalInput.value = node.timeVal || "1";
        unitSelect.value = node.unit || "dia";
        statusSelect.value = node.status || "Pendiente";
        if (situationSelect) situationSelect.value = node.situacion || "No Aceptado";
        obsTextarea.value = node.observaciones || "";
    } else {
        titleEl.innerText = "Crear Nodo Estándar";
        submitBtn.innerText = "Guardar en Catálogo";
        nameInput.value = "";
        assignedSelect.value = "Sin Asignar";
        timevalInput.value = "1";
        unitSelect.value = "dia";
        statusSelect.value = "Pendiente";
        if (situationSelect) situationSelect.value = "Aceptado";
        obsTextarea.value = "";
    }

    document.getElementById("modal-catalog-node-editor").classList.remove("hidden");
    lucide.createIcons();
}

function closeCatalogNodeModal() {
    document.getElementById("modal-catalog-node-editor").classList.add("hidden");
}

async function saveCatalogNodeFromModal() {
    const nameVal = document.getElementById("catalog-modal-node-name").value.trim();
    const assignedVal = document.getElementById("catalog-modal-node-assigned").value;
    const timevalVal = parseFloat(document.getElementById("catalog-modal-node-timeval").value) || 1;
    const unitVal = document.getElementById("catalog-modal-node-unit").value;
    const statusVal = document.getElementById("catalog-modal-node-status").value;
    const situationVal = document.getElementById("catalog-modal-node-situation") ? document.getElementById("catalog-modal-node-situation").value : "No Aceptado";
    const obsVal = document.getElementById("catalog-modal-node-obs").value.trim();

    if (!nameVal) {
        alert("Por favor, ingrese el nombre del nodo.");
        return;
    }

    if (editingCatalogNodeIndex === null) {
        const duplicateIndex = nodeLibraryList.findIndex(n => n.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicateIndex !== -1) {
            alert("Ya existe un nodo con este nombre en el catálogo estándar. Por favor elija un nombre diferente.");
            return;
        }
    } else {
        const duplicateIndex = nodeLibraryList.findIndex((n, idx) => idx !== editingCatalogNodeIndex && n.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicateIndex !== -1) {
            alert("Ya existe otro nodo con este nombre en el catálogo estándar.");
            return;
        }
    }

    // Alerta de sobrecarga
    const overload = checkBuilderNodeOverload();
    if (overload && overload.isOverloaded) {
        const nameOnly = getEmployeeNameFromAssigned(assignedVal);
        if (!confirm(`⚠️ ¡ALERTA DE SOBRECARGA!\nEl especialista ${nameOnly} excede su límite de ${overload.limit} horas de trabajo.\nHoras disponibles: ${formatHoursToHHMM(overload.minAvail)}\nHoras requeridas: ${formatHoursToHHMM(overload.totalRequired)}\n\n¿Desea guardar la asignación de todas formas?`)) {
            return;
        }
    }

    let durationInDays = timevalVal;
    if (unitVal === 'hora') {
        durationInDays = timevalVal / 24;
    } else if (unitVal === 'min') {
        durationInDays = timevalVal / (24 * 60);
    }

    let nodeId = null;
    if (editingCatalogNodeIndex !== null) {
        nodeId = nodeLibraryList[editingCatalogNodeIndex].id;
    }

    const payload = {
        id: nodeId,
        name: nameVal,
        category: 'General',
        icon: 'file-text',
        duration: durationInDays,
        description: obsVal,
        assigned: assignedVal,
        timeVal: timevalVal,
        unit: unitVal,
        status: statusVal,
        situacion: situationVal
    };

    const token = localStorage.getItem('sonicbi_token');

    try {
        const response = await fetch('/api/bpm/nodes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            
            const targetNode = {
                id: resData.id || nodeId,
                name: nameVal,
                assigned: assignedVal,
                timeVal: timevalVal,
                unit: unitVal,
                status: statusVal,
                situacion: situationVal,
                observaciones: obsVal
            };

            if (editingCatalogNodeIndex !== null) {
                nodeLibraryList[editingCatalogNodeIndex] = targetNode;
                alert(`Nodo "${nameVal}" actualizado exitosamente.`);
            } else {
                nodeLibraryList.push(targetNode);
                alert(`"${nameVal}" guardado exitosamente en el catálogo con sus propiedades predeterminadas.`);
            }

            if (statusVal) {
                persistCustomStatus(statusVal);
            }

            closeCatalogNodeModal();
            renderCatalogNodesView();
            syncStateToStorage();
        } else {
            alert("Error al guardar el nodo en la base de datos.");
        }
    } catch (e) {
        console.error("Error al persistir nodo:", e);
        alert("Error de conexión al guardar el nodo.");
    }
}

async function deleteCatalogNode(index) {
    const node = nodeLibraryList[index];
    if (confirm(`¿Está seguro de que desea eliminar "${node.name}" del catálogo?`)) {
        const token = localStorage.getItem('sonicbi_token');
        try {
            const response = await fetch(`/api/bpm/nodes/${node.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                if (editingCatalogNodeIndex === index) {
                    closeCatalogNodeModal();
                } else if (editingCatalogNodeIndex !== null && editingCatalogNodeIndex > index) {
                    editingCatalogNodeIndex--;
                }
                nodeLibraryList.splice(index, 1);
                renderCatalogNodesView();
                syncStateToStorage();
            } else {
                alert("Error al eliminar el nodo de la base de datos.");
            }
        } catch (e) {
            console.error("Error al borrar nodo:", e);
            alert("Error de conexión al eliminar el nodo.");
        }
    }
}

// Creador rápido de estado inline dentro del modal
function addCatalogModalQuickStatus() {
    const input = document.getElementById("catalog-modal-quick-status-input");
    const name = input ? input.value.trim() : "";

    if (!name) {
        alert("Por favor ingrese el nombre del nuevo estado.");
        return;
    }

    persistCustomStatus(name);

    const statusSelect = document.getElementById("catalog-modal-node-status");
    if (statusSelect) {
        statusSelect.innerHTML = statusesList.map(st => {
            return `<option value="${st}" ${st === name ? 'selected' : ''}>${st}</option>`;
        }).join('');
    }

    input.value = "";
    alert(`Estado "${name}" añadido, seleccionado y guardado en la base de datos.`);
}

// --- VISTA Y MODALES: GESTIÓN DE DEPARTAMENTOS ---

function renderDepartmentsView() {
    applyDeptsFilters();
}

function initDeptsFavorites() {
    const saved = localStorage.getItem("depts_favorites");
    if (saved) {
        deptsFavorites = JSON.parse(saved);
    } else {
        deptsFavorites = [];
    }
}

function renderDeptsFavoritesList() {
    const container = document.getElementById("depts-favorites-list");
    if (!container) return;
    if (deptsFavorites.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic">No hay favoritos guardados</div>`;
        return;
    }
    container.innerHTML = deptsFavorites.map((fav, index) => {
        return `
            <div class="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded select-none">
                <button onclick="applyDeptsFavoriteByIndex(${index})" class="flex-1 text-left hover:text-brand-500 truncate text-slate-700">
                    ${fav.name}
                </button>
                <button onclick="deleteDeptsFavorite(${index})" class="text-red-500 hover:text-red-755 text-xs font-bold focus:outline-none">
                    ×
                </button>
            </div>
        `;
    }).join("");
}

function applyDeptsFavoriteByIndex(index) {
    const fav = deptsFavorites[index];
    if (fav) {
        document.getElementById("filter-dept-active").checked = !!fav.filters.active;
        document.getElementById("filter-dept-empty").checked = !!fav.filters.empty;
        const radios = document.getElementsByName("group-depts");
        radios.forEach(r => { if (r.value === fav.groupBy) r.checked = true; });
        applyDeptsFilters();
        closeDeptsSearchDropdown();
    }
}

function deleteDeptsFavorite(index) {
    deptsFavorites.splice(index, 1);
    localStorage.setItem("depts_favorites", JSON.stringify(deptsFavorites));
    renderDeptsFavoritesList();
}

function saveDeptsFavorite() {
    const nameInput = document.getElementById("new-dept-favorite-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Por favor, ingresa un nombre para el favorito.");
        return;
    }
    const filters = {
        active: document.getElementById("filter-dept-active")?.checked || false,
        empty: document.getElementById("filter-dept-empty")?.checked || false
    };
    let groupByVal = "none";
    document.getElementsByName("group-depts").forEach(r => { if (r.checked) groupByVal = r.value; });
    deptsFavorites.push({ name, filters, groupBy: groupByVal });
    localStorage.setItem("depts_favorites", JSON.stringify(deptsFavorites));
    if (nameInput) nameInput.value = "";
    renderDeptsFavoritesList();
}

function toggleDeptsSearchDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("depts-search-dropdown");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderDeptsFavoritesList();
            lucide.createIcons();
        }
    }
}

// Registrar depts globalmente
window.toggleDeptsSearchDropdown = toggleDeptsSearchDropdown;
window.showDeptsSearchDropdown = showDeptsSearchDropdown;
window.closeDeptsSearchDropdown = closeDeptsSearchDropdown;
window.removeDeptsTag = removeDeptsTag;
window.applyDeptsFilters = applyDeptsFilters;
window.navigateDeptsList = navigateDeptsList;
window.saveDeptsFavorite = saveDeptsFavorite;
window.applyDeptsFavoriteByIndex = applyDeptsFavoriteByIndex;
window.deleteDeptsFavorite = deleteDeptsFavorite;

function showDeptsSearchDropdown() {
    const el = document.getElementById("depts-search-dropdown");
    if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        renderDeptsFavoritesList();
        lucide.createIcons();
    }
}

function closeDeptsSearchDropdown() {
    const el = document.getElementById("depts-search-dropdown");
    if (el) el.classList.add("hidden");
}

function removeDeptsTag(actionId) {
    if (actionId === 'search') {
        const inp = document.getElementById("depts-search-input");
        if (inp) inp.value = "";
    } else if (actionId.startsWith('filter-')) {
        const chk = document.getElementById(actionId);
        if (chk) chk.checked = false;
    } else if (actionId === 'group-none') {
        const radios = document.getElementsByName("group-depts");
        radios.forEach(r => { if (r.value === 'none') r.checked = true; });
    }
    applyDeptsFilters();
}

function applyDeptsFilters() {
    const searchInp = document.getElementById("depts-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkActive = document.getElementById("filter-dept-active")?.checked;
    const chkEmpty = document.getElementById("filter-dept-empty")?.checked;
    
    let groupByVal = "none";
    document.getElementsByName("group-depts").forEach(r => { if (r.checked) groupByVal = r.value; });
    
    // Chips
    const tagsContainer = document.getElementById("depts-search-tags");
    if (tagsContainer) {
        let tagsHtml = "";
        if (searchText) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] select-none">
                    "${searchText}"
                    <button onclick="removeDeptsTag('search')" class="hover:text-slate-950 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkActive) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-blue-50 text-blue-755 font-semibold px-2 py-0.5 rounded border border-blue-150 text-[10px] select-none">
                    Con personal
                    <button onclick="removeDeptsTag('filter-dept-active')" class="hover:text-blue-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkEmpty) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-amber-50 text-amber-755 font-semibold px-2 py-0.5 rounded border border-amber-150 text-[10px] select-none">
                    Sin personal
                    <button onclick="removeDeptsTag('filter-dept-empty')" class="hover:text-amber-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (groupByVal !== 'none') {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-teal-50 text-teal-755 font-semibold px-2 py-0.5 rounded border border-teal-150 text-[10px] select-none">
                    Agrupado: Responsable
                    <button onclick="removeDeptsTag('group-none')" class="hover:text-teal-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        tagsContainer.innerHTML = tagsHtml;
    }
    
    // Filtrar
    const filtered = departmentsList.filter(dept => {
        const associatedEmps = employeesList.filter(emp => emp.department === dept.name);
        if (searchText) {
            const nameMatch = dept.name.toLowerCase().includes(searchText);
            const mgrMatch = (dept.manager || "").toLowerCase().includes(searchText);
            if (!nameMatch && !mgrMatch) return false;
        }
        if (chkActive || chkEmpty) {
            let match = false;
            if (chkActive && associatedEmps.length > 0) match = true;
            if (chkEmpty && associatedEmps.length === 0) match = true;
            if (!match) return false;
        }
        return true;
    });
    
    // Paginación
    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / deptsListPageSize) - 1);
    if (deptsListCurrentPage > maxPage) deptsListCurrentPage = maxPage;
    
    const startIdx = totalCount === 0 ? 0 : deptsListCurrentPage * deptsListPageSize;
    const endIdx = Math.min(startIdx + deptsListPageSize, totalCount);
    
    const paginationLabel = document.getElementById("depts-pagination-label");
    if (paginationLabel) {
        paginationLabel.innerText = totalCount === 0 ? "0 / 0" : `${startIdx + 1}-${endIdx} / ${totalCount}`;
    }
    
    const paginated = filtered.slice(startIdx, endIdx);
    renderDeptsListTableContent(paginated, groupByVal);
}

function navigateDeptsList(direction) {
    const searchInp = document.getElementById("depts-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    const chkActive = document.getElementById("filter-dept-active")?.checked;
    const chkEmpty = document.getElementById("filter-dept-empty")?.checked;
    
    const filtered = departmentsList.filter(dept => {
        const associatedEmps = employeesList.filter(emp => emp.department === dept.name);
        if (searchText) {
            const nameMatch = dept.name.toLowerCase().includes(searchText);
            const mgrMatch = (dept.manager || "").toLowerCase().includes(searchText);
            if (!nameMatch && !mgrMatch) return false;
        }
        if (chkActive || chkEmpty) {
            let match = false;
            if (chkActive && associatedEmps.length > 0) match = true;
            if (chkEmpty && associatedEmps.length === 0) match = true;
            if (!match) return false;
        }
        return true;
    });

    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / deptsListPageSize) - 1);
    
    if (direction === 'prev') {
        deptsListCurrentPage--;
        if (deptsListCurrentPage < 0) deptsListCurrentPage = maxPage;
    } else if (direction === 'next') {
        deptsListCurrentPage++;
        if (deptsListCurrentPage > maxPage) deptsListCurrentPage = 0;
    }
    
    applyDeptsFilters();
}

function renderDeptsListTableContent(depts, groupBy) {
    const tbody = document.getElementById("depts-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const getRowHtml = (dept) => {
        const index = departmentsList.findIndex(d => d.name === dept.name);
        const associatedEmps = employeesList.filter(emp => emp.department === dept.name);
        const empNamesList = associatedEmps.map(emp => `${emp.name} (${emp.role})`).join(', ') || 'Ninguno';
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3 font-bold text-slate-800">${dept.name}</td>
                <td class="px-4 py-3 text-slate-750 font-semibold text-xs">${dept.manager || 'Sin asignar'}</td>
                <td class="px-4 py-3 text-slate-500 max-w-[340px] truncate text-xs font-semibold" title="${empNamesList}">${empNamesList}</td>
                <td class="px-4 py-3 text-center font-bold text-slate-700">${associatedEmps.length}</td>
                <td class="px-4 py-3 text-right space-x-1.5">
                    <button onclick="openDeptModal(${index})" class="text-brand-500 hover:text-brand-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Editar
                    </button>
                    <button onclick="deleteDepartment(${index})" class="text-red-500 hover:text-red-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    };

    if (depts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-400 text-xs font-semibold">No se encontraron departamentos con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    if (groupBy === 'none') {
        depts.forEach(d => {
            tbody.innerHTML += getRowHtml(d);
        });
    } else {
        const groups = {};
        depts.forEach(d => {
            const key = d.manager || "Sin Asignar";
            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });
        
        Object.keys(groups).forEach(key => {
            const groupDepts = groups[key];
            tbody.innerHTML += `
                <tr class="bg-slate-50/70 border-y border-slate-200/60 font-semibold text-slate-700 select-none">
                    <td colspan="5" class="px-4 py-2.5 text-xs flex items-center gap-1.5">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>Responsable: ${key} <span class="text-slate-400 font-normal">(${groupDepts.length} departamentos)</span></span>
                    </td>
                </tr>
            `;
            groupDepts.forEach(d => {
                tbody.innerHTML += getRowHtml(d);
            });
        });
    }

    lucide.createIcons();
}

function openDeptModal(index = null) {
    editingDeptIndex = index;
    
    const titleEl = document.getElementById("dept-modal-title");
    const submitBtn = document.getElementById("dept-modal-submit-btn");
    const nameInput = document.getElementById("dept-modal-name");
    const managerSelect = document.getElementById("dept-modal-manager");
    const membersContainer = document.getElementById("dept-modal-members-container");

    if (!titleEl || !nameInput || !managerSelect || !membersContainer) return;

    managerSelect.innerHTML = `<option value="Sin Asignar">Sin Asignar</option>` + employeesList.map(e => {
        return `<option value="${e.name}">${e.name} (${e.role})</option>`;
    }).join('');

    membersContainer.innerHTML = employeesList.map(emp => {
        return `
            <label class="flex items-center gap-2 bg-white p-2 rounded border border-slate-150 cursor-pointer text-xs hover:bg-slate-50 transition-all">
                <input type="checkbox" value="${emp.name}" class="rounded text-brand-500 focus:ring-brand-500 dept-member-checkbox">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-700">${emp.name}</span>
                    <span class="text-[10px] text-slate-400">${emp.role} (Actual: ${emp.department || 'Sin Asignar'})</span>
                </div>
            </label>
        `;
    }).join('');

    if (index !== null) {
        const dept = departmentsList[index];
        titleEl.innerText = "Editar Departamento: " + dept.name;
        submitBtn.innerText = "Actualizar Departamento";
        nameInput.value = dept.name;
        managerSelect.value = dept.manager;

        document.querySelectorAll(".dept-member-checkbox").forEach(chk => {
            const emp = employeesList.find(e => e.name === chk.value);
            if (emp && emp.department === dept.name) {
                chk.checked = true;
            }
        });
    } else {
        titleEl.innerText = "Crear Departamento";
        submitBtn.innerText = "Guardar Departamento";
        nameInput.value = "";
        managerSelect.value = "Sin Asignar";
    }

    document.getElementById("modal-dept-editor").classList.remove("hidden");
    lucide.createIcons();
}

function closeDeptModal() {
    document.getElementById("modal-dept-editor").classList.add("hidden");
}

async function saveDeptFromModal() {
    const nameVal = document.getElementById("dept-modal-name").value.trim();
    const managerVal = document.getElementById("dept-modal-manager").value;

    if (!nameVal) {
        alert("Por favor ingrese el nombre del departamento.");
        return;
    }

    if (editingDeptIndex === null) {
        const duplicate = departmentsList.findIndex(d => d.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicate !== -1) {
            alert("Ya existe un departamento con ese nombre.");
            return;
        }
    } else {
        const duplicate = departmentsList.findIndex((d, idx) => idx !== editingDeptIndex && d.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicate !== -1) {
            alert("Ya existe otro departamento con ese nombre.");
            return;
        }
    }

    const checkedEmployees = [];
    document.querySelectorAll(".dept-member-checkbox:checked").forEach(chk => {
        checkedEmployees.push(chk.value);
    });

    let deptId = null;
    let oldDeptName = null;
    if (editingDeptIndex !== null) {
        deptId = departmentsList[editingDeptIndex].id;
        oldDeptName = departmentsList[editingDeptIndex].name;
    }

    const payload = {
        id: deptId,
        name: nameVal,
        manager: managerVal,
        members: checkedEmployees,
        oldName: oldDeptName,
        color: 'border-slate-200 text-slate-700 bg-slate-50'
    };

    const token = localStorage.getItem('sonicbi_token');

    try {
        const response = await fetch('/api/bpm/departments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            const targetDept = { id: resData.id, name: nameVal, manager: managerVal };

            if (editingDeptIndex !== null) {
                const oldName = departmentsList[editingDeptIndex].name;
                
                employeesList.forEach(emp => {
                    if (emp.department === oldName) {
                        emp.department = nameVal;
                    }
                });

                employeesList.forEach(emp => {
                    const isChecked = checkedEmployees.includes(emp.name);
                    if (isChecked) {
                        emp.department = nameVal;
                    } else if (emp.department === nameVal) {
                        emp.department = "Sin Asignar";
                    }
                });

                departmentsList[editingDeptIndex] = targetDept;
                alert(`Departamento "${nameVal}" actualizado exitosamente.`);
            } else {
                departmentsList.push(targetDept);
                employeesList.forEach(emp => {
                    if (checkedEmployees.includes(emp.name)) {
                        emp.department = nameVal;
                    }
                });
                alert(`Departamento "${nameVal}" creado exitosamente.`);
            }

            closeDeptModal();
            renderDepartmentsView();
            if (!document.getElementById("view-personal").classList.contains("hidden")) {
                renderPersonalView();
            }
            syncStateToStorage();
        } else {
            alert("Error al guardar el departamento en la base de datos.");
        }
    } catch (e) {
        console.error("Error al persistir departamento:", e);
        alert("Error de conexión al guardar el departamento.");
    }
}

async function deleteDepartment(index) {
    const dept = departmentsList[index];
    if (confirm(`¿Está seguro de que desea eliminar el departamento "${dept.name}"? Los empleados asignados a este departamento quedarán sin asignación.`)) {
        const token = localStorage.getItem('sonicbi_token');
        try {
            const response = await fetch(`/api/bpm/departments/${dept.id || dept.name.toLowerCase()}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                employeesList.forEach(emp => {
                    if (emp.department === dept.name) {
                        emp.department = "Sin Asignar";
                    }
                });

                departmentsList.splice(index, 1);
                renderDepartmentsView();
                syncStateToStorage();
            } else {
                alert("Error al eliminar el departamento de la base de datos.");
            }
        } catch (e) {
            console.error("Error al borrar departamento:", e);
            alert("Error de conexión al eliminar el departamento.");
        }
    }
}

// --- VISTA Y MODALES: GESTIÓN DE PERSONAL ---

function calculateWorkingHours(timeIn, lunchOut, lunchIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    const toMinutes = (tStr) => {
        if (!tStr) return 0;
        const parts = tStr.split(":");
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        return h * 60 + m;
    };
    const mIn = toMinutes(timeIn);
    const mLOut = toMinutes(lunchOut);
    const mLIn = toMinutes(lunchIn);
    const mOut = toMinutes(timeOut);
    
    let total = 0;
    if (mLOut > mIn && mLIn > mLOut && mOut > mLIn) {
        total = (mLOut - mIn) + (mOut - mLIn);
    } else {
        total = mOut - mIn;
    }
    if (total < 0) total = 0;
    return parseFloat((total / 60).toFixed(2));
}

function getCompletedTasksCountForEmployee(employeeName) {
    if (!employeeName) return 0;
    let count = 0;
    templatesData.forEach(template => {
        if (template.tasks) {
            template.tasks.forEach(task => {
                if (task.assigned && task.assigned.includes(employeeName) && task.status === "Completado") {
                    count++;
                }
            });
        }
    });
    return count;
}

function toggleEmployeeDetails(index) {
    const detailsRow = document.getElementById(`emp-details-${index}`);
    const chevron = document.getElementById(`chevron-emp-${index}`);
    if (detailsRow) {
        if (detailsRow.classList.contains('hidden')) {
            detailsRow.classList.remove('hidden');
            if (chevron) chevron.classList.add('rotate-90');
        } else {
            detailsRow.classList.add('hidden');
            if (chevron) chevron.classList.remove('rotate-90');
        }
    }
}

function renderPersonalView() {
    applyEmpsFilters();
}

function initEmpsFavorites() {
    const saved = localStorage.getItem("emps_favorites");
    if (saved) {
        empsFavorites = JSON.parse(saved);
    } else {
        empsFavorites = [];
    }
}

function renderEmpsFavoritesList() {
    const container = document.getElementById("emps-favorites-list");
    if (!container) return;
    if (empsFavorites.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic">No hay favoritos guardados</div>`;
        return;
    }
    container.innerHTML = empsFavorites.map((fav, index) => {
        return `
            <div class="flex items-center justify-between gap-2 p-1 hover:bg-slate-50 rounded select-none">
                <button onclick="applyEmpsFavoriteByIndex(${index})" class="flex-1 text-left hover:text-brand-500 truncate text-slate-700">
                    ${fav.name}
                </button>
                <button onclick="deleteEmpsFavorite(${index})" class="text-red-500 hover:text-red-755 text-xs font-bold focus:outline-none">
                    ×
                </button>
            </div>
        `;
    }).join("");
}

function applyEmpsFavoriteByIndex(index) {
    const fav = empsFavorites[index];
    if (fav) {
        document.getElementById("filter-emp-comercial").checked = !!fav.filters.comercial;
        document.getElementById("filter-emp-soporte").checked = !!fav.filters.soporte;
        document.getElementById("filter-emp-control").checked = !!fav.filters.control;
        const radios = document.getElementsByName("group-emps");
        radios.forEach(r => { if (r.value === fav.groupBy) r.checked = true; });
        applyEmpsFilters();
        closeEmpsSearchDropdown();
    }
}

function deleteEmpsFavorite(index) {
    empsFavorites.splice(index, 1);
    localStorage.setItem("emps_favorites", JSON.stringify(empsFavorites));
    renderEmpsFavoritesList();
}

function saveEmpsFavorite() {
    const nameInput = document.getElementById("new-emp-favorite-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Por favor, ingresa un nombre para el favorito.");
        return;
    }
    const filters = {
        comercial: document.getElementById("filter-emp-comercial")?.checked || false,
        soporte: document.getElementById("filter-emp-soporte")?.checked || false,
        control: document.getElementById("filter-emp-control")?.checked || false
    };
    let groupByVal = "none";
    document.getElementsByName("group-emps").forEach(r => { if (r.checked) groupByVal = r.value; });
    empsFavorites.push({ name, filters, groupBy: groupByVal });
    localStorage.setItem("emps_favorites", JSON.stringify(empsFavorites));
    if (nameInput) nameInput.value = "";
    renderEmpsFavoritesList();
}

function toggleEmpsSearchDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("emps-search-dropdown");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderEmpsFavoritesList();
            lucide.createIcons();
        }
    }
}

// Registrar emps globalmente
window.toggleEmpsSearchDropdown = toggleEmpsSearchDropdown;
window.showEmpsSearchDropdown = showEmpsSearchDropdown;
window.closeEmpsSearchDropdown = closeEmpsSearchDropdown;
window.removeEmpsTag = removeEmpsTag;
window.applyEmpsFilters = applyEmpsFilters;
window.navigateEmpsList = navigateEmpsList;
window.saveEmpsFavorite = saveEmpsFavorite;
window.applyEmpsFavoriteByIndex = applyEmpsFavoriteByIndex;
window.deleteEmpsFavorite = deleteEmpsFavorite;

function showEmpsSearchDropdown() {
    const el = document.getElementById("emps-search-dropdown");
    if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        renderEmpsFavoritesList();
        lucide.createIcons();
    }
}

function closeEmpsSearchDropdown() {
    const el = document.getElementById("emps-search-dropdown");
    if (el) el.classList.add("hidden");
}

function removeEmpsTag(actionId) {
    if (actionId === 'search') {
        const inp = document.getElementById("emps-search-input");
        if (inp) inp.value = "";
    } else if (actionId.startsWith('filter-')) {
        const chk = document.getElementById(actionId);
        if (chk) chk.checked = false;
    } else if (actionId === 'group-none') {
        const radios = document.getElementsByName("group-emps");
        radios.forEach(r => { if (r.value === 'none') r.checked = true; });
    }
    applyEmpsFilters();
}

function applyEmpsFilters() {
    const searchInp = document.getElementById("emps-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    
    const chkComercial = document.getElementById("filter-emp-comercial")?.checked;
    const chkSoporte = document.getElementById("filter-emp-soporte")?.checked;
    const chkControl = document.getElementById("filter-emp-control")?.checked;
    
    let groupByVal = "none";
    document.getElementsByName("group-emps").forEach(r => { if (r.checked) groupByVal = r.value; });
    
    // Chips
    const tagsContainer = document.getElementById("emps-search-tags");
    if (tagsContainer) {
        let tagsHtml = "";
        if (searchText) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] select-none">
                    "${searchText}"
                    <button onclick="removeEmpsTag('search')" class="hover:text-slate-950 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkComercial) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-blue-50 text-blue-755 font-semibold px-2 py-0.5 rounded border border-blue-150 text-[10px] select-none">
                    Comercial
                    <button onclick="removeEmpsTag('filter-emp-comercial')" class="hover:text-blue-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkSoporte) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-amber-50 text-amber-755 font-semibold px-2 py-0.5 rounded border border-amber-150 text-[10px] select-none">
                    Soporte / Campo
                    <button onclick="removeEmpsTag('filter-emp-soporte')" class="hover:text-amber-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (chkControl) {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-purple-50 text-purple-755 font-semibold px-2 py-0.5 rounded border border-purple-150 text-[10px] select-none">
                    Control / Supervisor
                    <button onclick="removeEmpsTag('filter-emp-control')" class="hover:text-purple-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        if (groupByVal !== 'none') {
            tagsHtml += `
                <span class="inline-flex items-center gap-0.5 bg-teal-50 text-teal-755 font-semibold px-2 py-0.5 rounded border border-teal-150 text-[10px] select-none">
                    Agrupado: Departamento
                    <button onclick="removeEmpsTag('group-none')" class="hover:text-teal-955 font-bold ml-1">×</button>
                </span>
            `;
        }
        tagsContainer.innerHTML = tagsHtml;
    }
    
    // Filtrar
    const filtered = employeesList.filter(emp => {
        if (searchText) {
            const nameMatch = emp.name.toLowerCase().includes(searchText);
            const roleMatch = (emp.role || "").toLowerCase().includes(searchText);
            const deptMatch = (emp.department || "").toLowerCase().includes(searchText);
            if (!nameMatch && !roleMatch && !deptMatch) return false;
        }
        if (chkComercial || chkSoporte || chkControl) {
            let match = false;
            const r = (emp.role || "").toLowerCase();
            if (chkComercial && (r.includes("comercial") || r.includes("vendedor") || r.includes("ventas"))) match = true;
            if (chkSoporte && (r.includes("soporte") || r.includes("campo") || r.includes("tecnico") || r.includes("téc"))) match = true;
            if (chkControl && (r.includes("control") || r.includes("supervisor") || r.includes("coordinador") || r.includes("ing") || r.includes("jefe"))) match = true;
            if (!match) return false;
        }
        return true;
    });
    
    // Paginación
    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / empsListPageSize) - 1);
    if (empsListCurrentPage > maxPage) empsListCurrentPage = maxPage;
    
    const startIdx = totalCount === 0 ? 0 : empsListCurrentPage * empsListPageSize;
    const endIdx = Math.min(startIdx + empsListPageSize, totalCount);
    
    const paginationLabel = document.getElementById("emps-pagination-label");
    if (paginationLabel) {
        paginationLabel.innerText = totalCount === 0 ? "0 / 0" : `${startIdx + 1}-${endIdx} / ${totalCount}`;
    }
    
    const paginated = filtered.slice(startIdx, endIdx);
    renderEmpsListTableContent(paginated, groupByVal);
}

function navigateEmpsList(direction) {
    const searchInp = document.getElementById("emps-search-input");
    const searchText = searchInp ? searchInp.value.trim().toLowerCase() : "";
    const chkComercial = document.getElementById("filter-emp-comercial")?.checked;
    const chkSoporte = document.getElementById("filter-emp-soporte")?.checked;
    const chkControl = document.getElementById("filter-emp-control")?.checked;
    
    const filtered = employeesList.filter(emp => {
        if (searchText) {
            const nameMatch = emp.name.toLowerCase().includes(searchText);
            const roleMatch = (emp.role || "").toLowerCase().includes(searchText);
            const deptMatch = (emp.department || "").toLowerCase().includes(searchText);
            if (!nameMatch && !roleMatch && !deptMatch) return false;
        }
        if (chkComercial || chkSoporte || chkControl) {
            let match = false;
            const r = (emp.role || "").toLowerCase();
            if (chkComercial && (r.includes("comercial") || r.includes("vendedor") || r.includes("ventas"))) match = true;
            if (chkSoporte && (r.includes("soporte") || r.includes("campo") || r.includes("tecnico") || r.includes("téc"))) match = true;
            if (chkControl && (r.includes("control") || r.includes("supervisor") || r.includes("coordinador") || r.includes("ing") || r.includes("jefe"))) match = true;
            if (!match) return false;
        }
        return true;
    });

    const totalCount = filtered.length;
    const maxPage = Math.max(0, Math.ceil(totalCount / empsListPageSize) - 1);
    
    if (direction === 'prev') {
        empsListCurrentPage--;
        if (empsListCurrentPage < 0) empsListCurrentPage = maxPage;
    } else if (direction === 'next') {
        empsListCurrentPage++;
        if (empsListCurrentPage > maxPage) empsListCurrentPage = 0;
    }
    
    applyEmpsFilters();
}

function renderEmpsListTableContent(emps, groupBy) {
    const tbody = document.getElementById("emps-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const getRowHtml = (emp) => {
        const index = employeesList.findIndex(e => e.name === emp.name);
        const completedCount = getCompletedTasksCountForEmployee(emp.name);
        const hoursEfectivas = calculateWorkingHours(emp.timeIn || '09:00', emp.lunchOut || '14:00', emp.lunchIn || '15:00', emp.timeOut || '18:00');
        
        return `
            <tr onclick="toggleEmployeeDetails(${index})" class="cursor-pointer hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="chevron-right" id="chevron-emp-${index}" class="w-4 h-4 text-slate-400 transition-transform"></i>
                        <span class="font-bold text-slate-800 block text-xs">${emp.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-slate-700 text-xs font-semibold">${emp.role || 'Sin puesto'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded border text-[9px] font-bold bg-brand-50 text-brand-700 border-brand-100">${emp.department || 'Sin Asignar'}</span>
                </td>
                <td class="px-4 py-3 text-center font-bold text-emerald-600 font-mono text-xs">${completedCount} tareas</td>
                <td class="px-4 py-3 text-right space-x-1.5" onclick="event.stopPropagation()">
                    <button onclick="openEmployeeModal(${index})" class="text-brand-500 hover:text-brand-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Editar
                    </button>
                    <button onclick="deleteEmployee(${index})" class="text-red-500 hover:text-red-700 hover:underline font-bold uppercase text-[10px] tracking-wider transition-all">
                        Eliminar
                    </button>
                </td>
            </tr>
            <tr id="emp-details-${index}" class="hidden bg-slate-50/50">
                <td colspan="5" class="px-8 py-4 border-l-2 border-brand-500">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-[11px]">
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">Horario Entrada</p>
                            <p class="font-semibold text-slate-700 font-mono mt-0.5">${emp.timeIn || '09:00'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">Salida Comer</p>
                            <p class="font-semibold text-slate-700 font-mono mt-0.5">${emp.lunchOut || '14:00'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">Regreso Comer</p>
                            <p class="font-semibold text-slate-700 font-mono mt-0.5">${emp.lunchIn || '15:00'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">Horario Salida</p>
                            <p class="font-semibold text-slate-700 font-mono mt-0.5">${emp.timeOut || '18:00'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-brand-600 uppercase">Horas Efectivas</p>
                            <p class="font-bold text-brand-700 font-mono mt-0.5">${hoursEfectivas} hrs</p>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    };

    if (emps.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-slate-400 text-xs font-semibold">No se encontraron empleados con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    if (groupBy === 'none') {
        emps.forEach(e => {
            tbody.innerHTML += getRowHtml(e);
        });
    } else {
        const groups = {};
        emps.forEach(e => {
            const key = e.department || "Sin Asignar";
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        });
        
        Object.keys(groups).forEach(key => {
            const groupEmps = groups[key];
            tbody.innerHTML += `
                <tr class="bg-slate-50/70 border-y border-slate-200/60 font-semibold text-slate-700 select-none">
                    <td colspan="5" class="px-4 py-2.5 text-xs flex items-center gap-1.5">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>Departamento: ${key} <span class="text-slate-400 font-normal">(${groupEmps.length} personas)</span></span>
                    </td>
                </tr>
            `;
            groupEmps.forEach(e => {
                tbody.innerHTML += getRowHtml(e);
            });
        });
    }

    lucide.createIcons();
}

async function openEmployeeModal(index = null) {
    editingEmpIndex = index;
    
    const titleEl = document.getElementById("employee-modal-title");
    const submitBtn = document.getElementById("employee-modal-submit-btn");
    const nameInput = document.getElementById("emp-modal-name");
    const roleInput = document.getElementById("emp-modal-role");
    const deptSelect = document.getElementById("emp-modal-dept");
    
    const timeInInput = document.getElementById("emp-modal-time-in");
    const lunchOutInput = document.getElementById("emp-modal-time-lunch-out");
    const lunchInInput = document.getElementById("emp-modal-time-lunch-in");
    const timeOutInput = document.getElementById("emp-modal-time-out");

    if (!titleEl || !nameInput || !roleInput || !deptSelect || !timeInInput) return;

    // Cargar roles dinámicos del backend
    try {
        const response = await fetch('/api/roles/permisos');
        if (response.ok) {
            const data = await response.json();
            const roles = Object.keys(data).sort((a, b) => {
                if (a === 'Administrador') return -1;
                if (b === 'Administrador') return 1;
                return a.localeCompare(b);
            });
            roleInput.innerHTML = roles.map(r => `<option value="${r}">${r}</option>`).join('');
        }
    } catch(e) {
        console.error('Error cargando roles dinámicos en personal:', e);
    }

    deptSelect.innerHTML = `<option value="Sin Asignar">Sin Asignar</option>` + departmentsList.map(d => {
        return `<option value="${d.name}">${d.name}</option>`;
    }).join('');

    if (index !== null) {
        const emp = employeesList[index];
        titleEl.innerText = "Editar Personal: " + emp.name;
        submitBtn.innerText = "Actualizar Empleado";
        nameInput.value = emp.name;
        roleInput.value = emp.role || "Administrador";
        deptSelect.value = emp.department || "Sin Asignar";
        
        document.getElementById("emp-modal-email").value = emp.email || "";
        document.getElementById("emp-modal-password").value = "";
        
        timeInInput.value = emp.timeIn || "09:00";
        lunchOutInput.value = emp.lunchOut || "14:00";
        lunchInInput.value = emp.lunchIn || "15:00";
        timeOutInput.value = emp.timeOut || "18:00";
    } else {
        titleEl.innerText = "Registrar Personal";
        submitBtn.innerText = "Registrar Empleado";
        nameInput.value = "";
        roleInput.value = "";
        deptSelect.value = "Sin Asignar";
        
        document.getElementById("emp-modal-email").value = "";
        document.getElementById("emp-modal-password").value = "";
        
        timeInInput.value = "09:00";
        lunchOutInput.value = "14:00";
        lunchInInput.value = "15:00";
        timeOutInput.value = "18:00";
    }

    document.getElementById("modal-employee-editor").classList.remove("hidden");
    lucide.createIcons();
}

function closeEmployeeModal() {
    document.getElementById("modal-employee-editor").classList.add("hidden");
}

async function saveEmployeeFromModal() {
    const nameVal = document.getElementById("emp-modal-name").value.trim();
    const roleVal = document.getElementById("emp-modal-role").value.trim();
    const deptVal = document.getElementById("emp-modal-dept").value;
    
    const emailVal = document.getElementById("emp-modal-email").value.trim();
    const passwordVal = document.getElementById("emp-modal-password").value.trim();

    const timeInVal = document.getElementById("emp-modal-time-in").value;
    const lunchOutVal = document.getElementById("emp-modal-time-lunch-out").value;
    const lunchInVal = document.getElementById("emp-modal-time-lunch-in").value;
    const timeOutVal = document.getElementById("emp-modal-time-out").value;

    if (!nameVal) {
        alert("Por favor ingrese el nombre del empleado.");
        return;
    }

    if (editingEmpIndex === null) {
        const duplicate = employeesList.findIndex(e => e.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicate !== -1) {
            alert("Ya existe un empleado registrado con ese nombre.");
            return;
        }
    } else {
        const duplicate = employeesList.findIndex((e, idx) => idx !== editingEmpIndex && e.name.toLowerCase() === nameVal.toLowerCase());
        if (duplicate !== -1) {
            alert("Ya existe otro empleado registrado con ese nombre.");
            return;
        }
    }

    let empId = null;
    if (editingEmpIndex !== null) {
        empId = employeesList[editingEmpIndex].id;
    }

    const payload = {
        id: empId,
        name: nameVal,
        role: roleVal,
        department: deptVal,
        email: emailVal,
        password: passwordVal,
        status: 'Activo'
    };

    const token = localStorage.getItem('sonicbi_token');

    try {
        const response = await fetch('/api/bpm/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            const calculatedHours = calculateWorkingHours(timeInVal, lunchOutVal, lunchInVal, timeOutVal);
            
            const targetEmp = { 
                id: resData.id,
                name: nameVal, 
                role: roleVal, 
                department: deptVal, 
                email: emailVal,
                timeIn: timeInVal,
                lunchOut: lunchOutVal,
                lunchIn: lunchInVal,
                timeOut: timeOutVal,
                workHours: calculatedHours 
            };

            if (editingEmpIndex !== null) {
                employeesList[editingEmpIndex] = targetEmp;
                alert(`Empleado "${nameVal}" actualizado exitosamente.`);
            } else {
                employeesList.push(targetEmp);
                alert(`Empleado "${nameVal}" registrado exitosamente.`);
            }

            syncSpecialistsCatalog();
            closeEmployeeModal();
            renderPersonalView();
            syncStateToStorage();
        } else {
            alert("Error al guardar el empleado en la base de datos.");
        }
    } catch (e) {
        console.error("Error al persistir empleado:", e);
        alert("Error de conexión al guardar el empleado.");
    }
}

async function deleteEmployee(index) {
    const emp = employeesList[index];
    if (confirm(`¿Está seguro de que desea eliminar a "${emp.name}" del personal?`)) {
        const token = localStorage.getItem('sonicbi_token');
        try {
            const response = await fetch(`/api/bpm/employees/${emp.id || emp.name}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                if (editingEmpIndex === index) {
                    closeEmployeeModal();
                } else if (editingEmpIndex !== null && editingEmpIndex > index) {
                    editingEmpIndex--;
                }
                employeesList.splice(index, 1);
                syncSpecialistsCatalog();
                renderPersonalView();
                syncStateToStorage();
            } else {
                alert("Error al eliminar el empleado de la base de datos.");
            }
        } catch (e) {
            console.error("Error al borrar empleado:", e);
            alert("Error de conexión al eliminar el empleado.");
        }
    }
}

// SandyValue helper
function SandyValue(val) {
    return val || "Sin Asignar";
}

// --- MODELADOR VISUAL DE SECUENCIAS ---

function renderLibraryNodesList() {
    const container = document.getElementById("library-nodes-buttons-container");
    if (!container) return;

    container.innerHTML = nodeLibraryList.map(node => {
        let iconName = "file-text";
        const nodeName = node.name;
        if (nodeName.includes("Diagnóstico")) iconName = "activity";
        else if (nodeName.includes("Comercial")) iconName = "handshake";
        else if (nodeName.includes("Campo")) iconName = "navigation";
        else if (nodeName.includes("Pruebas")) iconName = "shield-check";
        else if (nodeName.includes("Firma") || nodeName.includes("Cierre")) iconName = "signature";

        const unitSymbol = node.unit === 'dia' ? 'd' : node.unit === 'hora' ? 'h' : 'm';
        const shortName = node.assigned.split(' ')[0];

        return `
            <button onclick="addStandardNodeToSequence('${node.name}')" class="w-full text-left p-2.5 bg-white border border-slate-200 rounded-lg hover:border-brand-500 hover:shadow-sm font-semibold text-xs text-slate-700 flex flex-col gap-0.5 transition-all shrink-0">
                <div class="flex items-center gap-1.5">
                    <i data-lucide="${iconName}" class="w-3.5 h-3.5 text-brand-500 shrink-0"></i>
                    <span class="truncate font-bold">${node.name}</span>
                </div>
                <div class="flex items-center justify-between text-[9px] text-slate-400 font-normal px-5">
                    <span>${shortName}</span>
                    <span>${node.timeVal}${unitSymbol}</span>
                </div>
            </button>
        `;
    }).join('');

    lucide.createIcons();
}

function toggleRecurrencePanels() {
    const type = document.getElementById("tpl-recurrence-type").value;
    
    document.getElementById("panel-recurrence-weekly").classList.add("hidden");
    document.getElementById("panel-recurrence-monthly").classList.add("hidden");
    document.getElementById("panel-recurrence-interval").classList.add("hidden");
    document.getElementById("panel-recurrence-specific").classList.add("hidden");
    
    if (type === "weekly") {
        document.getElementById("panel-recurrence-weekly").classList.remove("hidden");
    } else if (type === "monthly") {
        document.getElementById("panel-recurrence-monthly").classList.remove("hidden");
    } else if (type === "interval") {
        document.getElementById("panel-recurrence-interval").classList.remove("hidden");
    } else if (type === "specific") {
        document.getElementById("panel-recurrence-specific").classList.remove("hidden");
    }
}

function openCreateTemplateModal() {
    isBuilderEditMode = false;
    editingTemplateId = null;

    document.getElementById("modal-builder-title").innerText = "Modelador Visual de Flujos de Trabajo (BPMS)";
    document.getElementById("modal-create-template").classList.remove("hidden");
    document.getElementById("new-template-name").value = "";
    document.getElementById("new-template-client").value = "Cliente General";
    document.getElementById("new-template-observations").value = "";
    document.getElementById("custom-node-name-input").value = "";

    // Resetear recurrencia
    document.getElementById("tpl-recurrence-type").value = "disabled";
    document.querySelectorAll("input[name='weekly-day']").forEach(cb => cb.checked = false);
    document.querySelectorAll("input[name='monthly-day']").forEach(cb => cb.checked = false);
    document.getElementById("recurrence-weekly-time").value = "09:00";
    document.getElementById("recurrence-monthly-time").value = "09:00";
    document.getElementById("recurrence-interval-days").value = 0;
    document.getElementById("recurrence-interval-hours").value = 0;
    document.getElementById("recurrence-interval-minutes").value = 10;
    document.getElementById("recurrence-specific-date").value = "";
    document.getElementById("recurrence-specific-time").value = "09:00";
    toggleRecurrencePanels();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById("new-template-start-date").value = today;
    document.getElementById("new-template-start-time").value = currentTimeStr;
    
    constructorAddedNodes = [];
    selectedConstructorNodeId = null;

    renderLibraryNodesList();
    renderVisualSequenceCanvas();
    renderPropertiesPanel();
}

function openEditActiveTemplateModal() {
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) {
        alert("Por favor seleccione primero una plantilla del listado.");
        return;
    }

    isBuilderEditMode = true;
    editingTemplateId = template.id;

    document.getElementById("modal-builder-title").innerText = "Editar Plantilla de Proceso: " + template.name;
    document.getElementById("new-template-name").value = template.name;
    document.getElementById("new-template-client").value = template.client || "Cliente General";
    document.getElementById("new-template-observations").value = template.generalObservations || "";
    document.getElementById("new-template-start-date").value = template.startDate || new Date().toISOString().split('T')[0];
    document.getElementById("new-template-start-time").value = template.startTime || "09:00";
    document.getElementById("modal-create-template").classList.remove("hidden");
    document.getElementById("custom-node-name-input").value = "";

    // Cargar recurrencia en el formulario
    const recType = template.recurrenceType || 'disabled';
    document.getElementById("tpl-recurrence-type").value = recType;
    
    // Resetear todos los inputs de recurrencia
    document.querySelectorAll("input[name='weekly-day']").forEach(cb => cb.checked = false);
    document.querySelectorAll("input[name='monthly-day']").forEach(cb => cb.checked = false);
    document.getElementById("recurrence-weekly-time").value = "09:00";
    document.getElementById("recurrence-monthly-time").value = "09:00";
    document.getElementById("recurrence-interval-days").value = 0;
    document.getElementById("recurrence-interval-hours").value = 0;
    document.getElementById("recurrence-interval-minutes").value = 10;
    document.getElementById("recurrence-specific-date").value = "";
    document.getElementById("recurrence-specific-time").value = "09:00";

    if (recType !== 'disabled' && template.recurrenceData) {
        try {
            const data = typeof template.recurrenceData === 'string' ? JSON.parse(template.recurrenceData) : template.recurrenceData;
            if (recType === 'weekly') {
                if (data.days) {
                    data.days.forEach(d => {
                        const cb = document.querySelector(`input[name='weekly-day'][value='${d}']`);
                        if (cb) cb.checked = true;
                    });
                }
                if (data.time) document.getElementById("recurrence-weekly-time").value = data.time;
            } else if (recType === 'monthly') {
                if (data.days) {
                    data.days.forEach(d => {
                        const cb = document.querySelector(`input[name='monthly-day'][value='${d}']`);
                        if (cb) cb.checked = true;
                    });
                }
                if (data.time) document.getElementById("recurrence-monthly-time").value = data.time;
            } else if (recType === 'interval') {
                if (data.days) document.getElementById("recurrence-interval-days").value = data.days;
                if (data.hours) document.getElementById("recurrence-interval-hours").value = data.hours;
                if (data.minutes) document.getElementById("recurrence-interval-minutes").value = data.minutes;
            } else if (recType === 'specific') {
                if (data.date) document.getElementById("recurrence-specific-date").value = data.date;
                if (data.time) document.getElementById("recurrence-specific-time").value = data.time;
            }
        } catch(e) {
            console.error("Error al parsear recurrenceData al cargar modal:", e);
        }
    }
    toggleRecurrencePanels();

    constructorAddedNodes = (template.tasks || []).map((task, idx) => {
        let unit = "dia";
        let val = task.duration;
        const daysTextSafe = task.daysText || "";
        
        if (daysTextSafe.includes("min")) {
            unit = "min";
            val = parseInt(daysTextSafe) || 30;
        } else if (daysTextSafe.includes("hora")) {
            unit = "hora";
            val = parseInt(daysTextSafe) || 1;
        } else {
            unit = "dia";
            val = parseInt(daysTextSafe) || task.duration || 1;
        }

        return {
            id: task.id || (Date.now() + Math.random()),
            name: task.name.replace(/^\d+\.\s*/, ""), 
            assigned: task.assigned || "Sin Asignar",
            timeVal: val,
            unit: unit,
            status: task.status || "Pendiente",
            duration: task.duration || 1,
            durationText: daysTextSafe || "1 día",
            observaciones: task.description || "",
            urgencia: task.urgencia || "Media",
            ubicacion: task.ubicacion || "",
            actionStartDate: task.actionStartDate || "",
            actionStartTime: task.actionStartTime || "",
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
        };
    });

    selectedConstructorNodeId = constructorAddedNodes.length > 0 ? constructorAddedNodes[0].id : null;

    renderLibraryNodesList();
    renderVisualSequenceCanvas();
    renderPropertiesPanel();
}

function closeCreateTemplateModal() {
    document.getElementById("modal-create-template").classList.add("hidden");
}

function addNewCustomNodeToLibrary() {
    const input = document.getElementById("custom-node-name-input");
    const name = input ? input.value.trim() : "";

    if (!name) {
        alert("Por favor ingrese el nombre del nodo a guardar en la biblioteca.");
        return;
    }

    const duplicateIndex = nodeLibraryList.findIndex(n => n.name.toLowerCase() === name.toLowerCase());
    if (duplicateIndex !== -1) {
        alert("Este nodo ya se encuentra registrado en la biblioteca.");
        return;
    }

    const newNode = {
        name: name,
        assigned: "Sin Asignar",
        timeVal: 1,
        unit: "dia",
        status: "Pendiente",
        observaciones: ""
    };

    nodeLibraryList.push(newNode);
    input.value = "";
    renderLibraryNodesList();
    alert(`"${name}" añadido a la Biblioteca de Nodos.`);
}

function addStandardNodeToSequence(nodeName) {
    const nodeId = Date.now() + Math.random();
    
    const targetNameClean = (nodeName || "").trim().toLowerCase();
    const defNode = nodeLibraryList.find(n => (n.name || "").trim().toLowerCase() === targetNameClean) || {
        name: nodeName,
        assigned: "Sin Asignar",
        timeVal: 1,
        unit: "dia",
        status: "Pendiente",
        observaciones: ""
    };

    const timeVal = parseFloat(defNode.timeVal) || 1;
    const unit = defNode.unit || "dia";

    let daysEquiv = 1;
    let durationText = "1 día";
    if (unit === 'min') {
        daysEquiv = timeVal / 1440; 
        durationText = timeVal + "min";
    } else if (unit === 'hora') {
        daysEquiv = timeVal / 24;
        durationText = timeVal + " " + (timeVal == 1 ? "hora" : "horas");
    } else {
        daysEquiv = timeVal;
        durationText = timeVal + " " + (timeVal == 1 ? "día" : "días");
    }

    const defaultSit = defNode.situacion || ((defNode.name && defNode.name.toLowerCase().includes('reporte inicial')) ? "Aceptado" : "No Aceptado");

    constructorAddedNodes.push({
        id: nodeId,
        name: defNode.name,
        assigned: defNode.assigned || "Sin Asignar",
        timeVal: timeVal,
        unit: unit,
        status: defNode.status || "Pendiente",
        situacion: defaultSit,
        duration: daysEquiv,
        durationText: durationText,
        observaciones: defNode.observaciones || "",
        urgencia: "Media",
        ubicacion: "",
        actionStartDate: "",
        actionStartTime: ""
    });

    selectedConstructorNodeId = nodeId;
    renderVisualSequenceCanvas();
    renderPropertiesPanel();
}

function selectConstructorNode(nodeId) {
    selectedConstructorNodeId = nodeId;
    renderVisualSequenceCanvas();
    renderPropertiesPanel();
}

function deleteConstructorNode(nodeId, event) {
    if(event) event.stopPropagation();
    constructorAddedNodes = constructorAddedNodes.filter(n => n.id !== nodeId);
    
    if (selectedConstructorNodeId === nodeId) {
        selectedConstructorNodeId = constructorAddedNodes.length > 0 ? constructorAddedNodes[0].id : null;
    }

    renderVisualSequenceCanvas();
    renderPropertiesPanel();
}

function moveNodeInSequence(nodeId, direction, event) {
    if(event) event.stopPropagation();
    const index = constructorAddedNodes.findIndex(n => n.id === nodeId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        const temp = constructorAddedNodes[index];
        constructorAddedNodes[index] = constructorAddedNodes[index - 1];
        constructorAddedNodes[index - 1] = temp;
    } else if (direction === 'down' && index < constructorAddedNodes.length - 1) {
        const temp = constructorAddedNodes[index];
        constructorAddedNodes[index] = constructorAddedNodes[index + 1];
        constructorAddedNodes[index + 1] = temp;
    }

    renderVisualSequenceCanvas();
}

function updateSelectedNodeProperty(field, value) {
    if (!selectedConstructorNodeId) return;
    const node = constructorAddedNodes.find(n => n.id === selectedConstructorNodeId);
    if (!node) return;

    if (field === 'timeVal') {
        node.timeVal = parseFloat(value) || 1;
    } else {
        node[field] = value;
    }

    if (field === 'status' && value) {
        if (!statusesList.includes(value)) {
            statusesList.push(value);
            try {
                localStorage.setItem("sonicbi_custom_statuses", JSON.stringify(statusesList));
            } catch(e) {}
        }
    }

    let daysEquiv = 1;
    if (node.unit === 'min') {
        daysEquiv = node.timeVal / 1440; 
        node.durationText = node.timeVal + "min";
    } else if (node.unit === 'hora') {
        daysEquiv = node.timeVal / 24;
        node.durationText = node.timeVal + " " + (node.timeVal == 1 ? "hora" : "horas");
    } else {
        daysEquiv = parseFloat(node.timeVal) || 1;
        node.durationText = node.timeVal + " " + (node.timeVal == 1 ? "día" : "días");
    }
    node.duration = daysEquiv;

    renderVisualSequenceCanvasOnly();
}

function renderVisualSequenceCanvasOnly() {
    const canvas = document.getElementById("visual-sequence-canvas");
    if (!canvas) return;

    if (constructorAddedNodes.length === 0) {
        canvas.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-xs py-20">
                <i data-lucide="layout-grid" class="w-10 h-10 mb-2 text-slate-300"></i>
                Diagrama de secuencia vacío.<br>Haz clic en los botones de la biblioteca lateral para añadir pasos.
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let canvasHtml = "";
    constructorAddedNodes.forEach((node, index) => {
        const isSelected = node.id === selectedConstructorNodeId;
        const selectRing = isSelected ? "ring-2 ring-brand-500 bg-brand-50 border-brand-300 scale-102" : "bg-white hover:border-slate-400";
        
        canvasHtml += `
            <div onclick="selectConstructorNode(${node.id})" class="w-56 p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-all flex flex-col gap-1 relative ${selectRing}">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold text-slate-400 uppercase">Paso ${index + 1}</span>
                    <div class="flex items-center gap-0.5">
                        <button onclick="moveNodeInSequence(${node.id}, 'up', event)" class="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700" title="Mover arriba">
                            <i data-lucide="chevron-up" class="w-3 h-3"></i>
                        </button>
                        <button onclick="moveNodeInSequence(${node.id}, 'down', event)" class="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700" title="Mover abajo">
                            <i data-lucide="chevron-down" class="w-3 h-3"></i>
                        </button>
                        <button onclick="deleteConstructorNode(${node.id}, event)" class="p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600" title="Eliminar nodo">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <h5 class="font-bold text-slate-800 text-xs truncate" id="canvas-node-name-${node.id}">${node.name}</h5>
                    <div class="flex items-center gap-1 mt-0.5 text-[9px] text-slate-500 font-semibold flex-wrap">
                        <span class="bg-brand-50 text-brand-600 px-1.5 py-0.2 rounded truncate max-w-[85px]" title="${node.assigned}">${node.assigned}</span>
                        <span class="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">${node.durationText}</span>
                        <span class="bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-1 py-0.2 rounded font-bold truncate max-w-[85px]" title="Estado del nodo: ${node.status}">${node.status || 'Pendiente'}</span>
                    </div>
                </div>
            </div>
        `;

        if (index < constructorAddedNodes.length - 1) {
            canvasHtml += `
                <div class="flex flex-col items-center justify-center my-0.2 text-brand-400/80 animate-pulse">
                    <i data-lucide="arrow-down" class="w-4 h-4"></i>
                </div>
            `;
        }
    });

    canvas.innerHTML = canvasHtml;
    lucide.createIcons();
}

function renderVisualSequenceCanvas() {
    renderVisualSequenceCanvasOnly();
}

function autocompleteNodeStartDates() {
    const tplStartDateInput = document.getElementById("new-template-start-date");
    const tplStartTimeInput = document.getElementById("new-template-start-time");
    const startDateVal = tplStartDateInput ? (tplStartDateInput.value || "2026-07-06") : "2026-07-06";
    const startTimeVal = tplStartTimeInput ? (tplStartTimeInput.value || "09:00") : "09:00";
    
    let currentPointer = new Date(`${startDateVal}T${startTimeVal}`);
    if (isNaN(currentPointer.getTime())) {
        currentPointer = new Date();
    }

    constructorAddedNodes.forEach(node => {
        let daysEquiv = 1;
        if (node.unit === 'min') {
            daysEquiv = node.timeVal / 1440;
        } else if (node.unit === 'hora') {
            daysEquiv = node.timeVal / 24;
        } else {
            daysEquiv = parseFloat(node.timeVal) || 1;
        }
        const durationMs = daysEquiv * 24 * 60 * 60 * 1000;

        if (node.actionStartDate && node.actionStartTime) {
            const customStart = new Date(`${node.actionStartDate}T${node.actionStartTime}`);
            if (!isNaN(customStart.getTime())) {
                currentPointer = new Date(customStart.getTime() + durationMs);
                return;
            }
        }

        const pad = (n) => n.toString().padStart(2, '0');
        node.actionStartDate = `${currentPointer.getFullYear()}-${pad(currentPointer.getMonth() + 1)}-${pad(currentPointer.getDate())}`;
        node.actionStartTime = `${pad(currentPointer.getHours())}:${pad(currentPointer.getMinutes())}`;

        currentPointer = new Date(currentPointer.getTime() + durationMs);
    });
}

function renderPropertiesPanel() {
    autocompleteNodeStartDates();
    const panel = document.getElementById("node-properties-panel");
    if (!panel) return;

    if (!selectedConstructorNodeId || constructorAddedNodes.length === 0) {
        panel.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400 italic text-xs">
                <i data-lucide="settings" class="w-8 h-8 mb-2 text-slate-300"></i>
                Selecciona cualquier nodo del diagrama de flujo para modificar su duración, encargado y estado.
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const node = constructorAddedNodes.find(n => n.id === selectedConstructorNodeId);
    if (!node) return;

    syncSpecialistsCatalog();

    let builderSpecialistOptions = `
        <button type="button" onclick="updateSelectedNodeProperty('assigned', 'Sin Asignar'); renderPropertiesPanel();" 
            style="background: linear-gradient(90deg, #f8fafc, #e2e8f0); color: #1e293b;" 
            class="w-full text-left p-2 rounded-lg font-bold text-xs border border-slate-200 shadow-sm hover:brightness-95 transition-all flex items-center justify-between mb-1">
            <span>Sin Asignar</span>
        </button>
    `;
    // Mapear y ordenar empleados por disponibilidad fija en la fecha de arranque del proyecto (en el constructor de plantillas usamos el input de fecha)
    const tplStartDateInput = document.getElementById("new-template-start-date");
    const anchorDate = tplStartDateInput ? (tplStartDateInput.value || "2026-07-06") : "2026-07-06";

    const sortedEmployees = employeesList.map(e => {
        const availData = getEmployeeAvailabilityForAnchor(e.name, anchorDate);
        return { emp: e, avail: availData };
    }).sort((a, b) => b.avail.minAvail - a.avail.minAvail);

    sortedEmployees.forEach(item => {
        const e = item.emp;
        const availData = item.avail;
        
        let optionBg = "linear-gradient(90deg, #ffffff, #f1f5f9)";
        let availText = "";
        
        if (availData) {
            availText = ` (${formatHoursToHHMM(availData.minAvail)} disp.)`;
            const pct = Math.max(0, Math.min(1, availData.minAvail / availData.limit));
            const hueStart = Math.round(pct * 120);
            const hueEnd = Math.min(120, hueStart + 15);
            optionBg = `linear-gradient(90deg, hsl(${hueStart}, 90%, 82%), hsl(${hueEnd}, 90%, 87%))`;
        }
        
        builderSpecialistOptions += `
            <button type="button" onclick="updateSelectedNodeProperty('assigned', '${e.name} (${e.role})'); renderPropertiesPanel();" 
                style="background: ${optionBg}; color: #1e293b;" 
                class="w-full text-left p-2 rounded-lg font-bold text-[11px] shadow-sm hover:brightness-95 transition-all flex items-center justify-between border border-slate-200/50 mb-1">
                <span class="truncate">${e.name}</span>
                <span class="text-[9px] opacity-90 shrink-0 ml-1">${availText}</span>
            </button>
        `;
    });

    const statusOptions = statusesList.map(st => {
        return `<option value="${st}" ${node.status === st ? 'selected' : ''}>${st}</option>`;
    }).join('');

    // Validar disponibilidad en caliente
    const availData = checkBuilderNodeOverload();
    let alertHtml = "";
    if (availData) {
        if (availData.isOverloaded) {
            alertHtml = `
                <div class="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[10px] rounded-lg font-semibold space-y-1">
                    <div class="flex items-center gap-1">
                        <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-accent-500 animate-bounce"></i>
                        <span>⚠️ Alerta de Sobrecarga</span>
                    </div>
                    <div class="font-normal text-[9px] leading-tight">
                        ${availData.name} supera su límite diario de ${availData.limit} hrs.<br>
                        • Horas disponibles: <strong>${formatHoursToHHMM(availData.minAvail)}</strong><br>
                        • Horas a ocupar: <strong>${formatHoursToHHMM(availData.totalRequired)}</strong>
                    </div>
                </div>
            `;
        } else {
            alertHtml = `
                <div class="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[10px] rounded-lg font-semibold space-y-1">
                    <div class="flex items-center gap-1">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                        <span>✅ Especialista Disponible</span>
                    </div>
                    <div class="font-normal text-[9px] leading-tight">
                        • Horas disponibles hoy: <strong>${formatHoursToHHMM(availData.minAvail)}</strong><br>
                        • Horas a ocupar: <strong>${formatHoursToHHMM(availData.totalRequired)}</strong>
                    </div>
                </div>
            `;
        }
    }

    panel.innerHTML = `
        <div class="space-y-3.5 text-xs w-full">
            ${alertHtml}
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Nodo:</label>
                <input type="text" value="${node.name}" oninput="updateSelectedNodeProperty('name', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
            </div>
            
            <div class="relative">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Especialista Asignado:</label>
                <button type="button" onclick="toggleCustomDropdown('builder-assigned-dropdown', event)" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none flex items-center justify-between font-semibold text-slate-800">
                    <span>${node.assigned}</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
                </button>
                <div id="builder-assigned-dropdown" class="absolute left-0 right-0 mt-1 max-h-[380px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 hidden p-2 space-y-1">
                    ${builderSpecialistOptions}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Duración:</label>
                    <input type="number" step="any" value="${node.timeVal}" oninput="updateSelectedNodeProperty('timeVal', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Unidad:</label>
                    <select onchange="updateSelectedNodeProperty('unit', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                        <option value="min" ${node.unit === 'min' ? 'selected' : ''}>minutos</option>
                        <option value="hora" ${node.unit === 'hora' ? 'selected' : ''}>horas</option>
                        <option value="dia" ${node.unit === 'dia' ? 'selected' : ''}>días</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Urgencia:</label>
                    <select onchange="updateSelectedNodeProperty('urgencia', this.value)" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                        <option value="Baja" ${node.urgencia === 'Baja' ? 'selected' : ''}>Baja</option>
                        <option value="Media" ${(node.urgencia === 'Media' || !node.urgencia) ? 'selected' : ''}>Media</option>
                        <option value="Alta" ${node.urgencia === 'Alta' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Ubicación:</label>
                    <input type="text" value="${node.ubicacion || ''}" placeholder="Ej. Av. Garza Sada #450" oninput="updateSelectedNodeProperty('ubicacion', this.value)" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Inicio de Acción (Fecha):</label>
                    <input type="date" value="${node.actionStartDate || ''}" onchange="updateSelectedNodeProperty('actionStartDate', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">Inicio de Acción (Hora):</label>
                    <input type="time" value="${node.actionStartTime || ''}" onchange="updateSelectedNodeProperty('actionStartTime', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                </div>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase block">Observaciones / Descripción:</label>
                <textarea oninput="updateSelectedNodeProperty('observaciones', this.value)" placeholder="Detalle técnico de la tarea..." rows="3" class="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">${node.observaciones || ''}</textarea>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estado del Nodo / Estado Inicial:</label>
                <select onchange="updateSelectedNodeProperty('status', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    ${statusOptions}
                </select>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Situación (Aceptación):</label>
                <select onchange="updateSelectedNodeProperty('situacion', this.value); renderPropertiesPanel();" class="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="Aceptado" ${node.situacion === 'Aceptado' ? 'selected' : ''}>✅ Aceptado</option>
                    <option value="No Aceptado" ${(node.situacion === 'No Aceptado' || !node.situacion) ? 'selected' : ''}>⚠️ No Aceptado</option>
                </select>
            </div>

            <!-- ===== SECCIÓN SUBTAREAS OBLIGATORIAS ===== -->
            <div class="border border-brand-100 rounded-xl bg-brand-50/40 p-3 space-y-2">
                <div class="flex items-center gap-1.5 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    <label class="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Subtareas Obligatorias del Técnico</label>
                    <span class="ml-auto text-[9px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-bold">${(node.subtasks || []).length}</span>
                </div>

                <!-- Lista de subtareas -->
                <div id="builder-subtasks-list" class="space-y-1.5">
                    ${(node.subtasks || []).length === 0 
                        ? `<p class="text-[10px] text-slate-400 italic text-center py-1">Sin subtareas. Agrega las que el técnico debe verificar.</p>`
                        : (node.subtasks || []).map((st, idx) => `
                            <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 group">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                                <span class="flex-1 text-[11px] text-slate-700 leading-tight">${st.text}</span>
                                <button onclick="removeBuilderSubtask(${idx})" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all shrink-0" title="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                        `).join('')
                    }
                </div>

                <!-- Input para nueva subtarea -->
                <div class="flex gap-1.5 mt-1">
                    <input type="text" id="builder-new-subtask-input"
                        placeholder="Ej. Verificar voltaje 12V..."
                        onkeydown="if(event.key==='Enter'){event.preventDefault();addBuilderSubtask();}"
                        class="flex-1 p-2 border border-slate-200 rounded-lg text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400">
                    <button onclick="addBuilderSubtask()"
                        class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Agregar
                    </button>
                </div>
            </div>
        </div>
        
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
            <span>Creado en sesión</span>
            <button onclick="deleteConstructorNode(${node.id})" class="text-red-500 hover:underline font-bold uppercase">Eliminar Nodo</button>
        </div>
    `;
    lucide.createIcons();
}

// Agregar subtarea al nodo actualmente seleccionado en el constructor
function addBuilderSubtask() {
    const input = document.getElementById('builder-new-subtask-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const node = constructorAddedNodes.find(n => n.id === selectedConstructorNodeId);
    if (!node) return;

    if (!Array.isArray(node.subtasks)) node.subtasks = [];
    node.subtasks.push({ id: Date.now(), text: text, done: false });
    input.value = '';
    renderPropertiesPanel();
    // Re-enfocar el input después de re-render
    setTimeout(() => {
        const inp = document.getElementById('builder-new-subtask-input');
        if (inp) inp.focus();
    }, 50);
}

// Eliminar una subtarea por índice del nodo actualmente seleccionado
function removeBuilderSubtask(idx) {
    const node = constructorAddedNodes.find(n => n.id === selectedConstructorNodeId);
    if (!node || !Array.isArray(node.subtasks)) return;
    node.subtasks.splice(idx, 1);
    renderPropertiesPanel();
}

async function saveNewTemplate() {
    const nameInput = document.getElementById("new-template-name");
    const clientInput = document.getElementById("new-template-client");
    const obsInput = document.getElementById("new-template-observations");
    const startDateInput = document.getElementById("new-template-start-date");
    const startTimeInput = document.getElementById("new-template-start-time");

    const name = nameInput ? nameInput.value.trim() : "";
    const client = clientInput ? clientInput.value : "Cliente General";
    const observations = obsInput ? obsInput.value.trim() : "";
    const startDate = startDateInput ? startDateInput.value : new Date().toISOString().split('T')[0];
    const startTime = startTimeInput ? startTimeInput.value : "09:00";

    if (!name) {
        alert("Por favor, ingresa el nombre de la plantilla.");
        return;
    }

    if (constructorAddedNodes.length === 0) {
        alert("Debes añadir por lo menos un nodo al diagrama de flujo antes de guardar.");
        return;
    }

    const tplStartDateVal = startDate || "2026-07-06";
    const tplStartTimeVal = startTime || "09:00";
    const tplStart = new Date(`${tplStartDateVal}T${tplStartTimeVal}`);

    let currentStartDay = 0;
    const mappedTasks = constructorAddedNodes.map((n, index) => {
        let barColor = "bg-brand-500 text-white";
        if (n.status === "Pendiente") {
            barColor = "bg-slate-200 border border-slate-350 text-slate-700";
        } else if (n.status === "Por vencer") {
            barColor = "bg-amber-500 border border-amber-300 text-white";
        } else if (n.status === "Vencido") {
            barColor = "bg-red-500 border border-red-300 text-white";
        } else if (n.status === "Reincidencia Potencial") {
            barColor = "bg-accent-500 text-white animate-pulse";
        } else if (n.status === "Completado" || n.status === "Creado") {
            barColor = "bg-brand-500 text-white";
        }

        let startDayVal = currentStartDay;
        let actDate = n.actionStartDate;
        let actTime = n.actionStartTime;

        if (actDate && actTime) {
            const taskStart = new Date(`${actDate}T${actTime}`);
            const diffMs = taskStart.getTime() - tplStart.getTime();
            startDayVal = diffMs / (1000 * 60 * 60 * 24);
        } else {
            // Auto-completar basado en currentStartDay
            const taskStart = new Date(tplStart.getTime() + currentStartDay * 24 * 60 * 60 * 1000);
            const pad = (num) => num.toString().padStart(2, '0');
            actDate = `${taskStart.getFullYear()}-${pad(taskStart.getMonth() + 1)}-${pad(taskStart.getDate())}`;
            actTime = `${pad(taskStart.getHours())}:${pad(taskStart.getMinutes())}`;
        }

        const cleanName = (n.name || "").replace(/^\d+\.\s*/, "");
        const task = {
            id: isBuilderEditMode ? n.id : (index + 500),
            name: `${index + 1}. ${cleanName}`,
            duration: n.duration,
            daysText: n.durationText,
            status: n.status || "Pendiente",
            color: barColor,
            startDay: startDayVal,
            timeRemaining: (n.status === "Creado" || n.status === "Completado") ? "Finalizado" : "En espera",
            dateRange: "Fecha de ejecución",
            client: client, 
            description: n.observaciones,
            assigned: n.assigned || "Sin Asignar",
            urgencia: n.urgencia || "Media",
            ubicacion: n.ubicacion || "Ubicación del cliente",
            actionStartDate: actDate,
            actionStartTime: actTime,
            situacion: n.situacion || "No Aceptado",
            acceptedByTech: (n.situacion === 'Aceptado') ? 1 : 0,
            subtasks: Array.isArray(n.subtasks) ? n.subtasks : []
        };
        currentStartDay = startDayVal + n.duration;
        return task;
    });

    // Extraer datos de recurrencia
    const recurrenceType = document.getElementById("tpl-recurrence-type").value;
    let recurrenceData = {};
    
    if (recurrenceType === 'weekly') {
        const days = [];
        document.querySelectorAll("input[name='weekly-day']:checked").forEach(cb => {
            days.push(parseInt(cb.value));
        });
        const time = document.getElementById("recurrence-weekly-time").value;
        recurrenceData = { days, time };
    } else if (recurrenceType === 'monthly') {
        const days = [];
        document.querySelectorAll("input[name='monthly-day']:checked").forEach(cb => {
            days.push(parseInt(cb.value));
        });
        const time = document.getElementById("recurrence-monthly-time").value;
        recurrenceData = { days, time };
    } else if (recurrenceType === 'interval') {
        const days = parseInt(document.getElementById("recurrence-interval-days").value) || 0;
        const hours = parseInt(document.getElementById("recurrence-interval-hours").value) || 0;
        const minutes = parseInt(document.getElementById("recurrence-interval-minutes").value) || 0;
        recurrenceData = { days, hours, minutes };
    } else if (recurrenceType === 'specific') {
        const date = document.getElementById("recurrence-specific-date").value;
        const time = document.getElementById("recurrence-specific-time").value;
        recurrenceData = { date, time };
    }

    const recurrenceDataStr = JSON.stringify(recurrenceData);

    const token = localStorage.getItem('sonicbi_token');
    let tplId = isBuilderEditMode ? editingTemplateId : ("custom_" + Date.now());

    try {
        if (isBuilderEditMode && editingTemplateId) {
            const idx = templatesData.findIndex(t => t.id === editingTemplateId);
            if (idx !== -1) {
                const updatedTpl = {
                    name: name,
                    client: client,
                    generalObservations: observations,
                    startDate: startDate,
                    startTime: startTime,
                    tasks: mappedTasks,
                    recurrenceType: recurrenceType,
                    recurrenceData: recurrenceDataStr
                };

                const res = await fetch(`/api/bpm/templates/${editingTemplateId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedTpl)
                });

                if (res.ok) {
                    alert("Plantilla actualizada en el BPMS.");
                    await cargarDatosDesdeBackend();
                } else {
                    alert("Error al actualizar la plantilla.");
                    return;
                }
            }
        } else {
            const newTemplate = {
                id: tplId,
                name: name,
                type: "gantt",
                createdDate: new Date().toISOString().split('T')[0],
                startDate: startDate,
                startTime: startTime,
                client: client,
                generalObservations: observations,
                createdBy: "Capturista Backoffice",
                tasks: mappedTasks,
                activities: [],
                recurrenceType: recurrenceType,
                recurrenceData: recurrenceDataStr
            };

            const res = await fetch('/api/bpm/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTemplate)
            });

            if (res.ok) {
                alert("Nueva plantilla guardada en el BPMS.");
                await cargarDatosDesdeBackend();
            } else {
                alert("Error al guardar la plantilla.");
                return;
            }
        }

        closeCreateTemplateModal();
        highlightedTaskId = null;
        syncStateToStorage();
        
        selectedTemplateId = tplId;
        loadTemplate(selectedTemplateId);
        switchTab('bpmn-designer');
    } catch (e) {
        console.error("Error al guardar plantilla:", e);
        alert("Error de conexión al guardar la plantilla.");
    }
}

// --- EDICIÓN RÁPIDA DE NODO DESDE GANTT ---

function openQuickEditTaskModal(taskId) {
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const task = template.tasks.find(t => t.id === taskId);
    if (!task) return;

    quickEditingTaskId = taskId;
    syncSpecialistsCatalog();

    // Actualizar valor inicial del disparador
    const triggerVal = document.getElementById("quick-task-assigned-value");
    if (triggerVal) {
        triggerVal.innerText = task.assigned || "Sin Asignar";
    }
    const hiddenInput = document.getElementById("quick-task-assigned");
    if (hiddenInput) {
        hiddenInput.value = task.assigned || "Sin Asignar";
    }

    const dropdown = document.getElementById("quick-task-assigned-dropdown");
    if (dropdown) {
        let optionsHtml = `
            <button type="button" onclick="selectCustomDropdownValue('quick-task-assigned', 'Sin Asignar', 'quick-task-assigned-dropdown', 'quick-task-assigned-trigger', event)" 
                style="background: linear-gradient(90deg, #f8fafc, #e2e8f0); color: #1e293b;" 
                class="w-full text-left p-2.5 rounded-lg font-bold text-xs border border-slate-200 shadow-sm hover:brightness-95 transition-all flex items-center justify-between mb-1">
                <span>Sin Asignar</span>
            </button>
        `;
        
        // Mapear y ordenar empleados por disponibilidad fija en la fecha de arranque
        const sortedEmployees = employeesList.map(e => {
            const availData = getEmployeeAvailabilityForAnchor(e.name, selectedTemplateId);
            return { emp: e, avail: availData };
        }).sort((a, b) => b.avail.minAvail - a.avail.minAvail);

        sortedEmployees.forEach(item => {
            const e = item.emp;
            const availData = item.avail;
            
            let optionBg = "linear-gradient(90deg, #ffffff, #f1f5f9)";
            let availText = "";
            if (availData) {
                availText = ` (${formatHoursToHHMM(availData.minAvail)} disponibles hoy)`;
                const pct = Math.max(0, Math.min(1, availData.minAvail / availData.limit));
                const hueStart = Math.round(pct * 120); // 0 (rojo) a 120 (verde)
                const hueEnd = Math.min(120, hueStart + 15);
                optionBg = `linear-gradient(90deg, hsl(${hueStart}, 90%, 82%), hsl(${hueEnd}, 90%, 87%))`;
            }
            
            optionsHtml += `
                <button type="button" onclick="selectCustomDropdownValue('quick-task-assigned', '${e.name} (${e.role})', 'quick-task-assigned-dropdown', 'quick-task-assigned-trigger', event)" 
                    style="background: ${optionBg}; color: #1e293b;" 
                    class="w-full text-left p-2.5 rounded-lg font-bold text-xs shadow-sm hover:brightness-95 transition-all flex items-center justify-between border border-slate-200/50 mb-1">
                    <span>${e.name} (${e.role})</span>
                    <span class="text-[10px] opacity-90">${availText}</span>
                </button>
            `;
        });
        dropdown.innerHTML = optionsHtml;
    }

    document.getElementById("quick-task-name").value = task.name.replace(/^\d+\.\s*/, "");
    
    let unit = "dia";
    let val = task.duration;
    const daysTextSafe = task.daysText || "";
    if (daysTextSafe.includes("min")) {
        unit = "min";
        val = parseInt(daysTextSafe) || 30;
    } else if (daysTextSafe.includes("hora")) {
        unit = "hora";
        val = parseInt(daysTextSafe) || 1;
    } else {
        unit = "dia";
        val = parseInt(daysTextSafe) || task.duration || 1;
    }

    document.getElementById("quick-task-duration").value = val;
    document.getElementById("quick-task-unit").value = unit;
    document.getElementById("quick-task-obs").value = task.description || "";

    syncStatusesWithCatalog();
    const statusSelect = document.getElementById("quick-task-status");
    if (statusSelect) {
        statusSelect.innerHTML = statusesList.map(st => {
            return `<option value="${st}" ${task.status === st ? 'selected' : ''}>${st}</option>`;
        }).join('');
    }

    // Cargar fecha y hora de inicio de acción (o pre-completar con la fecha programada)
    let actDate = task.actionStartDate;
    let actTime = task.actionStartTime;
    if (!actDate || !actTime) {
        if (template) {
            const startDateVal = template.startDate || "2026-07-12";
            const startTimeVal = template.startTime || "09:00";
            const dateParts = startDateVal.split("-");
            const timeParts = startTimeVal.split(":");
            const tplStart = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0);
            const taskStart = new Date(tplStart.getTime() + (task.startDay * 24 * 60 * 60 * 1000));
            
            const pad = (n) => n.toString().padStart(2, '0');
            actDate = `${taskStart.getFullYear()}-${pad(taskStart.getMonth() + 1)}-${pad(taskStart.getDate())}`;
            actTime = `${pad(taskStart.getHours())}:${pad(taskStart.getMinutes())}`;
        }
    }
    document.getElementById("quick-task-start-date").value = actDate || "";
    document.getElementById("quick-task-start-time").value = actTime || "";
    document.getElementById("quick-task-urgency").value = task.urgencia || "Media";
    document.getElementById("quick-task-location").value = task.ubicacion || "";
    
    const situationSelect = document.getElementById("quick-task-situation");
    if (situationSelect) {
        situationSelect.value = (task.acceptedByTech === 1 || task.situacion === 'Aceptado') ? 'Aceptado' : 'No Aceptado';
    }

    document.getElementById("modal-quick-edit-task").classList.remove("hidden");
    checkQuickEditOverload();
    lucide.createIcons();
}

function closeQuickEditTaskModal() {
    document.getElementById("modal-quick-edit-task").classList.add("hidden");
}

function saveQuickEditTask() {
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const task = template.tasks.find(t => t.id === quickEditingTaskId);
    if (!task) return;

    const newNameVal = document.getElementById("quick-task-name").value.trim();
    const assignedVal = document.getElementById("quick-task-assigned").value;
    const timeVal = parseFloat(document.getElementById("quick-task-duration").value) || 1;
    const unitVal = document.getElementById("quick-task-unit").value;
    const obsVal = document.getElementById("quick-task-obs").value.trim();
    const statusVal = document.getElementById("quick-task-status") ? document.getElementById("quick-task-status").value : task.status;
    const situationVal = document.getElementById("quick-task-situation") ? document.getElementById("quick-task-situation").value : "No Aceptado";

    if (!newNameVal) {
        alert("El nombre de la tarea no puede estar vacío.");
        return;
    }

    const taskIdxStr = task.name.match(/^\d+\.\s*/);
    const prefix = taskIdxStr ? taskIdxStr[0] : "";

    task.name = prefix + newNameVal;
    task.assigned = assignedVal;
    task.description = obsVal;
    task.status = statusVal;
    task.situacion = situationVal;
    task.acceptedByTech = (situationVal === 'Aceptado') ? 1 : 0;
    task.urgencia = document.getElementById("quick-task-urgency").value;
    task.ubicacion = document.getElementById("quick-task-location").value.trim();

    if (statusVal) {
        persistCustomStatus(statusVal);
    }

    if (statusVal === "Completado" || statusVal === "Creado") {
        task.color = "bg-brand-500 text-white";
    } else if (statusVal === "Vencido") {
        task.color = "bg-red-500 border border-red-300 text-white";
    } else if (statusVal === "Por vencer") {
        task.color = "bg-amber-500 border border-amber-300 text-white";
    } else if (statusVal === "Reincidencia Potencial") {
        task.color = "bg-accent-500 text-white animate-pulse";
    } else {
        task.color = "bg-slate-200 border border-slate-350 text-slate-700";
    }

    let daysEquiv = 1;
    let durationText = "1 día";
    if (unitVal === 'min') {
        daysEquiv = timeVal / 1440; 
        durationText = timeVal + "min";
    } else if (unitVal === 'hora') {
        daysEquiv = timeVal / 24;
        durationText = timeVal + " " + (timeVal == 1 ? "hora" : "horas");
    } else {
        daysEquiv = timeVal;
        durationText = timeVal + " " + (timeVal == 1 ? "día" : "días");
    }

    task.duration = daysEquiv;
    task.daysText = durationText;
    const actDate = document.getElementById("quick-task-start-date").value;
    const actTime = document.getElementById("quick-task-start-time").value;
    task.actionStartDate = actDate;
    task.actionStartTime = actTime;

    if (actDate && actTime) {
        const tplStart = new Date(`${template.startDate || "2026-07-06"}T${template.startTime || "09:00"}`);
        const taskStart = new Date(`${actDate}T${actTime}`);
        const diffMs = taskStart.getTime() - tplStart.getTime();
        task.startDay = diffMs / (1000 * 60 * 60 * 24);
    }

    if (statusVal === "Completado") {
        checkAndFinishTemplateIfLastTaskCompleted(template);
    }

    closeQuickEditTaskModal();
    logTemplateActivity(template.id, "Tarea modificada", `${task.name}: Propiedades actualizadas.`);
    
    // Persistir el cambio de la tarea individual al servidor backend
    const token = localStorage.getItem('sonicbi_token');
    fetch(`/api/bpm/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(task)
    })
    .then(async (res) => {
        if (res.ok) {
            console.log("Edición rápida de tarea sincronizada con el servidor.");
            await cargarDatosDesdeBackend();
        } else {
            console.error("Error al sincronizar edición rápida de tarea.");
        }
    })
    .catch(e => console.error("Error de red al guardar edición rápida de tarea:", e));

    loadTemplate(selectedTemplateId);
    initDropdowns();
    renderAlertsTable();
    renderPrioritariasAlerts();
    syncStateToStorage();
}

// --- DÍAS INHÁBILES Y CÁLCULO CALENDARIO ---
const genericHolidays = [
    "01-01", 
    "02-05", 
    "03-21", 
    "05-01", 
    "09-16", 
    "11-20", 
    "12-25"  
];

function isHolidayOrSunday(date) {
    if (date.getDay() === 0) return true; 
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const key = `${mm}-${dd}`;
    return genericHolidays.includes(key);
}

function formatDateRange(start, end) {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
    const endStr = `${end.getDate()} ${months[end.getMonth()]}`;
    return `${startStr} - ${endStr}`;
}

async function toggleTemplatePauseState() {
    isTemplateExecutionPaused = !isTemplateExecutionPaused;
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (template) {
        template.isPaused = isTemplateExecutionPaused;
        
        // Persistir al backend
        const token = localStorage.getItem('sonicbi_token');
        try {
            await fetch(`/api/bpm/templates/${template.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(template)
            });
        } catch(e) {
            console.error("Error al persistir estado de pausa de plantilla:", e);
        }
    }
    loadTemplate(selectedTemplateId);
    renderMobileScreen();
    syncStateToStorage();
}

// --- GANTT RENDERING ENGINE ---

function loadTemplate(templateId) {
    selectedTemplateId = templateId;
    const template = templatesData.find(t => t.id === templateId);
    if (template) {
        isTemplateExecutionPaused = (template.isPaused === true);
    }
    if (!template) {
        const activeTplLabel = document.getElementById("active-template-name-label");
        if (activeTplLabel) activeTplLabel.innerText = "Sin Plantillas";
        const clientLabel = document.getElementById("gantt-client-name-label");
        if (clientLabel) clientLabel.innerText = "Ninguno";
        const startLabel = document.getElementById("gantt-start-date-label");
        if (startLabel) startLabel.innerText = "Arranque: -";
        const elapsedLabel = document.getElementById("gantt-elapsed-time-label");
        if (elapsedLabel) elapsedLabel.innerText = "Tiempo Consumido: 00:00:00";
        
        const rowsContainer = document.getElementById("gantt-rows-container");
        if (rowsContainer) {
            rowsContainer.innerHTML = `
                <svg id="gantt-svg" class="absolute inset-0 pointer-events-none w-full h-full z-10"></svg>
                <div class="p-8 text-center text-slate-400 text-xs font-semibold relative z-20">No hay plantillas de procesos. Haz clic en "Nuevo" para crear una.</div>
            `;
        }
        const timelineHeader = document.getElementById("gantt-timeline-header");
        if (timelineHeader) timelineHeader.innerHTML = "";
        return;
    }

    const activeTplLabel = document.getElementById("active-template-name-label");
    if (activeTplLabel) {
        activeTplLabel.innerText = template.name;
    }

    const clientLabel = document.getElementById("gantt-client-name-label");
    if (clientLabel) {
        clientLabel.innerText = template.client || "Sin Especificar";
    }

    // Actualizar folio en la cabecera Odoo-style
    const folioLabel = document.getElementById("template-top-folio-label");
    if (folioLabel) {
        folioLabel.innerText = getTemplateFolio(template);
    }
    const subFolioLabel = document.getElementById("template-sub-folio-label");
    if (subFolioLabel) {
        subFolioLabel.innerText = getTemplateFolio(template);
    }

    // Actualizar paginador de plantillas
    const paginationLabel = document.getElementById("gantt-pagination-label");
    if (paginationLabel) {
        const idx = templatesData.findIndex(t => t.id === template.id);
        const total = templatesData.length;
        const currentPos = idx !== -1 ? idx + 1 : 1;
        paginationLabel.innerText = `${currentPos} / ${total}`;
    }

    // Actualizar fecha y hora de arranque visual
    const startDateVal = template.startDate || "2026-07-06";
    const startTimeVal = template.startTime || "09:00";
    
    const parts = startDateVal.split('-');
    const formattedStartDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : startDateVal;
    
    const startLabel = document.getElementById("gantt-start-date-label");
    if (startLabel) {
        startLabel.innerText = `Arranque: ${formattedStartDate} ${startTimeVal}`;
    }
    
    const elapsedTpl = getTemplateElapsedTimeInSeconds(template);
    activeTemplateElapsedSeconds = elapsedTpl > 0 ? elapsedTpl : 0;
    const elapsedLabel = document.getElementById("gantt-elapsed-time-label");
    if (elapsedLabel) {
        elapsedLabel.innerText = "Tiempo Consumido: " + formatStopwatchTime(activeTemplateElapsedSeconds);
    }

    renderTemplateStatusStepbar();

    // Calcular rangos de fechas dinámicas basados en el startDay individual de cada tarea
    const startDateParts = (template.startDate || "2026-07-12").split("-");
    const startTimeParts = (template.startTime || "09:00").split(":");
    const tplStart = new Date(
        parseInt(startDateParts[0], 10),
        parseInt(startDateParts[1], 10) - 1,
        parseInt(startDateParts[2], 10),
        parseInt(startTimeParts[0], 10),
        parseInt(startTimeParts[1], 10)
    );
    template.tasks.forEach(task => {
        let taskStart = null;
        if (task.actionStartDate && task.actionStartTime) {
            const dp = task.actionStartDate.split("-");
            const tp = task.actionStartTime.split(":");
            taskStart = new Date(parseInt(dp[0], 10), parseInt(dp[1], 10) - 1, parseInt(dp[2], 10), parseInt(tp[0], 10), parseInt(tp[1], 10));
        } else {
            taskStart = new Date(tplStart.getTime() + (task.startDay || 0) * 24 * 60 * 60 * 1000);
        }
        const taskEnd = new Date(taskStart.getTime() + task.duration * 24 * 60 * 60 * 1000);
        task.dateRange = formatDateRange(taskStart, taskEnd);
        task.programmedStart = taskStart.toLocaleString('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    });

    // Mapeo de sobrecarga general
    const workload = getEmployeeWorkloadMap();

    const rowsContainer = document.getElementById("gantt-rows-container");
    const timelineHeader = document.getElementById("gantt-timeline-header");
    
    if (!rowsContainer || !timelineHeader) return;

    let tplStatusChanged = false;
    
    const maxEndDay = template.tasks.reduce((max, task) => Math.max(max, task.startDay + task.duration), 0);
    const totalDays = Math.max(1, Math.ceil(maxEndDay)); 
    
    const unifiedWrapper = document.getElementById("gantt-unified-wrapper");
    const containerWidth = unifiedWrapper ? (unifiedWrapper.clientWidth || 1120) : 1120;
    const timelineWidth = Math.max(700, containerWidth - 420);
    let dayWidth = Math.max(44, Math.floor((timelineWidth - 4) / totalDays));

    let currentTop = 0;
    const taskHeights = [];
    const taskTops = [];
    template.tasks.forEach((task) => {
        const rowHeight = (task.assigned && task.assigned !== "Sin Asignar") ? 125 : 75;
        taskHeights.push(rowHeight);
        taskTops.push(currentTop);
        currentTop += rowHeight;
    });

    const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    let headerHTML = '';
    let inhabilOverlayHTML = '';
    const rootStartDate = new Date(`${startDateVal}T${startTimeVal}`);

    for(let i = 0; i < totalDays; i++) {
        let colDate = new Date(rootStartDate);
        colDate.setDate(colDate.getDate() + i);

        const dayName = daysShort[colDate.getDay()];
        const dayNum = String(colDate.getDate()).padStart(2, '0');
        const isDefaultInhabil = isHolidayOrSunday(colDate);
        
        const dateStr = `${colDate.getDate()}/${String(colDate.getMonth()+1).padStart(2,'0')}/${colDate.getFullYear()}`;
        const tooltipText = isDefaultInhabil ? `Día Inhábil (Domingo / Festivo): ${dateStr}` : `Día Hábil: ${dateStr}`;

        const headerClass = isDefaultInhabil 
            ? "text-red-500 font-bold bg-red-50/50 border-r border-slate-200/50" 
            : "text-slate-400 border-r border-slate-200/50";

        headerHTML += `<div class="flex-shrink-0 flex flex-col items-center justify-center ${headerClass} h-full leading-tight" style="width: ${dayWidth}px" title="${tooltipText}">
            <span>D${i+1}</span>
            <span class="text-[8px] font-bold opacity-75">${dayName} ${dayNum}</span>
        </div>`;

        if (isDefaultInhabil) {
            inhabilOverlayHTML += `<div class="absolute top-0 bottom-0 bg-red-500/5 border-r border-red-200/25 pointer-events-none z-0" style="left: ${420 + i * dayWidth}px; width: ${dayWidth}px;" title="${tooltipText}"></div>`;
        } else {
            inhabilOverlayHTML += `<div class="absolute top-0 bottom-0 border-r border-slate-200/20 pointer-events-none z-0 hover:bg-slate-500/5" style="left: ${420 + i * dayWidth}px; width: ${dayWidth}px;" title="${tooltipText}"></div>`;
        }
    }
    timelineHeader.innerHTML = headerHTML;
    timelineHeader.style.width = (totalDays * dayWidth) + "px";
    
    if (unifiedWrapper) {
        unifiedWrapper.style.width = (420 + totalDays * dayWidth) + "px";
    }

    rowsContainer.style.backgroundSize = `${dayWidth}px 100%`;
    rowsContainer.style.backgroundPosition = `420px 0px`;

    let rowsHTML = "";
    let svgLinesHTML = "";

    template.tasks.forEach((task, index) => {
        if (task.status !== "Completado" && task.status !== "Reincidencia Potencial" && task.status !== "Creado") {
            const elapsed = getTaskElapsedTimeInSeconds(template, task);
            if (elapsed > 0) {
                const totalDuration = task.duration * 24 * 60 * 60;
                const remaining = totalDuration - elapsed;
                
                let newStatus = task.status;
                let newColor = task.color;
                
                if (remaining <= 0) {
                    newStatus = "Vencido";
                    newColor = "bg-red-500 border border-red-300 text-white";
                } else if (remaining / totalDuration <= 0.25) {
                    newStatus = "Por vencer";
                    newColor = "bg-amber-500 border border-amber-300 text-white";
                } else if (task.status === "Pendiente") {
                    newStatus = "En Proceso";
                    newColor = "bg-blue-500 text-white";
                }
                
                if (task.status !== newStatus) {
                    if (newStatus === "Vencido") {
                        addNotification(`SLA Excedido (Vencido): Tarea "${task.name.replace(/^\d+\.\s*/, "")}" en plantilla "${template.name}"`, 'vencido', { templateId: template.id });
                    } else if (newStatus === "Por vencer") {
                        addNotification(`SLA Por vencer: Tarea "${task.name.replace(/^\d+\.\s*/, "")}" en plantilla "${template.name}"`, 'porvencer', { templateId: template.id });
                    }
                    task.status = newStatus;
                    task.color = newColor;
                    tplStatusChanged = true;
                }
            }
        }

        let statusColor = "text-slate-500 bg-slate-50 border-slate-200";
        if (task.status === "Completado" || task.status === "Creado") statusColor = "text-brand-500 bg-brand-50 border-brand-100";
        else if (task.status === "Por vencer") statusColor = "text-amber-600 bg-amber-50 border-amber-100";
        else if (task.status === "Vencido") statusColor = "text-red-600 bg-red-50 border-red-100";
        else if (task.status === "Reincidencia Potencial") statusColor = "text-accent-500 bg-red-50 border-red-200 animate-pulse";
        else if (task.status === "Pendiente") statusColor = "text-slate-600 bg-slate-50 border-slate-200";

        const isHighlighted = (task.id === highlightedTaskId);
        const highlightStyle = isHighlighted ? "bg-brand-50/50 border-l-4 border-l-brand-500" : "";

        let acceptedBadgeHTML = "";
        if (task.assigned && task.assigned !== "Sin Asignar") {
            if (task.status !== 'Completado') {
                if (task.acceptedByTech || task.situacion === 'Aceptado') {
                    acceptedBadgeHTML = `<span class="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-bold shrink-0 flex items-center gap-0.5" title="Tarea aceptada por el personal asignado">✅ Aceptado</span>`;
                } else {
                    acceptedBadgeHTML = `<span class="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/80 rounded px-1.5 py-0.5 font-bold shrink-0 flex items-center gap-0.5" title="Tarea pendiente de aceptación por el personal">⚠️ No Aceptado</span>`;
                }
            }
        }

        const elapsed = getTaskElapsedTimeInSeconds(template, task);
        const totalDuration = task.duration * 24 * 60 * 60;
        const remaining = totalDuration - elapsed;
        
        let remainingRealText = "";
        if (template.isPaused) {
            remainingRealText = "Pausado (SLA Congelado)";
        } else if (task.status === 'Completado' || task.status === 'Creado') {
            remainingRealText = "Finalizado";
        } else {
            remainingRealText = formatRemainingTime(remaining, elapsed > 0);
        }

        let trackingMetadataHTML = "";
        if (task.assigned && task.assigned !== "Sin Asignar") {
            const hasEvidences = task.evidencePhotos && task.evidencePhotos.length > 0;
            const hasSignature = !!task.clientSignature;
            
            let evidenceHTML = "";
            if (hasEvidences || hasSignature) {
                let iconsHTML = "";
                if (hasEvidences) {
                    for(let i=0; i < task.evidencePhotos.length; i++) {
                        iconsHTML += `<span onclick="event.stopPropagation(); openEvidenceModal(${task.id})" class="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer select-none" title="Ver foto ${i+1}" style="cursor:pointer;">📷</span> `;
                    }
                }
                if (hasSignature) {
                    iconsHTML += `<span onclick="event.stopPropagation(); openEvidenceModal(${task.id})" class="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer select-none" title="Ver Firma" style="cursor:pointer;">✍️ Firma</span>`;
                }
                
                evidenceHTML = `
                    <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                        ${iconsHTML}
                    </div>
                `;
            }

            trackingMetadataHTML = `
                <div class="mt-1.5 pl-3 border-l border-slate-200 text-[9px] text-slate-500 space-y-0.5 leading-normal shrink-0">
                    <div><strong class="text-slate-400">📅 Planificado:</strong> ${task.programmedStart || 'Por definir'}</div>
                    <div><strong class="text-slate-400">📱 Aceptación:</strong> ${task.acceptedTime ? `Aceptado el ${task.acceptedTime}` : 'Pendiente de aceptar en móvil'}</div>
                    ${task.status === 'Completado' ? `<div><strong class="text-slate-400">✅ Finalización:</strong> ${task.completedTime || 'Fecha no registrada'}</div>` : ''}
                    <div><strong class="text-slate-400">⏱️ SLA Restante:</strong> <span id="gantt-sla-display-${task.id}" class="${remaining <= 0 && task.status !== 'Completado' && task.status !== 'Creado' ? 'text-red-650 font-bold animate-pulse' : 'font-semibold text-slate-600'}">${remainingRealText}</span></div>
                    ${evidenceHTML}
                </div>
            `;
        } else {
            trackingMetadataHTML = `
                <div class="mt-1.5 pl-3 border-l border-slate-200 text-[9px] text-slate-500 space-y-0.5 leading-normal shrink-0">
                    <div><strong class="text-slate-400">📅 Planificado:</strong> ${task.programmedStart || 'Por definir'}</div>
                </div>
            `;
        }

        const left = task.startDay * dayWidth;
        const width = task.duration * dayWidth;
        const visualWidth = Math.max(50, width);
        const isHighlightedBar = (task.id === highlightedTaskId);
        const highlightBorder = isHighlightedBar ? "ring-2 ring-brand-500 scale-102 z-30" : "";
        let barTextClass = task.color.includes("bg-slate-200") ? "text-slate-700 font-semibold" : "text-white";

        const barHTML = `
            <div id="gantt-bar-${task.id}" class="absolute h-7 rounded-md ${task.color} ${barTextClass} ${highlightBorder} transition-all duration-700 ease-out flex items-center px-1.5 text-[9px] font-bold overflow-hidden whitespace-nowrap z-20" 
                 style="left: ${left}px; top: calc(50% - 14px); width: 0px;" data-target-width="${visualWidth}" title="${task.name} (${task.dateRange})">
                ${task.daysText}
            </div>
        `;

        const rowHeight = taskHeights[index];

        rowsHTML += `
            <div class="flex items-stretch relative min-h-[48px]" style="height: ${rowHeight}px;" id="gantt-row-container-${task.id}">
                <!-- Lado Izquierdo: Detalles de la Tarea (Sticky) -->
                <div id="gantt-row-left-${task.id}" class="sticky left-0 z-30 w-[420px] shrink-0 bg-white border-r border-slate-200 p-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors text-xs ${highlightStyle}">
                    <div class="w-[260px] break-words whitespace-normal font-semibold text-slate-800 leading-tight flex flex-col justify-center pr-1">
                        <div class="flex items-start gap-1">
                            <span class="break-words whitespace-normal">${task.name}</span>
                            <button onclick="openQuickEditTaskModal(${task.id})" class="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-brand-500 rounded transition-all shrink-0 mt-0.5" title="Edición rápida de este nodo">
                                <i data-lucide="edit-3" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <div class="text-[10px] text-brand-500 font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <i data-lucide="user" class="w-3 h-3 text-brand-500 shrink-0"></i>
                            <span class="truncate" title="${task.assigned}">${task.assigned}</span>
                            ${acceptedBadgeHTML}
                        </div>
                        ${trackingMetadataHTML}
                    </div>
                    <div class="w-[70px] text-center font-mono text-slate-500 text-[10px] shrink-0">
                        ${task.daysText}
                    </div>
                    <div class="w-[80px] text-center shrink-0">
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusColor}">${task.status}</span>
                    </div>
                </div>
                
                <!-- Lado Derecho: Espacio del Cronograma / Timeline -->
                <div class="flex-1 bg-slate-50/20 relative min-w-[700px] pointer-events-auto">
                    ${barHTML}
                </div>
            </div>
        `;

        if (index < template.tasks.length - 1) {
            const nextTask = template.tasks[index + 1];
            const nextRowHeight = taskHeights[index + 1];
            const nextRowTop = taskTops[index + 1];
            const rowTop = taskTops[index];

            const startX = 420 + left + width;
            const startY = rowTop + rowHeight / 2; 
            const endX = 420 + nextTask.startDay * dayWidth;
            const endY = nextRowTop + nextRowHeight / 2;

            svgLinesHTML += `
                <path d="M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}" 
                      fill="none" stroke="#94a3b8" stroke-width="1.5" class="opacity-0 transition-opacity duration-1000 delay-500" id="gantt-line-${task.id}"/>
                <polygon points="${endX-1},${endY-3} ${endX+4},${endY} ${endX-1},${endY+3}" fill="#94a3b8" class="opacity-0 transition-opacity duration-1000 delay-500" id="gantt-arrow-${task.id}"/>
            `;
        }
    });

    rowsContainer.innerHTML = `<svg id="gantt-svg" class="absolute inset-0 pointer-events-none w-full h-full z-10">${svgLinesHTML}</svg>` + inhabilOverlayHTML + rowsHTML;

    setTimeout(() => {
        template.tasks.forEach((task) => {
            const bar = document.getElementById(`gantt-bar-${task.id}`);
            if (bar) {
                bar.style.width = bar.getAttribute('data-target-width') + 'px';
            }
            
            const line = document.getElementById(`gantt-line-${task.id}`);
            const arrow = document.getElementById(`gantt-arrow-${task.id}`);
            if (line) line.classList.remove('opacity-0');
            if (arrow) arrow.classList.remove('opacity-0');
        });
    }, 50);

    lucide.createIcons();

    // Actualizar historial de actividades si el drawer de Odoo está abierto
    const drawer = document.getElementById("activity-history-drawer");
    if (drawer && !drawer.classList.contains("hidden")) {
        renderActivityHistory();
    }

    if (tplStatusChanged) {
        setTimeout(() => {
            syncStateToStorage();
            renderAlertsTable();
            renderPrioritariasAlerts();
            renderMobileScreen();
        }, 0);
    }
}

document.addEventListener("click", (e) => {
    const tplDropdown = document.getElementById("template-dropdown");
    const taskDropdown = document.getElementById("task-dropdown");
    if (tplDropdown && !e.target.closest("#template-dropdown") && !e.target.closest("button[onclick='toggleTemplateDropdown()']")) {
        tplDropdown.classList.add("hidden");
    }
    if (taskDropdown && !e.target.closest("#task-dropdown") && !e.target.closest("button[onclick='toggleTaskDropdown()']")) {
        taskDropdown.classList.add("hidden");
    }
});

function getTaskElapsedTimeInSeconds(tpl, task) {
    if (task.status === 'Completado') return 0;
    
    let taskStart = null;
    if (task.actionStartDate && task.actionStartTime) {
        const dateParts = task.actionStartDate.split("-");
        const timeParts = task.actionStartTime.split(":");
        taskStart = new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10)
        );
    } else {
        const startDateVal = tpl.startDate || "2026-07-12";
        const startTimeVal = tpl.startTime || "09:00";
        const dateParts = startDateVal.split("-");
        const timeParts = startTimeVal.split(":");
        const tplStart = new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10)
        );
        taskStart = new Date(tplStart.getTime() + ((task.startDay || 0) * 24 * 60 * 60 * 1000));
    }
    
    if (isNaN(taskStart.getTime())) return 0;

    let nowMs = Date.now();
    if (tpl.isPaused) {
        if (!tpl.pausedAt) {
            tpl.pausedAt = nowMs;
        }
        nowMs = tpl.pausedAt;
    }
    if (tpl.accumulatedPausedMs) {
        nowMs -= tpl.accumulatedPausedMs;
    }
    
    if (nowMs < taskStart.getTime()) {
        return 0; // Tarea no ha arrancado en el cronograma
    }
    
    return Math.floor((nowMs - taskStart.getTime()) / 1000);
}

function getTemplateElapsedTimeInSeconds(tpl) {
    if (!tpl) return 0;
    
    const tasksCount = tpl.tasks ? tpl.tasks.length : 0;
    const lastTask = tasksCount > 0 ? tpl.tasks[tasksCount - 1] : null;
    const isLastTaskCompleted = lastTask && lastTask.status === "Completado";
    const completedTasksCount = tpl.tasks ? tpl.tasks.filter(t => t.status === "Completado").length : 0;
    const isTerminada = (tasksCount > 0 && completedTasksCount === tasksCount) || isLastTaskCompleted;

    if (tpl.finalElapsedSeconds !== undefined && tpl.finalElapsedSeconds !== null) {
        return tpl.finalElapsedSeconds;
    }

    const startDateVal = tpl.startDate || "2026-07-06";
    const startTimeVal = tpl.startTime || "09:00";
    const dateParts = startDateVal.split("-");
    const timeParts = startTimeVal.split(":");
    const tplStart = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        parseInt(timeParts[0], 10),
        parseInt(timeParts[1], 10)
    );
    let endMs = Date.now();
    
    if (isTerminada) {
        if (!tpl.finishedAt) {
            tpl.finishedAt = Date.now();
        }
        endMs = tpl.finishedAt;
    } else if (tpl.isPaused) {
        if (!tpl.pausedAt) {
            tpl.pausedAt = Date.now();
        }
        endMs = tpl.pausedAt;
    }

    if (tpl.accumulatedPausedMs) {
        endMs -= tpl.accumulatedPausedMs;
    }

    if (endMs < tplStart.getTime()) {
        return 0;
    }

    const totalSecs = Math.floor((endMs - tplStart.getTime()) / 1000);
    if (isTerminada) {
        tpl.finalElapsedSeconds = totalSecs;
    }
    return totalSecs;
}

function formatStopwatchTime(totalSeconds) {
    if (totalSeconds <= 0) return "00:00:00 (En Espera)";
    
    const days = Math.floor(totalSeconds / (3600 * 24));
    const rem = totalSeconds % (3600 * 24);
    const hrs = Math.floor(rem / 3600).toString().padStart(2, '0');
    const mins = Math.floor((rem % 3600) / 60).toString().padStart(2, '0');
    const secs = (rem % 60).toString().padStart(2, '0');
    
    if (days > 0) {
        return `${days}d, ${hrs}:${mins}:${secs}`;
    }
    return `${hrs}:${mins}:${secs}`;
}

function formatRemainingTime(seconds, hasStarted = true) {
    if (!hasStarted) {
        const days = Math.floor(seconds / (3600 * 24));
        const rem = seconds % (3600 * 24);
        const hrs = Math.floor(rem / 3600).toString().padStart(2, '0');
        const mins = Math.floor((rem % 3600) / 60).toString().padStart(2, '0');
        const secs = (rem % 60).toString().padStart(2, '0');
        const timeStr = days > 0 ? `${days}d, ${hrs}:${mins}:${secs}` : `${hrs}:${mins}:${secs}`;
        return `${timeStr} (En Espera)`;
    }
    
    if (seconds < 0) {
        const absSec = Math.abs(seconds);
        const days = Math.floor(absSec / (3600 * 24));
        const rem = absSec % (3600 * 24);
        const hrs = Math.floor(rem / 3600).toString().padStart(2, '0');
        const mins = Math.floor((rem % 3600) / 60).toString().padStart(2, '0');
        const secs = (rem % 60).toString().padStart(2, '0');
        const timeStr = days > 0 ? `${days}d, ${hrs}:${mins}:${secs}` : `${hrs}:${mins}:${secs}`;
        return `SLA Excedido: -${timeStr}`;
    } else {
        const days = Math.floor(seconds / (3600 * 24));
        const rem = seconds % (3600 * 24);
        const hrs = Math.floor(rem / 3600).toString().padStart(2, '0');
        const mins = Math.floor((rem % 3600) / 60).toString().padStart(2, '0');
        const secs = (rem % 60).toString().padStart(2, '0');
        const timeStr = days > 0 ? `${days}d, ${hrs}:${mins}:${secs}` : `${hrs}:${mins}:${secs}`;
        return `${timeStr} restantes`;
    }
}

function getFirstUnacceptedTask() {
    let found = null;
    templatesData.forEach(tpl => {
        tpl.tasks.forEach(t => {
            if (t.assigned && t.assigned.startsWith(currentMobileTech) && !t.acceptedByTech && t.status !== 'Completado') {
                found = { templateId: tpl.id, template: tpl, task: t };
            }
        });
    });
    return found;
}

let mobileGlobalClockStarted = false;
function startMobileGlobalClock() {
    if (mobileGlobalClockStarted) return;
    mobileGlobalClockStarted = true;
    setInterval(() => {
        // 1. Reloj del Técnico (Tiempo Restante en el móvil)
        if (!isTemplateExecutionPaused && currentMobileScreen === 'details' && selectedMobileTaskId) {
            const tpl = templatesData.find(t => t.id === selectedMobileTemplateId);
            const task = tpl ? tpl.tasks.find(tk => tk.id === selectedMobileTaskId) : null;
            if (task && task.status !== 'Completado') {
                const elapsedReal = getTaskElapsedTimeInSeconds(tpl, task);
                if (elapsedReal > 0) {
                    mobileTimerSeconds--;
                }
                const display = document.getElementById("mobile-timer-display");
                if (display) {
                    display.innerText = formatRemainingTime(mobileTimerSeconds, elapsedReal > 0);
                }
            }
        }
        
        // 2. Reloj del Administrador (Tiempo transcurrido general del proyecto en el Gantt)
        if (selectedTemplateId) {
            const tpl = templatesData.find(t => t.id === selectedTemplateId);
            if (tpl) {
                const elapsedTpl = getTemplateElapsedTimeInSeconds(tpl);
                activeTemplateElapsedSeconds = elapsedTpl;
                const elapsedLabel = document.getElementById("gantt-elapsed-time-label");
                if (elapsedLabel) {
                    elapsedLabel.innerText = "Tiempo Consumido: " + formatStopwatchTime(activeTemplateElapsedSeconds);
                }
            }
        }

        // 3. Actualizar en caliente el tiempo restante de SLA y los estados de las tareas
        let statusChanged = false;
        templatesData.forEach(tpl => {
            tpl.tasks.forEach(tk => {
                if (tk.status !== 'Completado' && tk.status !== 'Reincidencia Potencial' && tk.status !== 'Creado') {
                    const elapsed = getTaskElapsedTimeInSeconds(tpl, tk);
                    if (elapsed > 0) {
                        const totalDuration = (tk.duration || 1) * 24 * 60 * 60;
                        const remaining = totalDuration - elapsed;
                        
                        let newStatus = tk.status;
                        let newColor = tk.color;
                        
                        if (remaining <= 0) {
                            newStatus = 'Vencido';
                            newColor = 'bg-red-500 border border-red-300 text-white';
                        } else if (remaining / totalDuration <= 0.25) {
                            newStatus = 'Por vencer';
                            newColor = 'bg-amber-500 border border-amber-300 text-white';
                        } else if (tk.status === 'Pendiente') {
                            newStatus = 'En Proceso';
                            newColor = 'bg-blue-500 text-white';
                        }
                        
                        if (tk.status !== newStatus) {
                            tk.status = newStatus;
                            tk.color = newColor;
                            statusChanged = true;
                            
                            // También actualizar en alertsData si existe
                            const alert = alertsData.find(a => a.id === tk.id);
                            if (alert) {
                                alert.status = newStatus;
                                if (newStatus === 'Vencido') {
                                    alert.badgeColor = "bg-red-105 text-red-800 border border-red-200 animate-pulse font-bold";
                                } else if (newStatus === 'Por vencer') {
                                    alert.badgeColor = "bg-amber-100 text-amber-850 border border-amber-200";
                                } else {
                                    alert.badgeColor = "bg-blue-100 text-blue-800 border border-blue-200";
                                }
                            }
                        }
                    }
                }
                
                // Actualizar el texto en la celda de la tabla Gantt si existe y es la plantilla seleccionada
                if (tpl.id === selectedTemplateId) {
                    const slaEl = document.getElementById(`gantt-sla-display-${tk.id}`);
                    if (slaEl) {
                        const elapsed = getTaskElapsedTimeInSeconds(tpl, tk);
                        const totalDuration = tk.duration * 24 * 60 * 60;
                        const remaining = totalDuration - elapsed;
                        
                        let text = "";
                        if (tpl.isPaused) {
                            text = "Pausado (SLA Congelado)";
                        } else if (tk.status === 'Completado' || tk.status === 'Creado') {
                            text = "Finalizado";
                        } else {
                            text = formatRemainingTime(remaining, elapsed > 0);
                        }
                        slaEl.innerText = text;
                        
                        if (tpl.isPaused) {
                            slaEl.className = "text-amber-700 font-bold";
                        } else if (remaining <= 0 && tk.status !== 'Completado' && tk.status !== 'Creado') {
                            slaEl.className = "text-red-650 font-bold animate-pulse";
                        } else {
                            slaEl.className = "font-semibold text-slate-600";
                        }
                    }
                }
            });
        });
        
        if (statusChanged) {
            if (selectedTemplateId) {
                loadTemplate(selectedTemplateId);
            }
            renderAlertsTable();
            renderPrioritariasAlerts();
            renderMobileScreen();
            syncStateToStorage();
        }
    }, 1000);
}

// --- SIMULADOR MÓVIL LÓGICA ---

function renderMobileScreen() {
    const screen = document.getElementById("mobile-screen-content");
    if (!screen) return;
    screen.innerHTML = "";

    // Relación de continuidad: asignar primer técnico disponible si el seleccionado no existe o es Sin Asignar
    if (employeesList.length > 0) {
        const techExists = employeesList.some(e => e.name === currentMobileTech);
        if (!techExists || currentMobileTech === "Sin Asignar") {
            currentMobileTech = employeesList[0].name;
        }
    } else {
        currentMobileTech = "Sin Asignar";
    }

    // Iniciar reloj global si no se ha hecho
    startMobileGlobalClock();

    // 1. Cabecera con menú hamburguesa, título y perfil de técnico
    let headerHtml = `
        <div class="bg-brand-500 text-white p-3 flex items-center justify-between shrink-0 select-none shadow-sm relative z-20">
            <button onclick="toggleMobileMenu()" class="text-white focus:outline-none hover:opacity-80 p-1 rounded transition-all">
                <i data-lucide="menu" class="w-4 h-4"></i>
            </button>
            <span class="font-bold text-[11px] uppercase tracking-wider">Instante App</span>
            <select onchange="changeMobileTech(this.value)" class="bg-brand-600 text-white font-semibold text-[9px] rounded px-1 py-0.5 border-none focus:outline-none max-w-[115px]">
                ${employeesList.length === 0 ? '<option value="Sin Asignar">Sin Personal</option>' : employeesList.map(emp => {
                    const value = emp.name;
                    const isSel = currentMobileTech === value ? 'selected' : '';
                    return `<option value="${value}" ${isSel}>${emp.name} (${emp.role || 'Colab'})</option>`;
                }).join('')}
            </select>
        </div>
    `;

    // 2. Overlay del menú de hamburguesa si está abierto
    let menuOverlayHtml = "";
    if (mobileIsMenuOpen) {
        menuOverlayHtml = `
            <div class="absolute inset-0 bg-slate-900/60 z-30 transition-all duration-300">
                <div class="w-2/3 h-full bg-white flex flex-col p-4 space-y-4 shadow-lg animate-slide-right">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span class="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Menú Técnico</span>
                        <button onclick="toggleMobileMenu()" class="text-slate-400 hover:text-slate-600">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <nav class="flex-1 flex flex-col space-y-2">
                        <button onclick="selectMobileMenuOption('tasks')" class="flex items-center gap-2 text-xs font-semibold ${currentMobileScreen !== 'messaging' ? 'text-brand-500 bg-brand-50' : 'text-slate-600'} p-2 rounded-lg text-left">
                            <i data-lucide="list-todo" class="w-4 h-4"></i>
                            Tareas Asignadas
                        </button>
                        <button onclick="selectMobileMenuOption('messaging')" class="flex items-center gap-2 text-xs font-semibold ${currentMobileScreen === 'messaging' ? 'text-brand-500 bg-brand-50' : 'text-slate-600'} p-2 rounded-lg text-left">
                            <i data-lucide="message-square" class="w-4 h-4"></i>
                            Mensajería (Chat)
                        </button>
                    </nav>
                    <div class="pt-2 border-t border-slate-100 text-[9px] text-slate-400 text-center font-medium">
                        Versión 2.5 (Demo BPMS)
                    </div>
                </div>
            </div>
        `;
    }

    const isTourActive = !document.getElementById("tour-guide-card")?.classList.contains("hidden");
    if (isTourActive) {
        if (currentMobileScreen === 'details') {
            screen.innerHTML = headerHtml + `
                <div class="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="bg-brand-100 text-brand-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo - SLA En Curso</span>
                            <span class="text-[9px] text-slate-400 font-semibold font-mono">2h req.</span>
                        </div>
                        <h4 class="font-bold text-slate-800 text-sm">Visita en Campo (Diagnóstico)</h4>
                        <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[10px] text-slate-600">
                            <div>• <strong>Cliente:</strong> Cliente Tour S.A.</div>
                            <div>• <strong>Dirección:</strong> Av. Garza Sada #450, Monterrey</div>
                            <div>• <strong>Descripción:</strong> Diagnóstico técnico del enlace microondas.</div>
                            <div>• <strong>Estado:</strong> Asignada a Tec. Juan Pérez</div>
                        </div>
                        <div class="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[9px] text-brand-700 leading-normal">
                            ℹ️ Esta tarea fue modelada e inyectada automáticamente desde el constructor BPM.
                        </div>
                    </div>
                    <button onclick="setMobileScreen('signature')" class="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1">
                        <span>Iniciar Tarea en Campo</span> &rarr;
                    </button>
                </div>
            ` + menuOverlayHtml;
            lucide.createIcons();
            return;
        }
        else if (currentMobileScreen === 'signature') {
            screen.innerHTML = headerHtml + `
                <div class="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
                    <div class="space-y-3 shrink-0">
                        <h5 class="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Flujo de Trabajo del Técnico</h5>
                        
                        <!-- Recomendaciones -->
                        <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[9px] text-amber-800 leading-tight">
                            <strong>💡 Guía Preventiva:</strong> Comprobar conector de señal y atenuación recomendada (-4dB).
                        </div>
                        
                        <!-- Chat y Evidencias en 2 columnas -->
                        <div class="grid grid-cols-2 gap-2">
                            <!-- Evidencia -->
                            <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-500 font-bold"></i>
                                <span class="text-[9px] font-semibold text-slate-700 mt-1">Conexión OK</span>
                                <span class="text-[8px] text-slate-400">foto_evidencia.jpg</span>
                            </div>
                            <!-- Chat -->
                            <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
                                <span class="text-[8px] text-slate-400 font-bold uppercase">Chat Soporte:</span>
                                <div class="bg-white p-1 rounded border border-slate-100 text-[8px] text-slate-600 mt-0.5 leading-tight italic">
                                    "Iniciando diagnóstico físico, todo en orden."
                                </div>
                            </div>
                        </div>

                        <!-- Firma -->
                        <div class="space-y-1 mt-1">
                            <span class="text-[9px] font-semibold text-slate-500 uppercase">Firma de Conformidad del Cliente:</span>
                            <canvas id="signature-canvas" class="signature-pad w-full h-24 rounded-lg bg-slate-100 border border-slate-200" width="280" height="96"></canvas>
                            <input type="text" id="client-sig-name" placeholder="Nombre completo del cliente" class="w-full p-2 border border-slate-200 rounded text-[10px] mt-1 bg-white focus:outline-none focus:border-brand-500" value="">
                        </div>
                    </div>
                    <button onclick="completeMobileTicket()" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
                        Finalizar y Subir al BPMS
                    </button>
                </div>
            ` + menuOverlayHtml;
            initSignatureCanvas();
            lucide.createIcons();
            return;
        }
        else if (currentMobileScreen === 'success') {
            screen.innerHTML = headerHtml + `
                <div class="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                    <div class="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-xl font-bold">
                        <i data-lucide="check-circle" class="w-10 h-10"></i>
                    </div>
                    <h5 class="font-bold text-slate-800 text-sm">Servicio Express Completado</h5>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        El ticket de <strong>Cliente Tour S.A.</strong> ha sido cerrado con firma digital conforme. La trazabilidad se sincronizó con el BPMS.
                    </p>
                    <button onclick="switchTab('bpmn')" class="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg shadow transition-all">
                        Retornar al Gantt
                    </button>
                </div>
            ` + menuOverlayHtml;
            lucide.createIcons();
            return;
        }
    }

    let bodyHtml = "";
    if (currentMobileScreen === 'list') {
        let tasksToRender = [];
        templatesData.forEach(tpl => {
            tpl.tasks.forEach(t => {
                if (t.assigned && t.assigned.startsWith(currentMobileTech)) {
                    tasksToRender.push({
                        templateId: tpl.id,
                        templateName: tpl.name,
                        generalObservations: tpl.generalObservations || "",
                        client: tpl.client || "Cliente General",
                        startDate: tpl.startDate || "2026-07-12",
                        startTime: tpl.startTime || "09:00",
                        task: t
                    });
                }
            });
        });

        // Obtener fechas relativas al día de hoy local
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
        const tYyyy = tomorrow.getFullYear();
        const tMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const tDd = String(tomorrow.getDate()).padStart(2, '0');
        const tomorrowStr = `${tYyyy}-${tMm}-${tDd}`;

        // Filtrar por Hoy/Mañana/Semana utilizando fechas de calendario reales
        tasksToRender = tasksToRender.filter(item => {
            let taskDateStr = "";
            if (item.task.actionStartDate) {
                taskDateStr = item.task.actionStartDate;
            } else {
                const startParts = item.startDate.split('-');
                const timeParts = item.startTime.split(':');
                const tplStart = new Date(startParts[0], startParts[1] - 1, startParts[2], timeParts[0], timeParts[1], 0);
                const taskStart = new Date(tplStart.getTime() + (item.task.startDay * 24 * 60 * 60 * 1000));
                const y = taskStart.getFullYear();
                const m = String(taskStart.getMonth() + 1).padStart(2, '0');
                const d = String(taskStart.getDate()).padStart(2, '0');
                taskDateStr = `${y}-${m}-${d}`;
            }

            if (mobileFilterActive === 'Hoy') {
                return taskDateStr === todayStr || item.task.status !== 'Pendiente';
            } else if (mobileFilterActive === 'Mañana') {
                return taskDateStr === tomorrowStr && item.task.status === 'Pendiente';
            } else {
                return true;
            }
        });

        // Ordenar por prioridad
        const statusPriority = {
            "Vencido": 1,
            "Por vencer": 2,
            "Reincidencia Potencial": 3,
            "Pendiente": 4,
            "Completado": 5
        };
        tasksToRender.sort((a, b) => {
            const pA = statusPriority[a.task.status] || 99;
            const pB = statusPriority[b.task.status] || 99;
            return pA - pB;
        });

        let cardsHtml = "";
        if (tasksToRender.length === 0) {
            cardsHtml = `
                <div class="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 italic text-[11px] space-y-2">
                    <i data-lucide="check-circle" class="w-8 h-8 text-slate-350"></i>
                    <span>No hay tareas asignadas para este filtro.</span>
                </div>
            `;
        } else {
            cardsHtml = `<div class="p-3 flex-1 overflow-y-auto space-y-3">`;
            tasksToRender.forEach(item => {
                let badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";
                let statusLabel = item.task.status;
                if (item.task.status === 'Vencido') {
                    badgeStyle = "bg-red-100 text-red-800 border border-red-200";
                } else if (item.task.status === 'Por vencer') {
                    badgeStyle = "bg-amber-100 text-amber-800 border border-amber-200";
                } else if (item.task.status === 'Reincidencia Potencial') {
                    badgeStyle = "bg-accent-500 text-white animate-pulse";
                    statusLabel = "Reincidente";
                } else if (item.task.status === 'Completado') {
                    badgeStyle = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                }

                let acceptStatusHtml = "";
                if (item.task.status !== 'Completado') {
                    if (item.task.acceptedByTech) {
                        acceptStatusHtml = `<span class="text-[8px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-100 flex items-center gap-0.5">✔️ Enterado</span>`;
                    } else {
                        acceptStatusHtml = `<span class="text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-100 flex items-center gap-0.5 animate-pulse">⚠️ No Aceptada</span>`;
                    }
                }

                let actionStartStr = "";
                if (item.task.actionStartDate && item.task.actionStartTime) {
                    const dateParts = item.task.actionStartDate.split("-");
                    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const day = dateParts[2];
                    const monthStr = months[parseInt(dateParts[1], 10) - 1];
                    actionStartStr = `${day} ${monthStr}, ${item.task.actionStartTime}`;
                } else {
                    const startParts = item.startDate.split('-');
                    const timeParts = item.startTime.split(':');
                    const tplStart = new Date(startParts[0], startParts[1] - 1, startParts[2], timeParts[0], timeParts[1], 0);
                    const taskStart = new Date(tplStart.getTime() + (item.task.startDay * 24 * 60 * 60 * 1000));
                    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const day = taskStart.getDate().toString().padStart(2, '0');
                    const monthStr = months[taskStart.getMonth()];
                    const hrs = taskStart.getHours().toString().padStart(2, '0');
                    const mins = taskStart.getMinutes().toString().padStart(2, '0');
                    actionStartStr = `${day} ${monthStr}, ${hrs}:${mins} (Prog.)`;
                }

                cardsHtml += `
                    <div onclick="selectMobileTask('${item.templateId}', ${item.task.id})" class="bg-white p-3 rounded-xl border border-slate-150 hover:border-brand-300 shadow-sm cursor-pointer transition-all space-y-2 active:bg-slate-50">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5">
                                <span class="${badgeStyle} text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">${statusLabel}</span>
                                ${acceptStatusHtml}
                            </div>
                            <span class="text-[9px] text-slate-400 font-semibold font-mono">${item.task.daysText}</span>
                        </div>
                        <p class="font-bold text-slate-800 text-xs truncate">${item.task.name.replace(/^\d+\.\s*/, "")}</p>
                        <p class="text-[9px] text-slate-500 font-medium truncate">${item.client} - ${item.templateName}</p>
                        
                        <div class="flex items-center gap-1 text-[8.5px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded border border-slate-100/50">
                            <i data-lucide="calendar-clock" class="w-3 h-3 text-slate-400 shrink-0"></i>
                            <span>Inicio de Acción: <strong class="text-slate-700">${actionStartStr}</strong></span>
                        </div>

                        <div class="flex items-center justify-between pt-1.5 text-[9px] text-slate-400 font-medium border-t border-slate-100">
                            <span>Ver detalles</span>
                            <span class="text-brand-500 font-bold">&rarr;</span>
                        </div>
                    </div>
                `;
            });
            cardsHtml += `</div>`;
        }

        bodyHtml = `
            <div class="flex-1 flex flex-col min-h-0 bg-slate-50">
                <div class="flex border-b border-slate-200 text-center shrink-0 bg-white shadow-sm z-10">
                    <button onclick="setMobileFilter('Hoy')" class="flex-1 py-2 text-[10px] font-bold ${mobileFilterActive === 'Hoy' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-400 hover:text-slate-600'}">Hoy</button>
                    <button onclick="setMobileFilter('Mañana')" class="flex-1 py-2 text-[10px] font-bold ${mobileFilterActive === 'Mañana' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-400 hover:text-slate-600'}">Mañana</button>
                    <button onclick="setMobileFilter('Semana')" class="flex-1 py-2 text-[10px] font-bold ${mobileFilterActive === 'Semana' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-400 hover:text-slate-600'}">Semana</button>
                </div>
                <h5 class="px-3 pt-3 font-bold text-slate-800 text-[11px] uppercase tracking-wider shrink-0">Mis Tareas Programadas</h5>
                ${cardsHtml}
            </div>
        `;
    }
    else if (currentMobileScreen === 'details') {
        const tpl = templatesData.find(t => t.id === selectedMobileTemplateId);
        const task = tpl ? tpl.tasks.find(tk => tk.id === selectedMobileTaskId) : null;

        if (!task) {
            bodyHtml = `
                <div class="p-6 flex-1 flex flex-col justify-center items-center text-center text-slate-400 italic text-xs">
                    <p>No se seleccionó ninguna tarea activa. Regrese al listado.</p>
                    <button onclick="setMobileScreen('list')" class="mt-2 text-brand-500 font-bold underline">Volver</button>
                </div>
            `;
        } else {
            // Separar Urgencia de Estado de Ejecución
            let urgencyText = task.urgencia;
            if (!urgencyText) {
                if (task.name.includes("Diagnóstico") || task.name.includes("Montaje") || task.name.includes("Servidores")) {
                    urgencyText = "Alta";
                } else if (task.name.includes("Planificación") || task.name.includes("Cotización")) {
                    urgencyText = "Media";
                } else {
                    urgencyText = "Baja";
                }
            }
            let urgencyColor = "bg-amber-100 text-amber-800 border border-amber-200";
            if (urgencyText === "Alta") {
                urgencyColor = "bg-red-100 text-red-800 border border-red-200 font-bold";
            } else if (urgencyText === "Baja") {
                urgencyColor = "bg-slate-100 text-slate-700 border border-slate-200";
            }

            let statusText = "En Proceso";
            let statusColor = "bg-blue-100 text-blue-805 border border-blue-200";
            const elapsedReal = getTaskElapsedTimeInSeconds(tpl, task);
            
            if (task.status === 'Completado' || task.status === 'Creado') {
                statusText = task.status === 'Creado' ? "Creado" : "Completado";
                statusColor = task.status === 'Creado' ? "bg-brand-100 text-brand-800 border border-brand-250" : "bg-emerald-100 text-emerald-800 border border-emerald-250";
            } else if (elapsedReal === 0) {
                statusText = "En Espera";
                statusColor = "bg-slate-100 text-slate-500 border border-slate-200";
            } else if (mobileTimerSeconds <= 0) {
                statusText = "Vencido (SLA Excedido)";
                statusColor = "bg-red-105 text-red-800 border border-red-200 animate-pulse font-bold";
                if (task.status !== 'Vencido') {
                    task.status = 'Vencido';
                    task.color = 'bg-red-500 border border-red-300 text-white';
                    setTimeout(() => {
                        loadTemplate(tpl.id);
                        renderPrioritariasAlerts();
                        renderAlertsTable();
                        syncStateToStorage();
                    }, 0);
                }
            } else if (mobileTimerSeconds / (task.duration * 24 * 60 * 60) <= 0.25) {
                statusText = "Por Vencer";
                statusColor = "bg-amber-100 text-amber-850 border border-amber-200";
                if (task.status !== 'Por vencer') {
                    task.status = 'Por vencer';
                    task.color = 'bg-amber-500 border border-amber-300 text-white';
                    setTimeout(() => {
                        loadTemplate(tpl.id);
                        renderPrioritariasAlerts();
                        renderAlertsTable();
                        syncStateToStorage();
                    }, 0);
                }
            } else {
                statusText = "En Proceso";
                statusColor = "bg-blue-100 text-blue-800 border border-blue-200";
            }

            let tabContentHtml = "";
            if (mobileDetailsTab === 'details') {
                let actionBtnHtml = "";
                if (task.status === 'Completado') {
                    actionBtnHtml = `
                        <div class="p-2.5 bg-emerald-50 border border-emerald-250 rounded-lg text-[9px] text-emerald-850 text-center font-semibold">
                            ✅ Esta tarea ya se encuentra completada y subida en el BPMS.
                        </div>
                    `;
                } else {
                    const nextScreen = (task.status === 'Reincidencia Potencial') ? 'warning' : 'checklist';
                    actionBtnHtml = `
                        <button onclick="setMobileScreen('${nextScreen}')" class="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5">
                            <span>Siguiente Paso (Checklist)</span> &rarr;
                        </button>
                    `;
                }

                // Panel del cronómetro de tiempo restante basado en el SLA
                const elapsedReal = getTaskElapsedTimeInSeconds(tpl, task);
                let stopwatchPanelHtml = "";
                if (task.status === 'Completado') {
                    stopwatchPanelHtml = `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-1 shadow-inner w-full">
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cronómetro SLA (Tiempo Restante)</span>
                            <span class="text-lg font-mono font-bold text-slate-400">00:00:00 (Fin)</span>
                            <span class="text-[8px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-0.5">✅ Completada</span>
                        </div>
                    `;
                } else if (isTemplateExecutionPaused) {
                    stopwatchPanelHtml = `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-1 shadow-inner w-full text-center">
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cronómetro SLA (Tiempo Restante)</span>
                            <span class="text-lg font-mono font-bold text-amber-600 animate-pulse" id="mobile-timer-display">${formatRemainingTime(mobileTimerSeconds, elapsedReal > 0)}</span>
                            <span class="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider inline-flex items-center gap-0.5 justify-center"><i data-lucide="pause-circle" class="w-3 h-3 text-amber-600"></i> Pausada por Administrador</span>
                        </div>
                    `;
                } else {
                    stopwatchPanelHtml = `
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-1 shadow-inner w-full text-center">
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cronómetro SLA (Tiempo Restante)</span>
                            <span class="text-lg font-mono font-bold text-slate-800" id="mobile-timer-display">${formatRemainingTime(mobileTimerSeconds, elapsedReal > 0)}</span>
                            <span class="text-[8px] font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 uppercase tracking-wider inline-flex items-center gap-0.5 justify-center"><i data-lucide="zap" class="w-3 h-3 text-emerald-500 animate-bounce"></i> Contabilizando SLA en Vivo</span>
                        </div>
                    `;
                }

                let detailsActionStartStr = "";
                if (task.actionStartDate && task.actionStartTime) {
                    const dateParts = task.actionStartDate.split("-");
                    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const day = dateParts[2];
                    const monthStr = months[parseInt(dateParts[1], 10) - 1];
                    detailsActionStartStr = `${day} ${monthStr}, ${task.actionStartTime}`;
                } else {
                    const startDateVal = tpl.startDate || "2026-07-12";
                    const startTimeVal = tpl.startTime || "09:00";
                    const dateParts = startDateVal.split("-");
                    const timeParts = startTimeVal.split(":");
                    const tplStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0);
                    const taskStart = new Date(tplStart.getTime() + (task.startDay * 24 * 60 * 60 * 1000));
                    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const day = taskStart.getDate().toString().padStart(2, '0');
                    const monthStr = months[taskStart.getMonth()];
                    const hrs = taskStart.getHours().toString().padStart(2, '0');
                    const mins = taskStart.getMinutes().toString().padStart(2, '0');
                    detailsActionStartStr = `${day} ${monthStr}, ${hrs}:${mins} (Programada)`;
                }

                tabContentHtml = `
                    <div class="space-y-3.5 text-[10px] text-slate-600">
                        <div class="bg-white p-3 rounded-lg border border-slate-150 space-y-1.5 shadow-sm">
                            <div>• <strong>Cliente:</strong> ${tpl.client || "Cliente General"}</div>
                            <div>• <strong>Ubicación:</strong> ${task.ubicacion || "Av. Garza Sada #450, Monterrey N.L."}</div>
                            <div class="flex items-center gap-1.5 mt-1">
                                <span>• <strong>Urgencia:</strong></span>
                                <span class="px-2 py-0.5 rounded-full font-bold text-[8px] uppercase ${urgencyColor}">${urgencyText}</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-1">
                                <span>• <strong>Estado:</strong></span>
                                <span class="px-2 py-0.5 rounded-full font-bold text-[8px] uppercase ${statusColor}">${statusText}</span>
                            </div>
                            <div>• <strong>Tiempo Reservado:</strong> ${task.daysText}</div>
                            <div>• <strong>Inicio de Acción:</strong> ${detailsActionStartStr}</div>
                        </div>

                        ${stopwatchPanelHtml}

                        ${actionBtnHtml}
                    </div>
                `;
            } else {
                let failureHtml = `
                    <div class="bg-blue-50 border border-blue-150 p-3 rounded-lg text-[9px] text-brand-700 leading-relaxed shadow-sm">
                        <strong>💡 Diagnóstico Preventivo:</strong> El motor predictivo estima un <strong>94% de efectividad</strong> si se ejecuta la calibración física de acuerdo al protocolo BPMS.
                    </div>
                `;
                if (task.status === 'Reincidencia Potencial' || tpl.id === 'camera_support') {
                    failureHtml = `
                        <div class="bg-red-50 border border-red-150 p-3 rounded-lg text-[9px] text-red-800 leading-relaxed shadow-sm animate-pulse">
                            <strong>⚠️ Alerta de Causa Raíz (Predictiva):</strong> El <strong>78% de fallas recurrentes</strong> en este sitio son por humedad o doblez en el cableado enterrado, no por la cámara. Revisa la canalización.
                        </div>
                    `;
                }

                tabContentHtml = `
                    <div class="space-y-3.5 text-[10px] text-slate-600">
                        ${failureHtml}
                        
                        <div class="bg-white p-3 rounded-lg border border-slate-150 space-y-1.5 shadow-sm">
                            <span class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notas de esta Actividad:</span>
                            <div class="font-normal leading-relaxed text-slate-600 italic">
                                "${task.description || 'Sin notas específicas.'}"
                            </div>
                        </div>

                        <div class="bg-white p-3 rounded-lg border border-slate-150 space-y-1.5 shadow-sm">
                            <span class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Observaciones Generales del Proyecto:</span>
                            <div class="font-normal leading-relaxed text-slate-500">
                                ${tpl.generalObservations || "Planificación comercial y técnica del ticket."}
                            </div>
                        </div>
                    </div>
                `;
            }

            bodyHtml = `
                <div class="flex-1 flex flex-col min-h-0 bg-slate-50 animate-fade-in">
                    <button onclick="setMobileScreen('list')" class="px-3 py-2 bg-white text-left font-bold text-brand-500 text-[10px] hover:underline shrink-0 flex items-center gap-1 border-b border-slate-100">
                        &larr; Volver al Listado General
                    </button>
                    
                    <div class="p-3 flex-1 overflow-y-auto space-y-3 flex flex-col">
                        <h4 class="font-bold text-slate-800 text-[11px] uppercase tracking-wider">${task.name.replace(/^\d+\.\s*/, "")}</h4>
                        
                        <div class="flex border-b border-slate-200 text-center shrink-0">
                            <button onclick="setMobileDetailsTab('details')" class="flex-1 py-1.5 text-[10px] font-bold ${mobileDetailsTab === 'details' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-400 hover:text-slate-600'}">Detalles</button>
                            <button onclick="setMobileDetailsTab('falla')" class="flex-1 py-1.5 text-[10px] font-bold ${mobileDetailsTab === 'falla' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-400 hover:text-slate-600'}">Acerca de la Falla</button>
                        </div>

                        <div class="flex-1 mt-2">
                            ${tabContentHtml}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    else if (currentMobileScreen === 'warning') {
        bodyHtml = `
            <div class="p-6 flex-1 flex flex-col justify-between overflow-y-auto text-center bg-slate-50 animate-fade-in">
                <div class="space-y-4">
                    <div class="w-12 h-12 bg-red-50 text-red-500 border border-red-200 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                        <i data-lucide="alert-octagon" class="w-6 h-6"></i>
                    </div>
                    <h5 class="font-bold text-red-700 text-xs uppercase tracking-wider">¡Alerta Predictiva de Causa Raíz!</h5>
                    <p class="text-[10px] text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        El motor predictivo estimó que el <strong>78% de fallas recurrentes</strong> en este tipo de cámaras exteriores en Residencial Jardines son causadas por <strong>humedad o doblez en el cableado enterrado</strong> en el jardín, no por fallo de la cámara misma.
                    </p>
                    <p class="text-[9px] text-slate-450 leading-relaxed">
                        El checklist estándar de cierre ha sido bloqueado temporalmente. Debe certificar el diagnóstico de infraestructura.
                    </p>
                </div>
                <button onclick="setMobileScreen('checklist')" class="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
                    Entendido, Iniciar Diagnóstico de Infraestructura
                </button>
            </div>
        `;
    }
    else if (currentMobileScreen === 'checklist') {
        bodyHtml = `
            <div class="p-4 flex-1 flex flex-col justify-between overflow-y-auto bg-slate-50 animate-fade-in">
                <div class="space-y-3">
                    <h5 class="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Pruebas Obligatorias de Causa Raíz</h5>
                    <p class="text-[9px] text-slate-400 leading-tight">Certifique las siguientes condiciones para evitar reincidencia:</p>
                    
                    <div class="space-y-2 mt-2">
                        <label class="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer shadow-sm">
                            <input type="checkbox" id="check-volts" class="mt-0.5 rounded text-brand-500 focus:ring-brand-500">
                            <span class="text-[9px] text-slate-600 leading-tight">Comprobación de voltaje en fuente externa (12V estable).</span>
                        </label>
                        <label class="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer shadow-sm">
                            <input type="checkbox" id="check-continuity" class="mt-0.5 rounded text-brand-500 focus:ring-brand-500">
                            <span class="text-[9px] text-slate-600 leading-tight">Prueba de continuidad del cableado exterior (sin derivaciones a tierra).</span>
                        </label>
                    </div>

                    <div class="mt-3">
                        <p class="text-[9px] font-semibold text-slate-500 uppercase">Subir Evidencia de Canalización:</p>
                        <div id="photo-box" onclick="simulatePhotoUpload()" class="mt-1 bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                            <i data-lucide="camera" class="w-5 h-5 text-slate-400 mx-auto"></i>
                            <span class="text-[8px] text-slate-400 block mt-1">Toque para simular foto de tubería</span>
                        </div>
                    </div>
                </div>
                <button onclick="setMobileScreen('signature')" class="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
                    Continuar al Cierre del Ticket
                </button>
            </div>
        `;
    }
    else if (currentMobileScreen === 'signature') {
        bodyHtml = `
            <div class="p-4 flex-1 flex flex-col justify-between overflow-y-auto bg-slate-50 animate-fade-in">
                <div class="space-y-3">
                    <h5 class="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Firma Digital del Cliente</h5>
                    <p class="text-[9px] text-slate-400">Por favor solicite la firma del cliente en conformidad de la solución:</p>
                    
                    <canvas id="signature-canvas" class="signature-pad w-full h-28 rounded-lg bg-white border border-slate-200 shadow-sm" width="280" height="112"></canvas>
                    <button onclick="clearCanvas()" class="text-[9px] text-slate-455 hover:text-slate-600 font-semibold self-end">Limpiar Firma</button>
                </div>
                <button onclick="completeMobileTicket()" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
                    Cerrar Ticket & Facturar al Instante
                </button>
            </div>
        `;
        initSignatureCanvas();
    }
    else if (currentMobileScreen === 'success') {
        let savingText = "+ $150.00 USD en OPEX Ahorrado";
        if (selectedMobileTemplateId === 'microwave') {
            savingText = "+ Enlace validado (Cierre de Acta)";
        }
        bodyHtml = `
            <div class="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4 bg-slate-50 animate-fade-in">
                <div class="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-xl font-bold shadow-sm">
                    <i data-lucide="check-circle" class="w-10 h-10"></i>
                </div>
                <h5 class="font-bold text-slate-800 text-sm">Ticket Resuelto con Éxito</h5>
                <p class="text-xs text-slate-500 leading-relaxed">
                    Firma registrada y evidencias subidas al BPMS central. 
                </p>
                <div class="bg-brand-50 border border-brand-100 p-2.5 rounded-lg text-[10px] text-brand-700 w-full font-bold shadow-sm">
                    ${savingText}
                </div>
                <button onclick="resetMobileSimulator()" class="mt-4 text-[10px] font-bold text-brand-500 hover:underline">
                    &larr; Regresar a la lista de tareas
                </button>
            </div>
        `;
    }
    else if (currentMobileScreen === 'messaging') {
        bodyHtml = `
            <div class="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50 animate-fade-in">
                <div class="p-2.5 bg-slate-100 border-b border-slate-200 text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between shrink-0">
                    <span>Canal: Central de Operaciones</span>
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                
                <div class="flex-1 overflow-y-auto p-3.5 space-y-3 flex flex-col" id="mobile-chat-messages-container">
                    ${mobileChatMessages.map(msg => {
                        const isMe = (msg.sender === "Técnico");
                        const bubbleBg = isMe ? "bg-brand-500 text-white rounded-br-none self-end" : "bg-white text-slate-700 rounded-bl-none self-start border border-slate-150";
                        const alignment = isMe ? "justify-end" : "justify-start";
                        return `
                            <div class="flex ${alignment} w-full">
                                <div class="${bubbleBg} p-2.5 rounded-xl max-w-[85%] text-[10px] shadow-sm leading-normal">
                                    <div class="font-bold text-[8px] opacity-75 mb-0.5">${msg.sender}</div>
                                    <div>${msg.text}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="p-2.5 bg-white border-t border-slate-200 flex gap-1.5 shrink-0">
                    <input type="text" id="mobile-chat-input" placeholder="Escribe un mensaje..." onkeydown="if(event.key==='Enter') sendMobileChatMessage()" class="flex-1 p-2 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-brand-500">
                    <button onclick="sendMobileChatMessage()" class="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all shadow-sm shrink-0 flex items-center justify-center">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // 3. Chequeo de alertas de asignación de tareas obligatorias (Aceptación del técnico)
    const unaccepted = getFirstUnacceptedTask();
    if (unaccepted) {
        const alertOverlayHtml = `
            <div class="absolute inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl p-5 w-full space-y-4 shadow-2xl animate-fade-in border border-slate-200 text-left">
                    <div class="w-10 h-10 bg-brand-50 border border-brand-200 text-brand-500 rounded-full flex items-center justify-center mx-auto">
                        <i data-lucide="bell" class="w-5 h-5 text-brand-500 animate-bounce"></i>
                    </div>
                    <div class="text-center space-y-1">
                        <span class="text-[9px] font-bold text-accent-500 uppercase tracking-widest">Alerta de Asignación Obligatoria</span>
                        <h5 class="font-bold text-slate-800 text-xs">${unaccepted.task.name.replace(/^\d+\.\s*/, "")}</h5>
                        <p class="text-[9px] text-slate-400">Asignado a: ${currentMobileTech}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[9px] text-slate-600 space-y-1">
                        <div>• <strong>Cliente:</strong> ${unaccepted.template.client}</div>
                        <div>• <strong>Duración / SLA:</strong> ${unaccepted.task.daysText}</div>
                        <div>• <strong>Ubicación:</strong> Av. Garza Sada #450, Mty</div>
                        <div>• <strong>Rango Programado:</strong> ${unaccepted.task.dateRange}</div>
                    </div>
                    <p class="text-[8px] text-slate-400 text-center leading-tight">
                        Debe aceptar la tarea para registrar su enterado en el BPMS del Administrador.
                    </p>
                    <button onclick="acceptMobileTaskAssignment('${unaccepted.templateId}', ${unaccepted.task.id})" class="w-full bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition-all text-center">
                        Aceptar Tarea
                    </button>
                </div>
            </div>
        `;
        screen.innerHTML = headerHtml + bodyHtml + alertOverlayHtml;
        lucide.createIcons();
        return;
    }

    screen.innerHTML = headerHtml + bodyHtml + menuOverlayHtml;
    lucide.createIcons();
}

// --- CONTROLES AUXILIARES DEL SIMULADOR MÓVIL ---
function toggleMobileMenu() {
    mobileIsMenuOpen = !mobileIsMenuOpen;
    renderMobileScreen();
}

function selectMobileMenuOption(option) {
    mobileIsMenuOpen = false;
    if (option === 'tasks') {
        currentMobileScreen = 'list';
    } else if (option === 'messaging') {
        currentMobileScreen = 'messaging';
    }
    renderMobileScreen();
}

function changeMobileTech(tech) {
    currentMobileTech = tech;
    renderMobileScreen();
}

function setMobileFilter(filter) {
    mobileFilterActive = filter;
    renderMobileScreen();
}

function setMobileDetailsTab(tab) {
    mobileDetailsTab = tab;
    renderMobileScreen();
}

function selectMobileTask(templateId, taskId) {
    selectedMobileTemplateId = templateId;
    selectedMobileTaskId = taskId;
    currentMobileScreen = 'details';
    mobileDetailsTab = 'details';
    const tpl = templatesData.find(t => t.id === templateId);
    const task = tpl ? tpl.tasks.find(tk => tk.id === taskId) : null;
    if (tpl && task) {
        const elapsed = getTaskElapsedTimeInSeconds(tpl, task);
        mobileTimerSeconds = (task.duration * 24 * 60 * 60) - elapsed;
    } else {
        mobileTimerSeconds = 0;
    }
    renderMobileScreen();
}

function toggleMobileStopwatch() {
    // Obsoleto, el cronómetro ahora se calcula automáticamente por SLA
}

function acceptMobileTaskAssignment(templateId, taskId) {
    const template = templatesData.find(t => t.id === templateId);
    if (template) {
        const task = template.tasks.find(tk => tk.id === taskId);
        if (task) {
            task.acceptedByTech = true;
            task.acceptedTime = new Date().toLocaleString('es-ES', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            addNotification(`Téc. ${currentMobileTech} aceptó la tarea "${task.name.replace(/^\d+\.\s*/, "")}"`, 'confirm', { techName: currentMobileTech });
        }
        loadTemplate(template.id);
    }
    selectMobileTask(templateId, taskId);
    renderMobileScreen();
    renderPrioritariasAlerts();
    renderAlertsTable();
    syncStateToStorage();
}

function sendMobileChatMessage() {
    const input = document.getElementById("mobile-chat-input");
    if (!input || !input.value.trim()) return;
    mobileChatMessages.push({
        sender: "Técnico",
        text: input.value.trim()
    });
    addNotification(`Mensaje desde móvil de Téc. ${currentMobileTech}: "${input.value.trim()}"`, 'chat', { chatType: 'dm', chatName: currentMobileTech });
    input.value = "";
    renderMobileScreen();
    
    setTimeout(() => {
        const container = document.getElementById("mobile-chat-messages-container");
        if (container) container.scrollTop = container.scrollHeight;
    }, 50);
}

function setMobileScreen(screenId) {
    currentMobileScreen = screenId;
    renderMobileScreen();
}

function simulatePhotoUpload() {
    const photoBox = document.getElementById("photo-box");
    if (photoBox) {
        photoBox.innerHTML = `
            <div class="text-emerald-600 flex flex-col items-center justify-center">
                <i data-lucide="check-circle" class="w-6 h-6 mb-1"></i>
                <span class="text-[9px] font-bold">Foto cargada: Canalizacion_Ok.jpg</span>
            </div>
        `;
        lucide.createIcons();
    }
}

// Inicializar lienzo de firma
let isDrawing = false;
let sigCanvas, sigCtx;

function initSignatureCanvas() {
    sigCanvas = document.getElementById("signature-canvas");
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext("2d");
    
    sigCtx.strokeStyle = "#0f172a";
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = "round";

    sigCanvas.addEventListener("mousedown", startDrawing);
    sigCanvas.addEventListener("mousemove", draw);
    sigCanvas.addEventListener("mouseup", stopDrawing);
    sigCanvas.addEventListener("mouseout", stopDrawing);

    sigCanvas.addEventListener("touchstart", (e) => {
        const touch = e.touches[0];
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.beginPath();
        sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
        isDrawing = true;
        e.preventDefault();
    });

    sigCanvas.addEventListener("touchmove", (e) => {
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        sigCtx.stroke();
        e.preventDefault();
    });

    sigCanvas.addEventListener("touchend", stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.beginPath();
    sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    sigCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearCanvas() {
    if (sigCanvas && sigCtx) {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    }
}

function completeMobileTicket() {
    setMobileScreen('success');
    opexSavedValue += 150.00;
    const opexKpi = document.getElementById("kpi-opex-saved");
    if (opexKpi) {
        opexKpi.innerText = `$${opexSavedValue.toFixed(2)} USD`;
    }

    if (mobileTimerInterval) {
        clearInterval(mobileTimerInterval);
        mobileTimerInterval = null;
    }

    if (selectedMobileTaskId) {
        // Resolver alerta si existía
        const alert = alertsData.find(a => a.id === selectedMobileTaskId);
        if (alert) {
            alert.status = "Resuelto";
            alert.badgeColor = "bg-emerald-100 text-emerald-800";
            alert.timeRemaining = "Resuelto en campo";
        }
        
        // Actualizar estado de la tarea en la plantilla
        const template = templatesData.find(t => t.id === selectedMobileTemplateId);
        if (template) {
            const task = template.tasks.find(tk => tk.id === selectedMobileTaskId);
            if (task) {
                task.status = "Completado";
                task.color = "bg-brand-500 text-white";
                task.timeRemaining = "Finalizado";
                task.completedTime = new Date().toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                addNotification(`Tarea completada: "${task.name.replace(/^\d+\.\s*/, "")}" por Téc. ${currentMobileTech}`, 'completado', { templateId: selectedMobileTemplateId });
                
                // Activar la siguiente tarea de la secuencia si está pendiente
                const currentIdx = template.tasks.findIndex(tk => tk.id === selectedMobileTaskId);
                if (currentIdx !== -1 && currentIdx < template.tasks.length - 1) {
                    const nextTask = template.tasks[currentIdx + 1];
                    
                    // Auto-completar fecha y hora de inicio de acción de la siguiente tarea al terminar la anterior
                    const now = new Date();
                    const pad = (num) => num.toString().padStart(2, '0');
                    nextTask.actionStartDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                    nextTask.actionStartTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    
                    if (nextTask.status === "Pendiente") {
                        nextTask.status = "Por vencer";
                        nextTask.color = "bg-amber-500 border border-amber-350 text-white animate-pulse";
                    }
                } else if (currentIdx === template.tasks.length - 1) {
                    checkAndFinishTemplateIfLastTaskCompleted(template);
                }
            }
            loadTemplate(template.id);
        }
    } else {
        // Fallback histórico para demo
        const alert = alertsData.find(a => a.id === 303);
        if (alert) {
            alert.status = "Resuelto";
            alert.badgeColor = "bg-emerald-100 text-emerald-800";
            alert.timeRemaining = "Resuelto en campo";
        }

        const template = templatesData.find(t => t.id === "camera_support");
        if (template) {
            const task = template.tasks.find(t => t.id === 303);
            if (task) {
                task.status = "Completado";
                task.color = "bg-brand-500 text-white";
                task.timeRemaining = "Finalizado";
            }
        }
    }

    renderPrioritariasAlerts();
    renderAlertsTable();
    if (selectedTemplateId) {
        loadTemplate(selectedTemplateId);
    }
    syncStateToStorage();
}

function resetMobileSimulator() {
    currentMobileScreen = 'list';
    selectedMobileTaskId = null;
    selectedMobileTemplateId = null;
    renderMobileScreen();
}

// Reiniciar datos
function resetDemoData() {
    endAutoSimulationTour(false);
    cargarDatosDesdeBackend();
}

function clearAllDemoData() {
    endAutoSimulationTour(false);
    cargarDatosDesdeBackend();
}

// --- AYUDANTES DE DROPDOWNS PERSONALIZADOS ---
function toggleCustomDropdown(dropdownId, event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Cerrar otros dropdowns activos
    document.querySelectorAll("[id$='-dropdown']").forEach(el => {
        if (el.id !== dropdownId) el.classList.add("hidden");
    });
    
    dropdown.classList.toggle("hidden");
}

function selectCustomDropdownValue(inputId, value, dropdownId, triggerId, event) {
    if (event) event.stopPropagation();
    
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
        const changeEvent = new Event('change');
        input.dispatchEvent(changeEvent);
    }
    
    const triggerVal = document.getElementById(triggerId + "-value");
    if (triggerVal) {
        triggerVal.innerText = value;
    }
    
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.add("hidden");
    }
}

// Listener global para cerrar dropdowns al hacer clic en cualquier parte
document.addEventListener("click", () => {
    document.querySelectorAll("[id$='-dropdown']").forEach(el => {
        el.classList.add("hidden");
    });
});

// Listener de cambio de tamaño de ventana para recalcular anchos del Gantt
window.addEventListener("resize", () => {
    const bpmnView = document.getElementById("view-bpmn");
    if (bpmnView && !bpmnView.classList.contains("hidden")) {
        loadTemplate(selectedTemplateId);
    }
});

// --- FUNCIONES DE TOOLTIPS DEL TOUR ---
function showTourTooltip(targetSelector, text, placement = "top") {
    removeTourTooltips();
    const target = document.querySelector(targetSelector);
    if (!target) return;
    
    const tooltip = document.createElement("div");
    tooltip.id = "tour-active-tooltip";
    tooltip.className = "absolute z-[999] text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xl border border-brand-500 max-w-[250px] pointer-events-none transition-all duration-300";
    tooltip.style.backgroundColor = "#004b93"; 
    tooltip.innerHTML = `
        <div class="relative leading-relaxed">
            ${text}
            <div class="absolute w-2 h-2 rotate-45 bg-[#004b93] border-r border-b border-brand-500" id="tooltip-arrow" style="bottom: -5px; left: calc(50% - 4px);"></div>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    
    let top = 0;
    let left = 0;
    
    const arrow = tooltip.querySelector("#tooltip-arrow");
    
    if (placement === "top") {
        top = rect.top + scrollY - tooltip.offsetHeight - 8;
        left = rect.left + scrollX + (rect.width - tooltip.offsetWidth) / 2;
        arrow.style.bottom = "-4px";
        arrow.style.top = "auto";
        arrow.style.left = "calc(50% - 4px)";
    } else if (placement === "bottom") {
        top = rect.bottom + scrollY + 8;
        left = rect.left + scrollX + (rect.width - tooltip.offsetWidth) / 2;
        arrow.style.top = "-4px";
        arrow.style.bottom = "auto";
        arrow.style.left = "calc(50% - 4px)";
    } else if (placement === "left") {
        top = rect.top + scrollY + (rect.height - tooltip.offsetHeight) / 2;
        left = rect.left + scrollX - tooltip.offsetWidth - 8;
        arrow.style.right = "-4px";
        arrow.style.left = "auto";
        arrow.style.top = "calc(50% - 4px)";
    } else if (placement === "right") {
        top = rect.top + scrollY + (rect.height - tooltip.offsetHeight) / 2;
        left = rect.right + scrollX + 8;
        arrow.style.left = "-4px";
        arrow.style.right = "auto";
        arrow.style.top = "calc(50% - 4px)";
    }
    
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

function removeTourTooltips() {
    const existing = document.getElementById("tour-active-tooltip");
    if (existing) existing.remove();
}

// --- FUNCIONES DEL PUNTERO DE MOUSE SIMULADO ---
function moveSimulatedCursor(selector, callback) {
    const cursor = document.getElementById("simulated-cursor");
    if (!cursor) {
        if (callback) callback();
        return;
    }
    
    const target = document.querySelector(selector);
    if (!target) {
        if (callback) callback();
        return;
    }
    
    cursor.classList.remove("hidden");
    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    
    // Posicionar el cursor sobre el centro del elemento
    const targetX = rect.left + scrollX + rect.width / 2;
    const targetY = rect.top + scrollY + rect.height / 2;
    
    cursor.style.left = `${targetX}px`;
    cursor.style.top = `${targetY}px`;
    
    // Esperar a que la transición de movimiento de 1 segundo termine, luego hacer clic
    setTimeout(() => {
        simulateCursorClick(callback);
    }, 1100);
}

function simulateCursorClick(callback) {
    const cursor = document.getElementById("simulated-cursor");
    if (!cursor) {
        if (callback) callback();
        return;
    }
    // Efecto de encogido para simular clic físico
    cursor.style.transform = "scale(0.75)";
    
    // Crear un anillo visual de clic
    const ring = document.createElement("div");
    ring.className = "fixed w-8 h-8 border-2 border-brand-500 rounded-full z-[9998] pointer-events-none transition-all duration-500 ease-out";
    ring.style.left = cursor.style.left;
    ring.style.top = cursor.style.top;
    ring.style.transform = "translate(-16px, -16px) scale(0)"; 
    ring.style.opacity = "1";
    document.body.appendChild(ring);
    
    setTimeout(() => {
        ring.style.transform = "translate(-16px, -16px) scale(1.6)";
        ring.style.opacity = "0";
    }, 50);
    
    setTimeout(() => {
        cursor.style.transform = "scale(1)";
        ring.remove();
        if (callback) callback();
    }, 450);
}

function hideSimulatedCursor() {
    const cursor = document.getElementById("simulated-cursor");
    if (cursor) cursor.classList.add("hidden");
}

// --- MOTOR DEL RECORRIDO SIMULADO AUTOMÁTICO (TOUR DE 10 PASOS) ---
let tourCurrentStep = 0;
let tourTimer = null;
let isTourPlaying = false;

const tourSteps = [
    {
        title: "Paso 1: Parámetros del Proceso (Diseñador BPM)",
        desc: "Ingresamos al modelador de flujos visual. Se abre el creador de plantillas para definir el nombre, cliente y fecha/hora de arranque (14/07/2026).",
        action: () => {
            // Mover cursor a la pestaña BPM
            moveSimulatedCursor('#btn-bpmn', () => {
                switchTab('bpmn');
                templatesData = [];
                alertsData = [];
                initDropdowns();
                loadTemplate("");
                
                // Mover cursor al botón de Crear Plantilla
                setTimeout(() => {
                    moveSimulatedCursor('#btn-create-template', () => {
                        openCreateTemplateModal();
                        
                        document.getElementById("new-template-name").value = "Servicio Express";
                        document.getElementById("new-template-client").value = "Cliente Tour S.A.";
                        document.getElementById("new-template-start-date").value = "2026-07-14";
                        document.getElementById("new-template-start-time").value = "09:00";
                        document.getElementById("new-template-observations").value = "Atención al instante simulada.";
                        
                        constructorAddedNodes = [];
                        renderVisualSequenceCanvas();
                        renderPropertiesPanel();
                        
                        showTourTooltip('#modal-create-template', 'Definimos los parámetros comerciales y temporales del flujo de trabajo.', 'bottom');
                    });
                }, 400);
            });
        }
    },
    {
        title: "Paso 2: Modelado del Flujo (Creación de Nodos)",
        desc: "Añadimos secuencialmente 4 hitos operativos al lienzo para modelar el flujo paso a paso: Reporte, Visita, Pruebas y Cierre.",
        action: () => {
            // Mover cursor al lienzo de flujo
            moveSimulatedCursor('#canvas-container', () => {
                const id1 = Date.now() + 1;
                constructorAddedNodes.push({
                    id: id1,
                    name: "Reporte Inicial",
                    assigned: "Capturista (Backoffice) (Backoffice)",
                    timeVal: 10,
                    unit: "min",
                    status: "Creado",
                    duration: 10 / 1440,
                    durationText: "10min",
                    observaciones: "Entrada inicial del ticket."
                });
                const id2 = Date.now() + 2;
                constructorAddedNodes.push({
                    id: id2,
                    name: "Visita en Campo",
                    assigned: "Tec. Juan Pérez (Campo)",
                    timeVal: 2,
                    unit: "hora",
                    status: "Pendiente",
                    duration: 2 / 24,
                    durationText: "2 horas",
                    observaciones: "Técnico acude al sitio."
                });
                const id3 = Date.now() + 3;
                constructorAddedNodes.push({
                    id: id3,
                    name: "Pruebas de Red",
                    assigned: "Ing. Josué (Redes)",
                    timeVal: 1,
                    unit: "hora",
                    status: "Pendiente",
                    duration: 1 / 24,
                    durationText: "1 hora",
                    observaciones: "Verificación de señal."
                });
                const id4 = Date.now() + 4;
                constructorAddedNodes.push({
                    id: id4,
                    name: "Cierre y Firma",
                    assigned: "Tec. Juan Pérez (Campo)",
                    timeVal: 30,
                    unit: "min",
                    status: "Pendiente",
                    duration: 30 / 1440,
                    durationText: "30min",
                    observaciones: "Firma digital del cliente."
                });

                selectedConstructorNodeId = id2; // Foco en Visita en Campo
                renderVisualSequenceCanvas();
                renderPropertiesPanel();
                
                showTourTooltip('#canvas-container', 'Los hitos se agregan en orden lógico y se visualizan en el mapa de flujo central.', 'top');
            });
        }
    },
    {
        title: "Paso 3: Captura de Datos y Disponibilidad (Hot-checking)",
        desc: "Al seleccionar un hito en el constructor, se despliega el panel de edición. El sistema consulta en tiempo real las horas libres de los técnicos y los ordena para evitar sobrecargas.",
        action: () => {
            // Mover cursor al panel de propiedades
            moveSimulatedCursor('#node-properties-panel', () => {
                renderPropertiesPanel();
                showTourTooltip('#node-properties-panel', 'El dropdown calcula la capacidad laboral en caliente en la fecha programada antes de guardar.', 'left');
            });
        }
    },
    {
        title: "Paso 4: Despliegue del Gantt con Tooltips de Plantilla",
        desc: "Se guarda el flujo en el BPMS. Observa cómo el gráfico Gantt autoajustable estira la jornada en pantalla ocupando el 100% de la columna de 24 horas del Martes 14.",
        action: () => {
            // Mover cursor al botón de Guardar en el pie de modal
            moveSimulatedCursor('button[onclick="saveNewTemplate()"]', () => {
                saveNewTemplate();
                closeCreateTemplateModal();
                setTimeout(() => {
                    showTourTooltip('#bpm-dynamic-container .bg-brand-500', 'Plantilla: Servicio Express<br>• Cliente: Cliente Tour S.A.<br>• Duración: 3h 40min en 1 día.', 'bottom');
                }, 300);
            });
        }
    },
    {
        title: "Paso 5: Avance del Proceso con Tooltips de Ubicación",
        desc: "El primer hito ('Reporte Inicial') se marca como completado y el motor actualiza la traza en tiempo real, guardando el lugar y hora exacta de ejecución.",
        action: () => {
            if (templatesData.length > 0) {
                const tpl = templatesData[0];
                tpl.tasks[0].status = "Completado";
                tpl.tasks[0].color = "bg-brand-500 text-white";
                tpl.tasks[1].status = "Creado";
                tpl.tasks[1].color = "bg-brand-500 text-white";
                loadTemplate(tpl.id);
            }
            
            // Mover cursor a la tarea completada en la tabla del Gantt
            moveSimulatedCursor('#bpm-dynamic-container .border-l-brand-500', () => {
                showTourTooltip('#bpm-dynamic-container .border-l-brand-500', 'Ejecutado:<br>• Tarea: Reporte Inicial<br>• Lugar: Central de Backoffice a las 09:10 hrs.', 'right');
            });
        }
    },
    {
        title: "Paso 6: Simulador Móvil - Tarea Asignada y Características",
        desc: "Navegamos a la aplicación móvil del técnico Juan Pérez. Él ve de inmediato en su pantalla el ticket activo 'Visita en Campo' con su duración y dirección.",
        action: () => {
            removeTourTooltips();
            // Mover cursor al botón de Móvil de la barra lateral
            moveSimulatedCursor('#btn-mobile-sim', () => {
                switchTab('mobile-sim');
                currentMobileScreen = 'details';
                renderMobileScreen();
                
                showTourTooltip('#mobile-simulator-body', 'La orden se notifica en el celular con toda la metadata del proyecto BPM.', 'left');
            });
        }
    },
    {
        title: "Paso 7: Flujo de Trabajo del Técnico en Campo",
        desc: "El técnico consulta recomendaciones, adjunta la foto de evidencia, chatea su estatus con la central y firma con el cliente en el smartphone.",
        action: () => {
            // Mover cursor al botón 'Iniciar Tarea' del simulador móvil
            moveSimulatedCursor('#mobile-screen-content button', () => {
                currentMobileScreen = 'signature';
                renderMobileScreen();
                
                setTimeout(() => {
                    const canvas = document.getElementById("signature-canvas");
                    if (canvas) {
                        const ctx = canvas.getContext("2d");
                        ctx.strokeStyle = "#004b93";
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(30, 50);
                        ctx.bezierCurveTo(70, 20, 120, 80, 160, 40);
                        ctx.lineTo(250, 60);
                        ctx.stroke();
                    }
                    const nameInput = document.getElementById("client-sig-name");
                    if (nameInput) nameInput.value = "Ing. Roberto Garza";
                    
                    showTourTooltip('#mobile-simulator-body', 'Captura de evidencias, chat en caliente y firma de conformidad digital.', 'left');
                }, 150);
            });
        }
    },
    {
        title: "Paso 8: Cierre y Flujo Completado al 100% en BPM",
        desc: "Al finalizar en el móvil, los datos regresan al BPMS central. Retornamos al Diseñador de Flujos: el Gantt se visualiza en verde (solucionado) y el SLA se cierra exitosamente.",
        action: () => {
            // Mover cursor al botón de Finalizar del móvil
            moveSimulatedCursor('#mobile-screen-content button', () => {
                if (templatesData.length > 0) {
                    const tpl = templatesData[0];
                    tpl.tasks.forEach(t => {
                        t.status = "Completado";
                        t.color = "bg-brand-500 text-white";
                    });
                }
                switchTab('bpmn');
                if (templatesData.length > 0) {
                    loadTemplate(templatesData[0].id);
                }
                currentMobileScreen = 'success';
                
                setTimeout(() => {
                    showTourTooltip('#bpm-dynamic-container', 'El proyecto express ha sido finalizado. El SLA concluye al 100% sin retrasos.', 'top');
                }, 200);
            });
        }
    },
    {
        title: "Paso 9: Alertas de SLA y Navegación Bidireccional",
        desc: "Navegamos a Alertas de SLA. Hacemos clic en el nombre de la tarea vencida 'Elaboración de Cotización' para ir a su Gantt e identificar la desviación.",
        action: () => {
            removeTourTooltips();
            
            // Mover cursor a la pestaña Alertas en barra lateral
            moveSimulatedCursor('#btn-alerts', () => {
                switchTab('alerts');
                
                // Restaurar los datos de prueba originales para que no esté vacío y el usuario vea todo
                alertsData = [
                    {
                        id: 103,
                        activity: "Elaboración de Cotización",
                        client: "Inmobiliaria Norte (Nuevo)",
                        assigned: "Lic. Ana Gómez (Comercial)",
                        description: "Cotización de fibra óptica y cableado de oficinas",
                        startFin: "08 Jul - 10 Jul",
                        timeRemaining: "Vencido hace 2 días",
                        status: "Vencido",
                        badgeColor: "bg-red-100 text-red-800",
                        templateId: "microwave"
                    },
                    {
                        id: 202,
                        activity: "Diagnóstico en Campo",
                        client: "Corporativo Calzapato (Recurrente)",
                        assigned: "Tec. Juan Pérez (Campo)",
                        description: "Diagnóstico de enlace microondas punto a punto",
                        startFin: "10 Jul - 13 Jul",
                        timeRemaining: "1 día restante",
                        status: "Por vencer",
                        badgeColor: "bg-amber-100 text-amber-800",
                        templateId: "fiber"
                    },
                    {
                        id: 303,
                        activity: "Soporte de Cámara Exterior",
                        client: "Residencial Jardines (Recurrente)",
                        assigned: "Tec. Pedro López (Soporte)",
                        description: "Fallo repetitivo en cámara de jardín central",
                        startFin: "11 Jul - 12 Jul",
                        timeRemaining: "12 horas restantes",
                        status: "Reincidencia Potencial",
                        badgeColor: "bg-accent-500 text-white animate-pulse",
                        templateId: "camera_support"
                    }
                ];
                
                templatesData = [
                    {
                        id: "microwave",
                        name: "Proyecto: Instalación Enlaces B2B",
                        type: "gantt",
                        createdDate: "2026-07-12",
                        startDate: "2026-07-06",
                        startTime: "09:00",
                        client: "Inmobiliaria Norte",
                        generalObservations: "Implementación de enlace troncal secundario para redundancia de oficinas principales.",
                        createdBy: "Capturista Backoffice",
                        tasks: [
                            { id: 101, name: "1. Planificación de Sitios", duration: 2, daysText: "2 días", status: "Completado", color: "bg-brand-500 text-white", startDay: 0, timeRemaining: "Finalizado", dateRange: "06 Jul - 08 Jul", description: "Reunión de kickoff y planos", assigned: "Lic. Ana Gómez (Comercial)" },
                            { id: 102, name: "2. Levantamiento Físico de Obra", duration: 2, daysText: "2 días", status: "Completado", color: "bg-brand-500 text-white", startDay: 2, timeRemaining: "Finalizado", dateRange: "08 Jul - 10 Jul", description: "Mediciones físicas de campo", assigned: "Tec. Juan Pérez (Campo)" },
                            { id: 103, name: "3. Elaboración de Cotización", duration: 2, daysText: "2 días", status: "Vencido", color: "bg-red-500 border border-red-300 text-white", startDay: 4, timeRemaining: "Vencido hace 2 días", dateRange: "10 Jul - 12 Jul", description: "Cotización de fibra óptica y cableado de oficinas", assigned: "Lic. Ana Gómez (Comercial)" },
                            { id: 104, name: "4. Montaje de Mástiles y Antenas", duration: 3, daysText: "3 días", status: "Pendiente", color: "bg-slate-200 border border-slate-350 text-slate-700", startDay: 6, timeRemaining: "En espera", dateRange: "12 Jul - 15 Jul", description: "Montaje exterior torre", assigned: "Tec. Pedro López (Soporte)" }
                        ]
                    },
                    {
                        id: "fiber",
                        name: "Proyecto: Fibra Óptica HFC - Zona 1",
                        type: "gantt",
                        createdDate: "2026-07-10",
                        startDate: "2026-07-08",
                        startTime: "08:00",
                        client: "Corporativo Calzapato",
                        generalObservations: "Tendido de fibra en postes públicos autorizados por el municipio.",
                        createdBy: "Capturista Backoffice",
                        tasks: [
                            { id: 201, name: "1. Planificación y Venta", duration: 2, daysText: "2 días", status: "Completado", color: "bg-brand-500 text-white", startDay: 0, timeRemaining: "Finalizado", dateRange: "08 Jul - 10 Jul", description: "Cierre comercial de fibra", assigned: "Lic. Ana Gómez (Comercial)" },
                            { id: 202, name: "2. Diagnóstico en Campo", duration: 3, daysText: "3 días", status: "Por vencer", color: "bg-amber-500 border border-amber-300 text-white", startDay: 2, timeRemaining: "1 día restante", dateRange: "10 Jul - 13 Jul", description: "Diagnóstico de enlace microondas punto a punto", assigned: "Tec. Juan Pérez (Campo)" },
                            { id: 203, name: "3. Tendido de Fibra", duration: 5, daysText: "5 días", status: "Pendiente", color: "bg-slate-200 border border-slate-350 text-slate-700", startDay: 5, timeRemaining: "En espera", dateRange: "13 Jul - 18 Jul", description: "Instalación física fibra", assigned: "Ing. Josué (Redes)" }
                        ]
                    },
                    {
                        id: "camera_support",
                        name: "Soporte: Fallo en Cámara Exterior",
                        type: "crm",
                        createdDate: "2026-07-05",
                        startDate: "2026-07-05",
                        startTime: "10:00",
                        client: "Residencial Jardines",
                        generalObservations: "Revisión preventiva por reincidencia analítica de cableado.",
                        createdBy: "Capturista Backoffice",
                        tasks: [
                            { id: 301, name: "1. Reporte Inicial de Falla", duration: 1, daysText: "1 día", status: "Completado", color: "bg-brand-500 text-white", startDay: 0, timeRemaining: "Finalizado", dateRange: "05 Jul - 06 Jul", description: "Cliente reporta falla de imagen", assigned: "Capturista (Backoffice)" },
                            { id: 302, name: "2. Asignación de Técnico", duration: 1, daysText: "1 día", status: "Completado", color: "bg-brand-500 text-white", startDay: 1, timeRemaining: "Finalizado", dateRange: "06 Jul - 07 Jul", description: "Técnico programado para visita", assigned: "Capturista (Backoffice)" },
                            { id: 303, name: "3. Soporte de Cámara Exterior", duration: 2, daysText: "2 días", status: "Reincidencia Potencial", color: "bg-accent-500 text-white animate-pulse", startDay: 2, timeRemaining: "12 horas restantes", dateRange: "07 Jul - 09 Jul", description: "Fallo repetitivo en cámara de jardín central", assigned: "Tec. Pedro López (Soporte)" }
                        ]
                    }
                ];
                
                activeFilter = 'all';
                renderAlertsTable();
                
                setTimeout(() => {
                    showTourTooltip('#alerts-table-body', 'Haz clic en el nombre de la tarea en color azul para navegar directamente.', 'top');
                    
                    // Mover cursor a la tarea "Elaboración de Cotización" en la tabla
                    setTimeout(() => {
                        moveSimulatedCursor('#alerts-table-body button', () => {
                            navigateToTaskBpm('microwave', 103);
                            setTimeout(() => {
                                showTourTooltip('#bpm-dynamic-container', '¡Sincronización instantánea! El Gantt destaca la tarea vencida en rojo.', 'top');
                            }, 200);
                        });
                    }, 1200);
                }, 300);
            });
        }
    },
    {
        title: "Paso 10: Filtros y Reasignación de Especialistas",
        desc: "Filtramos las alertas críticas por 'Reincidencia Potencial' y presionamos 'Reasignar Especialista' para equilibrar cargas laborales y evitar multas de SLA.",
        action: () => {
            removeTourTooltips();
            
            // Mover cursor a la pestaña Alertas en barra lateral
            moveSimulatedCursor('#btn-alerts', () => {
                switchTab('alerts');
                activeFilter = 'Reincidencia Potencial';
                renderAlertsTable();
                
                setTimeout(() => {
                    showTourTooltip('#alerts-table-body', 'Filtramos reincidencias y hacemos clic en Reasignar para abrir la mitigación.', 'top');
                    
                    // Mover cursor al botón Reasignar
                    setTimeout(() => {
                        moveSimulatedCursor('#alerts-table-body button', () => {
                            openReasignModal(303);
                            
                            // Mover cursor al dropdown select del técnico
                            setTimeout(() => {
                                moveSimulatedCursor('#select-specialist', () => {
                                    const select = document.getElementById("select-specialist");
                                    if (select) select.value = "Ing. Sofía Reyes (Senior)";
                                    
                                    // Mover cursor a Guardar Reasignación
                                    setTimeout(() => {
                                        moveSimulatedCursor('button[onclick="confirmReasign()"]', () => {
                                            confirmReasign();
                                            removeTourTooltips();
                                            setTimeout(() => {
                                                showTourTooltip('#alerts-table-body', 'Especialista reasignado exitosamente. Carga laboral balanceada.', 'top');
                                            }, 200);
                                        });
                                    }, 800);
                                });
                            }, 1200);
                        });
                    }, 1200);
                }, 300);
            });
        }
    }
];

function startAutoSimulationTour() {
    const card = document.getElementById("tour-guide-card");
    if (card) card.classList.remove("hidden");
    
    tourCurrentStep = 0;
    isTourPlaying = true;
    runTourStep(0);
}

function runTourStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= tourSteps.length) {
        endAutoSimulationTour();
        return;
    }
    
    tourCurrentStep = stepIndex;
    const step = tourSteps[stepIndex];
    
    document.getElementById("tour-step-title").innerText = step.title;
    document.getElementById("tour-step-desc").innerText = step.desc;
    document.getElementById("tour-step-counter").innerText = `${stepIndex + 1} de ${tourSteps.length}`;
    
    const prevBtn = document.getElementById("tour-prev-btn");
    if (prevBtn) prevBtn.disabled = (stepIndex === 0);
    
    const playIcon = document.getElementById("tour-play-icon");
    if (playIcon) {
        playIcon.setAttribute("data-lucide", isTourPlaying ? "pause" : "play");
    }
    lucide.createIcons();
    
    step.action();
    
    if (tourTimer) clearTimeout(tourTimer);
    if (isTourPlaying) {
        // En los pasos 9 y 10 damos más margen por las sub-animaciones del mouse
        const duration = (stepIndex === 8 || stepIndex === 9) ? 10000 : 7500;
        tourTimer = setTimeout(() => {
            nextTourStep();
        }, duration);
    }
}

function nextTourStep() {
    if (tourCurrentStep < tourSteps.length - 1) {
        runTourStep(tourCurrentStep + 1);
    } else {
        removeTourTooltips();
        hideSimulatedCursor();
        alert("¡Recorrido Simulado Completado con Éxito! Todas las etapas del BPMS y del Simulador han sido validadas.");
        endAutoSimulationTour();
    }
}

function prevTourStep() {
    if (tourCurrentStep > 0) {
        runTourStep(tourCurrentStep - 1);
    }
}

function toggleTourPlay() {
    isTourPlaying = !isTourPlaying;
    const playIcon = document.getElementById("tour-play-icon");
    if (playIcon) {
        playIcon.setAttribute("data-lucide", isTourPlaying ? "pause" : "play");
    }
    lucide.createIcons();
    
    if (isTourPlaying) {
        const duration = (tourCurrentStep === 8 || tourCurrentStep === 9) ? 10000 : 7500;
        tourTimer = setTimeout(() => {
            nextTourStep();
        }, duration);
    } else {
        if (tourTimer) clearTimeout(tourTimer);
    }
}

function endAutoSimulationTour(restoreData = true) {
    if (tourTimer) clearTimeout(tourTimer);
    removeTourTooltips();
    hideSimulatedCursor();
    const card = document.getElementById("tour-guide-card");
    if (card) card.classList.add("hidden");
    isTourPlaying = false;
    
    if (restoreData) {
        resetDemoData();
    }
}

// ==========================================
// --- MÓDULO DE VENTAS (ERP STYLE) ---
// ==========================================

let salesProductsCatalog = [];
let activeEditingProductId = null;

async function initProductsCatalog() {
    const token = localStorage.getItem('sonicbi_token');
    if (!token) return;
    try {
        const response = await fetch('/api/bpm/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            salesProductsCatalog = await response.json();
        }
    } catch(e) {
        console.error("Error al inicializar catálogo de productos:", e);
    }
}
initProductsCatalog();

function renderProductsView() {
    const tableBody = document.getElementById("products-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    salesProductsCatalog.forEach(prod => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-all text-slate-700 text-xs";
        
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-brand-600">${prod.id}</td>
            <td class="px-6 py-4 font-semibold">${prod.name}</td>
            <td class="px-6 py-4">$${prod.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4">${prod.tax}</td>
            <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
                <button onclick="openProductModal('${prod.id}')" class="text-xs font-bold text-brand-500 hover:text-brand-600 hover:underline transition-all">Editar</button>
                <button onclick="deleteProduct('${prod.id}')" class="text-xs font-bold text-red-500 hover:text-red-600 hover:underline transition-all">Eliminar</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
window.renderProductsView = renderProductsView;

function filterProductsTable() {
    const query = document.getElementById("products-search-input").value.toLowerCase().trim();
    const rows = document.querySelectorAll("#products-table-body tr");
    
    rows.forEach((row, idx) => {
        const prod = salesProductsCatalog[idx];
        if (!prod) return;
        const match = prod.id.toLowerCase().includes(query) || prod.name.toLowerCase().includes(query);
        if (match) {
            row.classList.remove("hidden");
        } else {
            row.classList.add("hidden");
        }
    });
}
window.filterProductsTable = filterProductsTable;

function openProductModal(prodId = null) {
    activeEditingProductId = prodId;
    const modal = document.getElementById("modal-product-editor");
    const title = document.getElementById("product-modal-title");
    const submitBtn = document.getElementById("product-modal-submit-btn");
    
    const idInput = document.getElementById("product-modal-id");
    const nameInput = document.getElementById("product-modal-name");
    const priceInput = document.getElementById("product-modal-price");
    const taxSelect = document.getElementById("product-modal-tax");
    
    if (!modal) return;
    
    if (prodId) {
        const prod = salesProductsCatalog.find(p => p.id === prodId);
        if (prod) {
            title.innerText = "Editar Producto";
            submitBtn.innerText = "Guardar Cambios";
            idInput.value = prod.id;
            idInput.disabled = true;
            nameInput.value = prod.name;
            priceInput.value = prod.price;
            taxSelect.value = prod.tax;
        }
    } else {
        title.innerText = "Registrar Producto";
        submitBtn.innerText = "Registrar Producto";
        idInput.value = `REFPR${String(salesProductsCatalog.length + 1).padStart(3, '0')}`;
        idInput.disabled = false;
        nameInput.value = "";
        priceInput.value = "0.00";
        taxSelect.value = "16%";
    }
    
    modal.classList.remove("hidden");
}
window.openProductModal = openProductModal;

function closeProductModal() {
    const modal = document.getElementById("modal-product-editor");
    if (modal) modal.classList.add("hidden");
}
window.closeProductModal = closeProductModal;

async function saveProduct() {
    const id = document.getElementById("product-modal-id").value.trim().toUpperCase();
    const name = document.getElementById("product-modal-name").value.trim();
    const price = parseFloat(document.getElementById("product-modal-price").value) || 0;
    const tax = document.getElementById("product-modal-tax").value;
    
    if (!id || !name) {
        if (typeof showSalesNotification === 'function') showSalesNotification("Por favor, rellena los campos obligatorios.", "error");
        else alert("Por favor, rellena los campos obligatorios.");
        return;
    }
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, name, price, tax })
        });
        if (response.ok) {
            await initProductsCatalog();
            closeProductModal();
            renderProductsView();
            if (typeof showSalesNotification === 'function') showSalesNotification("Producto guardado correctamente en el catálogo.", "success");
        } else {
            const err = await response.json();
            alert("Error al guardar producto: " + (err.error || "Intente de nuevo"));
        }
    } catch(e) {
        console.error("Error al guardar producto:", e);
        alert("Error de comunicación con el servidor.");
    }
}
window.saveProduct = saveProduct;

async function deleteProduct(prodId) {
    if (!confirm("¿Está seguro de que desea eliminar este producto del catálogo?")) return;
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch(`/api/bpm/products/${prodId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            await initProductsCatalog();
            renderProductsView();
            if (typeof showSalesNotification === 'function') showSalesNotification("Producto eliminado del catálogo.", "warning");
        } else {
            alert("Error al eliminar el producto.");
        }
    } catch(e) {
        console.error("Error al eliminar producto:", e);
        alert("Error de comunicación con el servidor.");
    }
}
window.deleteProduct = deleteProduct;

let salesOrdersData = [];

let currentSalesOrder = null;

async function initSalesView() {
    const token = localStorage.getItem('sonicbi_token');
    if (!token) return;
    try {
        const response = await fetch('/api/bpm/sales-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            salesOrdersData = await response.json();
        }
    } catch (e) {
        console.warn("Error leyendo cotizaciones de la base de datos", e);
    }
    
    // Rellenar selectores de cliente en el modal de ventas
    syncSalesClientsCatalog();
}

function syncSalesClientsCatalog() {
    let clients = clientsList.map(c => c.name);
    if (clients.length === 0) {
        clients = [
            "Erik N. French",
            "FEMSA",
            "Azure Interior, Abigail Peterson",
            "klajsdlkajd, ahsdjk",
            "Inmobiliaria Norte",
            "Corporativo Calzapato",
            "Residencial Jardines",
            "Logística Express",
            "Corporativo Tiendas Norte"
        ];
    }
    
    // Rellenar datalist para el cotizador
    const salesDatalist = document.getElementById("sales-clients-datalist");
    if (salesDatalist) {
        salesDatalist.innerHTML = clients.map(c => `<option value="${c}"></option>`).join("");
    }
    
    // Rellenar datalist para el creador de plantillas de proceso
    const processDatalist = document.getElementById("process-clients-datalist");
    if (processDatalist) {
        processDatalist.innerHTML = clients.map(c => `<option value="${c}"></option>`).join("");
    }
    
    renderSalesTable();
}

function renderSalesTable() {
    const tableBody = document.getElementById("sales-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    salesOrdersData.forEach(order => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-all cursor-pointer";
        tr.onclick = (e) => {
            if (e.target.closest("button") || e.target.closest("a")) return;
            openSalesOrderDetail(order.id);
        };
        
        let dateStr = order.date;
        try {
            const d = new Date(order.date);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const seconds = String(d.getSeconds()).padStart(2, '0');
                dateStr = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            }
        } catch(err) {}
        
        let badgeClass = "bg-slate-100 text-slate-700";
        if (order.state === "Cotización") {
            badgeClass = "bg-sky-50 border border-sky-200 text-sky-700 font-semibold";
        } else if (order.state === "Pedido de venta") {
            badgeClass = "bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold";
        } else if (order.state === "Cancelado") {
            badgeClass = "bg-rose-50 border border-rose-200 text-rose-700 font-semibold";
        }
        
        const orderCurrency = order.currency || "USD";
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-brand-600">${order.id}</td>
            <td class="px-6 py-4 text-xs text-slate-500 font-medium">${dateStr}</td>
            <td class="px-6 py-4 font-semibold text-slate-700">${order.client}</td>
            <td class="px-6 py-4 text-xs text-slate-500 font-semibold">
                <span class="flex items-center gap-1.5">
                    <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">M</span>
                    <span>${order.salesperson}</span>
                </span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-500 font-medium">${order.contact || "N/A"}</td>
            <td class="px-6 py-4 text-right font-bold text-slate-800">$${order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${orderCurrency}</td>
            <td class="px-6 py-4 text-center">
                <span class="text-[10px] px-2 py-0.5 rounded-full ${badgeClass}">${order.state}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="openSalesOrderDetail('${order.id}')" class="text-xs font-bold text-brand-500 hover:text-brand-600 hover:underline transition-all">Ver Detalle</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function filterSalesTable() {
    const query = document.getElementById("sales-search-input").value.toLowerCase();
    const filter = document.getElementById("sales-status-filter").value;
    
    const rows = document.querySelectorAll("#sales-table-body tr");
    rows.forEach((row, idx) => {
        const order = salesOrdersData[idx];
        if (!order) return;
        
        const numMatch = order.id.toLowerCase().includes(query);
        const clientMatch = order.client.toLowerCase().includes(query);
        const searchMatch = numMatch || clientMatch;
        
        let filterMatch = true;
        if (filter !== "all") {
            filterMatch = (order.state === filter);
        }
        
        if (searchMatch && filterMatch) {
            row.classList.remove("hidden");
        } else {
            row.classList.add("hidden");
        }
    });
}

function openCreateQuotationView() {
    const num = salesOrdersData.length + 164;
    const id = `S00${num}`;
    
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
    
    currentSalesOrder = {
        id: id,
        date: now.toISOString(),
        client: "",
        contact: "",
        currency: "USD",
        salesperson: "Mitchell Admin",
        company: "SONICBI México",
        total: 0,
        state: "Cotización",
        invoiceAddress: "",
        deliveryAddress: "",
        paymentTerms: "30 días",
        clientRef: "",
        deliveryCount: 1,
        lines: []
    };
    
    document.getElementById("sales-doc-number").innerText = id + "-2026";
    document.getElementById("sales-doc-creator").innerText = "Mitchell Admin";
    document.getElementById("sales-order-date").value = localISOTime;
    document.getElementById("sales-payment-terms").value = "30 días";
    document.getElementById("sales-client-ref").value = "";
    const deliveryEl1 = document.getElementById("sales-delivery-count");
    if (deliveryEl1) deliveryEl1.innerText = "1";
    
    const contactInput = document.getElementById("sales-client-contact");
    if (contactInput) contactInput.value = "";
    
    const currencyToggle = document.getElementById("sales-currency-toggle");
    if (currencyToggle) currencyToggle.checked = true; // default to MXN (morado)
    
    const select = document.getElementById("sales-client-select");
    if (select) {
        select.value = "";
        autoFillSalesAddresses();
    }
    
    document.getElementById("sales-lines-body").innerHTML = "";
    calculateSalesTotals();
    
    updateSalesPipelineVisuals("Cotización");
    
    document.getElementById("sales-confirm-btn").classList.remove("hidden");
    document.getElementById("sales-cancel-btn").classList.remove("hidden");
    
    if (typeof toggleSalesFormLock === 'function') toggleSalesFormLock(false);
    
    switchTab("sales-detail");
    appendSalesOrderLineRow("", 1, 0, "16%");
}

function openSalesOrderDetail(orderId) {
    const order = salesOrdersData.find(o => o.id === orderId);
    if (!order) return;
    
    currentSalesOrder = JSON.parse(JSON.stringify(order));
    
    document.getElementById("sales-doc-number").innerText = currentSalesOrder.id + "-2026";
    document.getElementById("sales-doc-creator").innerText = currentSalesOrder.salesperson;
    
    let dateStr = "";
    try {
        const d = new Date(currentSalesOrder.date);
        const offset = d.getTimezoneOffset() * 60000;
        dateStr = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
    } catch(e) {
        dateStr = currentSalesOrder.date.slice(0, 16);
    }
    
    document.getElementById("sales-order-date").value = dateStr;
    document.getElementById("sales-payment-terms").value = currentSalesOrder.paymentTerms;
    document.getElementById("sales-client-ref").value = currentSalesOrder.clientRef || "";
    const deliveryEl2 = document.getElementById("sales-delivery-count");
    if (deliveryEl2) deliveryEl2.innerText = currentSalesOrder.deliveryCount || "1";
    
    const select = document.getElementById("sales-client-select");
    if (select) {
        select.value = currentSalesOrder.client;
    }
    
    const contactInput = document.getElementById("sales-client-contact");
    if (contactInput) {
        contactInput.value = currentSalesOrder.contact || "";
    }
    
    const currencyToggle = document.getElementById("sales-currency-toggle");
    if (currencyToggle) {
        currencyToggle.checked = (currentSalesOrder.currency === "MXN");
    }
    
    document.getElementById("sales-invoice-address").value = currentSalesOrder.invoiceAddress || "";
    document.getElementById("sales-delivery-address").value = currentSalesOrder.deliveryAddress || "";
    
    const linesBody = document.getElementById("sales-lines-body");
    if (linesBody) {
        linesBody.innerHTML = "";
        currentSalesOrder.lines.forEach(line => {
            appendSalesOrderLineRow(line.product, line.quantity, line.price, line.tax, !!line.opcional);
        });
    }
    
    calculateSalesTotals();
    updateSalesPipelineVisuals(currentSalesOrder.state);
    
    const isLocked = (currentSalesOrder.state !== "Presupuesto" && currentSalesOrder.state !== "Cotización");
    if (typeof toggleSalesFormLock === 'function') toggleSalesFormLock(isLocked);
    
    switchTab("sales-detail");
}

function autoFillSalesAddresses() {
    const clientName = document.getElementById("sales-client-select").value;
    const invoiceInput = document.getElementById("sales-invoice-address");
    const deliveryInput = document.getElementById("sales-delivery-address");
    const termsSelect = document.getElementById("sales-payment-terms");
    const contactInput = document.getElementById("sales-client-contact");
    
    // Buscar en la lista dinámica de clientes
    const clientObj = clientsList.find(c => c.name === clientName);
    
    if (clientObj) {
        const address = clientObj.address || "Dirección conocida del cliente registrado";
        if (invoiceInput) invoiceInput.value = address;
        if (deliveryInput) deliveryInput.value = address;
        if (termsSelect && clientObj.payment_terms) {
            termsSelect.value = clientObj.payment_terms;
        }
        if (contactInput && clientObj.contact_name) {
            contactInput.value = clientObj.contact_name;
        }
    } else {
        const addresses = {
            "Erik N. French": "123 Main St, San Francisco, CA",
            "FEMSA": "Av. Alfonso Reyes 2202, Monterrey, NL",
            "Azure Interior, Abigail Peterson": "Market St 455, San Francisco, CA",
            "klajsdlkajd, ahsdjk": "Calle de la Piruleta 12, Madrid, España",
            "Inmobiliaria Norte": "Paseo de la Reforma 450, Ciudad de México, DF",
            "Corporativo Calzapato": "Av. Corrientes 1200, Buenos Aires, Argentina",
            "Residencial Jardines": "Circuito de las Lomas 99, Zapopan, Jalisco",
            "Logística Express": "Blvd. Diaz Ordaz 540, Monterrey, NL",
            "Corporativo Tiendas Norte": "Av. Vasconcelos 1000, San Pedro Garza García, NL"
        };
        
        const address = addresses[clientName] || "Dirección conocida del cliente registrado";
        if (invoiceInput) invoiceInput.value = address;
        if (deliveryInput) deliveryInput.value = address;
    }
}

function appendSalesOrderLineRow(productName = "", qty = 1, price = 0, tax = "16%", isOptional = false) {
    const linesBody = document.getElementById("sales-lines-body");
    if (!linesBody) return;
    
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition-all";
    
    const optionsHtml = salesProductsCatalog.map(p => {
        const selected = (p.name === productName) ? "selected" : "";
        return `<option value="${p.id}" ${selected}>${p.name}</option>`;
    }).join("");
    
    const isCustom = !salesProductsCatalog.some(p => p.name === productName) && productName !== "";
    const customHtml = isCustom ? `<option value="custom" selected>${productName}</option>` : "";
    
    const taxOptions = [
        { val: "16%", label: "IVA 16%" },
        { val: "21%", label: "IVA 21%" },
        { val: "0%", label: "Exento" }
    ].map(t => {
        const selected = (t.val === tax) ? "selected" : "";
        return `<option value="${t.val}" ${selected}>${t.label}</option>`;
    }).join("");
    
    tr.innerHTML = `
        <td class="px-4 py-3">
            <select class="sales-line-product w-full p-2 border border-slate-200 rounded text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" onchange="onSalesLineProductChange(this)">
                <option value="">-- Seleccionar Producto --</option>
                ${optionsHtml}
                ${customHtml}
            </select>
        </td>
        <td class="px-4 py-3 text-center">
            <input type="number" class="sales-line-quantity w-20 p-2 border border-slate-200 rounded text-center text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" value="${qty}" min="1" onchange="calculateSalesTotals()">
        </td>
        <td class="px-4 py-3 text-right">
            <input type="number" class="sales-line-price w-28 p-2 border border-slate-200 rounded text-right text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" value="${price}" step="0.01" onchange="calculateSalesTotals()">
        </td>
        <td class="px-4 py-3 text-center">
            <select class="sales-line-tax w-24 p-2 border border-slate-200 rounded text-center text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500" onchange="calculateSalesTotals()">
                ${taxOptions}
            </select>
        </td>
        <td class="px-4 py-3 text-center">
            <input type="checkbox" class="sales-line-optional w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer" ${isOptional ? 'checked' : ''} title="Marcar como opcional para el cliente">
        </td>
        <td class="px-4 py-3 text-right">
            <span class="sales-line-subtotal font-bold text-slate-700 text-xs block pr-2">$0.00 USD</span>
        </td>
        <td class="px-4 py-3 text-center">
            <button type="button" class="text-slate-400 hover:text-red-500 transition-all mx-auto flex items-center justify-center p-1" onclick="deleteSalesOrderLineRow(this)" title="Quitar línea">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </td>
    `;
    
    linesBody.appendChild(tr);
    lucide.createIcons();
    calculateSalesTotals();
}

function addSalesOrderLine() {
    appendSalesOrderLineRow("", 1, 0, "16%");
}

function onSalesLineProductChange(selectEl) {
    const row = selectEl.closest("tr");
    if (!row) return;
    
    const prodId = selectEl.value;
    const priceInput = row.querySelector(".sales-line-price");
    const taxSelect = row.querySelector(".sales-line-tax");
    
    if (prodId === "") {
        if (priceInput) priceInput.value = "0.00";
        calculateSalesTotals();
        return;
    }
    
    const catalogItem = salesProductsCatalog.find(p => p.id === prodId);
    if (catalogItem) {
        let basePrice = catalogItem.price;
        
        // Buscar datos de cliente para aplicar descuentos comerciales y lista de precios
        const clientName = document.getElementById("sales-client-select").value;
        const clientObj = clientsList.find(c => c.name === clientName);
        
        if (clientObj) {
            // Tarifa VIP (10% descuento), Distribuidor (15% descuento)
            if (clientObj.price_list === 'VIP') {
                basePrice = basePrice * 0.90;
            } else if (clientObj.price_list === 'Distribuidor') {
                basePrice = basePrice * 0.85;
            }
            
            // Descuento adicional por defecto
            if (clientObj.discount_percent > 0) {
                basePrice = basePrice * (1 - clientObj.discount_percent / 100);
            }
        }
        
        if (priceInput) priceInput.value = basePrice.toFixed(2);
        if (taxSelect) {
            if (clientObj) {
                taxSelect.value = clientObj.iva_rate + "%";
            } else {
                taxSelect.value = catalogItem.tax;
            }
        }
    }
    
    calculateSalesTotals();
}

function deleteSalesOrderLineRow(btn) {
    const row = btn.closest("tr");
    if (row) {
        row.remove();
        calculateSalesTotals();
    }
}

function calculateSalesTotals() {
    const rows = document.querySelectorAll("#sales-lines-body tr");
    let grandSubtotal = 0;
    let grandTax = 0;
    
    // Check currency toggle
    const currencyToggle = document.getElementById("sales-currency-toggle");
    const isMXN = currencyToggle ? currencyToggle.checked : true;
    const currencyStr = isMXN ? "MXN" : "USD";
    
    // Update label next to switch
    const currencyLabel = document.getElementById("sales-currency-label");
    if (currencyLabel) {
        currencyLabel.innerText = isMXN ? "Pesos (MXN)" : "Dólares (USD)";
    }
    
    rows.forEach(row => {
        const qtyInput = row.querySelector(".sales-line-quantity");
        const priceInput = row.querySelector(".sales-line-price");
        const taxSelect = row.querySelector(".sales-line-tax");
        const subtotalSpan = row.querySelector(".sales-line-subtotal");
        
        const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;
        const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
        const taxRateStr = taxSelect ? taxSelect.value : "16%";
        const taxRate = parseFloat(taxRateStr.replace("%", "")) / 100;
        
        const subtotal = qty * price;
        const tax = subtotal * taxRate;
        
        grandSubtotal += subtotal;
        grandTax += tax;
        
        if (subtotalSpan) {
            subtotalSpan.innerText = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyStr}`;
        }
    });
    
    const grandTotal = grandSubtotal + grandTax;
    
    document.getElementById("sales-subtotal-display").innerText = `$${grandSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyStr}`;
    document.getElementById("sales-tax-display").innerText = `$${grandTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyStr}`;
    document.getElementById("sales-total-display").innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyStr}`;
    
    if (currentSalesOrder) {
        currentSalesOrder.total = grandTotal;
        currentSalesOrder.currency = currencyStr;
    }
}

function updateSalesPipelineVisuals(state) {
    const stepDraft = document.getElementById("pipeline-step-draft");
    const stepSent = document.getElementById("pipeline-step-sent");
    const stepSale = document.getElementById("pipeline-step-sale");
    const confirmBtn = document.getElementById("sales-confirm-btn");
    const cancelBtn = document.getElementById("sales-cancel-btn");
    
    const baseClasses = "px-3.5 py-1.5 whitespace-nowrap text-xs font-semibold text-slate-500 transition-colors";
    
    [stepDraft, stepSent, stepSale].forEach(step => {
        if (step) {
            step.className = `${baseClasses} border-r border-slate-200`;
        }
    });
    if (stepSale) stepSale.className = baseClasses;
    
    if (state === "Cotización" || state === "Presupuesto") {
        if (stepDraft) stepDraft.className = "px-3.5 py-1.5 whitespace-nowrap text-xs bg-sky-500 text-white font-bold border-r border-sky-600 shadow-inner";
        if (confirmBtn) confirmBtn.classList.remove("hidden");
        if (cancelBtn) cancelBtn.classList.remove("hidden");
    } else if (state === "Enviado") {
        if (stepSent) stepSent.className = "px-3.5 py-1.5 whitespace-nowrap text-xs bg-brand-500 text-white font-bold border-r border-brand-600 shadow-inner";
        if (confirmBtn) confirmBtn.classList.remove("hidden");
        if (cancelBtn) cancelBtn.classList.remove("hidden");
    } else if (state === "Pedido de venta") {
        if (stepSale) stepSale.className = "px-3.5 py-1.5 whitespace-nowrap text-xs bg-emerald-500 text-white font-bold shadow-inner";
        if (confirmBtn) confirmBtn.classList.add("hidden");
        if (cancelBtn) cancelBtn.classList.remove("hidden");
    } else if (state === "Cancelado") {
        if (stepDraft) stepDraft.className = "px-3.5 py-1.5 whitespace-nowrap text-xs bg-rose-500 text-white font-bold border-r border-rose-600 shadow-inner";
        if (confirmBtn) confirmBtn.classList.add("hidden");
        if (cancelBtn) cancelBtn.classList.add("hidden");
    }
}

function toggleSalesFormLock(shouldLock) {
    const inputs = [
        "sales-client-select",
        "sales-client-contact",
        "sales-invoice-address",
        "sales-delivery-address",
        "sales-order-date",
        "sales-payment-terms",
        "sales-client-ref",
        "sales-currency-toggle"
    ];
    
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = shouldLock;
    });
    
    const lineInputs = document.querySelectorAll("#sales-lines-body select, #sales-lines-body input, #sales-lines-body button");
    lineInputs.forEach(el => {
        el.disabled = shouldLock;
    });
    
    const addLineBtn = document.querySelector("button[onclick='appendSalesOrderLineRow()']");
    if (addLineBtn) addLineBtn.disabled = shouldLock;
    
    const saveBtn = document.getElementById("sales-save-btn");
    const confirmBtn = document.getElementById("sales-confirm-btn");
    
    if (shouldLock) {
        if (saveBtn) saveBtn.classList.add("opacity-50", "pointer-events-none");
        if (confirmBtn) confirmBtn.classList.add("opacity-50", "pointer-events-none");
    } else {
        if (saveBtn) saveBtn.classList.remove("opacity-50", "pointer-events-none");
        if (confirmBtn) confirmBtn.classList.remove("opacity-50", "pointer-events-none");
    }
}
window.toggleSalesFormLock = toggleSalesFormLock;

async function persistSalesOrderState(newState) {
    if (!currentSalesOrder) return;
    currentSalesOrder.state = newState;
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/sales-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(currentSalesOrder)
        });
        if (response.ok) {
            const getRes = await fetch('/api/bpm/sales-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getRes.ok) {
                salesOrdersData = await getRes.json();
            }
            renderSalesTable();
            toggleSalesFormLock(newState !== "Presupuesto" && newState !== "Cotización");
        } else {
            alert("Error al actualizar el estado en el servidor.");
        }
    } catch(e) {
        console.error("Error al persistir estado:", e);
        alert("Error de comunicación con el servidor.");
    }
}

async function confirmSalesOrder() {
    if (!currentSalesOrder) return;
    updateSalesPipelineVisuals("Pedido de venta");
    calculateSalesTotals();
    await persistSalesOrderState("Pedido de venta");
    showSalesNotification(`¡Cotización ${currentSalesOrder.id} confirmada como Pedido de Venta!`, "success");
}
window.confirmSalesOrder = confirmSalesOrder;

async function cancelSalesOrder() {
    if (!currentSalesOrder) return;
    updateSalesPipelineVisuals("Presupuesto");
    calculateSalesTotals();
    await persistSalesOrderState("Presupuesto");
    showSalesNotification(`La cotización ${currentSalesOrder.id} ha sido devuelta al estado Presupuesto.`, "warning");
}
window.cancelSalesOrder = cancelSalesOrder;

async function saveSalesOrder() {
    if (!currentSalesOrder) return;
    
    const clientName = document.getElementById("sales-client-select").value.trim();
    if (!clientName) {
        showSalesNotification("Debes especificar un cliente.", "error");
        return;
    }
    
    currentSalesOrder.client = clientName;
    currentSalesOrder.contact = document.getElementById("sales-client-contact").value.trim();
    const currencyToggle = document.getElementById("sales-currency-toggle");
    currentSalesOrder.currency = (currencyToggle && currencyToggle.checked) ? "MXN" : "USD";
    currentSalesOrder.invoiceAddress = document.getElementById("sales-invoice-address").value;
    currentSalesOrder.deliveryAddress = document.getElementById("sales-delivery-address").value;
    currentSalesOrder.date = new Date(document.getElementById("sales-order-date").value).toISOString();
    currentSalesOrder.paymentTerms = document.getElementById("sales-payment-terms").value;
    currentSalesOrder.clientRef = document.getElementById("sales-client-ref").value;
    
    const rows = document.querySelectorAll("#sales-lines-body tr");
    const lines = [];
    rows.forEach(row => {
        const prodSelect = row.querySelector(".sales-line-product");
        const qtyInput = row.querySelector(".sales-line-quantity");
        const priceInput = row.querySelector(".sales-line-price");
        const taxSelect = row.querySelector(".sales-line-tax");
        
        let productName = "";
        if (prodSelect) {
            if (prodSelect.value === "custom") {
                productName = prodSelect.options[prodSelect.selectedIndex].text;
            } else if (prodSelect.value !== "") {
                const item = salesProductsCatalog.find(p => p.id === prodSelect.value);
                productName = item ? item.name : "Producto Personalizado";
            }
        }
        
        const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;
        const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
        const tax = taxSelect ? taxSelect.value : "16%";
        const isOptional = row.querySelector(".sales-line-optional")?.checked ? 1 : 0;
        
        if (productName !== "") {
            lines.push({ product: productName, quantity: qty, price: price, tax: tax, opcional: isOptional });
        }
    });
    
    if (lines.length === 0) {
        showSalesNotification("Debes añadir al menos un producto válido antes de guardar.", "error");
        return;
    }
    
    currentSalesOrder.lines = lines;
    
    // Registrar automáticamente el cliente si no existe en el catálogo
    const clientExists = clientsList.some(c => c.name.toLowerCase().trim() === clientName.toLowerCase().trim());
    if (!clientExists) {
        const newClientData = {
            name: clientName,
            rfc: "",
            address: currentSalesOrder.invoiceAddress || "",
            phone: "",
            email: "",
            contact_name: "",
            portal_enabled: false,
            portal_email: "",
            portal_password: "",
            payment_terms: currentSalesOrder.paymentTerms || "Contado",
            discount_percent: 0,
            price_list: "General",
            currency: "MXN",
            iva_rate: 16
        };
        
        const token = localStorage.getItem('sonicbi_token');
        try {
            const res = await fetch('/api/bpm/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newClientData)
            });
            if (res.ok) {
                console.log("Cliente nuevo registrado automáticamente en el catálogo:", clientName);
                await cargarDatosDesdeBackend();
                renderClientsView();
            }
        } catch (e) {
            console.error("Error al registrar cliente automáticamente:", e);
        }
    }
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/sales-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(currentSalesOrder)
        });
        if (response.ok) {
            const getRes = await fetch('/api/bpm/sales-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getRes.ok) {
                salesOrdersData = await getRes.json();
            }
            renderSalesTable();
            switchTab("sales");
            showSalesNotification(`Cotización ${currentSalesOrder.id} guardada con éxito.`, "success");
        } else {
            alert("Error al guardar la cotización en el servidor.");
        }
    } catch (e) {
        console.error("Error al guardar cotización:", e);
        alert("Error de comunicación con el servidor.");
    }
}

function cancelSalesDetailView() {
    switchTab("sales");
}

// --- FUNCIONES DE COTIZACIÓN COMPARTIDA Y NEGOCIACIÓN ---
function copySharedQuoteLink() {
    if (!currentSalesOrder) return;
    const hash = currentSalesOrder.public_hash || currentSalesOrder.publicHash;
    if (!hash) {
        showSalesNotification("Guarda la cotización primero para generar su enlace seguro.", "error");
        return;
    }
    const fullUrl = `${window.location.origin}/shared.html?hash=${hash}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showSalesNotification("¡Enlace copiado al portapapeles! Listo para enviar por WhatsApp o correo.", "success");
    }).catch(() => {
        prompt("Copia este enlace para tu cliente:", fullUrl);
    });
}
window.copySharedQuoteLink = copySharedQuoteLink;

function openSharedQuoteTab() {
    if (!currentSalesOrder) return;
    const hash = currentSalesOrder.public_hash || currentSalesOrder.publicHash;
    if (!hash) {
        showSalesNotification("Guarda la cotización primero para ver la vista del cliente.", "error");
        return;
    }
    window.open(`/shared.html?hash=${hash}`, '_blank');
}
window.openSharedQuoteTab = openSharedQuoteTab;

async function openQuoteNegotiationModal() {
    if (!currentSalesOrder) return;
    document.getElementById("negotiation-modal-folio").innerText = currentSalesOrder.id;
    const dot = document.getElementById("vendor-chat-dot");
    if (dot) dot.classList.add("hidden");
    
    const modal = document.getElementById("modal-quote-negotiation");
    if (modal) modal.classList.remove("hidden");
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    await loadVendorChatComments();
    await loadVendorInteractions();
}
window.openQuoteNegotiationModal = openQuoteNegotiationModal;

function closeQuoteNegotiationModal() {
    const modal = document.getElementById("modal-quote-negotiation");
    if (modal) modal.classList.add("hidden");
}
window.closeQuoteNegotiationModal = closeQuoteNegotiationModal;

async function loadVendorChatComments() {
    if (!currentSalesOrder) return;
    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch(`/api/bpm/quote/${currentSalesOrder.id}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const comments = await res.json();
            const container = document.getElementById("vendor-chat-messages-container");
            container.innerHTML = "";
            comments.forEach(c => renderVendorChatMessage(c));
            container.scrollTop = container.scrollHeight;
        }
    } catch(e) {
        console.error("Error al cargar comentarios del vendedor:", e);
    }
}

function renderVendorChatMessage(comment) {
    const container = document.getElementById("vendor-chat-messages-container");
    const isVendor = (comment.remitente === "Vendedor");
    const isSystem = (comment.remitente === "Sistema");
    const timeStr = new Date(comment.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement("div");
    if (isSystem) {
        msgDiv.className = "text-center my-2";
        msgDiv.innerHTML = `
            <div class="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                ${comment.mensaje} <span class="text-[9px] text-amber-600 ml-1 font-normal">${timeStr}</span>
            </div>
        `;
    } else if (isVendor) {
        msgDiv.className = "flex flex-col items-end";
        msgDiv.innerHTML = `
            <div class="max-w-[85%] bg-brand-500 text-white rounded-2xl rounded-tr-xs p-3 shadow-xs">
                <p class="leading-relaxed font-normal">${comment.mensaje}</p>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 font-medium">Tú (Vendedor) • ${timeStr}</span>
        `;
    } else {
        msgDiv.className = "flex flex-col items-start";
        msgDiv.innerHTML = `
            <div class="max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs p-3 shadow-xs">
                <p class="leading-relaxed font-medium">${comment.mensaje}</p>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 font-bold text-brand-600">Cliente • ${timeStr}</span>
        `;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

async function sendVendorChatMessage(e) {
    e.preventDefault();
    if (!currentSalesOrder) return;
    const input = document.getElementById("vendor-chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";
    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch(`/api/bpm/quote/${currentSalesOrder.id}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mensaje: msg })
        });

        if (res.ok) {
            const data = await res.json();
            renderVendorChatMessage({
                remitente: 'Vendedor',
                mensaje: msg,
                fecha: data.fecha || new Date().toISOString()
            });
        }
    } catch(err) {
        console.error("Error al enviar mensaje:", err);
    }
}
window.sendVendorChatMessage = sendVendorChatMessage;

function setFastDiscount(val) {
    const input = document.getElementById("vendor-discount-input");
    if (input) input.value = val;
}
window.setFastDiscount = setFastDiscount;

async function applyVendorNegotiatedDiscount() {
    if (!currentSalesOrder) return;
    const discInput = document.getElementById("vendor-discount-input");
    const disc = parseFloat(discInput ? discInput.value : 0) || 0;
    if (disc < 0 || disc > 100) {
        alert("Por favor ingresa un porcentaje válido entre 0% y 100%.");
        return;
    }

    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch(`/api/bpm/quote/${currentSalesOrder.id}/apply-discount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ discountPercent: disc })
        });

        const data = await res.json();
        if (res.ok) {
            currentSalesOrder.descuento_negociado = disc;
            currentSalesOrder.total = data.newTotal;
            calculateSalesTotals();
            await loadVendorChatComments();
            showSalesNotification(`¡Descuento comercial del ${disc}% aplicado y sincronizado en vivo!`, "success");
        } else {
            alert("Error al aplicar descuento: " + (data.error || "Intente nuevamente"));
        }
    } catch(e) {
        console.error("Error al aplicar descuento:", e);
    }
}
window.applyVendorNegotiatedDiscount = applyVendorNegotiatedDiscount;

async function loadVendorInteractions() {
    if (!currentSalesOrder) return;
    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch(`/api/bpm/quote/${currentSalesOrder.id}/interactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const container = document.getElementById("vendor-interactions-container");
            container.innerHTML = "";

            if (list.length === 0) {
                container.innerHTML = `<p class="text-[11px] text-slate-400 italic text-center py-4">No hay interacciones registradas aún.</p>`;
                return;
            }

            list.forEach(item => {
                const dateFormatted = new Date(item.fecha).toLocaleString('es-MX', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const div = document.createElement("div");
                div.className = "flex items-start gap-2 text-[11px] p-2 bg-slate-50 border border-slate-100 rounded-lg";
                div.innerHTML = `
                    <div class="w-2 h-2 rounded-full bg-brand-500 mt-1 shrink-0"></div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-700">${item.evento}</span>
                            <span class="text-[10px] text-slate-400">${dateFormatted}</span>
                        </div>
                        <p class="text-slate-500 mt-0.5">${item.detalles || ''}</p>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    } catch(e) {
        console.error("Error al cargar interacciones:", e);
    }
}

async function askAiForChatReply() {
    if (!currentSalesOrder) return;
    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch(`/api/bpm/quote/${currentSalesOrder.id}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        let lastMsg = "Consulta de cotización";
        if (res.ok) {
            const comments = await res.json();
            const clientMsgs = comments.filter(c => c.remitente === "Cliente");
            if (clientMsgs.length > 0) {
                lastMsg = clientMsgs[clientMsgs.length - 1].mensaje;
            }
        }

        const aiRes = await fetch('/api/bpm/ai/suggest-chat-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                lastClientMessage: lastMsg,
                quoteFolio: currentSalesOrder.id,
                clientName: currentSalesOrder.client
            })
        });

        if (aiRes.ok) {
            const data = await aiRes.json();
            const input = document.getElementById("vendor-chat-input");
            if (input && data.suggestedReply) {
                input.value = data.suggestedReply;
                input.focus();
                showSalesNotification("Respuesta generada por IA. Puedes revisarla y presionar Enviar.", "success");
            }
        }
    } catch(e) {
        console.error("Error al generar respuesta IA:", e);
    }
}
window.askAiForChatReply = askAiForChatReply;

// --- MODAL ASISTENTE SONIC AI ---
function openSonicAiAdvisor() {
    if (!currentSalesOrder) return;
    const modal = document.getElementById("modal-sonic-ai-advisor");
    if (modal) modal.classList.remove("hidden");
    if (typeof lucide !== 'undefined') lucide.createIcons();
    runAiPriceAdvisor();
}
window.openSonicAiAdvisor = openSonicAiAdvisor;

function closeSonicAiAdvisor() {
    const modal = document.getElementById("modal-sonic-ai-advisor");
    if (modal) modal.classList.add("hidden");
}
window.closeSonicAiAdvisor = closeSonicAiAdvisor;

async function runAiPriceAdvisor() {
    if (!currentSalesOrder) return;
    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch('/api/bpm/ai/suggest-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                client: currentSalesOrder.client,
                product: currentSalesOrder.lines?.[0]?.product || "",
                basePrice: currentSalesOrder.total || 100
            })
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById("ai-client-tier").innerText = data.tier || "General";
            document.getElementById("ai-suggested-discount").innerText = `${data.suggestedDiscountPercent}%`;
            document.getElementById("ai-win-prob").innerText = `${data.winProbability}%`;
            document.getElementById("ai-win-prob-bar").style.width = `${data.winProbability}%`;
            document.getElementById("ai-pricing-reason").innerText = data.reasoning || "";
        }
    } catch(e) {
        console.error("Error en asesor de precios IA:", e);
    }
}
window.runAiPriceAdvisor = runAiPriceAdvisor;

async function generateAiDescription() {
    const conceptInput = document.getElementById("ai-concept-name");
    const name = conceptInput ? conceptInput.value.trim() : "";
    if (!name) {
        alert("Por favor introduce el nombre del concepto o servicio.");
        return;
    }

    const btn = document.getElementById("btn-ai-gen-desc");
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Generando...`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const token = localStorage.getItem('sonicbi_token');
    try {
        const res = await fetch('/api/bpm/ai/generate-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ conceptName: name })
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById("ai-desc-output-container").classList.remove("hidden");
            document.getElementById("ai-desc-output").value = data.description;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } catch(e) {
        console.error("Error al generar descripción:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
window.generateAiDescription = generateAiDescription;

function copyAiDescriptionToClipboard() {
    const desc = document.getElementById("ai-desc-output").value;
    navigator.clipboard.writeText(desc).then(() => {
        showSalesNotification("Descripción comercial copiada al portapapeles.", "success");
    });
}
window.copyAiDescriptionToClipboard = copyAiDescriptionToClipboard;

function openSendEmailModal() {
    if (!currentSalesOrder) return;
    
    const clientObj = clientsList.find(c => c.name.toLowerCase().trim() === currentSalesOrder.client.toLowerCase().trim());
    const toEmail = clientObj ? (clientObj.email || "") : "";
    
    document.getElementById("email-send-to").value = toEmail;
    document.getElementById("email-send-subject").value = `Cotización ${currentSalesOrder.id} - SONIC BI`;
    
    let linesText = "";
    (currentSalesOrder.lines || []).forEach(line => {
        linesText += `- ${line.product} (Cant: ${line.quantity}, Precio: $${line.price.toLocaleString('en-US', {minimumFractionDigits:2})} ${currentSalesOrder.currency})\n`;
    });
    
    const bodyText = `Estimado Cliente,

Adjuntamos la cotización correspondiente al folio ${currentSalesOrder.id}.

Detalles de la cotización:
${linesText}
Total Neto: $${currentSalesOrder.total.toLocaleString('en-US', {minimumFractionDigits:2})} ${currentSalesOrder.currency}

Quedamos a su entera disposición para cualquier aclaración.

Atentamente,
El Equipo de Ventas
SONIC BI`;
    
    document.getElementById("email-send-body").value = bodyText;
    
    const modal = document.getElementById("modal-send-email");
    if (modal) modal.classList.remove("hidden");
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openSendEmailModal = openSendEmailModal;

function closeSendEmailModal() {
    const modal = document.getElementById("modal-send-email");
    if (modal) modal.classList.add("hidden");
}
window.closeSendEmailModal = closeSendEmailModal;

async function sendOrderEmail() {
    if (!currentSalesOrder) return;
    
    const to = document.getElementById("email-send-to").value.trim();
    const subject = document.getElementById("email-send-subject").value.trim();
    const body = document.getElementById("email-send-body").value.trim();
    
    if (!to || !subject || !body) {
        alert("Por favor complete todos los campos obligatorios.");
        return;
    }
    
    const submitBtn = document.getElementById("email-send-submit-btn");
    const originalText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Enviando...`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/send-order-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId: currentSalesOrder.id,
                to,
                subject,
                body
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            currentSalesOrder.state = "Enviado";
            updateSalesPipelineVisuals("Enviado");
            
            const getRes = await fetch('/api/bpm/sales-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getRes.ok) {
                salesOrdersData = await getRes.json();
            }
            
            renderSalesTable();
            closeSendEmailModal();
            showSalesNotification("Correo electrónico enviado con éxito y estado actualizado a Enviado.", "success");
        } else {
            alert("Error al enviar el correo: " + (data.error || "Intente nuevamente."));
        }
    } catch(e) {
        console.error("Error al enviar email de cotización:", e);
        alert("Error de comunicación con el servidor.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
window.sendOrderEmail = sendOrderEmail;

function printSalesOrder() {
    if (!currentSalesOrder) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Por favor habilite las ventanas emergentes en su navegador para imprimir.");
        return;
    }
    
    let itemsRows = "";
    let subtotal = 0;
    
    (currentSalesOrder.lines || []).forEach(line => {
        const lineTotal = line.quantity * line.price;
        subtotal += lineTotal;
        
        itemsRows += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                <td style="padding: 10px 0; font-weight: 500; color: #334155;">${line.product}</td>
                <td style="padding: 10px 0; text-align: center; color: #475569;">${line.quantity}</td>
                <td style="padding: 10px 0; text-align: right; color: #475569;">$${line.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td style="padding: 10px 0; text-align: center; color: #475569;">${line.tax}</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1e293b;">$${lineTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    const currencyStr = currentSalesOrder.currency || "MXN";
    const ivaRate = 0.16; // default IVA
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;
    
    const dateFormatted = new Date(currentSalesOrder.date).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cotización ${currentSalesOrder.id}</title>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
                .logo-section h1 { margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 900; }
                .logo-section p { margin: 5px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; }
                .quote-details { text-align: right; }
                .quote-details h2 { margin: 0; font-size: 20px; font-weight: 800; color: #334155; }
                .quote-details p { margin: 5px 0 0 0; font-size: 12px; color: #64748b; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
                .info-block h3 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; font-weight: 700; }
                .info-block p { margin: 4px 0; font-size: 13px; color: #334155; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th { border-bottom: 2px solid #cbd5e1; padding: 10px 0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                .totals-section { display: flex; justify-content: flex-end; }
                .totals-table { width: 300px; border-collapse: collapse; }
                .totals-table td { padding: 8px 0; font-size: 13px; color: #475569; }
                .totals-table tr.grand-total { border-top: 1.5px solid #cbd5e1; font-weight: 800; font-size: 16px; color: #1e293b; }
                @media print {
                    body { margin: 20px; }
                    .info-block { background: #ffffff !important; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    <h1>SONIC BI</h1>
                    <p>BI & Soluciones Tecnológicas Integrales</p>
                </div>
                <div class="quote-details">
                    <h2>COTIZACIÓN</h2>
                    <p><strong>Folio:</strong> ${currentSalesOrder.id}</p>
                    <p><strong>Fecha:</strong> ${dateFormatted}</p>
                    <p><strong>Moneda:</strong> ${currencyStr}</p>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-block">
                    <h3>Cliente</h3>
                    <p><strong>Nombre/Razón Social:</strong> ${currentSalesOrder.client}</p>
                    <p><strong>Contacto:</strong> ${currentSalesOrder.contact || 'N/A'}</p>
                    <p><strong>Dirección:</strong> ${currentSalesOrder.invoiceAddress || 'N/A'}</p>
                </div>
                <div class="info-block">
                    <h3>Condiciones y Referencias</h3>
                    <p><strong>Condiciones de Pago:</strong> ${currentSalesOrder.paymentTerms || '30 días'}</p>
                    <p><strong>Referencia de Compra:</strong> ${currentSalesOrder.clientRef || 'N/A'}</p>
                    <p><strong>Vendedor Asignado:</strong> ${currentSalesOrder.salesperson || 'Mitchell Admin'}</p>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 45%;">Concepto / Producto</th>
                        <th style="width: 10%; text-align: center;">Cant</th>
                        <th style="width: 15%; text-align: right;">P. Unitario</th>
                        <th style="width: 10%; text-align: center;">IVA</th>
                        <th style="width: 20%; text-align: right;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}</td>
                    </tr>
                    <tr>
                        <td>IVA Trasladado (16%):</td>
                        <td style="text-align: right;">$${tax.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}</td>
                    </tr>
                    <tr class="grand-total">
                        <td style="padding-top: 12px; color: #8b5cf6;">Total Neto:</td>
                        <td style="text-align: right; padding-top: 12px; color: #8b5cf6;">$${currentSalesOrder.total.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}</td>
                    </tr>
                </table>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
window.printSalesOrder = printSalesOrder;

function showSalesNotification(message, type = "success") {
    let container = document.getElementById("sales-notification-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "sales-notification-container";
        container.className = "fixed bottom-5 right-5 flex flex-col gap-2.5 z-[100]";
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    
    let bgClass = "bg-white border-emerald-250 text-emerald-800";
    let icon = "check-circle";
    if (type === "warning") {
        bgClass = "bg-amber-50 border-amber-250 text-amber-800";
        icon = "alert-triangle";
    } else if (type === "error") {
        bgClass = "bg-rose-50 border-rose-250 text-rose-800";
        icon = "x-circle";
    }
    
    toast.className = `p-4 rounded-xl border shadow-xl flex items-center gap-3 transition-all duration-300 transform translate-y-10 opacity-0 min-w-[280px] max-w-sm ${bgClass}`;
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 flex-shrink-0"></i>
        <div class="text-xs font-semibold">${message}</div>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add("opacity-0", "scale-95");
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 4000);
}

// ==========================================
// --- MÓDULO DE COMUNICACIONES (OMNICANAL) ---
// ==========================================

let activeChatTarget = { type: 'channel', name: 'general' };

const commChatHistories = {
    'channel-general': [
        { sender: "Tec. Juan Pérez", time: "10:15 AM", text: "Hola equipo, acabo de terminar la revisión del rack principal en el nodo central. Todo en orden y sin alarmas." },
        { sender: "Lic. Ana Gómez", time: "10:18 AM", text: "Excelente Juan, acabo de actualizar el ticket correspondiente en la consola de Gantt." },
        { sender: "Ing. Josué", time: "10:20 AM", text: "Perfecto. Juan, ¿verificaste la continuidad del cableado secundario?" },
        { sender: "Tec. Juan Pérez", time: "10:22 AM", text: "Sí, Josué. Todo correcto. Los niveles de atenuación están dentro del rango operativo." }
    ],
    'channel-urgencias-campo': [
        { sender: "Ing. Carlos Mendoza", time: "09:30 AM", text: "ATENCIÓN: Se reporta caída de enlace microondas secundario en Tiendas Norte." },
        { sender: "Ing. Sofía Reyes", time: "09:32 AM", text: "Revisando telemetría desde oficina central... Confirmo pérdida de ping en puerto 5." },
        { sender: "Tec. Juan Pérez", time: "09:35 AM", text: "Recibido. Voy saliendo hacia el sitio para validar alimentación física del equipo." }
    ]
};

function initComm() {
    renderCommChannels();
    renderCommDMs();
    openChannelChat('general');
}

function renderCommDMs() {
    const list = document.getElementById("comm-dm-list");
    if (!list) return;
    
    const statusMap = {
        "Lic. Ana Gómez": { status: "Online", color: "bg-emerald-500" },
        "Tec. Juan Pérez": { status: "Online", color: "bg-emerald-500" },
        "Ing. Josué": { status: "Away", color: "bg-amber-500" },
        "Tec. Pedro López": { status: "Busy", color: "bg-rose-500" },
        "Ing. Carlos Mendoza": { status: "Online", color: "bg-emerald-500" },
        "Ing. Sofía Reyes": { status: "Busy", color: "bg-rose-500" },
        "Capturista (Backoffice)": { status: "Online", color: "bg-emerald-500" }
    };
    
    const currentUserName = localStorage.getItem('sonicbi_usuario') ? JSON.parse(localStorage.getItem('sonicbi_usuario')).nombre : 'Mitchell Admin';

    list.innerHTML = employeesList.filter(emp => emp.name !== currentUserName).map(emp => {
        const info = statusMap[emp.name] || { status: "Offline", color: "bg-slate-300" };
        return `
            <li>
                <button onclick="openDirectMessage('${emp.name}')" id="btn-dm-${emp.name.replace(/\s+/g, '-').replace(/\./g, '')}" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all">
                    <span class="flex items-center gap-2 truncate">
                        <span class="w-2.5 h-2.5 rounded-full ${info.color} flex-shrink-0"></span>
                        <span class="truncate">${emp.name}</span>
                    </span>
                    <span class="text-[9px] text-slate-400 font-bold uppercase">${emp.role}</span>
                </button>
            </li>
        `;
    }).join("");
}

function openChannelChat(chanName) {
    activeChatTarget = { type: 'channel', name: chanName };
    
    document.querySelectorAll("button[id^='btn-chan-']").forEach(btn => {
        const name = btn.id.replace("btn-chan-", "");
        if (name === chanName) {
            btn.className = `w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-brand-600 font-bold border border-brand-100 text-xs flex items-center transition-all bg-brand-50`;
        } else {
            btn.className = `w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center transition-all`;
        }
    });
    
    employeesList.forEach(emp => {
        const btn = document.getElementById(`btn-dm-${emp.name.replace(/\s+/g, '-').replace(/\./g, '')}`);
        if (btn) btn.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all";
    });
    
    const titleEl = document.getElementById("comm-active-title");
    if (titleEl) {
        titleEl.innerHTML = `<i data-lucide="hash" class="w-4 h-4 mr-2 text-slate-500"></i> ${chanName}`;
    }
    
    const token = localStorage.getItem('sonicbi_token');
    fetch(`/api/comms/chat/history?chatType=channel&chatTarget=${chanName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(messages => {
        renderChatHistory(messages);
    });
    
    lucide.createIcons();
}

function openDirectMessage(empName) {
    activeChatTarget = { type: 'dm', name: empName };
    
    document.querySelectorAll("button[id^='btn-chan-']").forEach(btn => {
        btn.className = `w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center transition-all`;
    });
    
    employeesList.forEach(emp => {
        const btn = document.getElementById(`btn-dm-${emp.name.replace(/\s+/g, '-').replace(/\./g, '')}`);
        if (btn) {
            if (emp.name === empName) {
                btn.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-brand-650 font-bold flex items-center justify-between transition-all bg-brand-50 border border-brand-100";
            } else {
                btn.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all";
            }
        }
    });
    
    const titleEl = document.getElementById("comm-active-title");
    if (titleEl) {
        titleEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> @${empName}`;
    }
    
    const token = localStorage.getItem('sonicbi_token');
    fetch(`/api/comms/chat/history?chatType=dm&chatTarget=${empName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(messages => {
        renderChatHistory(messages);
    });
    
    lucide.createIcons();
}

function renderChatHistory(messages) {
    const history = document.getElementById("comm-chat-history");
    if (!history) return;
    
    history.innerHTML = "";
    if (!messages || messages.length === 0) {
        history.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full py-12 text-slate-400 text-xs italic space-y-1">
                <p>💬 No hay mensajes en este chat aún.</p>
                <p class="text-[10px] text-slate-400 font-normal">Escribe un mensaje para iniciar la conversación en tiempo real.</p>
            </div>
        `;
        return;
    }

    const currentUserName = localStorage.getItem('sonicbi_usuario') ? JSON.parse(localStorage.getItem('sonicbi_usuario')).nombre : 'Mitchell Admin';

    messages.forEach(msg => {
        const isMe = msg.sender === currentUserName || msg.sender === "Mitchell Admin";
        
        const bubble = document.createElement("div");
        if (isMe) {
            bubble.className = "flex items-start justify-end ml-auto max-w-[80%] gap-3";
            bubble.innerHTML = `
                <div class="flex flex-col items-end">
                    <div class="bg-brand-500 text-white p-3 rounded-2xl rounded-tr-none text-xs font-medium shadow-sm">
                        <p>${msg.text}</p>
                    </div>
                    <span class="text-[9px] text-slate-400 mt-1 font-semibold">${msg.time}</span>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-750 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    M
                </div>
            `;
        } else {
            bubble.className = "flex items-start max-w-[80%] gap-3";
            const initials = msg.sender.split(" ").map(w => w[0]).join("").replace("Tec.", "T").replace("Lic.", "L").replace("Ing.", "I");
            bubble.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-750 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ${initials}
                </div>
                <div class="flex flex-col">
                    <span class="text-[9px] text-slate-500 font-bold mb-1">${msg.sender}</span>
                    <div class="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs text-slate-700 font-medium shadow-sm">
                        <p>${msg.text}</p>
                    </div>
                    <span class="text-[9px] text-slate-400 mt-1 font-semibold">${msg.time}</span>
                </div>
            `;
        }
        history.appendChild(bubble);
    });
    
    history.scrollTop = history.scrollHeight;
}

function sendCommMessage(e) {
    e.preventDefault();
    const input = document.getElementById("comm-input");
    const history = document.getElementById("comm-chat-history");
    if (!input || !input.value.trim() || !history) return;
    
    const text = input.value.trim();
    input.value = "";
    const token = localStorage.getItem('sonicbi_token');

    // Apéndice optimista instantáneo
    const now = new Date();
    const timeStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    if (history.children.length === 1 && history.children[0].innerText.includes("No hay mensajes")) {
        history.innerHTML = "";
    }

    const bubble = document.createElement("div");
    bubble.className = "flex items-start justify-end ml-auto max-w-[80%] gap-3";
    bubble.innerHTML = `
        <div class="flex flex-col items-end">
            <div class="bg-brand-500 text-white p-3 rounded-2xl rounded-tr-none text-xs font-medium shadow-sm">
                <p>${text}</p>
            </div>
            <span class="text-[9px] text-slate-400 mt-1 font-semibold">${timeStr}</span>
        </div>
        <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-750 flex items-center justify-center font-bold text-xs flex-shrink-0">
            M
        </div>
    `;
    history.appendChild(bubble);
    history.scrollTop = history.scrollHeight;

    // Enviar el mensaje al servidor
    fetch('/api/comms/chat/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            text: text,
            chatType: activeChatTarget.type,
            chatTarget: activeChatTarget.name
        })
    })
    .then(res => res.json())
    .then(() => {
        if (activeChatTarget.type === 'channel') {
            openChannelChat(activeChatTarget.name);
        } else {
            openDirectMessage(activeChatTarget.name);
        }
    });
}

// --- HISTORIAL DE ACTIVIDADES (ODDO-STYLE CHATTER) ---

function toggleActionDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("action-dropdown-menu");
    if (el) el.classList.toggle("hidden");
}

function closeActionDropdown() {
    const el = document.getElementById("action-dropdown-menu");
    if (el) el.classList.add("hidden");
}

function openActivityHistoryDrawer() {
    closeActionDropdown();
    const drawer = document.getElementById("activity-history-drawer");
    if (!drawer) return;
    drawer.classList.remove("hidden");
    // Forzar reflow
    drawer.offsetWidth;
    drawer.classList.remove("translate-x-full");
    renderActivityHistory();
}

function closeActivityHistoryDrawer() {
    const drawer = document.getElementById("activity-history-drawer");
    if (!drawer) return;
    drawer.classList.add("translate-x-full");
    setTimeout(() => {
        if (drawer.classList.contains("translate-x-full")) {
            drawer.classList.add("hidden");
        }
    }, 300);
}

function logTemplateActivity(templateId, description, details) {
    const template = templatesData.find(t => t.id === templateId);
    if (!template) return;
    if (!template.activities) template.activities = [];
    
    // Obtener fecha formateada como "18 de julio de 2026"
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('es-ES', options);
    
    template.activities.unshift({
        author: "Mitchell Admin",
        date: dateStr,
        relativeTime: "hace unos segundos",
        description: description,
        details: details || null
    });
    
    // Si el drawer está abierto y pertenece a la misma plantilla, refrescarlo
    const drawer = document.getElementById("activity-history-drawer");
    if (drawer && !drawer.classList.contains("hidden") && selectedTemplateId === templateId) {
        renderActivityHistory();
    }
}

function renderActivityHistory() {
    const timeline = document.getElementById("activity-history-timeline");
    if (!timeline) return;
    
    const template = templatesData.find(t => t.id === selectedTemplateId);
    if (!template) {
        timeline.innerHTML = `<div class="text-xs text-slate-400 italic text-center p-8">No se pudo cargar la plantilla seleccionada.</div>`;
        return;
    }
    
    const activities = template.activities || [];
    if (activities.length === 0) {
        timeline.innerHTML = `
            <div class="text-center p-8 space-y-2">
                <i data-lucide="message-square" class="w-8 h-8 text-slate-300 mx-auto"></i>
                <p class="text-xs text-slate-450 font-semibold">Sin actividades registradas.</p>
                <p class="text-[10px] text-slate-400">Los cambios que realices aparecerán aquí.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    // Agrupar actividades por fecha
    const groups = {};
    activities.forEach(act => {
        const dateKey = act.date || act.timestamp || "HOY";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(act);
    });
    
    let html = "";
    Object.keys(groups).forEach(date => {
        html += `
            <div class="flex items-center gap-2 select-none py-1.5">
                <div class="h-[1px] bg-slate-200 flex-1"></div>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">${date}</span>
                <div class="h-[1px] bg-slate-200 flex-1"></div>
            </div>
        `;
        
        groups[date].forEach(act => {
            const isSecurity = act.author === "SISTEMA DE SEGURIDAD";
            const isOdooBot = act.author === "OdooBot";
            
            let avatarBg = "bg-brand-50 text-brand-700 border-brand-100";
            let avatarChar = "MA";
            let containerStyle = "hover:bg-slate-50/80 p-2 rounded-lg transition-colors border border-transparent";

            if (isSecurity) {
                avatarBg = "bg-red-500 text-white border-red-600";
                avatarChar = "🛡️";
                containerStyle = "bg-red-50/90 border border-red-200 rounded-xl p-3 shadow-xs my-1";
            } else if (isOdooBot) {
                avatarBg = "bg-purple-100 text-purple-700";
                avatarChar = "OB";
            }
            
            let detailsHtml = "";
            if (act.details) {
                let styledDetails = act.details;
                if (act.details.includes("→")) {
                    const parts = act.details.split("→");
                    if (parts.length === 2) {
                        styledDetails = `<span class="line-through text-slate-400">${parts[0].trim()}</span> <span class="text-slate-400">→</span> <span class="text-brand-600 font-bold">${parts[1].trim()}</span>`;
                    }
                }
                detailsHtml = `
                    <ul class="list-disc pl-4 mt-1 text-[11px] ${isSecurity ? 'text-red-700 font-medium' : 'text-slate-500'} space-y-0.5">
                        <li>${styledDetails}</li>
                    </ul>
                `;
            }

            const displayTime = act.time || act.relativeTime || '';
            
            html += `
                <div class="flex gap-3 items-start ${containerStyle}">
                    <!-- Avatar -->
                    <div class="w-7 h-7 rounded-full ${avatarBg} font-bold text-[10px] flex items-center justify-center shrink-0 border shadow-sm select-none">
                        ${avatarChar}
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline justify-between gap-1">
                            <span class="font-bold ${isSecurity ? 'text-red-900 font-mono text-[12px]' : 'text-slate-800 text-[11px]'}">${act.author}</span>
                            <span class="text-[9px] ${isSecurity ? 'text-red-600 font-bold' : 'text-slate-400 font-medium'} font-mono">${displayTime}</span>
                        </div>
                        <p class="text-[11px] ${isSecurity ? 'text-red-800 font-semibold mt-1' : 'text-slate-650 mt-0.5'}">${act.description}</p>
                        ${detailsHtml}
                    </div>
                </div>
            `;
        });
    });
    
    timeline.innerHTML = html;
    lucide.createIcons();
}

// --- NOTIFICATION SYSTEM FUNCTIONS ---

function addNotification(title, type, metadata = null) {
    // Evitar notificaciones duplicadas idénticas seguidas en corto tiempo
    if (notifications.length > 0 && notifications[0].title === title) {
        return;
    }
    
    notifications.unshift({
        id: Date.now() + Math.random(),
        title: title,
        time: "hace unos segundos",
        read: false,
        type: type,
        metadata: metadata
    });
    
    // Mantener un límite razonable de notificaciones (ej: 50)
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    // Sonido sutil
    try {
        const audio = new Audio("zumbido.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch(e) {}
    
    renderNotifications();
    syncStateToStorage();
}

function renderNotifications() {
    const list = document.getElementById("notifications-list");
    const badge = document.getElementById("notification-badge");
    if (!list) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5 select-none">
                <i data-lucide="bell-off" class="w-8 h-8 text-slate-350"></i>
                <span class="text-xs font-semibold">No tienes notificaciones</span>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    list.innerHTML = notifications.map(n => {
        let iconName = "bell";
        let iconColor = "text-brand-500 bg-brand-50 border-brand-100";
        if (n.type === 'create') {
            iconName = "plus-circle";
            iconColor = "text-blue-600 bg-blue-50 border-blue-150";
        } else if (n.type === 'vencido') {
            iconName = "alert-triangle";
            iconColor = "text-red-600 bg-red-50 border-red-150 animate-pulse";
        } else if (n.type === 'porvencer') {
            iconName = "clock";
            iconColor = "text-amber-600 bg-amber-50 border-amber-150";
        } else if (n.type === 'confirm') {
            iconName = "user-check";
            iconColor = "text-emerald-600 bg-emerald-50 border-emerald-150";
        } else if (n.type === 'completado') {
            iconName = "check-circle";
            iconColor = "text-teal-600 bg-teal-50 border-teal-150";
        } else if (n.type === 'chat') {
            iconName = "message-square";
            iconColor = "text-indigo-600 bg-indigo-50 border-indigo-150";
        }
        
        const readClass = n.read ? "bg-white opacity-70" : "bg-slate-50 border-l-2 border-brand-500 font-medium";
        
        return `
            <div onclick="clickNotification(${n.id})" class="p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-100/80 transition-colors border-b border-slate-100 last:border-0 ${readClass}">
                <!-- Icon -->
                <div class="w-7 h-7 rounded-lg ${iconColor} flex items-center justify-center shrink-0 border shadow-sm">
                    <i data-lucide="${iconName}" class="w-4 h-4"></i>
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] text-slate-800 leading-tight">${n.title}</p>
                    <div class="flex items-center justify-between mt-1 text-[9px] text-slate-400 font-semibold font-mono">
                        <span>${n.time}</span>
                        ${!n.read ? `<span class="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join("");
    
    lucide.createIcons();
}

function clickNotification(id) {
    const n = notifications.find(notif => notif.id === id);
    if (n) {
        const token = localStorage.getItem('sonicbi_token');
        fetch(`/api/comms/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(() => {
            cargarDatosDesdeBackend();
        });
        
        closeNotificationsDropdown();
        
        // Redirección inteligente y despliegue según requerimientos del usuario
        if (n.type === 'vencido' || n.type === 'porvencer' || n.type === 'completado' || n.type === 'create') {
            if (n.metadata && n.metadata.templateId) {
                selectedTemplateId = n.metadata.templateId;
                loadTemplate(n.metadata.templateId);
            }
            switchTab('bpmn-designer');
        } else if (n.type === 'confirm' || n.type === 'chat') {
            switchTab('comm');
            if (n.metadata) {
                if (n.metadata.techName) {
                    openDirectMessage(n.metadata.techName);
                } else if (n.metadata.chatType === 'dm' && n.metadata.chatName) {
                    openDirectMessage(n.metadata.chatName);
                } else if (n.metadata.chatType === 'channel' && n.metadata.chatName) {
                    openChannelChat(n.metadata.chatName);
                }
            }
        }
    }
}

function toggleNotificationsDropdown(event) {
    if (event) event.stopPropagation();
    const el = document.getElementById("notifications-dropdown-menu");
    if (el) {
        el.classList.toggle("hidden");
        if (!el.classList.contains("hidden")) {
            renderNotifications();
        }
    }
}

function closeNotificationsDropdown() {
    const el = document.getElementById("notifications-dropdown-menu");
    if (el) el.classList.add("hidden");
}

function markAllNotificationsAsRead() {
    const token = localStorage.getItem('sonicbi_token');
    fetch('/api/comms/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(() => {
        cargarDatosDesdeBackend();
    });
}

function clearNotifications() {
    const token = localStorage.getItem('sonicbi_token');
    fetch('/api/comms/notifications', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(() => {
        cargarDatosDesdeBackend();
    });
}

window.cerrarSesion = function() {
    localStorage.removeItem('sonicbi_token');
    localStorage.removeItem('sonicbi_usuario');
    window.location.href = 'login.html';
};

// --- GESTIÓN DE CANALES DE CHAT (OMNICANAL) ---
let activeEditingChannelName = null;

function renderCommChannels() {
    const list = document.getElementById("comm-channel-list");
    if (!list) return;

    if (channelsList.length === 0) {
        list.innerHTML = `
            <li class="text-[10px] text-slate-400 italic px-3 py-2">Sin canales creados</li>
        `;
        return;
    }

    list.innerHTML = channelsList.map(chan => {
        const isSelected = activeChatTarget && activeChatTarget.type === 'channel' && activeChatTarget.name === chan.name;
        const btnClass = isSelected 
            ? "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-brand-650 font-bold flex items-center justify-between transition-all bg-brand-50 border border-brand-100"
            : "w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all group";
        
        return `
            <li>
                <div class="flex items-center justify-between w-full">
                    <button onclick="openChannelChat('${chan.name}')" id="btn-chan-${chan.name}" class="${btnClass} flex-1">
                        <span class="flex items-center gap-1 truncate">
                            <i data-lucide="hash" class="w-3.5 h-3.5 text-slate-500"></i>
                            <span class="truncate">${chan.name}</span>
                        </span>
                        <span class="flex items-center gap-1.5 ml-auto">
                            <!-- Ícono de engranaje para configurar miembros -->
                            <i onclick="event.stopPropagation(); openChannelModal('${chan.name}')" data-lucide="settings" class="w-3 h-3 text-slate-400 hover:text-brand-600 transition-all ml-1.5" title="Configurar miembros del canal"></i>
                        </span>
                    </button>
                </div>
            </li>
        `;
    }).join("");

    lucide.createIcons();
}

function openChannelModal(chanName = null) {
    activeEditingChannelName = chanName;
    const modal = document.getElementById("modal-channel-editor");
    const titleEl = document.getElementById("channel-modal-title");
    const nameInput = document.getElementById("chan-modal-name");
    const descInput = document.getElementById("chan-modal-desc");
    const deleteBtn = document.getElementById("channel-modal-delete-btn");
    const membersContainer = document.getElementById("chan-modal-members-container");

    if (!modal || !nameInput || !descInput || !membersContainer) return;

    // Rellenar lista de empleados como checkboxes para seleccionar miembros
    // Excluimos Mitchell Admin del listado porque es administrador y está por defecto, o lo dejamos
    membersContainer.innerHTML = employeesList.map(emp => {
        return `
            <label class="flex items-center gap-2 bg-white p-2 rounded border border-slate-150 cursor-pointer text-[11px] hover:bg-slate-50 transition-all">
                <input type="checkbox" name="chan-member-checkbox" value="${emp.name}" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500">
                <div class="flex items-center justify-between w-full">
                    <span class="font-semibold text-slate-700">${emp.name}</span>
                    <span class="text-[9px] text-slate-400 uppercase font-bold">${emp.role}</span>
                </div>
            </label>
        `;
    }).join("");

    if (chanName) {
        // Modo Edición
        const chan = channelsList.find(c => c.name === chanName);
        titleEl.innerHTML = `<i data-lucide="settings" class="w-4 h-4 text-brand-500"></i> Editar Canal: #${chanName}`;
        nameInput.value = chanName;
        nameInput.disabled = true; // No se permite editar el nombre llave primaria
        descInput.value = chan ? (chan.description || "") : "";

        // Marcar miembros del canal
        const membersList = chan ? (chan.members || []) : [];
        document.querySelectorAll("input[name='chan-member-checkbox']").forEach(chk => {
            if (membersList.includes(chk.value)) {
                chk.checked = true;
            }
        });

        // Solo permitir borrar canales que no sean esenciales
        if (['general', 'mesa-de-ayuda'].includes(chanName)) {
            deleteBtn.classList.add("hidden");
        } else {
            deleteBtn.classList.remove("hidden");
        }
    } else {
        // Modo Creación
        titleEl.innerHTML = `<i data-lucide="hash" class="w-4 h-4 text-brand-500"></i> Crear Canal de Chat`;
        nameInput.value = "";
        nameInput.disabled = false;
        descInput.value = "";
        deleteBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
}

function closeChannelModal() {
    const modal = document.getElementById("modal-channel-editor");
    if (modal) modal.classList.add("hidden");
    activeEditingChannelName = null;
}

async function saveChannelFromModal() {
    const nameInput = document.getElementById("chan-modal-name");
    const descInput = document.getElementById("chan-modal-desc");
    
    if (!nameInput || !descInput) return;
    
    const nameVal = nameInput.value.trim();
    const descVal = descInput.value.trim();

    if (!nameVal) {
        alert("Por favor ingrese el nombre del canal.");
        return;
    }

    // Recopilar miembros seleccionados
    const selectedMembers = [];
    document.querySelectorAll("input[name='chan-member-checkbox']:checked").forEach(chk => {
        selectedMembers.push(chk.value);
    });

    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/comms/channels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: nameVal,
                description: descVal,
                members: selectedMembers
            })
        });

        if (response.ok) {
            closeChannelModal();
            await cargarDatosDesdeBackend();
            alert(`Canal #${nameVal.toLowerCase().replace(/\s+/g, '-')} guardado exitosamente.`);
        } else {
            const err = await response.json();
            alert("Error al guardar el canal: " + (err.error || "Error interno"));
        }
    } catch (e) {
        console.error("Error al guardar canal:", e);
        alert("Error de comunicación con el servidor.");
    }
}

async function deleteChannelFromModal() {
    if (!activeEditingChannelName) return;
    
    if (!confirm(`¿Está seguro de que desea eliminar permanentemente el canal #${activeEditingChannelName} y todos sus mensajes?`)) {
        return;
    }

    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch(`/api/comms/channels/${activeEditingChannelName}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            closeChannelModal();
            await cargarDatosDesdeBackend();
            openChannelChat('general');
            alert("Canal eliminado exitosamente.");
        } else {
            const err = await response.json();
            alert("Error al eliminar canal: " + (err.error || "Error interno"));
        }
    } catch (e) {
        console.error("Error al eliminar canal:", e);
        alert("Error de comunicación con el servidor.");
    }
}

// Registrar en el objeto global window
window.toggleActionDropdown = toggleActionDropdown;
window.closeActionDropdown = closeActionDropdown;
window.openActivityHistoryDrawer = openActivityHistoryDrawer;
window.closeActivityHistoryDrawer = closeActivityHistoryDrawer;
window.renderActivityHistory = renderActivityHistory;
window.logTemplateActivity = logTemplateActivity;
window.addNotification = addNotification;
window.renderNotifications = renderNotifications;
window.clickNotification = clickNotification;
window.toggleNotificationsDropdown = toggleNotificationsDropdown;
window.closeNotificationsDropdown = closeNotificationsDropdown;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.clearNotifications = clearNotifications;
window.cerrarSesion = window.cerrarSesion;
window.renderCommChannels = renderCommChannels;
window.openChannelModal = openChannelModal;
window.closeChannelModal = closeChannelModal;
window.saveChannelFromModal = saveChannelFromModal;
window.deleteChannelFromModal = deleteChannelFromModal;

// ==========================================
// MÓDULO RBAC (ROLES Y PERMISOS)
// ==========================================

let rbacPermissions = {}; // Memoria temporal para la sesión actual
let rolePermissionsState = {
    Administrador: [],
    Supervisor: [],
    Ingeniero: [],
    Tecnico: []
};

const RBAC_OPTIONS = [
    { id: 'btn-dashboard', label: 'Dashboard' },
    { id: 'btn-alerts', label: 'Alertas SLA' },
    { id: 'btn-bpmn', label: 'Flujo de Proceso' },
    { id: 'btn-catalog-nodes', label: 'Catálogo de Nodos' },
    { id: 'btn-departments', label: 'Departamentos' },
    { id: 'btn-personal', label: 'Personal' },
    { id: 'btn-sales', label: 'Ventas' },
    { id: 'btn-clients', label: 'Clientes' },
    { id: 'btn-products', label: 'Productos' },
    { id: 'btn-comm', label: 'Comunicaciones' }
];

async function initRBAC() {
    try {
        let usuarioStr = localStorage.getItem('sonicbi_usuario');
        let usuario = null;
        if (usuarioStr) {
            try { usuario = JSON.parse(usuarioStr); } catch(e) {}
        }
        if (!usuario) {
            usuario = { id: 1, email: 'admin@sonicbi.com', rol: 'admin', nombre: 'Mitchell Admin' };
            localStorage.setItem('sonicbi_usuario', JSON.stringify(usuario));
        }

        const userRole = usuario.rol || 'admin';
        
        // Mostrar botón de configuración solo a Administradores (o admins backend)
        const configContainer = document.getElementById('rbac-config-container');
        if (configContainer && (userRole === 'admin' || userRole === 'Administrador' || usuario.nombre === 'Mitchell Admin')) {
            configContainer.classList.remove('hidden');
        }

        // Obtener permisos del backend para el rol del usuario
        let rolToFetch = userRole === 'admin' ? 'Administrador' : (userRole.charAt(0).toUpperCase() + userRole.slice(1));
        if (usuario.nombre === 'Mitchell Admin') rolToFetch = 'Administrador';
        
        // Actualizar UI del perfil de la barra lateral
        const profileNameEl = document.getElementById('sidebar-profile-name');
        const profileRoleEl = document.getElementById('sidebar-profile-role');
        const profileInitialsEl = document.getElementById('sidebar-profile-initials');
        if (profileNameEl) profileNameEl.innerText = usuario.nombre || 'Mitchell Admin';
        if (profileRoleEl) profileRoleEl.innerText = (userRole === 'admin' ? 'Administrador' : userRole).toUpperCase();
        if (profileInitialsEl) profileInitialsEl.innerText = (usuario.nombre || 'M').charAt(0).toUpperCase();

        // Si el rol es admin, forzamos tener todo por seguridad en frontend
        if (rolToFetch === 'Administrador') {
            rbacPermissions = RBAC_OPTIONS.map(o => o.id);
        } else {
            const response = await fetch(`/api/roles/permisos/${rolToFetch}`);
            if (response.ok) {
                const data = await response.json();
                rbacPermissions = data.permisos || [];
            } else {
                rbacPermissions = RBAC_OPTIONS.map(o => o.id);
            }
        }

        applyRBACPermissions();

    } catch (error) {
        console.error('[RBAC] Error inicializando permisos:', error);
        rbacPermissions = RBAC_OPTIONS.map(o => o.id);
        applyRBACPermissions();
    }
}

window.initRBAC = initRBAC;

function applyRBACPermissions() {
    // Aplicar a los botones del sidebar
    const allSections = RBAC_OPTIONS.map(o => o.id);
    
    // Primero, ocultar todos
    allSections.forEach(sectionId => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.classList.add('hidden'); // Ocultar
            el.classList.remove('flex'); // Quitar display flex
        }
    });

    // Luego, mostrar solo los permitidos
    rbacPermissions.forEach(sectionId => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.classList.remove('hidden');
            el.classList.add('flex');
        }
    });

    // Redirigir al primer tab disponible (o dashboard si está permitido) para quitar pantalla de carga
    if (rbacPermissions.length > 0) {
        const targetTab = rbacPermissions.includes('btn-dashboard') ? 'dashboard' : rbacPermissions[0].replace('btn-', '');
        setTimeout(() => switchTab(targetTab), 100);
    } else {
        // En el caso poco probable de no tener ningún permiso
        const loader = document.getElementById('view-loading');
        if (loader) loader.classList.add('hidden');
    }
}

window.loadAllRolePermissions = async function() {
    try {
        const response = await fetch('/api/roles/permisos');
        if (response.ok) {
            const allData = await response.json(); 
            rolePermissionsState = allData;
            
            // Asegurarnos de que el Administrador siempre exista en el estado
            if (!rolePermissionsState['Administrador']) {
                rolePermissionsState['Administrador'] = RBAC_OPTIONS.map(o => o.id);
            }
            
            renderConfigRoles();
        }
    } catch(e) {
        console.error('Error cargando los roles de config', e);
    }
}

window.renderConfigRoles = function() {
    const container = document.getElementById('config-roles-container');
    if (!container) return;
    
    // Obtener los roles dinámicos
    const roles = Object.keys(rolePermissionsState);
    
    // Asegurar que Administrador salga primero
    roles.sort((a, b) => {
        if (a === 'Administrador') return -1;
        if (b === 'Administrador') return 1;
        return a.localeCompare(b);
    });
    
    let html = '';
    
    roles.forEach(rol => {
        let currentPerms = rolePermissionsState[rol] || [];
        
        let tagsHtml = currentPerms.map(permId => {
            let option = RBAC_OPTIONS.find(o => o.id === permId);
            if (!option) return '';
            
            // Administrador options cannot be removed
            let removeBtn = (rol === 'Administrador') ? '' : `
                <button onclick="event.stopPropagation(); removeRbacTag('${rol}', '${permId}')" class="hover:text-red-500 focus:outline-none transition-colors ml-1" title="Quitar permiso">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            `;
            
            return `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-300 shadow-sm transition-colors">
                    ${option.label}
                    ${removeBtn}
                </span>
            `;
        }).join('');

        let dropdownOptions = RBAC_OPTIONS.filter(o => !currentPerms.includes(o.id)).map(o => {
            return `
                <div class="px-3 py-2 hover:bg-brand-50 hover:text-brand-600 cursor-pointer text-sm text-slate-700 transition-colors" onclick="event.stopPropagation(); addRbacTag('${rol}', '${o.id}')">
                    ${o.label}
                </div>
            `;
        }).join('');
        
        if (!dropdownOptions) {
            dropdownOptions = `<div class="px-3 py-2 text-sm text-slate-400 italic">No hay más secciones disponibles</div>`;
        }

        const isClickable = rol !== 'Administrador';
        const clickEvent = isClickable ? `onclick="toggleRbacDropdown('${rol}')"` : '';
        const chevron = isClickable ? `<div class="ml-auto mt-1 mr-1 text-slate-400"><i data-lucide="chevron-down" class="w-4 h-4"></i></div>` : '';
        const emptyState = currentPerms.length === 0 ? '<span class="text-slate-400 text-sm italic p-1">Ninguna (Sin acceso)</span>' : '';

        // Controles de edición de rol
        let roleControls = '';
        if (rol !== 'Administrador') {
            roleControls = `
                <div class="flex items-center gap-2 mt-1">
                    <button onclick="renameRole('${rol}')" class="text-slate-400 hover:text-brand-500 transition-colors" title="Renombrar rol">
                        <i data-lucide="pencil" class="w-3 h-3"></i>
                    </button>
                    <button onclick="deleteRole('${rol}')" class="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar rol">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
            `;
        }

        html += `
            <div class="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                <div class="w-full sm:w-48 shrink-0 pt-2">
                    <div class="flex items-center justify-between pr-4">
                        <span class="font-bold text-slate-700 text-sm break-all">${rol}</span>
                        ${roleControls}
                    </div>
                    ${rol === 'Administrador' ? '<p class="text-[10px] text-slate-400 mt-0.5">Acceso total (No editable)</p>' : ''}
                </div>
                <div class="flex-1 relative">
                    <div class="min-h-[42px] border border-slate-200 rounded-lg p-1.5 flex flex-wrap gap-1.5 ${isClickable ? 'bg-white cursor-pointer hover:border-brand-300' : 'bg-slate-50 cursor-not-allowed opacity-80'} transition-colors" ${clickEvent}>
                        ${tagsHtml}
                        ${emptyState}
                        ${chevron}
                    </div>
                    
                    <div class="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-lg rounded-lg z-10 hidden overflow-hidden" id="dropdown-${rol}">
                        ${dropdownOptions}
                    </div>
                </div>
            </div>
        `;
    });
    
    // Añadir botón "+ Nuevo Rol"
    html += `
        <div class="pt-2">
            <button onclick="createNewRole()" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-100 border-dashed">
                <i data-lucide="plus" class="w-4 h-4"></i> Crear Nuevo Rol
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

window.createNewRole = async function() {
    const roleName = prompt("Ingresa el nombre del nuevo rol:");
    if (!roleName) return;
    
    const cleanName = roleName.trim();
    if (cleanName === '' || rolePermissionsState[cleanName]) {
        if (typeof showToast !== 'undefined') showToast('El rol ya existe o el nombre es inválido.', 'error');
        return;
    }
    
    // Crear el rol con permisos vacíos
    rolePermissionsState[cleanName] = [];
    
    // Guardarlo en BD inmediatamente para que se registre
    try {
        await fetch(`/api/roles/permisos/${cleanName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permisos: [] })
        });
        if (typeof showToast !== 'undefined') showToast(`Rol '${cleanName}' creado exitosamente.`, 'success');
        
        // Renderizar de nuevo
        renderConfigRoles();
    } catch(e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast('Error al crear el rol', 'error');
    }
}

window.renameRole = async function(oldName) {
    if (oldName === 'Administrador') return;
    
    const newName = prompt(`Ingresa el nuevo nombre para el rol '${oldName}':`, oldName);
    if (!newName) return;
    
    const cleanName = newName.trim();
    if (cleanName === '' || cleanName === oldName) return;
    if (rolePermissionsState[cleanName]) {
        if (typeof showToast !== 'undefined') showToast('Ya existe un rol con ese nombre.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/roles/rename', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName: cleanName })
        });
        
        if (response.ok) {
            // Actualizar estado local
            rolePermissionsState[cleanName] = rolePermissionsState[oldName];
            delete rolePermissionsState[oldName];
            
            if (typeof showToast !== 'undefined') showToast(`Rol renombrado a '${cleanName}'.`, 'success');
            renderConfigRoles();
        } else {
            if (typeof showToast !== 'undefined') showToast('Error al renombrar el rol.', 'error');
        }
    } catch(e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast('Error de conexión al renombrar el rol.', 'error');
    }
}

window.deleteRole = async function(rol) {
    if (rol === 'Administrador') return;
    
    if (!confirm(`¿Estás seguro de que deseas eliminar el rol '${rol}'? Esta acción no se puede deshacer y los empleados con este rol podrían perder el acceso correcto.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/roles/permisos/${rol}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            delete rolePermissionsState[rol];
            if (typeof showToast !== 'undefined') showToast(`Rol '${rol}' eliminado.`, 'success');
            renderConfigRoles();
        } else {
            if (typeof showToast !== 'undefined') showToast('Error al eliminar el rol.', 'error');
        }
    } catch(e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast('Error de conexión al eliminar el rol.', 'error');
    }
}

window.removeRbacTag = function(rol, permId) {
    if (rol === 'Administrador') return;
    rolePermissionsState[rol] = rolePermissionsState[rol].filter(p => p !== permId);
    renderConfigRoles();
}

window.addRbacTag = function(rol, permId) {
    if (!rolePermissionsState[rol]) rolePermissionsState[rol] = [];
    rolePermissionsState[rol].push(permId);
    
    // Hide dropdown after adding
    const dd = document.getElementById(`dropdown-${rol}`);
    if (dd) dd.classList.add('hidden');
    renderConfigRoles();
}

window.toggleRbacDropdown = function(rol) {
    if (rol === 'Administrador') return;
    
    // Cerrar otros
    document.querySelectorAll('[id^="dropdown-"]').forEach(el => {
        if (el.id !== `dropdown-${rol}`) el.classList.add('hidden');
    });
    
    const dd = document.getElementById(`dropdown-${rol}`);
    if (dd) dd.classList.toggle('hidden');
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('[id^="dropdown-"]') && !e.target.closest('.min-h-\\[42px\\]')) {
        document.querySelectorAll('[id^="dropdown-"]').forEach(el => el.classList.add('hidden'));
    }
});

window.saveConfigRoles = async function() {
    try {
        const btn = document.querySelector('button[onclick="saveConfigRoles()"]');
        if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Guardando...';

        const roles = Object.keys(rolePermissionsState);
        for (let rol of roles) {
            let permisos = rolePermissionsState[rol] || [];
            if (rol === 'Administrador') {
                permisos = RBAC_OPTIONS.map(o => o.id); // Forzar a guardar todo
            }
            await fetch(`/api/roles/permisos/${rol}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permisos })
            });
        }
        
        if (typeof showToast !== 'undefined') showToast('Permisos actualizados correctamente', 'success');
        
        // Si el usuario actual es Admin, refrescamos su propio estado
        await initRBAC(); 

    } catch(e) {
        console.error('[RBAC] Error guardando permisos', e);
        if (typeof showToast !== 'undefined') showToast('Error al guardar permisos', 'error');
    } finally {
        const btn = document.querySelector('button[onclick="saveConfigRoles()"]');
        if (btn) btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Guardar Cambios';
        lucide.createIcons();
    }
}

// --- GESTIÓN DE CLIENTES ---
let activeEditingClientId = null;

function renderClientsView() {
    const tbody = document.getElementById("clients-table-body");
    if (!tbody) return;

    if (clientsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-10 text-center text-slate-500 font-medium text-xs">
                    <div class="flex flex-col items-center gap-2">
                        <i data-lucide="users" class="w-8 h-8 text-slate-300"></i>
                        <span>No hay clientes registrados en el catálogo.</span>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = clientsList.map(client => {
        const portalText = client.portal_enabled 
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Activo</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Inactivo</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-800">
                    <div class="flex flex-col">
                        <span>${client.name}</span>
                        ${client.address ? `<span class="text-[10px] text-slate-400 font-normal mt-0.5">${client.address}</span>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-600 font-mono">${client.rfc || 'N/D'}</td>
                <td class="px-6 py-4 text-slate-600">
                    <div class="flex flex-col">
                        <span>${client.contact_name || 'N/D'}</span>
                        ${client.phone ? `<span class="text-[10px] text-slate-400 font-normal mt-0.5">${client.phone}</span>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-600">${client.payment_terms || 'Contado'}</td>
                <td class="px-6 py-4 font-medium text-slate-600">
                    <span>${client.price_list || 'General'}</span>
                    ${client.discount_percent > 0 ? `<span class="text-[10px] text-brand-600 font-bold block">-${client.discount_percent}%</span>` : ''}
                </td>
                <td class="px-6 py-4 font-medium text-slate-600">
                    <span>${client.currency || 'MXN'}</span>
                    <span class="text-[10px] text-slate-400 font-normal block">${client.iva_rate}% IVA</span>
                </td>
                <td class="px-6 py-4 text-center">${portalText}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button onclick="openClientModal(${client.id})" class="text-slate-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all inline-flex items-center" title="Editar Cliente">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteClient(${client.id}, '${client.name}')" class="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all inline-flex items-center" title="Eliminar Cliente">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

function filterClientsTable() {
    const q = document.getElementById("clients-search-input").value.toLowerCase();
    const rows = document.querySelectorAll("#clients-table-body tr");
    rows.forEach(row => {
        if (row.cells.length < 2) return; // Saltarse fila de "sin clientes"
        const text = row.innerText.toLowerCase();
        if (text.includes(q)) {
            row.classList.remove("hidden");
        } else {
            row.classList.add("hidden");
        }
    });
}

function openClientModal(clientId = null) {
    activeEditingClientId = clientId;
    const modal = document.getElementById("modal-client-editor");
    const title = document.getElementById("client-modal-title");
    const submitBtn = document.getElementById("client-modal-submit-btn");

    if (!modal) return;

    // Resetear formulario
    document.getElementById("client-modal-name").value = "";
    document.getElementById("client-modal-rfc").value = "";
    document.getElementById("client-modal-contact").value = "";
    document.getElementById("client-modal-phone").value = "";
    document.getElementById("client-modal-email").value = "";
    document.getElementById("client-modal-address").value = "";
    document.getElementById("client-modal-payment-terms").value = "Contado";
    document.getElementById("client-modal-discount").value = "0";
    document.getElementById("client-modal-price-list").value = "General";
    document.getElementById("client-modal-currency").value = "MXN";
    document.getElementById("client-modal-iva").value = "16";

    const portalChk = document.getElementById("client-modal-portal-enabled");
    portalChk.checked = false;
    document.getElementById("client-modal-portal-email").value = "";
    document.getElementById("client-modal-portal-password").value = "";
    document.getElementById("client-modal-portal-fields").classList.add("hidden");

    if (clientId) {
        title.innerHTML = `<i data-lucide="contact" class="w-4 h-4 text-brand-500"></i> Editar Cliente`;
        submitBtn.innerText = "Guardar Cambios";

        const client = clientsList.find(c => c.id === clientId);
        if (client) {
            document.getElementById("client-modal-name").value = client.name;
            document.getElementById("client-modal-rfc").value = client.rfc || "";
            document.getElementById("client-modal-contact").value = client.contact_name || "";
            document.getElementById("client-modal-phone").value = client.phone || "";
            document.getElementById("client-modal-email").value = client.email || "";
            document.getElementById("client-modal-address").value = client.address || "";
            document.getElementById("client-modal-payment-terms").value = client.payment_terms || "Contado";
            document.getElementById("client-modal-discount").value = client.discount_percent || "0";
            document.getElementById("client-modal-price-list").value = client.price_list || "General";
            document.getElementById("client-modal-currency").value = client.currency || "MXN";
            document.getElementById("client-modal-iva").value = String(client.iva_rate || "16");

            if (client.portal_enabled) {
                portalChk.checked = true;
                document.getElementById("client-modal-portal-email").value = client.portal_email || "";
                document.getElementById("client-modal-portal-fields").classList.remove("hidden");
            }
        }
    } else {
        title.innerHTML = `<i data-lucide="contact" class="w-4 h-4 text-brand-500"></i> Registrar Cliente`;
        submitBtn.innerText = "Registrar Cliente";
    }

    modal.classList.remove("hidden");
    lucide.createIcons();
}

function closeClientModal() {
    const modal = document.getElementById("modal-client-editor");
    if (modal) modal.classList.add("hidden");
}

function togglePortalFields() {
    const chk = document.getElementById("client-modal-portal-enabled");
    const container = document.getElementById("client-modal-portal-fields");
    if (chk && container) {
        if (chk.checked) {
            container.classList.remove("hidden");
            const portalEmail = document.getElementById("client-modal-portal-email");
            const contactEmail = document.getElementById("client-modal-email").value;
            if (portalEmail && !portalEmail.value && contactEmail) {
                portalEmail.value = contactEmail;
            }
        } else {
            container.classList.add("hidden");
        }
    }
}

async function saveClientFromModal() {
    const name = document.getElementById("client-modal-name").value.trim();
    if (!name) {
        alert("El nombre/razón social es obligatorio.");
        return;
    }

    const rfc = document.getElementById("client-modal-rfc").value.trim();
    const contact_name = document.getElementById("client-modal-contact").value.trim();
    const phone = document.getElementById("client-modal-phone").value.trim();
    const email = document.getElementById("client-modal-email").value.trim();
    const address = document.getElementById("client-modal-address").value.trim();
    const payment_terms = document.getElementById("client-modal-payment-terms").value;
    const discount_percent = document.getElementById("client-modal-discount").value;
    const price_list = document.getElementById("client-modal-price-list").value;
    const currency = document.getElementById("client-modal-currency").value;
    const iva_rate = document.getElementById("client-modal-iva").value;

    const portal_enabled = document.getElementById("client-modal-portal-enabled").checked;
    const portal_email = document.getElementById("client-modal-portal-email").value.trim();
    const portal_password = document.getElementById("client-modal-portal-password").value;

    if (portal_enabled) {
        if (!portal_email) {
            alert("Si habilita el portal de cliente, debe ingresar un correo de usuario.");
            return;
        }
        if (!activeEditingClientId && !portal_password) {
            alert("Debe ingresar una contraseña para el portal del nuevo cliente.");
            return;
        }
    }

    let oldName = null;
    if (activeEditingClientId) {
        const client = clientsList.find(c => c.id === activeEditingClientId);
        if (client) oldName = client.name;
    }

    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: activeEditingClientId,
                name,
                rfc,
                contact_name,
                phone,
                email,
                address,
                portal_enabled,
                portal_email,
                portal_password,
                payment_terms,
                discount_percent,
                price_list,
                currency,
                iva_rate,
                oldName
            })
        });

        if (response.ok) {
            closeClientModal();
            await cargarDatosDesdeBackend();
            renderClientsView();
            if (typeof showToast !== 'undefined') showToast("Cliente guardado con éxito", "success");
        } else {
            const err = await response.json();
            alert("Error al guardar cliente: " + (err.error || "Intente de nuevo"));
        }
    } catch(e) {
        console.error("Error al guardar cliente:", e);
        alert("Error de comunicación con el servidor.");
    }
}

async function deleteClient(id, name) {
    if (!confirm(`¿Está seguro de que desea eliminar permanentemente al cliente "${name}"?\n(Se deshabilitará su acceso al portal de clientes).`)) {
        return;
    }

    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch(`/api/bpm/clients/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            await cargarDatosDesdeBackend();
            renderClientsView();
            if (typeof showToast !== 'undefined') showToast("Cliente eliminado correctamente", "success");
        } else {
            const err = await response.json();
            alert("Error al eliminar cliente: " + (err.error || "Intente de nuevo"));
        }
    } catch(e) {
        console.error("Error al eliminar cliente:", e);
        alert("Error de comunicación con el servidor.");
    }
}

// Exportar al objeto global window para botones inline
window.openClientModal = openClientModal;
window.closeClientModal = closeClientModal;
window.togglePortalFields = togglePortalFields;
window.saveClientFromModal = saveClientFromModal;
window.deleteClient = deleteClient;
window.filterClientsTable = filterClientsTable;

// --- CONFIGURACIÓN DE CORREO SMTP ---
function switchConfigSubTab(subtabId) {
    const rolesBtn = document.getElementById("subbtn-config-roles");
    const emailBtn = document.getElementById("subbtn-config-email");
    const rolesView = document.getElementById("config-subview-roles");
    const emailView = document.getElementById("config-subview-email");

    if (subtabId === "roles") {
        if (rolesBtn) {
            rolesBtn.className = "flex items-center gap-3 px-3 py-2 bg-brand-50 text-brand-600 rounded-lg text-sm font-medium transition-colors";
        }
        if (emailBtn) {
            emailBtn.className = "flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors";
        }
        if (rolesView) rolesView.classList.remove("hidden");
        if (emailView) emailView.classList.add("hidden");
    } else if (subtabId === "email") {
        if (rolesBtn) {
            rolesBtn.className = "flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors";
        }
        if (emailBtn) {
            emailBtn.className = "flex items-center gap-3 px-3 py-2 bg-brand-50 text-brand-600 rounded-lg text-sm font-medium transition-colors";
        }
        if (rolesView) rolesView.classList.add("hidden");
        if (emailView) emailView.classList.remove("hidden");
        
        loadConfigEmail();
    }
}
window.switchConfigSubTab = switchConfigSubTab;

async function saveConfigEmail() {
    const sender = document.getElementById("config-email-sender").value.trim();
    const smtp = document.getElementById("config-email-smtp").value.trim();
    const port = parseInt(document.getElementById("config-email-port").value) || 0;
    const security = document.getElementById("config-email-security").value;
    const password = document.getElementById("config-email-password").value;

    const config = { sender, smtp, port, security, password };
    
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/email-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        if (response.ok) {
            if (typeof showToast !== 'undefined') {
                showToast("Configuración de correo guardada correctamente", "success");
            } else {
                alert("Configuración de correo guardada correctamente.");
            }
        } else {
            alert("Error al guardar la configuración de correo.");
        }
    } catch(e) {
        console.error("Error al guardar email-config:", e);
        alert("Error de comunicación con el servidor.");
    }
}
window.saveConfigEmail = saveConfigEmail;

async function loadConfigEmail() {
    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/email-config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const config = await response.json();
            if (document.getElementById("config-email-sender")) document.getElementById("config-email-sender").value = config.sender || "";
            if (document.getElementById("config-email-smtp")) document.getElementById("config-email-smtp").value = config.smtp || "";
            if (document.getElementById("config-email-port")) document.getElementById("config-email-port").value = config.port || "";
            if (document.getElementById("config-email-security")) document.getElementById("config-email-security").value = config.security || "SSL/TLS";
            if (document.getElementById("config-email-password")) document.getElementById("config-email-password").value = config.password || "";
        }
    } catch(e) {
        console.error("Error al cargar email-config:", e);
    }
}
window.loadConfigEmail = loadConfigEmail;

async function testEmailConnection() {
    const sender = document.getElementById("config-email-sender").value.trim();
    const smtp = document.getElementById("config-email-smtp").value.trim();
    const port = parseInt(document.getElementById("config-email-port").value) || 0;
    const security = document.getElementById("config-email-security").value;
    const password = document.getElementById("config-email-password").value;

    if (!sender || !smtp || !port) {
        if (typeof showToast !== 'undefined') {
            showToast("Por favor complete los campos obligatorios antes de probar.", "error");
        } else {
            alert("Por favor complete los campos obligatorios antes de probar.");
        }
        return;
    }

    const testBtn = document.querySelector("button[onclick='testEmailConnection()']");
    const originalText = testBtn ? testBtn.innerHTML : "";
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Probando...`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const token = localStorage.getItem('sonicbi_token');
    try {
        const response = await fetch('/api/bpm/test-email-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sender, smtp, port, security, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            if (typeof showToast !== 'undefined') {
                showToast("¡Autoprueba de conexión SMTP exitosa!", "success");
            } else {
                alert("¡Autoprueba de conexión SMTP exitosa!");
            }
        } else {
            const errStr = data.error || "Error desconocido";
            if (typeof showToast !== 'undefined') {
                showToast("Error de conexión: " + errStr, "error");
            } else {
                alert("Error de conexión: " + errStr);
            }
        }
    } catch (e) {
        console.error("Error al probar conexión SMTP:", e);
        alert("Error de red o comunicación con el servidor.");
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = originalText;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
window.testEmailConnection = testEmailConnection;
