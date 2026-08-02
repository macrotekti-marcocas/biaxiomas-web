/**
 * SONICBI MVP - Logic and Interactivity
 * Author: Antigravity Architect
 */

// Initialize Lucide Icons
lucide.createIcons();

// --- MOCK DATA ---
const DATA = {
    alerts: [
        { id: 1, type: 'warning', icon: 'alert-triangle', text: 'Alerta de SLA: Tarea de instalación en Nodo B excede en 27% el promedio histórico. Notificación enviada a Supervisor vía WhatsApp.' },
        { id: 2, type: 'info', icon: 'trending-up', text: 'Optimización de ruta activa: Reducción estimada de 15 min en traslados para Cuadrilla Zona Norte.' },
        { id: 3, type: 'danger', icon: 'zap-off', text: 'Fallo crítico reportado en Radiobase X45. Despacho automático de técnicos habilitado.' }
    ],
    sla: {
        labels: ['Cuadrilla Alfa (Norte)', 'Cuadrilla Beta (Sur)', 'Cuadrilla Gamma (Centro)', 'Contratistas Externos'],
        data: [96, 85, 92, 71]
    },
    leads: {
        labels: ['Licitaciones', 'Outbound B2B', 'Partners', 'Orgánico'],
        data: [45, 30, 15, 10]
    },
    financials: {
        months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        revenue: [120000, 135000, 128000, 150000, 162000, 180000],
        costs: [80000, 85000, 82000, 95000, 100000, 105000]
    },
    projects: [
        { name: 'Despliegue Fibra Óptica HFC - Zona 1', type: 'Expansión de Red', score: 94, status: 'Óptimo', date: '2026-08-15' },
        { name: 'Mantenimiento Preventivo Core Network', type: 'Mantenimiento', score: 82, status: 'Estable', date: '2026-07-20' },
        { name: 'Migración Nodos 5G Fase 2', type: 'Actualización', score: 45, status: 'Riesgo Climático', date: '2026-09-01' },
        { name: 'Instalación Enlaces Microondas B2B', type: 'Clientes Corp.', score: 67, status: 'Retraso Prov.', date: '2026-07-25' }
    ],
    ocrMockResult: {
        rfc: 'TELC090812X1A',
        concepto: 'Bobinas Fibra Óptica 48 Hilos Monomodo y Materiales',
        monto: 45200.00,
        items: [
            { code: 'FO-48H-MM', name: 'Bobina Fibra 48 Hilos (1KM)', category: 'Fibra', qty: 5, unit: 'Bobina' },
            { code: 'CN-MEC-APC', name: 'Conector Mecánico SC/APC', category: 'Conectores', qty: 200, unit: 'Pieza' }
        ]
    }
};

// Global variables for Chart instances so we can destroy/update them if needed
let charts = {};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDashboard();
    initReportBuilder();
    initPurchases();
    initPredictive();
    initTasks();
    initCRM();
    initQuotes();
    initHR();
    initComm();
    initGPS();
    initMobileApp();
    
    // Simulate real-time data persistence/loading from localStorage
    loadLocalState();
    
    // Initialize Theme
    initTheme();
});

// --- NAVIGATION LOGIC ---
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('translate-x-0');
        if (overlay) overlay.classList.toggle('hidden');
    }
};

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.view-section');
    const titleEl = document.getElementById('view-title');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active classes
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            // Add active to clicked
            link.classList.add('active');
            const targetView = link.getAttribute('data-view');
            document.getElementById(`view-${targetView}`).classList.remove('hidden');
            document.getElementById(`view-${targetView}`).classList.add('animate-fade-in');
            
            // Update Title
            titleEl.textContent = link.textContent.trim();
            
            // Auto-close sidebar on mobile
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                    window.toggleSidebar();
                }
            }
        });
    });
}

// --- DASHBOARD (VIEW 1) ---
function initDashboard() {
    // Populate Alerts
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = DATA.alerts.map(alert => `
        <div class="flex items-start p-3 rounded-lg ${alert.type === 'warning' ? 'bg-orange-500/10 border border-orange-500/20' : alert.type === 'danger' ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}">
            <i data-lucide="${alert.icon}" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${alert.type === 'warning' ? 'text-orange-400' : alert.type === 'danger' ? 'text-red-400' : 'text-blue-400'}"></i>
            <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${alert.text}</p>
        </div>
    `).join('');
    lucide.createIcons();

    // Chart Common Config for Dark Mode
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.scale.grid.color = '#334155';

    // 1. SLA Bar Chart
    const ctxBar = document.getElementById('slaBarChart').getContext('2d');
    charts.slaBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: DATA.sla.labels,
            datasets: [{
                label: 'Cumplimiento SLA (%)',
                data: DATA.sla.data,
                backgroundColor: ['#14b8a6', '#14b8a6', '#14b8a6', '#f43f5e'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });

    // 2. Leads Pie Chart (Doughnut for modern look)
    const ctxPie = document.getElementById('leadsPieChart').getContext('2d');
    charts.leadsPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: DATA.leads.labels,
            datasets: [{
                data: DATA.leads.data,
                backgroundColor: ['#3b82f6', '#8b5cf6', '#14b8a6', '#64748b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#cbd5e1' } }
            },
            cutout: '70%'
        }
    });

    // 3. Gauge Chart (Simulated with Doughnut)
    const ctxGauge = document.getElementById('gaugeChart').getContext('2d');
    charts.gauge = new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [87, 13], // 87% compliance
                backgroundColor: ['#14b8a6', '#334155'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });
}

// --- REPORT BUILDER (VIEW 2) ---
function initReportBuilder() {
    const btn = document.getElementById('generate-report-btn');
    const resultContainer = document.getElementById('report-result-container');
    const ctxReport = document.getElementById('reportChart').getContext('2d');
    
    btn.addEventListener('click', () => {
        // Add loading state to button
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Procesando...`;
        lucide.createIcons();

        // Simulate API/Processing delay
        setTimeout(() => {
            btn.innerHTML = originalText;
            lucide.createIcons();
            
            resultContainer.classList.remove('hidden');
            resultContainer.classList.add('animate-fade-in');
            
            const varX = document.getElementById('report-var-x').options[document.getElementById('report-var-x').selectedIndex].text;
            const varY = document.getElementById('report-var-y').options[document.getElementById('report-var-y').selectedIndex].text;
            
            document.getElementById('report-result-title').textContent = `${varY} vs ${varX}`;
            
            // Destroy existing chart if recreating
            if(charts.report) charts.report.destroy();
            
            // Generate mock correlation data based on selection
            const labels = ['0-1', '1-2', '2-3', '3-4', '4+'];
            const data = Array.from({length: 5}, () => Math.floor(Math.random() * 50) + 10);
            
            charts.report = new Chart(ctxReport, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Correlación',
                        data: data,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4 // curve
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
            
        }, 800);
    });
}

// --- PURCHASES & OCR (VIEW 3) ---
function initPurchases() {
    initInventory();
    
    // 1. Margin Chart
    const ctxFin = document.getElementById('financialChart').getContext('2d');
    charts.financial = new Chart(ctxFin, {
        type: 'bar',
        data: {
            labels: DATA.financials.months,
            datasets: [
                {
                    label: 'Cotizaciones Aprobadas ($)',
                    data: DATA.financials.revenue,
                    backgroundColor: '#14b8a6',
                    borderRadius: 4,
                    barPercentage: 0.6
                },
                {
                    label: 'Costos Ejecutados ($)',
                    data: DATA.financials.costs,
                    backgroundColor: '#f43f5e',
                    borderRadius: 4,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { grid: { color: '#334155' } }
            }
        }
    });

    // 2. OCR Simulation Logic
    const btnOcr = document.getElementById('btn-ocr-scan');
    const loader = document.getElementById('ocr-loader');
    const resultsContainer = document.getElementById('ocr-results');
    const tableBody = document.getElementById('ocr-table-body');

    btnOcr.addEventListener('click', () => {
        // Show loader
        loader.classList.remove('hidden');
        
        setTimeout(() => {
            // Hide loader
            loader.classList.add('hidden');
            
            // Show results
            resultsContainer.classList.remove('hidden');
            
            // Enable the 'Ingresar a Almacén' button
            const btnIngresar = document.getElementById('btn-ingresar-stock');
            if(btnIngresar) {
                btnIngresar.disabled = false;
                btnIngresar.innerHTML = '<i data-lucide="download" class="w-3 h-3 mr-1"></i> Ingresar Artículos a Almacén';
                btnIngresar.classList.remove('opacity-50', 'cursor-not-allowed');
                lucide.createIcons({root: btnIngresar.parentElement});
            }

            // Generate row
            const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
            
            const tr = document.createElement('tr');
            tr.className = 'border-b border-dark-border bg-dark-bg/30 hover:bg-dark-bg/80 transition-colors';
            tr.innerHTML = `
                <td class="px-4 py-3 font-mono text-brand-500">${DATA.ocrMockResult.rfc}</td>
                <td class="px-4 py-3 text-slate-300">${DATA.ocrMockResult.concepto}</td>
                <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">${formatter.format(DATA.ocrMockResult.monto)}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30 flex items-center justify-center w-fit mx-auto">
                        <i data-lucide="check-circle-2" class="w-3 h-3 mr-1"></i> Validado
                    </span>
                </td>
            `;
            
            tableBody.prepend(tr);
            lucide.createIcons();
            
            // Save to localStorage for demo persistence
            saveScan(DATA.ocrMockResult);
            
            // Dynamically update the chart to simulate real-time cost increase
            const lastCostIndex = DATA.financials.costs.length - 1;
            DATA.financials.costs[lastCostIndex] += DATA.ocrMockResult.monto;
            
            // Deduct from the first approved quote if exists
            let quotes = JSON.parse(localStorage.getItem('sonicbi_quotes') || '[]');
            const approvedQuote = quotes.find(q => q.status === 'Aprobada');
            if (approvedQuote) {
                approvedQuote.margen -= DATA.ocrMockResult.monto;
                localStorage.setItem('sonicbi_quotes', JSON.stringify(quotes));
                if (typeof renderQuotesTable === 'function') {
                    renderQuotesTable();
                }
                showToast(`Se dedujo ${formatter.format(DATA.ocrMockResult.monto)} del presupuesto del proyecto ${approvedQuote.folio}`, 'warning');
            }

            charts.financial.update();
            
        }, 2000); // 2 seconds of "AI Processing"
    });
}

// --- PREDICTIVE ANALYTICS (VIEW 4) ---
function initPredictive() {
    const container = document.getElementById('projects-container');
    
    const html = DATA.projects.map(proj => {
        let scoreColor, bgGradient;
        if (proj.score >= 80) {
            scoreColor = 'text-emerald-400';
            bgGradient = 'from-emerald-500/10 to-transparent';
        } else if (proj.score >= 60) {
            scoreColor = 'text-yellow-400';
            bgGradient = 'from-yellow-500/10 to-transparent';
        } else {
            scoreColor = 'text-red-400';
            bgGradient = 'from-red-500/10 to-transparent';
        }

        return `
        <div class="bg-dark-card border border-dark-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-50"></div>
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-medium px-2 py-1 bg-dark-bg border border-dark-border rounded text-slate-400 uppercase tracking-wider">${proj.type}</span>
                    <span class="text-xs text-slate-500 flex items-center"><i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${proj.date}</span>
                </div>
                <h4 class="text-lg font-medium text-slate-900 dark:text-white mb-6 leading-tight">${proj.name}</h4>
                
                <div class="flex items-end justify-between border-t border-dark-border pt-4">
                    <div>
                        <p class="text-xs text-slate-400 mb-1">Score Predictivo (IA)</p>
                        <div class="flex items-baseline">
                            <span class="text-3xl font-bold ${scoreColor}">${proj.score}</span>
                            <span class="text-sm text-slate-500 ml-1">/100</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 mb-1">Estado</p>
                        <p class="text-sm font-medium ${scoreColor}">${proj.status}</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    lucide.createIcons();
}

// --- LOCAL STORAGE HELPERS ---
function saveScan(data) {
    let scans = JSON.parse(localStorage.getItem('sonicbi_scans') || '[]');
    scans.push({...data, timestamp: new Date().toISOString()});
    localStorage.setItem('sonicbi_scans', JSON.stringify(scans));
}

function loadLocalState() {
    console.log("SONICBI Local State Initialized.");
    if (typeof renderCustomTemplateButtons === 'function') {
        renderCustomTemplateButtons();
    }
    const state = localStorage.getItem('sonicbi_demo_state');
    if (state === 'template_loaded' || state === 'template_loaded_fo') {
        loadTemplate('fo', true);
    } else if (state === 'template_loaded_critico') {
        loadTemplate('critico', true);
    } else if (state && state.startsWith('template_loaded_custom_')) {
        const customId = state.replace('template_loaded_', '');
        loadTemplate(customId, true);
    }
}

// --- TASKS & BPM LOGIC ---
function initTasks() {
    [1, 2].forEach(taskId => {
        const fileInput = document.getElementById(`evidence-${taskId}`);
        if(fileInput) {
            fileInput.addEventListener('change', (e) => {
                const statusEl = document.getElementById(`evidence-status-${taskId}`);
                const errorEl = document.getElementById(`evidence-error-${taskId}`);
                if (e.target.files.length > 0) {
                    statusEl.textContent = 'Evidencia cargada ✅';
                    statusEl.classList.remove('text-slate-500');
                    statusEl.classList.add('text-brand-400');
                    errorEl.classList.add('hidden'); // Hide error if there was one
                } else {
                    statusEl.textContent = 'Ningún archivo...';
                    statusEl.classList.add('text-slate-500');
                    statusEl.classList.remove('text-brand-400');
                }
            });
        }
        
        // Chat Enter key submit
        const chatInput = document.getElementById(`chat-input-${taskId}`);
        if(chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    sendChatMessage(taskId);
                }
            });
        }
    });
}

window.saveTaskDraft = function(taskId) {
    alert(`Borrador de la Tarea ${taskId} guardado localmente.`);
    localStorage.setItem(`task_${taskId}_status`, 'draft');
};

window.postponeTask = function(taskId) {
    const date = prompt("Selecciona nueva fecha (YYYY-MM-DD):");
    if(date) {
        alert(`Tarea ${taskId} pospuesta para: ${date}`);
    }
};

window.finishTask = function(taskId) {
    const fileInput = document.getElementById(`evidence-${taskId}`);
    const errorEl = document.getElementById(`evidence-error-${taskId}`);
    const taskCard = document.getElementById(`task-card-${taskId}`);
    
    if(!fileInput.files || fileInput.files.length === 0) {
        errorEl.classList.remove('hidden');
        showToast('❌ [CANDADO DE EVIDENCIA] Bloqueo de Seguridad: Sube la captura del reporte OTDR/Fotografía antes de cerrar el nodo.', 'error');
        return;
    }
    
    errorEl.classList.add('hidden');
    
    // Success flow
    if(taskCard) {
        taskCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        taskCard.style.opacity = '0';
        taskCard.style.transform = 'scale(0.95)';
        setTimeout(() => taskCard.remove(), 300);
    }
    
    showToast('✅ Tarea completada exitosamente. Actualizando diagrama de Gantt en tiempo real...', 'success');
    
    // Gantt Interconnection Logic for Task 1
    if (taskId === 1) {
        // Change Phase 3 to Completed
        const status3 = document.getElementById('gantt-status-3');
        const bar3 = document.getElementById('gantt-bar-3');
        if (status3 && bar3) {
            status3.textContent = 'Completado';
            status3.className = 'text-[11px] font-semibold text-brand-500 dark:text-brand-400 px-2 py-1 rounded-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border';
            bar3.className = 'absolute h-7 rounded-md bg-brand-500 transition-all duration-700 ease-out flex items-center px-2 text-[10px] font-bold text-white overflow-hidden whitespace-nowrap z-20';
        }
        
        // Change Phase 4 to En Proceso
        const status4 = document.getElementById('gantt-status-4');
        const bar4 = document.getElementById('gantt-bar-4');
        if (status4 && bar4) {
            status4.textContent = 'En Proceso';
            status4.className = 'text-[11px] font-semibold text-brand-400 px-2 py-1 rounded-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border';
            bar4.className = 'absolute h-7 rounded-md bg-brand-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.5)] border border-brand-300 transition-colors duration-700 ease-out flex items-center px-2 text-[10px] font-bold text-white overflow-hidden whitespace-nowrap z-20';
        }
    }
    
    // Add ML Alert to Dashboard
    const alertsContainer = document.getElementById('alerts-container');
    if(alertsContainer) {
        const mlHTML = `
            <div class="flex items-start p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mt-3 animate-fade-in">
                <i data-lucide="bot" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 text-orange-400"></i>
                <p class="text-sm text-slate-300 leading-relaxed">⚠️ Alerta de ML: Tarea finalizada en 1.8 hrs. El algoritmo predice un 98% de éxito para la entrega final.</p>
            </div>
        `;
        alertsContainer.insertAdjacentHTML('afterbegin', mlHTML);
        lucide.createIcons();
    }
};

window.sendChatMessage = function(taskId) {
    const input = document.getElementById(`chat-input-${taskId}`);
    const text = input.value.trim();
    if(!text) return;
    
    const box = document.getElementById(`chat-box-${taskId}`);
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const msgHTML = `
        <div class="self-end bg-brand-500/20 border border-brand-500/30 rounded-lg p-2 text-slate-900 dark:text-white max-w-[85%] mt-2">
            <span class="text-[10px] text-brand-300 block mb-0.5">Técnico - ${time}</span>
            ${text}
        </div>
    `;
    
    box.insertAdjacentHTML('beforeend', msgHTML);
    input.value = '';
    box.scrollTop = box.scrollHeight; // Scroll to bottom
    lucide.createIcons();
};

window.showToast = function(msg, type) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const isError = type === 'error';
    const bg = isError ? 'bg-red-500' : 'bg-brand-500';
    const toast = document.createElement('div');
    toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in flex items-center max-w-md mb-2`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

window.loadTemplate = function(type = 'fo', isInit = false) {
    if (!isInit) {
        localStorage.setItem('sonicbi_demo_state', 'template_loaded_' + type);
        let msg = 'Plantilla personalizada activada';
        if (type === 'fo') msg = 'Plantilla "[FO] Fibra" activada';
        else if (type === 'critico') msg = 'Caso Crítico "[Crítico] Cámaras" activado';
        showToast(msg, 'success');
    }

    const bpmContainer = document.getElementById('bpm-dynamic-container');
    const tasksContainer = document.getElementById('tasks-container');

    let templateConfig = null;
    let isGantt = false;
    let isCrm = false;

    if (type === 'fo') {
        isGantt = true;
    } else if (type === 'critico') {
        isCrm = true;
    } else if (type.startsWith('custom_')) {
        const stored = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
        templateConfig = stored.find(t => t.id === type);
        if (templateConfig) {
            isGantt = templateConfig.type === 'gantt';
            isCrm = templateConfig.type === 'crm';
        }
    }

    if (isGantt) {
        if (bpmContainer) {
            // Restore Gantt structure in case it was replaced by CRM mock
            bpmContainer.innerHTML = `
                <!-- Left Panel: Task Table (40%) -->
                <div class="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-dark-border flex flex-col bg-dark-card">
                    <div class="grid grid-cols-12 gap-2 p-3 border-b border-dark-border bg-dark-bg text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div class="col-span-6">Fase / Tarea</div>
                        <div class="col-span-2 text-center">Duración</div>
                        <div class="col-span-4 text-center">Estado</div>
                    </div>
                    <div id="gantt-table-body" class="flex-1 overflow-y-auto"></div>
                </div>

                <!-- Right Panel: Timeline (60%) -->
                <div class="w-full md:w-7/12 bg-dark-bg relative overflow-x-auto flex flex-col">
                    <div class="flex border-b border-dark-border bg-dark-card min-w-[700px] h-[41px] items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" id="gantt-timeline-header"></div>
                    <div id="gantt-timeline-body" class="relative flex-1 min-w-[700px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NCIgaGVpZ2h0PSI0NCI+PHJlY3Qgd2lkdGg9IjQ0IiBoZWlnaHQ9IjQ0IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgNDRMMCAwIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-[length:44px_44px]"></div>
                </div>
            `;
        }

        // 1. Gantt Dynamic Rendering
        const tableBody = document.getElementById('gantt-table-body');
        const timelineHeader = document.getElementById('gantt-timeline-header');
        const timelineBody = document.getElementById('gantt-timeline-body');
        
        if (tableBody && timelineHeader && timelineBody) {
            let ganttTasks = [];
            if (type === 'fo' || !templateConfig) {
                ganttTasks = [
                    { id: 1, name: "1. Planificación y Venta", duration: 2, daysText: "2 días", status: "Completado", color: "bg-brand-500", startDay: 0 },
                    { id: 2, name: "2. Levantamiento Técnico en Sitio", duration: 3, daysText: "3 días", status: "Completado", color: "bg-brand-500", startDay: 2 },
                    { id: 3, name: "3. Tendido e Instalación de Fibra Óptica", duration: 5, daysText: "5 días", status: "En Proceso", color: "bg-brand-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.5)] border border-brand-300", startDay: 5 },
                    { id: 4, name: "4. Fusión y Empalmes en Distribuidor", duration: 4, daysText: "4 días", status: "Pendiente", color: "bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 border-dashed text-slate-700 dark:text-slate-300", startDay: 10 },
                    { id: 5, name: "5. Pruebas OTDR y Certificación", duration: 2, daysText: "2 días", status: "Pendiente", color: "bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 border-dashed text-slate-700 dark:text-slate-300", startDay: 14 }
                ];
            } else {
                let startDayAcc = 0;
                ganttTasks = templateConfig.nodes.map((nodeName, index) => {
                    const task = {
                        id: index + 1,
                        name: `${index + 1}. ${nodeName}`,
                        duration: 2,
                        daysText: "2 días",
                        status: "Pendiente",
                        color: "bg-slate-200 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 border-dashed text-slate-700 dark:text-slate-300",
                        startDay: startDayAcc
                    };
                    startDayAcc += 2;
                    return task;
                });
            }

            let tableHTML = '';
            ganttTasks.forEach(task => {
                let statusClass = task.status === "Completado" ? "text-brand-500 dark:text-brand-400" : (task.status === "En Proceso" ? "text-brand-400" : "text-slate-500 dark:text-slate-500");
                tableHTML += `
                    <div class="grid grid-cols-12 gap-2 p-3 border-b border-slate-200 dark:border-dark-border text-sm items-center hover:bg-slate-100 dark:hover:bg-dark-bg/50 transition-colors h-[44px]">
                        <div class="col-span-6 font-medium text-slate-700 dark:text-slate-300 truncate" title="${task.name}">${task.name}</div>
                        <div class="col-span-2 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">${task.daysText}</div>
                        <div class="col-span-4 text-center">
                            <span class="text-[10px] font-semibold ${statusClass} px-2 py-1 rounded-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border" id="gantt-status-${task.id}">${task.status}</span>
                        </div>
                    </div>
                `;
            });
            tableBody.innerHTML = tableHTML;

            let headerHTML = '';
            let totalDays = 16;
            if (templateConfig && templateConfig.nodes.length * 2 > 16) {
                totalDays = templateConfig.nodes.length * 2 + 2;
            }
            const dayWidth = 44; 
            for(let i=1; i<=totalDays; i++) {
                headerHTML += `<div class="flex-shrink-0 flex items-center justify-center text-slate-500 border-r border-dark-border" style="width: ${dayWidth}px">D${i}</div>`;
            }
            timelineHeader.innerHTML = headerHTML;

            let barsHTML = '';
            let svgLinesHTML = '';

            ganttTasks.forEach((task, index) => {
                const left = task.startDay * dayWidth;
                const width = task.duration * dayWidth;
                const top = index * 44 + 8;

                barsHTML += `
                    <div id="gantt-bar-${task.id}" class="absolute h-7 rounded-md ${task.color} transition-all duration-700 ease-out flex items-center px-2 text-[10px] font-bold text-white overflow-hidden whitespace-nowrap z-20" 
                         style="left: ${left}px; top: ${top}px; width: 0px;" data-target-width="${width}">
                        ${task.duration}d
                    </div>
                `;
                
                if (index < ganttTasks.length - 1) {
                    const nextTask = ganttTasks[index + 1];
                    const startX = left + width;
                    const startY = top + 14; 
                    const endX = nextTask.startDay * dayWidth;
                    const endY = (index + 1) * 44 + 8 + 14;
                    
                    svgLinesHTML += `
                        <path d="M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}" 
                              fill="none" stroke="#475569" stroke-width="1.5" class="opacity-0 transition-opacity duration-1000 delay-500" id="gantt-line-${task.id}"/>
                        <polygon points="${endX-1},${endY-3} ${endX+4},${endY} ${endX-1},${endY+3}" fill="#475569" class="opacity-0 transition-opacity duration-1000 delay-500" id="gantt-arrow-${task.id}"/>
                    `;
                }
            });

            timelineBody.innerHTML = `<svg id="gantt-svg" class="absolute inset-0 pointer-events-none w-full h-full z-10">${svgLinesHTML}</svg>` + barsHTML;

            setTimeout(() => {
                ganttTasks.forEach(task => {
                    const bar = document.getElementById(`gantt-bar-${task.id}`);
                    if(bar) bar.style.width = bar.getAttribute('data-target-width') + 'px';
                    
                    const line = document.getElementById(`gantt-line-${task.id}`);
                    const arrow = document.getElementById(`gantt-arrow-${task.id}`);
                    if(line) line.classList.remove('opacity-0');
                    if(arrow) arrow.classList.remove('opacity-0');
                });
            }, 50);
        }

        if (tasksContainer) {
            tasksContainer.innerHTML = `
                ${createTaskHTML(1, "Fusión de Fibra Óptica en Distribuidor Central (ODF-02)", "SLA Máximo: 4 horas", "Activa")}
                ${createTaskHTML(2, "Prueba de Atenuación con OTDR y Certificación de Enlace", "SLA Máximo: 2 horas", "Activa")}
            `;
            initTasks(); 
            lucide.createIcons();
        }
    } else if (isCrm) {
        if (bpmContainer) {
            let cardsHTML = '';
            if (type === 'critico' || !templateConfig) {
                cardsHTML = `
                        <!-- Sucursal 1 -->
                        <div class="bg-dark-bg border border-dark-border rounded-xl p-5 hover:border-emerald-500/50 transition-colors cursor-pointer" onclick="openEvidenceModal()">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h5 class="font-bold text-slate-900 dark:text-white">Sucursal 1 (Av. Central)</h5>
                                    <p class="text-xs text-slate-400 mt-1">Ticket #TK-9921</p>
                                </div>
                                <span class="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/30 flex items-center">
                                    <i data-lucide="check-circle" class="w-3 h-3 mr-1"></i> Completado
                                </span>
                            </div>
                            <p class="text-sm text-slate-300">Reemplazo de domo PTZ y re-cableado UTP.</p>
                            <div class="mt-4 text-xs text-brand-400 flex items-center">
                                <i data-lucide="image" class="w-4 h-4 mr-1"></i> Ver Evidencia Fotográfica
                            </div>
                        </div>

                        <!-- Sucursal 2 -->
                        <div class="bg-dark-bg border border-red-500/50 rounded-xl p-5 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden" id="crm-sucursal-2">
                            <div class="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                                <i data-lucide="lock" class="w-6 h-6 text-red-500/50 mt-2 mr-2"></i>
                            </div>
                            <div class="flex justify-between items-start mb-3 relative z-10">
                                <div>
                                    <h5 class="font-bold text-slate-900 dark:text-white">Sucursal 2 (Plaza Valle)</h5>
                                    <p class="text-xs text-slate-400 mt-1">Ticket #TK-9922</p>
                                </div>
                                <span class="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded border border-red-500/30 flex items-center" id="crm-status-2">
                                    <i data-lucide="lock" class="w-3 h-3 mr-1"></i> Retenido por Finanzas
                                </span>
                            </div>
                            <p class="text-sm text-slate-300 relative z-10">Mantenimiento preventivo de cámaras de acceso.</p>
                            <div class="mt-4 text-xs text-red-400 flex items-center relative z-10" id="crm-action-2">
                                <i data-lucide="alert-triangle" class="w-4 h-4 mr-1"></i> Requiere liberación financiera
                            </div>
                        </div>
                `;
            } else {
                cardsHTML = templateConfig.nodes.map((nodeName, index) => {
                    const statuses = [
                        { text: 'Completado', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'check-circle' },
                        { text: 'En Proceso', class: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: 'clock' },
                        { text: 'Pendiente', class: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: 'clock' }
                    ];
                    const status = statuses[index % statuses.length];
                    return `
                        <div class="bg-dark-bg border border-dark-border rounded-xl p-5 hover:border-brand-500/50 transition-colors">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h5 class="font-bold text-slate-900 dark:text-white">${nodeName}</h5>
                                    <p class="text-xs text-slate-400 mt-1">Ticket #TK-${9920 + index}</p>
                                </div>
                                <span class="${status.class} text-xs px-2 py-1 rounded border flex items-center">
                                    <i data-lucide="${status.icon}" class="w-3 h-3 mr-1"></i> ${status.text}
                                </span>
                            </div>
                            <p class="text-sm text-slate-300">Paso personalizado de flujo operativo.</p>
                        </div>
                    `;
                }).join('');
            }

            bpmContainer.innerHTML = `
                <div class="w-full bg-dark-card p-6 flex flex-col items-center flex-1 h-full min-h-[400px] overflow-y-auto">
                    <div class="mb-6 w-full max-w-3xl border-b border-dark-border pb-4 flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center mr-4 border border-indigo-500/30">
                                <i data-lucide="building" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="text-xl font-bold text-slate-900 dark:text-white">${templateConfig ? templateConfig.name : 'Corporativo Tiendas Norte'}</h4>
                                <p class="text-sm text-slate-400">${templateConfig ? 'Plantilla Dinámica (Demo)' : 'Cliente VIP - SLA 4 Horas'}</p>
                            </div>
                        </div>
                        <span class="bg-dark-bg border border-dark-border px-3 py-1 text-xs text-slate-300 rounded-full">ID CRM: ${templateConfig ? 'CLI-CUSTOM' : 'CLI-88402'}</span>
                    </div>

                    <div class="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${cardsHTML}
                    </div>
                </div>
            `;
            lucide.createIcons();
        }

        const alertsContainer = document.getElementById('alerts-container');
        if(alertsContainer) {
            alertsContainer.innerHTML = `
                <div class="flex items-start p-3 rounded-lg bg-red-500/10 border border-red-500/30 mt-3 animate-fade-in">
                    <i data-lucide="shield-alert" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 text-red-600 dark:text-red-500"></i>
                    <p class="text-sm text-red-800 dark:text-red-200 leading-relaxed"><strong class="text-red-700 dark:text-red-400">🛑 Alerta de Flujo:</strong> Operación en Sucursal 2 detenida preventivamente para mitigar riesgo de cartera vencida (Deuda: $12,500 MXN).</p>
                </div>
            `;
            lucide.createIcons();
        }

        if (tasksContainer) {
            tasksContainer.innerHTML = `
                <div id="task-card-locked" class="bg-red-500/5 border border-red-500/20 rounded-xl p-5 shadow-lg flex flex-col relative overflow-hidden animate-fade-in">
                    <div class="absolute inset-0 bg-white/90 dark:bg-dark-bg/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                        <i data-lucide="lock" class="w-12 h-12 text-red-600 dark:text-red-500 mb-3 animate-pulse"></i>
                        <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Orden de Servicio Bloqueada</h4>
                        <p class="text-sm text-red-800 dark:text-red-300 max-w-md">Motivo: Factura F-904 (Monto: $12,500 MXN) presenta 15 días de adeudo. Orden pausada automáticamente por el módulo de Inteligencia Financiera de SONICBI.</p>
                    </div>
                    
                    <div class="opacity-30 blur-sm pointer-events-none">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <span class="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded uppercase font-medium">Bloqueado</span>
                                <h4 class="text-lg font-bold text-slate-900 dark:text-white mt-2">Mantenimiento Prev. Cámaras Suc. 2</h4>
                                <p class="text-sm text-slate-400">SLA Máximo: 2 horas</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
    }

    // --- Ticket B2B Integration Effects ---
    if (templateConfig && templateConfig.ticketId) {
        // 1. ML Alert
        if (templateConfig.urgencyLevel && (templateConfig.urgencyLevel.includes('Inmediato') || templateConfig.urgencyLevel.includes('Hoy'))) {
            const alertsContainer = document.getElementById('alerts-container');
            if (alertsContainer) {
                const newAlert = document.createElement('div');
                newAlert.className = "flex items-start p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-3 animate-fade-in";
                newAlert.innerHTML = `
                    <i data-lucide="shield-alert" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 text-red-600 dark:text-red-500"></i>
                    <p class="text-sm text-red-800 dark:text-red-200 leading-relaxed"><strong class="text-red-700 dark:text-red-400">🚨 Alerta crítica:</strong> Ticket B2B (${templateConfig.ticketId}) recibido con prioridad ${templateConfig.urgencyLevel.toUpperCase()}. Despachando cuadrilla más cercana.</p>
                `;
                alertsContainer.prepend(newAlert);
                lucide.createIcons();
            }
        }
        
        // 2. Mobile Simulator Task
        const tasksContainer = document.getElementById('tasks-container');
        if (tasksContainer) {
            const taskHTML = createTaskHTML(Date.now(), templateConfig.name, "SLA: " + templateConfig.urgencyLevel, "Pendiente");
            // Remove the locked task to make it cleaner or just prepend
            tasksContainer.insertAdjacentHTML('afterbegin', taskHTML);
            lucide.createIcons();
        }
        
        // 3. GPS Flashing Pin
        const map = document.getElementById('gps-map-container');
        if (map) {
            const pinId = 'pin-ticket-' + Date.now();
            const pinHTML = `
                <div id="${pinId}" 
                     class="absolute flex justify-center items-center group cursor-crosshair z-50 animate-bounce"
                     style="top: 45%; left: 55%;">
                    <div class="relative flex justify-center items-center">
                        <div class="absolute w-12 h-12 bg-red-500 rounded-full opacity-40 animate-ping"></div>
                        <div class="w-5 h-5 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] border-2 border-white z-10 flex items-center justify-center">
                            <i data-lucide="alert-triangle" class="w-3 h-3 text-white"></i>
                        </div>
                    </div>
                </div>
            `;
            map.insertAdjacentHTML('beforeend', pinHTML);
            lucide.createIcons();
            
            showToast('GPS actualizado con ubicación de Sucursal afectada.', 'success');
        }
    }
};

window.openEvidenceModal = function() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeModal = function() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
};

window.simulatePayment = function() {
    showToast('✅ Pago procesado exitosamente. Liberando orden de servicio...', 'success');
    
    // Update CRM UI
    const crmCard = document.getElementById('crm-sucursal-2');
    const crmStatus = document.getElementById('crm-status-2');
    const crmAction = document.getElementById('crm-action-2');
    
    if (crmCard && crmStatus && crmAction) {
        crmCard.className = 'bg-dark-bg border border-cyan-500/50 rounded-xl p-5 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative overflow-hidden transition-all duration-500';
        crmStatus.className = 'bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded border border-cyan-500/30 flex items-center';
        crmStatus.innerHTML = '<i data-lucide="zap" class="w-3 h-3 mr-1"></i> En Proceso';
        crmAction.className = 'mt-4 text-xs text-cyan-400 flex items-center relative z-10';
        crmAction.innerHTML = '<i data-lucide="tool" class="w-4 h-4 mr-1"></i> Técnico habilitado';
        
        const bgLock = crmCard.querySelector('.absolute.-right-4');
        if(bgLock) bgLock.remove();
        
        lucide.createIcons();
    }

    // Update Tasks UI
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        tasksContainer.innerHTML = createTaskHTML(3, "Mantenimiento Preventivo Cámaras Suc. 2", "SLA Máximo: 2 horas", "Activa");
        initTasks();
        lucide.createIcons();
    }
    
    // Switch view back to Tasks automatically
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.getAttribute('data-view') === 'tasks') b.click();
    });
};

window.resetDemo = function() {
    localStorage.removeItem('sonicbi_demo_state');
    window.location.reload();
};

function createTaskHTML(taskId, title, subtitle, status) {
    return `
        <div id="task-card-${taskId}" class="bg-dark-card border border-dark-border rounded-xl p-5 shadow-lg flex flex-col animate-fade-in">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs rounded uppercase font-medium">${status}</span>
                    <h4 class="text-lg font-bold text-slate-900 dark:text-white mt-2">${title}</h4>
                    <p class="text-sm text-slate-400">${subtitle}</p>
                </div>
                <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-dark-border">
                    <i data-lucide="wrench" class="w-5 h-5 text-brand-400"></i>
                </div>
            </div>
            
            <div class="space-y-4 mb-6 flex-1">
                <div class="mb-2">
                    <label class="block text-xs font-medium text-slate-400 mb-1">Asignar a (Técnico/Cuadrilla):</label>
                    <select onchange="showToast('Técnico asignado exitosamente y notificado en su app móvil.', 'success')" class="w-full bg-dark-bg border border-dark-border text-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-brand-500">
                        <option value="" disabled selected>-- Selecciona un colaborador --</option>
                        ${JSON.parse(localStorage.getItem('sonicbi_hr') || '[]').map(e => `<option value="${e.name}">${e.name} (${e.role})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Evidencia Fotográfica (Candado)</label>
                    <div class="flex items-center space-x-3">
                        <input type="file" id="evidence-${taskId}" class="hidden" accept="image/*,.pdf">
                        <label for="evidence-${taskId}" class="cursor-pointer bg-dark-bg border border-dark-border hover:border-brand-500 text-sm text-slate-300 py-2 px-4 rounded-lg flex items-center transition-colors">
                            <i data-lucide="upload-cloud" class="w-4 h-4 mr-2"></i> Subir Reporte/Foto
                        </label>
                        <span id="evidence-status-${taskId}" class="text-xs text-slate-500">Ningún archivo...</span>
                    </div>
                    <p id="evidence-error-${taskId}" class="text-xs text-red-500 mt-1 hidden">⚠️ Evidencia obligatoria para terminar.</p>
                </div>
            </div>

            <div class="flex space-x-2 border-t border-dark-border pt-4">
                <button onclick="saveTaskDraft(${taskId})" class="flex-1 bg-dark-bg hover:bg-slate-700 border border-dark-border text-slate-300 py-2 rounded transition-colors text-sm font-medium">
                    Guardar Avance
                </button>
                <button onclick="postponeTask(${taskId})" class="flex-1 bg-dark-bg hover:bg-orange-500/20 border border-dark-border text-orange-400 py-2 rounded transition-colors text-sm font-medium">
                    Posponer
                </button>
                <button onclick="finishTask(${taskId})" class="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded transition-colors text-sm font-medium">
                    Terminar
                </button>
            </div>
            
            <div class="mt-4 border-t border-dark-border pt-4">
                <h5 class="text-sm font-medium text-slate-300 mb-2 flex items-center"><i data-lucide="message-square" class="w-4 h-4 mr-1"></i> Chat de Seguimiento</h5>
                <div id="chat-box-${taskId}" class="h-32 bg-dark-bg border border-dark-border rounded p-3 overflow-y-auto space-y-2 mb-2 text-sm flex flex-col">
                </div>
                <div class="flex space-x-2">
                    <input type="text" id="chat-input-${taskId}" placeholder="Escribe un comentario..." class="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500">
                    <button onclick="sendChatMessage(${taskId})" class="bg-brand-500 text-white px-3 py-1.5 rounded hover:bg-brand-600 transition-colors">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- CUSTOM TEMPLATE CREATOR LOGIC ---
let customNodesTemp = [];
let currentEditingTemplateId = null;

window.openCustomTemplateModal = function(editId = null) {
    currentEditingTemplateId = editId;
    
    if (editId) {
        let stored = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
        const tpl = stored.find(t => t.id === editId);
        if (tpl) {
            customNodesTemp = [...tpl.nodes];
            document.getElementById('custom-tpl-name').value = tpl.name;
            document.getElementById('custom-tpl-type').value = tpl.type;
        }
    } else {
        customNodesTemp = [];
        document.getElementById('custom-tpl-name').value = '';
        document.getElementById('custom-tpl-type').value = 'gantt';
    }
    
    document.getElementById('custom-tpl-node-input').value = '';
    renderCustomNodesList();
    const modal = document.getElementById('custom-template-modal');
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({root: modal});
};

window.closeCustomTemplateModal = function() {
    document.getElementById('custom-template-modal').classList.add('hidden');
};

window.addCustomNode = function() {
    const input = document.getElementById('custom-tpl-node-input');
    const val = input.value.trim();
    if (val) {
        customNodesTemp.push(val);
        input.value = '';
        renderCustomNodesList();
    }
};

window.renderCustomNodesList = function() {
    const list = document.getElementById('custom-tpl-nodes-list');
    if (customNodesTemp.length === 0) {
        list.innerHTML = '<li class="text-slate-500 text-xs text-center py-2 italic" id="custom-tpl-empty-msg">No hay nodos agregados. Escribe uno arriba.</li>';
        return;
    }
    
    list.innerHTML = customNodesTemp.map((node, i) => `
        <li class="bg-dark-card border border-dark-border rounded px-3 py-2 flex justify-between items-center text-sm text-slate-300">
            <span><span class="text-brand-500 font-bold mr-2">${i+1}.</span>${node}</span>
            <div class="flex space-x-2">
                <button onclick="editCustomNode(${i})" class="text-slate-400 hover:text-brand-400 transition-colors" title="Editar"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="removeCustomNode(${i})" class="text-red-400 hover:text-red-300 transition-colors" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </li>
    `).join('');
    if (window.lucide) lucide.createIcons({root: list});
};

window.editCustomNode = function(index) {
    const newName = prompt('Editar nombre del paso/sucursal:', customNodesTemp[index]);
    if (newName && newName.trim() !== '') {
        customNodesTemp[index] = newName.trim();
        renderCustomNodesList();
    }
};

window.removeCustomNode = function(index) {
    customNodesTemp.splice(index, 1);
    renderCustomNodesList();
};

window.saveAndDeployCustomTemplate = function() {
    const name = document.getElementById('custom-tpl-name').value.trim();
    const type = document.getElementById('custom-tpl-type').value;
    
    if (!name) {
        showToast('Debes ingresar un nombre para la plantilla', 'error');
        return;
    }
    if (customNodesTemp.length === 0) {
        showToast('Debes agregar al menos un nodo o sucursal', 'error');
        return;
    }
    
    let stored = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
    let templateIdToLoad = null;

    if (currentEditingTemplateId) {
        const idx = stored.findIndex(t => t.id === currentEditingTemplateId);
        if (idx !== -1) {
            stored[idx].name = name;
            stored[idx].type = type;
            stored[idx].nodes = [...customNodesTemp];
        }
        templateIdToLoad = currentEditingTemplateId;
        showToast('Plantilla actualizada con éxito', 'success');
    } else {
        const newId = 'custom_' + Date.now();
        const templateData = {
            id: newId,
            name: name,
            type: type,
            nodes: [...customNodesTemp]
        };
        stored.push(templateData);
        templateIdToLoad = newId;
        showToast('Plantilla personalizada creada con éxito', 'success');
    }
    
    localStorage.setItem('sonicbi_custom_templates', JSON.stringify(stored));
    
    closeCustomTemplateModal();
    renderCustomTemplateButtons();
    loadTemplate(templateIdToLoad);
};

window.renderCustomTemplateButtons = function() {
    const container = document.getElementById('template-buttons-container');
    if (!container) return;
    
    const existing = container.querySelectorAll('div[id^="wrapper-custom_"]');
    existing.forEach(b => b.remove());
    
    let stored = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
    stored.forEach(tpl => {
        const wrapper = document.createElement('div');
        wrapper.id = 'wrapper-custom_' + tpl.id;
        wrapper.className = "flex items-center space-x-1 ml-2 bg-brand-500/10 border border-brand-500/30 rounded-lg p-1";

        const btn = document.createElement('button');
        btn.onclick = () => loadTemplate(tpl.id);
        btn.className = "text-brand-400 font-medium py-1 px-2 hover:bg-brand-500/20 rounded transition-colors flex items-center text-sm whitespace-nowrap";
        btn.innerHTML = `<i data-lucide="star" class="w-4 h-4 mr-2"></i> [Custom] ${tpl.name}`;
        
        const btnEdit = document.createElement('button');
        btnEdit.onclick = () => openCustomTemplateModal(tpl.id);
        btnEdit.className = "text-slate-400 hover:text-brand-400 p-1 rounded transition-colors";
        btnEdit.innerHTML = `<i data-lucide="edit-2" class="w-3.5 h-3.5"></i>`;
        btnEdit.title = "Editar plantilla";

        const btnDel = document.createElement('button');
        btnDel.onclick = () => deleteCustomTemplate(tpl.id);
        btnDel.className = "text-slate-400 hover:text-red-400 p-1 rounded transition-colors";
        btnDel.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>`;
        btnDel.title = "Eliminar plantilla";

        wrapper.appendChild(btn);
        wrapper.appendChild(btnEdit);
        wrapper.appendChild(btnDel);

        container.insertBefore(wrapper, container.lastElementChild);
    });
    if (window.lucide) lucide.createIcons({root: container});
};

window.deleteCustomTemplate = function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta plantilla personalizada?')) {
        let stored = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
        stored = stored.filter(t => t.id !== id);
        localStorage.setItem('sonicbi_custom_templates', JSON.stringify(stored));
        
        showToast('🗑️ Plantilla eliminada correctamente', 'error');
        
        const state = localStorage.getItem('sonicbi_demo_state');
        if (state === 'template_loaded_' + id) {
            loadTemplate('fo');
        }
        renderCustomTemplateButtons();
    }
};

// --- CRM LOGIC ---
function initCRM() {
    renderClientsTable();
}

window.saveClient = function(e) {
    e.preventDefault();
    const name = document.getElementById('crm-client-name').value;
    const rfc = document.getElementById('crm-client-rfc').value;
    const branches = document.getElementById('crm-client-branches').value;
    
    let clients = JSON.parse(localStorage.getItem('sonicbi_clients') || '[]');
    clients.push({ name, rfc, branches });
    localStorage.setItem('sonicbi_clients', JSON.stringify(clients));
    
    showToast('Cliente guardado exitosamente', 'success');
    e.target.reset();
    renderClientsTable();
};

window.renderClientsTable = function() {
    const tbody = document.getElementById('crm-clients-table-body');
    if (!tbody) return;
    
    let clients = JSON.parse(localStorage.getItem('sonicbi_clients') || '[]');
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-slate-500 italic">No hay clientes registrados.</td></tr>';
        return;
    }
    
    tbody.innerHTML = clients.map(c => `
        <tr class="border-b border-dark-border bg-dark-bg/30 hover:bg-dark-bg/80 transition-colors">
            <td class="px-4 py-3 text-slate-900 dark:text-white font-medium">${c.name}</td>
            <td class="px-4 py-3 text-brand-400 font-mono">${c.rfc}</td>
            <td class="px-4 py-3 text-center text-slate-300">${c.branches}</td>
        </tr>
    `).join('');
};

// --- QUOTES LOGIC ---
function initQuotes() {
    let quotes = JSON.parse(localStorage.getItem('sonicbi_quotes') || '[]');
    if (quotes.length === 0) {
        // Pre-fill mock data
        quotes = [
            { id: 1, folio: 'COT-001A', client: 'Corporativo Tiendas Norte', service: 'Despliegue Fibra (5 Sitios)', monto: 120000, margen: 45000, status: 'Enviada' },
            { id: 2, folio: 'COT-002B', client: 'Hospitales del Sur', service: 'Mantenimiento Cámaras (2 Sitios)', monto: 45000, margen: 15000, status: 'Borrador' }
        ];
        localStorage.setItem('sonicbi_quotes', JSON.stringify(quotes));
    }
    renderQuotesTable();
}

window.renderQuotesTable = function() {
    const tbody = document.getElementById('quotes-table-body');
    if (!tbody) return;
    
    let quotes = JSON.parse(localStorage.getItem('sonicbi_quotes') || '[]');
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    
    tbody.innerHTML = quotes.map(q => {
        let statusBadge = '';
        let actionBtn = '';
        
        if (q.status === 'Aprobada') {
            statusBadge = '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30 flex items-center justify-center w-fit mx-auto"><i data-lucide="check-circle" class="w-3 h-3 mr-1"></i> Aprobada</span>';
        } else if (q.status === 'Enviada') {
            statusBadge = '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 flex items-center justify-center w-fit mx-auto"><i data-lucide="send" class="w-3 h-3 mr-1"></i> Enviada</span>';
            actionBtn = `<button onclick="approveQuote(${q.id})" class="text-xs bg-brand-500 hover:bg-brand-600 text-white px-2 py-1 rounded transition-colors w-full">Aprobar</button>`;
        } else {
            statusBadge = '<span class="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded border border-slate-500/30 flex items-center justify-center w-fit mx-auto"><i data-lucide="file-edit" class="w-3 h-3 mr-1"></i> Borrador</span>';
            actionBtn = `<button class="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded w-full cursor-not-allowed">Editar</button>`;
        }
        
        return `
        <tr class="border-b border-dark-border bg-dark-bg/30 hover:bg-dark-bg/80 transition-colors">
            <td class="px-4 py-3 text-slate-900 dark:text-white font-medium">${q.folio}</td>
            <td class="px-4 py-3 text-slate-300">${q.client}</td>
            <td class="px-4 py-3 text-slate-300">${q.service}</td>
            <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">${formatter.format(q.monto)}</td>
            <td class="px-4 py-3 text-right font-medium ${q.margen < 0 ? 'text-red-400' : 'text-brand-400'}">${formatter.format(q.margen)}</td>
            <td class="px-4 py-3 text-center">${statusBadge}</td>
            <td class="px-4 py-3 text-center">${actionBtn}</td>
        </tr>
        `;
    }).join('');
    
    if (window.lucide) lucide.createIcons({root: tbody});
};

window.approveQuote = function(id) {
    let quotes = JSON.parse(localStorage.getItem('sonicbi_quotes') || '[]');
    const qIndex = quotes.findIndex(q => q.id === id);
    if (qIndex === -1) return;
    
    quotes[qIndex].status = 'Aprobada';
    localStorage.setItem('sonicbi_quotes', JSON.stringify(quotes));
    
    renderQuotesTable();
    showToast('⚡ Cotización aprobada. Proyecto operativo creado.', 'success');
    
    // Create automatic custom template based on the quote
    let customNodes = ["Kickoff & Planificación", "Adquisición de Materiales", "Ejecución Técnica", "Validación y Entrega"];
    const newId = 'custom_auto_' + Date.now();
    const templateData = {
        id: newId,
        name: `Proyecto: ${quotes[qIndex].client}`,
        type: 'gantt',
        nodes: customNodes
    };
    
    let storedTpl = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
    storedTpl.push(templateData);
    localStorage.setItem('sonicbi_custom_templates', JSON.stringify(storedTpl));
    
    if (typeof renderCustomTemplateButtons === 'function') {
        renderCustomTemplateButtons();
    }
};

// --- HR LOGIC ---
function initHR() {
    let hr = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    if (hr.length === 0) {
        // Pre-fill mock data based on prompt requirements
        hr = [
            { id: 1, name: 'Ing. Carlos Mendoza', role: 'Ingeniero Senior', manager: 'Dirección de Operaciones', status: '🟢 ACTIVO', degree: 'Ingeniería', cert: 'Certificación CCNA, FOA', nss: 'NSS-4109-78-1234', stars: 5, v_taken: 5, v_rem: 15, p_time: 95, p_proj: 88, p_tasks: 92 },
            { id: 2, name: 'David López', role: 'Técnico Instalador', manager: 'Ing. Carlos Mendoza', status: '🟢 ACTIVO', degree: 'Técnico Superior', cert: 'Básico FO', nss: 'NSS-4109-78-5678', stars: 3, v_taken: 1, v_rem: 9, p_time: 70, p_proj: 60, p_tasks: 80 }
        ];
        localStorage.setItem('sonicbi_hr', JSON.stringify(hr));
    }
    renderEmployees();
}

window.saveEmployee = function(e) {
    e.preventDefault();
    const name = document.getElementById('hr-name').value;
    const role = document.getElementById('hr-role').value;
    const manager = document.getElementById('hr-manager').value;
    const degree = document.getElementById('hr-degree').value;
    const cert = document.getElementById('hr-cert').value || 'Sin Certificación';
    const nss = document.getElementById('hr-nss').value || 'NSS-XXXX-XX-XXXX';
    
    // Auto-generate random performance metrics
    const stars = Math.floor(Math.random() * 3) + 3; // 3 to 5
    const p_time = Math.floor(Math.random() * 30) + 70; // 70 to 100
    const p_proj = Math.floor(Math.random() * 40) + 60; // 60 to 100
    const p_tasks = Math.floor(Math.random() * 30) + 70; // 70 to 100
    const v_taken = Math.floor(Math.random() * 10);
    const v_rem = 20 - v_taken;

    let hr = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    hr.push({ id: Date.now(), name, role, manager, status: '🟢 ACTIVO', degree, cert, nss, stars, v_taken, v_rem, p_time, p_proj, p_tasks });
    localStorage.setItem('sonicbi_hr', JSON.stringify(hr));
    
    showToast('Colaborador registrado y sincronizado exitosamente.', 'success');
    e.target.reset();
    renderEmployees();
    renderCommDMs();
    initTasks(); // Refresh tasks dropdowns
};

window.toggleDossier = function(id) {
    const el = document.getElementById(`dossier-${id}`);
    if(el) {
        if(el.classList.contains('hidden')) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
};

window.renderEmployees = function() {
    const list = document.getElementById('hr-list');
    if (!list) return;
    
    let hr = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    
    list.innerHTML = hr.map(emp => {
        const isAvailable = emp.status.includes('🟢');
        let statusBadge = isAvailable ? `text-emerald-400 bg-emerald-500/10 border-emerald-500/20` : `text-red-400 bg-red-500/10 border-red-500/20`;
        let starsHtml = Array(5).fill(0).map((_, i) => `<i data-lucide="star" class="w-3 h-3 ${i < emp.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}"></i>`).join('');
        
        return `
        <div class="bg-dark-bg/50 border border-dark-border rounded-lg p-4 hover:bg-dark-bg/80 transition-colors">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="text-slate-900 dark:text-white font-medium flex items-center">
                        <i data-lucide="user" class="w-4 h-4 mr-2 text-slate-400"></i> ${emp.name}
                    </h4>
                    <p class="text-xs text-slate-400 mt-1 pl-6">Rol: ${emp.role} ${emp.manager ? `| Reporta a: ${emp.manager}` : ''}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="toggleDossier(${emp.id})" class="bg-dark-bg border border-dark-border hover:border-brand-500 text-slate-300 text-xs px-3 py-1.5 rounded transition-colors flex items-center">
                        <i data-lucide="search" class="w-3 h-3 mr-1"></i> Ver Expediente
                    </button>
                    <button onclick="openDirectMessage('${emp.name}')" class="bg-slate-700 hover:bg-brand-500 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center">
                        <i data-lucide="message-circle" class="w-3 h-3 mr-1"></i>
                    </button>
                </div>
            </div>
            
            <!-- Expandable Dossier -->
            <div id="dossier-${emp.id}" class="hidden mt-4 pt-4 border-t border-dark-border animate-fade-in">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- Academics & Competencies -->
                    <div class="bg-dark-card/50 p-3 rounded border border-dark-border">
                        <h5 class="text-xs font-bold text-slate-400 uppercase mb-2">A) Académico y Competencias</h5>
                        <p class="text-sm text-slate-300"><span class="font-medium text-slate-900 dark:text-white">Grado:</span> ${emp.degree}</p>
                        <p class="text-sm text-slate-300"><span class="font-medium text-slate-900 dark:text-white">Certificación:</span> ${emp.cert}</p>
                        <div class="flex items-center mt-1 text-sm text-slate-300">
                            <span class="font-medium text-slate-900 dark:text-white mr-2">Nivel:</span> <div class="flex">${starsHtml}</div>
                        </div>
                    </div>
                    
                    <!-- Labor & Legal -->
                    <div class="bg-dark-card/50 p-3 rounded border border-dark-border">
                        <h5 class="text-xs font-bold text-slate-400 uppercase mb-2">B) Datos Laborales</h5>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-slate-900 dark:text-white">Estado:</span>
                            <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${statusBadge}">${emp.status}</span>
                        </div>
                        <p class="text-sm text-slate-300"><span class="font-medium text-slate-900 dark:text-white">NSS:</span> <span class="font-mono text-brand-400">${emp.nss}</span></p>
                        <p class="text-sm text-slate-300 mt-1"><i data-lucide="sun" class="w-3 h-3 inline"></i> Vacaciones: <span class="text-orange-400">${emp.v_taken} tomados</span> | <span class="text-emerald-400">${emp.v_rem} restantes</span></p>
                    </div>
                </div>

                <!-- Performance Metrics -->
                <div class="bg-dark-card/50 p-3 rounded border border-dark-border">
                    <h5 class="text-xs font-bold text-slate-400 uppercase mb-3">C) Métricas de Desempeño Operativo</h5>
                    
                    <!-- Metric 1: Punctuality -->
                    <div class="mb-3">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-300">Horarios y Puntualidad</span>
                            <span class="text-violet-400 font-bold">${emp.p_time}%</span>
                        </div>
                        <div class="w-full bg-dark-bg rounded-full h-1.5">
                            <div class="bg-violet-500 h-1.5 rounded-full" style="width: ${emp.p_time}%"></div>
                        </div>
                    </div>
                    
                    <!-- Metric 2: Projects -->
                    <div class="mb-3">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-300">Proyectos Completados</span>
                            <span class="text-cyan-400 font-bold">${emp.p_proj}%</span>
                        </div>
                        <div class="w-full bg-dark-bg rounded-full h-1.5">
                            <div class="bg-cyan-500 h-1.5 rounded-full" style="width: ${emp.p_proj}%"></div>
                        </div>
                    </div>
                    
                    <!-- Metric 3: Rework -->
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-300">Tareas sin Re-trabajo</span>
                            <span class="text-emerald-400 font-bold">${emp.p_tasks}%</span>
                        </div>
                        <div class="w-full bg-dark-bg rounded-full h-1.5">
                            <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${emp.p_tasks}%"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        `;
    }).join('');
    
    if(window.lucide) lucide.createIcons({root: list});
};

// --- COMMUNICATIONS LOGIC ---
function initComm() {
    renderCommDMs();
}

window.renderCommDMs = function() {
    const list = document.getElementById('comm-dm-list');
    if (!list) return;
    
    let hr = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    list.innerHTML = hr.map(emp => `
        <li>
            <button onclick="openDirectMessage('${emp.name}')" class="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 text-slate-300 font-medium flex items-center truncate">
                <span class="w-2 h-2 rounded-full ${emp.status.includes('🟢') ? 'bg-emerald-500' : (emp.status.includes('🟡') ? 'bg-yellow-500' : 'bg-red-500')} mr-2"></span>
                ${emp.name}
            </button>
        </li>
    `).join('');
};

window.openDirectMessage = function(name) {
    // Navigate to Comm tab
    const commBtn = document.querySelector('.nav-btn[data-view="comm"]');
    if (commBtn) commBtn.click();
    
    // Update active chat title
    const titleEl = document.getElementById('comm-active-title');
    if (titleEl) {
        titleEl.innerHTML = `<span class="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> @${name}`;
    }
    
    // Clear history and show a new conversation
    const history = document.getElementById('comm-chat-history');
    if (history) {
        history.innerHTML = `
            <div class="flex items-start max-w-[80%]">
                <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0">
                    <i data-lucide="bot" class="w-4 h-4 text-brand-400"></i>
                </div>
                <div class="bg-dark-bg border border-dark-border p-3 rounded-lg rounded-tl-none">
                    <p class="text-sm text-slate-300">Este es el inicio de tu conversación directa con ${name}.</p>
                </div>
            </div>
        `;
        if(window.lucide) lucide.createIcons({root: history});
    }
};

window.sendMessage = function(e) {
    e.preventDefault();
    const input = document.getElementById('comm-input');
    const history = document.getElementById('comm-chat-history');
    if (!input.value.trim() || !history) return;
    
    // Add user message
    history.innerHTML += `
        <div class="flex items-start justify-end ml-auto max-w-[80%]">
            <div class="bg-brand-500 text-slate-900 dark:text-white p-3 rounded-lg rounded-tr-none">
                <p class="text-sm">${input.value}</p>
            </div>
        </div>
    `;
    
    input.value = '';
    history.scrollTop = history.scrollHeight;
    
    // Auto reply
    setTimeout(() => {
        history.innerHTML += `
            <div class="flex items-start max-w-[80%]">
                <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0">
                    <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
                </div>
                <div class="bg-dark-bg border border-dark-border p-3 rounded-lg rounded-tl-none">
                    <p class="text-sm text-slate-300">Mensaje recibido. En un momento te respondo.</p>
                </div>
            </div>
        `;
        if(window.lucide) lucide.createIcons({root: history});
        history.scrollTop = history.scrollHeight;
    }, 1000);
};

// --- INVENTORY LOGIC (PURCHASES SUBMODULES) ---
function initInventory() {
    let stock = JSON.parse(localStorage.getItem('sonicbi_stock') || '[]');
    if (stock.length === 0) {
        stock = [
            { code: 'FO-48H-MM', name: 'Bobina Fibra 48 Hilos (1KM)', category: 'Fibra', qty: 2, unit: 'Bobina', threshold: 5 },
            { code: 'CN-MEC-APC', name: 'Conector Mecánico SC/APC', category: 'Conectores', qty: 85, unit: 'Pieza', threshold: 100 },
            { code: 'HR-TNS-01', name: 'Tensor de Fibra', category: 'Herrajes', qty: 350, unit: 'Pieza', threshold: 50 },
            { code: 'CB-UTP-C6', name: 'Cable UTP Cat 6 (Bobina)', category: 'Cobre', qty: 15, unit: 'Bobina', threshold: 10 }
        ];
        localStorage.setItem('sonicbi_stock', JSON.stringify(stock));
    }
    
    let tools = JSON.parse(localStorage.getItem('sonicbi_tools') || '[]');
    if (tools.length === 0) {
        tools = [
            { id: 1, name: 'Fusionadora Fujikura 90S+', serial: 'FJK-90S-8834', status: 'En Almacén', assignee: null },
            { id: 2, name: 'Reflectómetro OTDR Exfo', serial: 'EXF-OTDR-1102', status: 'Asignado', assignee: 'Ing. Carlos Mendoza' },
            { id: 3, name: 'Escalera Dieléctrica 24ft', serial: 'LDR-24-009', status: 'En Almacén', assignee: null }
        ];
        localStorage.setItem('sonicbi_tools', JSON.stringify(tools));
    }
    
    renderStock();
    renderTools();
}

window.renderStock = function() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    
    let stock = JSON.parse(localStorage.getItem('sonicbi_stock') || '[]');
    tbody.innerHTML = stock.map(item => {
        const isCritical = item.qty < item.threshold;
        const statusHtml = isCritical 
            ? `<span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded uppercase font-bold flex items-center justify-center w-fit mx-auto"><i data-lucide="alert-triangle" class="w-3 h-3 mr-1"></i> Stock Crítico</span>`
            : `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center w-fit mx-auto">Suficiente</span>`;
            
        return `
            <tr class="bg-dark-bg/30 hover:bg-dark-bg/80 transition-colors ${isCritical ? 'bg-red-500/5' : ''}">
                <td class="px-3 py-3 font-mono text-xs text-brand-400">${item.code}</td>
                <td class="px-3 py-3 text-slate-300">
                    <p class="font-medium text-slate-900 dark:text-white">${item.name}</p>
                    <p class="text-[10px] text-slate-500">${item.category}</p>
                </td>
                <td class="px-3 py-3 text-center">
                    <span class="font-bold text-slate-900 dark:text-white text-lg ${isCritical ? 'text-red-400' : ''}">${item.qty}</span>
                    <span class="text-xs text-slate-400 block">${item.unit}</span>
                </td>
                <td class="px-3 py-3 text-center">${statusHtml}</td>
            </tr>
        `;
    }).join('');
    
    if(window.lucide) lucide.createIcons({root: tbody});
};

window.renderTools = function() {
    const tbody = document.getElementById('tools-table-body');
    if (!tbody) return;
    
    let tools = JSON.parse(localStorage.getItem('sonicbi_tools') || '[]');
    let hr = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    const hrOptions = hr.filter(e => e.status.includes('🟢') || e.status.includes('🟡'))
                        .map(e => `<option value="${e.name}">${e.name}</option>`).join('');
                        
    tbody.innerHTML = tools.map(tool => {
        const isAssigned = tool.status === 'Asignado';
        
        let actionHtml = '';
        if (isAssigned) {
            actionHtml = `<span class="text-xs text-slate-500">No disponible</span>`;
        } else {
            actionHtml = `
                <div class="flex items-center space-x-2">
                    <select id="assign-select-${tool.id}" class="bg-dark-bg border border-dark-border text-slate-300 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-brand-500 w-24">
                        <option value="" disabled selected>Técnico...</option>
                        ${hrOptions}
                    </select>
                    <button onclick="assignTool(${tool.id})" class="bg-slate-700 hover:bg-brand-500 text-white text-[10px] font-medium py-1 px-2 rounded transition-colors whitespace-nowrap">
                        Asignar
                    </button>
                </div>
            `;
        }
        
        return `
            <tr class="bg-dark-bg/30 hover:bg-dark-bg/80 transition-colors">
                <td class="px-3 py-3 text-slate-300 font-medium">${tool.name}</td>
                <td class="px-3 py-3 font-mono text-[10px] text-slate-500">${tool.serial}</td>
                <td class="px-3 py-3 text-center">
                    ${isAssigned 
                        ? `<span class="px-2 py-1 bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] rounded block text-center truncate w-24 mx-auto" title="Asignado a: ${tool.assignee}">${tool.assignee}</span>`
                        : `<span class="px-2 py-1 bg-slate-700 text-slate-300 text-[10px] rounded block text-center w-24 mx-auto">En Almacén</span>`
                    }
                </td>
                <td class="px-3 py-3 text-center">${actionHtml}</td>
            </tr>
        `;
    }).join('');
};

window.assignTool = function(toolId) {
    const select = document.getElementById(`assign-select-${toolId}`);
    if (!select || !select.value) {
        showToast('Debes seleccionar un técnico', 'error');
        return;
    }
    
    const assignee = select.value;
    let tools = JSON.parse(localStorage.getItem('sonicbi_tools') || '[]');
    const idx = tools.findIndex(t => t.id === toolId);
    if (idx !== -1) {
        tools[idx].status = 'Asignado';
        tools[idx].assignee = assignee;
        localStorage.setItem('sonicbi_tools', JSON.stringify(tools));
        
        showToast(`Equipo asignado a ${assignee} exitosamente`, 'success');
        renderTools();
    }
};

window.ingresarFacturaAlStock = function() {
    const btn = document.getElementById('btn-ingresar-stock');
    if (btn.disabled) return;
    
    let stock = JSON.parse(localStorage.getItem('sonicbi_stock') || '[]');
    const itemsToIngest = DATA.ocrMockResult.items;
    
    itemsToIngest.forEach(ingestItem => {
        const existingIdx = stock.findIndex(s => s.code === ingestItem.code);
        if (existingIdx !== -1) {
            stock[existingIdx].qty += ingestItem.qty;
        } else {
            stock.push(ingestItem);
        }
    });
    
    localStorage.setItem('sonicbi_stock', JSON.stringify(stock));
    
    // Disable button
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.innerHTML = '<i data-lucide="check" class="w-3 h-3 mr-1"></i> Artículos Ingresados';
    lucide.createIcons({root: btn.parentElement});
    
    showToast('Los artículos de la factura han sido ingresados al Almacén', 'success');
    renderStock();
};

// --- MOBILE APP SIMULATOR LOGIC ---
function initMobileApp() {
    updateMobileTime();
    setInterval(updateMobileTime, 60000);
    
    renderMobileTasks();
    renderMobileInventory();
}

function updateMobileTime() {
    const timeEl = document.getElementById('mobile-time');
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

window.switchMobileView = function(viewId) {
    // Update nav styling
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-brand-400', 'active');
        btn.classList.add('text-slate-500');
    });
    const activeBtn = document.querySelector(`.mobile-nav-btn[data-mview="${viewId}"]`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('text-brand-400', 'active');
    }
    
    // Switch views
    document.querySelectorAll('.mobile-inner-view').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`mobile-view-${viewId}`);
    if(targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('animate-fade-in');
    }
};

window.renderMobileTasks = function() {
    const container = document.getElementById('mobile-view-tasks');
    if (!container) return;
    
    // We mock the tasks that would be assigned to this user
    container.innerHTML = `
        <div class="bg-dark-card border border-brand-500/30 rounded-2xl p-4 shadow-lg mb-3">
            <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-1 bg-brand-500/20 text-brand-400 text-[10px] rounded uppercase font-bold">Activa</span>
                <span class="text-[10px] text-slate-400">#TK-9922</span>
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm mb-1">Mantenimiento de Cámara (Suc 1)</h3>
            <p class="text-xs text-slate-400 mb-4"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1 text-brand-500"></i> Av. Tecnológico 1200</p>
            
            <div class="space-y-2">
                <button onclick="document.getElementById('mobile-ev-input').click()" class="w-full bg-dark-bg border border-dark-border text-slate-300 py-2 rounded-lg text-xs font-medium flex items-center justify-center hover:border-brand-500 transition-colors">
                    <i data-lucide="camera" class="w-4 h-4 mr-2"></i> Subir Foto Evidencia
                </button>
                <input type="file" id="mobile-ev-input" class="hidden" accept="image/*">
                
                <button onclick="completeMobileTask(this)" class="w-full bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-xs font-medium transition-colors">
                    Terminar Tarea
                </button>
            </div>
        </div>
        
        <div class="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-lg opacity-50">
            <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-1 bg-slate-500/20 text-slate-400 text-[10px] rounded uppercase font-bold">Pendiente</span>
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm mb-1">Empalme Fibra Nivel 2</h3>
            <p class="text-xs text-slate-400"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1"></i> Nodo Central Sur</p>
        </div>
    `;
    if(window.lucide) lucide.createIcons({root: container});
};

window.completeMobileTask = function(btn) {
    btn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 mr-1 inline"></i> Completado';
    btn.classList.replace('bg-brand-500', 'bg-emerald-500');
    btn.classList.replace('hover:bg-brand-600', 'hover:bg-emerald-600');
    btn.disabled = true;
    
    showToast('Tarea completada sincronizada con SONICBI Central', 'success');
    
    // Simulate updating the web app global state if it's the specific task
    const globalTask = document.getElementById('task-card-2'); // Hardcoded mapping for demo
    if (globalTask) {
        const titleArea = globalTask.querySelector('h4');
        if (titleArea && titleArea.textContent.includes('Cámara')) {
            const statusBadge = globalTask.querySelector('.bg-brand-500\\/20');
            if (statusBadge) {
                statusBadge.className = 'px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded uppercase font-medium';
                statusBadge.textContent = 'Completado';
                globalTask.classList.add('border-emerald-500/30');
            }
        }
    }
};

window.renderMobileInventory = function() {
    const container = document.getElementById('mobile-view-inventory');
    if (!container) return;
    
    let tools = JSON.parse(localStorage.getItem('sonicbi_tools') || '[]');
    const myTools = tools.filter(t => t.assignee === 'Ing. Carlos Mendoza');
    
    let html = `
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mi Equipo Asignado</h3>
    `;
    
    if (myTools.length === 0) {
        html += `<div class="bg-dark-card rounded-xl p-4 text-center text-xs text-slate-500">No tienes equipo asignado.</div>`;
    } else {
        html += myTools.map(t => `
            <div class="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center shadow-lg">
                <div class="w-10 h-10 rounded-lg bg-dark-bg flex items-center justify-center mr-3 flex-shrink-0">
                    <i data-lucide="wrench" class="w-5 h-5 text-brand-500"></i>
                </div>
                <div>
                    <p class="font-bold text-slate-900 dark:text-white text-xs">${t.name}</p>
                    <p class="text-[10px] text-slate-400 font-mono">SN: ${t.serial}</p>
                </div>
            </div>
        `).join('');
    }
    
    html += `
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Consumibles en Camioneta</h3>
        <div class="bg-dark-card border border-dark-border rounded-xl p-3 shadow-lg flex justify-between items-center mb-2">
            <div>
                <p class="font-bold text-slate-900 dark:text-white text-xs">Bobina Fibra (1KM)</p>
                <p class="text-[10px] text-slate-400">FO-48H-MM</p>
            </div>
            <span class="text-brand-400 font-bold text-sm">1</span>
        </div>
        <div class="bg-dark-card border border-dark-border rounded-xl p-3 shadow-lg flex justify-between items-center">
            <div>
                <p class="font-bold text-slate-900 dark:text-white text-xs">Conectores SC/APC</p>
                <p class="text-[10px] text-slate-400">CN-MEC-APC</p>
            </div>
            <span class="text-brand-400 font-bold text-sm">45</span>
        </div>
    `;
    
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons({root: container});
};

window.sendMobileMessage = function(e) {
    e.preventDefault();
    const input = document.getElementById('mobile-chat-input');
    const history = document.getElementById('mobile-chat-history');
    if (!input.value.trim() || !history) return;
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    history.innerHTML += `
        <div class="flex items-start justify-end ml-auto max-w-[85%]">
            <div class="bg-brand-500 text-slate-900 dark:text-white px-3 py-2 rounded-2xl rounded-tr-sm">
                <p class="text-xs">${input.value}</p>
                <p class="text-[8px] text-brand-200 text-right mt-1">${time}</p>
            </div>
        </div>
    `;
    
    input.value = '';
    history.scrollTop = history.scrollHeight;
    
    setTimeout(() => {
        history.innerHTML += `
            <div class="flex items-start max-w-[85%] mt-2">
                <div class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center mr-2 flex-shrink-0">
                    <i data-lucide="bot" class="w-3 h-3 text-brand-400"></i>
                </div>
                <div class="bg-dark-card border border-dark-border px-3 py-2 rounded-2xl rounded-tl-sm">
                    <p class="text-xs text-slate-300">Entendido, actualizo la base de control.</p>
                </div>
            </div>
        `;
        if(window.lucide) lucide.createIcons({root: history});
        history.scrollTop = history.scrollHeight;
    }, 1500);
};

// --- GPS TRACKER & TELEMETRY LOGIC ---
let gpsInterval;
function initGPS() {
    let hrData = JSON.parse(localStorage.getItem('sonicbi_hr') || '[]');
    if (hrData.length === 0) return; // No personnel
    
    let gpsData = JSON.parse(localStorage.getItem('sonicbi_gps') || '[]');
    
    // Initialize GPS coordinates for employees if not exists
    if (gpsData.length === 0 || gpsData.length !== hrData.length) {
        gpsData = hrData.map(emp => {
            // Determine category and color based on role
            let cat = 'Técnicos';
            let color = 'bg-cyan-500';
            let shadow = 'shadow-[0_0_10px_rgba(6,182,212,0.8)]';
            
            if (emp.role.includes('Supervisor') || emp.role.includes('Gerente')) {
                cat = 'Supervisores';
                color = 'bg-emerald-500';
                shadow = 'shadow-[0_0_10px_rgba(16,185,129,0.8)]';
            } else if (emp.role.includes('Director') || emp.role.includes('Jefe')) {
                cat = 'Directivos';
                color = 'bg-purple-500';
                shadow = 'shadow-[0_0_10px_rgba(168,85,247,0.8)]';
            }
            
            return {
                id: emp.id,
                name: emp.name,
                role: emp.role,
                category: cat,
                color: color,
                shadow: shadow,
                x: Math.floor(Math.random() * 80) + 10, // 10% to 90%
                y: Math.floor(Math.random() * 80) + 10,
                battery: Math.floor(Math.random() * 50) + 50,
                signal: Math.floor(Math.random() * 2) + 3 // 3 or 4
            };
        });
        localStorage.setItem('sonicbi_gps', JSON.stringify(gpsData));
    }
    
    renderGPSList();
    renderGPSMap();
    
    // Start Telemetry Engine
    if(gpsInterval) clearInterval(gpsInterval);
    gpsInterval = setInterval(telemetryLoop, 4000); // Update every 4 seconds
}

function renderGPSList() {
    const container = document.getElementById('gps-list-container');
    if (!container) return;
    
    const gpsData = JSON.parse(localStorage.getItem('sonicbi_gps') || '[]');
    
    const cats = ['Técnicos', 'Supervisores', 'Directivos'];
    let html = '';
    
    cats.forEach(cat => {
        const personnel = gpsData.filter(p => p.category === cat);
        if(personnel.length === 0) return;
        
        let catColor = cat === 'Técnicos' ? 'text-cyan-400' : (cat === 'Supervisores' ? 'text-emerald-400' : 'text-purple-400');
        
        html += `
            <div>
                <h4 class="text-xs font-bold ${catColor} uppercase tracking-wider mb-3 border-b border-dark-border pb-1">${cat}</h4>
                <div class="space-y-2">
        `;
        
        personnel.forEach(p => {
            html += `
                <div onclick="focusPin(${p.id})" class="bg-dark-bg border border-dark-border rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:border-brand-500 transition-colors group">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center mr-3 border border-dark-border group-hover:border-${p.color.split('-')[1]}-500 transition-colors">
                            <i data-lucide="user" class="w-4 h-4 text-slate-400 group-hover:text-white"></i>
                        </div>
                        <div>
                            <p class="font-bold text-slate-900 dark:text-white text-xs">${p.name}</p>
                            <p class="text-[10px] text-slate-400">${p.role}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end">
                        <div class="flex space-x-1.5 mb-1">
                            <i data-lucide="signal" class="w-3 h-3 text-slate-400"></i>
                            <i data-lucide="battery-${p.battery > 80 ? 'full' : 'medium'}" class="w-3 h-3 ${p.battery > 80 ? 'text-emerald-500' : 'text-amber-500'}"></i>
                        </div>
                        <p class="text-[9px] text-slate-500 font-mono tracking-tighter" id="coords-text-${p.id}">
                            ${p.x.toFixed(1)}°N ${p.y.toFixed(1)}°W
                        </p>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons({root: container});
}

function renderGPSMap() {
    const map = document.getElementById('gps-map-container');
    if (!map) return;
    
    const gpsData = JSON.parse(localStorage.getItem('sonicbi_gps') || '[]');
    let html = '';
    
    gpsData.forEach(p => {
        html += `
            <div id="pin-${p.id}" 
                 class="absolute flex justify-center items-center group cursor-crosshair z-10"
                 style="top: ${p.y}%; left: ${p.x}%; transition: top 2s ease-in-out, left 2s ease-in-out;">
                
                <!-- Pin Base -->
                <div class="relative flex justify-center items-center">
                    <div class="absolute w-6 h-6 ${p.color} rounded-full opacity-20 animate-ping"></div>
                    <div class="w-3 h-3 rounded-full ${p.color} ${p.shadow} border-2 border-[#0B1120] z-10"></div>
                </div>
                
                <!-- Hover Tooltip -->
                <div class="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform group-hover:-translate-y-1">
                    <p class="font-bold text-slate-900 dark:text-white text-xs mb-1">${p.name}</p>
                    <p class="text-[10px] text-brand-400 mb-2">${p.role}</p>
                    <div class="bg-dark-bg rounded p-1.5 border border-dark-border">
                        <p class="text-[9px] text-slate-400 uppercase">Tarea Activa</p>
                        <p class="text-xs text-slate-900 dark:text-white font-medium truncate">Ruta de Mantenimiento</p>
                        <div class="w-full bg-slate-700 h-1 mt-1.5 rounded-full overflow-hidden">
                            <div class="bg-emerald-500 h-full" style="width: 85%"></div>
                        </div>
                    </div>
                    <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-dark-card border-b border-r border-dark-border transform rotate-45"></div>
                </div>
            </div>
        `;
    });
    
    map.innerHTML = html;
}

function telemetryLoop() {
    const map = document.getElementById('gps-map-container');
    if (!map || map.parentElement.parentElement.classList.contains('hidden')) return; // Don't run if view is hidden
    
    let gpsData = JSON.parse(localStorage.getItem('sonicbi_gps') || '[]');
    
    gpsData = gpsData.map(p => {
        // Random walk logic (move -2% to 2% in both directions)
        let dx = (Math.random() * 4) - 2;
        let dy = (Math.random() * 4) - 2;
        
        p.x = Math.max(5, Math.min(95, p.x + dx));
        p.y = Math.max(5, Math.min(95, p.y + dy));
        
        // Update DOM Marker directly for smooth CSS transition
        const pin = document.getElementById(`pin-${p.id}`);
        if (pin) {
            pin.style.left = `${p.x}%`;
            pin.style.top = `${p.y}%`;
        }
        
        // Update Side List text directly without full re-render
        const coordsText = document.getElementById(`coords-text-${p.id}`);
        if(coordsText) {
            coordsText.textContent = `${p.x.toFixed(1)}°N ${p.y.toFixed(1)}°W`;
        }
        
        return p;
    });
    
    localStorage.setItem('sonicbi_gps', JSON.stringify(gpsData));
}

window.focusPin = function(id) {
    const pin = document.getElementById(`pin-${id}`);
    if (pin) {
        // Bring to front
        document.querySelectorAll('[id^="pin-"]').forEach(p => p.style.zIndex = '10');
        pin.style.zIndex = '50';
        
        // Create an explicit ping ring that flashes heavily
        const ring = document.createElement('div');
        ring.className = 'absolute inset-0 rounded-full bg-white border-2 border-white animate-ping opacity-80';
        ring.style.width = '4rem';
        ring.style.height = '4rem';
        ring.style.marginLeft = '-1.5rem';
        ring.style.marginTop = '-1.5rem';
        
        pin.appendChild(ring);
        
        setTimeout(() => {
            ring.remove();
        }, 1500);
    }
};

// --- INTERACTIVE SALES TOOLTIPS (DEMO GUIDE) ---
(function() {
    let demoTooltip = null;
    let exclusions = new Set();
    
    function createTooltip() {
        if(demoTooltip) return;
        demoTooltip = document.createElement('div');
        demoTooltip.className = 'fixed z-[9999] bg-[#1E293B] border border-slate-700 text-white rounded-xl shadow-2xl p-4 w-64 transition-opacity duration-200 opacity-0 pointer-events-auto flex flex-col hidden';
        demoTooltip.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-brand-400 uppercase tracking-wider flex items-center"><i data-lucide="info" class="w-3 h-3 mr-1"></i> Asistente de Ventas</span>
                <button class="text-slate-400 hover:text-white transition-colors" id="demo-guide-close">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed" id="demo-guide-text"></p>
        `;
        document.body.appendChild(demoTooltip);
        if(window.lucide) lucide.createIcons({root: demoTooltip});
        
        document.getElementById('demo-guide-close').addEventListener('click', (e) => {
            e.stopPropagation();
            hideTooltip();
            if (demoTooltip.currentElement) {
                exclusions.add(demoTooltip.currentElement);
            }
        });
    }

    function showTooltip(el, text) {
        if(exclusions.has(el)) return;
        
        createTooltip();
        demoTooltip.currentElement = el;
        document.getElementById('demo-guide-text').textContent = text;
        
        const rect = el.getBoundingClientRect();
        demoTooltip.classList.remove('hidden');
        
        // Force reflow
        void demoTooltip.offsetWidth;
        
        let tooltipWidth = demoTooltip.offsetWidth || 256;
        let tooltipHeight = demoTooltip.offsetHeight || 100;
        
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        
        const margin = 25; // Safe margin for scrollbars and edges
        
        // Adjust horizontal bounds
        if (left < margin) {
            left = margin;
        } else if (left + tooltipWidth > window.innerWidth - margin) {
            left = window.innerWidth - tooltipWidth - margin;
        }
        
        // Adjust vertical bounds
        if (top + tooltipHeight > window.innerHeight - margin) {
            top = rect.top - tooltipHeight - 10; 
            // If it still clips at the top, force it inside
            if (top < margin) {
                top = margin;
            }
        }
        
        demoTooltip.style.top = top + 'px';
        demoTooltip.style.left = left + 'px';
        
        requestAnimationFrame(() => {
            demoTooltip.classList.remove('opacity-0');
        });
    }

    function hideTooltip() {
        if(!demoTooltip) return;
        demoTooltip.classList.add('opacity-0');
        setTimeout(() => {
            if(demoTooltip.classList.contains('opacity-0')) {
                demoTooltip.classList.add('hidden');
            }
        }, 200);
    }

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-demo-guide]');
        if (target) {
            const text = target.getAttribute('data-demo-guide');
            if (text) showTooltip(target, text);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-demo-guide]');
        if (target) {
            if (!target.contains(e.relatedTarget)) {
                exclusions.delete(target);
                if(demoTooltip && demoTooltip.currentElement === target) {
                    hideTooltip();
                }
            }
        }
    });
})();

// --- THEME TOGGLE LOGIC ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if not specified since it's the original MVP look
    const isDark = savedTheme === 'dark' || !savedTheme;
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    const themeBtn = document.querySelector('button[title="Alternar Tema"]');
    if (themeBtn) {
        themeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}" id="theme-icon" class="w-4 h-4"></i>`;
    }
    
    // Sync Charts after rendering
    setTimeout(() => updateChartsTheme(isDark), 500);
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = !html.classList.contains('dark');
    
    if (isDark) {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    
    const themeBtn = document.querySelector('button[title="Alternar Tema"]');
    if (themeBtn) {
        themeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}" id="theme-icon" class="w-4 h-4"></i>`;
        lucide.createIcons();
    }
    
    updateChartsTheme(isDark);
}

function updateChartsTheme(isDark) {
    if (!window.Chart || !window.Chart.instances) return;
    
    const textColor = isDark ? '#cbd5e1' : '#475569'; // slate-300 / slate-600
    const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 / slate-200
    
    Object.values(window.Chart.instances).forEach(chart => {
        if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
                if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
                if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            }
        }
        chart.update();
    });
}

// --- Sync with B2B Portal (index2.html) ---
window.addEventListener('storage', function(e) {
    if (e.key === 'sonicbi_shared_tickets') {
        if (typeof renderCustomTemplateButtons === 'function') {
            renderCustomTemplateButtons();
            showToast('Nuevo ticket B2B recibido. Plantilla generada en el BPM.', 'success');
            
            // Visual indicator on BPM nav button
            const navBtn = document.querySelector('.nav-btn[data-view="bpm"]');
            if (navBtn) {
                navBtn.classList.add('animate-pulse', 'text-brand-400');
                setTimeout(() => navBtn.classList.remove('animate-pulse', 'text-brand-400'), 5000);
            }
            
            // Add B2B Alert to Dashboard
            const b2bContainer = document.getElementById('tickets-b2b-container');
            if (b2bContainer) {
                const storedTemplates = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
                if (storedTemplates.length > 0) {
                    const lastTicket = storedTemplates[storedTemplates.length - 1];
                    
                    // Remove "No hay tickets..." placeholder if it exists
                    const placeholder = b2bContainer.querySelector('p.italic');
                    if (placeholder) placeholder.remove();
                    
                    const alertDiv = document.createElement('div');
                    alertDiv.className = "flex items-start p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 animate-fade-in cursor-pointer hover:bg-orange-500/20 transition-colors";
                    // Clicking the alert takes you to BPM and loads the template
                    alertDiv.onclick = () => {
                        const bpmTab = document.querySelector('.nav-btn[data-view="bpm"]');
                        if(bpmTab) bpmTab.click();
                        setTimeout(() => loadTemplate(lastTicket.id), 300);
                    };
                    
                    alertDiv.innerHTML = `
                        <i data-lucide="bell-ring" class="w-5 h-5 mt-0.5 mr-3 flex-shrink-0 text-orange-600 dark:text-orange-500"></i>
                        <div>
                            <p class="text-sm font-bold text-orange-800 dark:text-orange-200">${lastTicket.name}</p>
                            <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">Haga clic para abrir en el Motor de Procesos (BPM)</p>
                        </div>
                    `;
                    b2bContainer.prepend(alertDiv);
                    if (window.lucide) lucide.createIcons({root: alertDiv});
                }
            }
        }
    }
});
