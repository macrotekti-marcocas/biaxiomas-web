/**
 * SONICBI MVP - Customer Portal Logic
 */

// Initialize Lucide Icons
lucide.createIcons();

// --- MOCK DATA ---
const PORTAL_DATA = {
    tickets: [
        { id: 'TK-8834', title: 'Caída de enlace en Sucursal 2', date: '2026-07-09 10:30', status: 'En Proceso', statusClass: 'bg-amber-100 text-amber-700 border-amber-200' },
        { id: 'TK-8830', title: 'Mantenimiento Preventivo Servidores', date: '2026-07-05 14:15', status: 'Completado', statusClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    ],
    invoices: [
        { id: 'F-903', amount: 8500.00, dueDate: '2026-06-30', status: 'Pagada', statusClass: 'bg-emerald-100 text-emerald-700' },
        { id: 'F-904', amount: 12500.00, dueDate: '2026-07-05', status: 'Vencida', statusClass: 'bg-red-100 text-red-700' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    renderTickets();
    renderInvoices();

    // Attach event listeners
    const ticketForm = document.getElementById('ticket-form');
    if (ticketForm) {
        ticketForm.addEventListener('submit', submitTicket);
    }

    // Escuchador de sincronización en tiempo real
    window.addEventListener("storage", (event) => {
        if (event.key === "bpms-state-sync") {
            renderTickets();
        }
    });
});

// --- TICKETS LOGIC ---
function loadPortalTicketsFromSync() {
    const syncData = localStorage.getItem("bpms-state-sync");
    if (!syncData) return PORTAL_DATA.tickets;
    
    try {
        const state = JSON.parse(syncData);
        // Filtrar plantillas creadas desde el portal de clientes
        const clientTemplates = state.templatesData.filter(t => t.client === "Corporativo Tiendas Norte" || t.createdBy === "Cliente Portal");
        
        // Mapear estas plantillas a la estructura de tickets del portal
        const customTickets = clientTemplates.map(t => {
            const cleanId = t.id.replace("portal_tk_", "").replace("custom_tk_", "");
            const mainTask = t.tasks[0];
            let ticketStatus = "🟢 Recibido";
            let statusClass = "bg-blue-100 text-blue-700 border-blue-200";
            
            if (mainTask) {
                if (mainTask.status === "Completado") {
                    ticketStatus = "Completado";
                    statusClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                } else if (mainTask.status === "Vencido") {
                    ticketStatus = "Vencido";
                    statusClass = "bg-red-100 text-red-750 border-red-200";
                } else if (mainTask.status === "Por vencer" || mainTask.status === "En Proceso") {
                    ticketStatus = "En Proceso";
                    statusClass = "bg-amber-100 text-amber-700 border-amber-200";
                }
            }
            
            return {
                id: cleanId,
                title: t.name.replace("[PORTAL] ", ""),
                date: t.createdDate + " " + t.startTime,
                status: ticketStatus,
                statusClass: statusClass
            };
        });
        
        // Unir con los tickets estáticos (evitando duplicados)
        const combined = [...customTickets];
        PORTAL_DATA.tickets.forEach(st => {
            if (!combined.some(c => c.id === st.id)) {
                combined.push(st);
            }
        });
        return combined;
    } catch (e) {
        console.warn("Error al cargar tickets desde sync:", e);
        return PORTAL_DATA.tickets;
    }
}

function renderTickets() {
    const tbody = document.getElementById('tickets-tbody');
    if (!tbody) return;

    const ticketsToShow = loadPortalTicketsFromSync();

    tbody.innerHTML = ticketsToShow.map(t => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
                <p class="text-sm font-bold text-gray-900">${t.title}</p>
                <p class="text-xs text-corp-muted font-mono mt-0.5">${t.id}</p>
            </td>
            <td class="px-6 py-4 text-sm text-corp-muted">${t.date}</td>
            <td class="px-6 py-4 text-center">
                <span class="px-2.5 py-1 text-xs font-medium rounded-full border ${t.statusClass}">
                    ${t.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function submitTicket(e) {
    e.preventDefault();
    const input = document.getElementById('ticket-input');
    const title = input.value.trim();
    
    // Capture urgency
    const urgenciaInput = document.querySelector('input[name="urgencia"]:checked');
    const urgencia = urgenciaInput ? urgenciaInput.value : 'Durante la semana';
    
    if (!title) return;

    const newTicketId = 'TK-' + Math.floor(Math.random() * 9000 + 1000);

    // --- AUTO CREATE TEMPLATE IN LOCALSTORAGE "bpms-state-sync" ---
    const savedState = localStorage.getItem("bpms-state-sync");
    let state = savedState ? JSON.parse(savedState) : null;
    
    if (state) {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const currentDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const dayStr = pad(now.getDate());
        const monthStr = months[now.getMonth()];
        const rangeStr = `${dayStr} ${monthStr} - ${dayStr} ${monthStr}`;

        const newTemplate = {
            id: 'portal_tk_' + newTicketId,
            name: `[PORTAL] ${title}`,
            type: 'crm',
            createdDate: currentDateStr,
            startDate: currentDateStr,
            startTime: currentTimeStr,
            client: "Corporativo Tiendas Norte",
            generalObservations: `Reporte: ${title}. Urgencia: ${urgencia}`,
            createdBy: "Cliente Portal",
            tasks: [
                {
                    id: Math.floor(Math.random() * 900000 + 100000),
                    name: "1. Ticket Portal",
                    duration: 0.125, // 1 hora
                    daysText: "1 hora",
                    status: "Pendiente",
                    color: "bg-slate-200 border border-slate-350 text-slate-700",
                    startDay: 0,
                    timeRemaining: "En espera",
                    dateRange: rangeStr,
                    description: `Reporte: ${title}. Urgencia: ${urgencia}`,
                    assigned: "Sin Asignar"
                }
            ]
        };
        
        // Insertar al inicio de la lista de plantillas para que aparezca primero
        state.templatesData.unshift(newTemplate);
        
        // Agregar notificación para el administrador
        if (!state.notifications) {
            state.notifications = [];
        }
        
        state.notifications.unshift({
            id: Date.now() + Math.random(),
            title: `Nueva alerta del Cliente: "${title}" (Urgencia: ${urgencia})`,
            time: "hace unos segundos",
            read: false,
            type: 'create',
            metadata: { templateId: 'portal_tk_' + newTicketId }
        });
        
        // Limitar a 50
        if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
        }
        
        // Guardar en localStorage
        localStorage.setItem("bpms-state-sync", JSON.stringify(state));
    }
    
    // También guardar de forma redundante en los antiguos campos para compatibilidad si es necesario
    const storedTemplates = JSON.parse(localStorage.getItem('sonicbi_custom_templates') || '[]');
    storedTemplates.unshift({
        id: 'portal_tk_' + newTicketId,
        name: `[PORTAL] ${title}`,
        type: 'crm',
        nodes: ['Ticket Portal'],
        ticketId: newTicketId,
        urgencyLevel: urgencia
    });
    localStorage.setItem('sonicbi_custom_templates', JSON.stringify(storedTemplates));
    localStorage.setItem('sonicbi_shared_tickets', Date.now().toString());

    input.value = '';
    
    // Desmarcar radio buttons de urgencia
    const radios = document.querySelectorAll('input[name="urgencia"]');
    radios.forEach(r => r.checked = false);

    renderTickets();
    showToast('Reporte enviado con éxito. Un técnico ha sido notificado.', 'success');
}

// --- INVOICES LOGIC ---
function renderInvoices() {
    const container = document.getElementById('invoices-container');
    if (!container) return;

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

    container.innerHTML = PORTAL_DATA.invoices.map(inv => {
        const isOverdue = inv.status === 'Vencida';
        
        let actionHtml = '';
        if (isOverdue) {
            actionHtml = `
                <button onclick="payInvoice('${inv.id}')" class="mt-3 w-full bg-gray-900 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-lg transition-colors flex justify-center items-center">
                    <i data-lucide="credit-card" class="w-4 h-4 mr-2"></i> Simular Pago
                </button>
            `;
        }

        return `
            <div class="border border-corp-border rounded-xl p-4 flex flex-col ${isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-white'}">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="px-2 py-1 text-[10px] font-bold uppercase rounded ${inv.statusClass}">${inv.status}</span>
                        <p class="font-bold text-gray-900 mt-2">Factura ${inv.id}</p>
                        <p class="text-xs text-corp-muted">Vence: ${inv.dueDate}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}">${formatter.format(inv.amount)}</p>
                    </div>
                </div>
                ${actionHtml}
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}

window.payInvoice = function(id) {
    const idx = PORTAL_DATA.invoices.findIndex(inv => inv.id === id);
    if (idx !== -1) {
        PORTAL_DATA.invoices[idx].status = 'Pagada';
        PORTAL_DATA.invoices[idx].statusClass = 'bg-emerald-100 text-emerald-700';
        renderInvoices();
        showToast(`Factura ${id} pagada. Los servicios se han desbloqueado.`, 'success');
    }
};

// --- CHATBOT LOGIC ---
window.fillChatInput = function(text) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        input.focus();
    }
};

window.sendChatMessage = function(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const history = document.getElementById('chat-history');
    const text = input.value.trim();
    if (!text || !history) return;

    // 1. Add User Message
    const userMsg = `
        <div class="flex items-start justify-end max-w-[90%] ml-auto mt-4 animate-fade-in">
            <div class="bg-brand-500 text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-sm">
                <p>${text}</p>
            </div>
        </div>
    `;
    history.insertAdjacentHTML('beforeend', userMsg);
    input.value = '';
    history.scrollTop = history.scrollHeight;

    // 2. Determine Bot Response
    let botResponse = "Entendido. Un asesor humano revisará tu solicitud en breve para brindarte asistencia personalizada.";
    
    // Exact match or keyword match for the alarm question
    if (text.toLowerCase().includes("armar una alarma") || text.toLowerCase().includes("panel de alarma") || text.includes("¿Cómo armar una alarma recientemente instalada por nuestra empresa?")) {
        botResponse = `Hola. Para armar tu sistema de alarma panel de control instalado:<br><br>
        1. Asegura que todas las zonas/sensores estén cerrados (Led Verde Listo).<br>
        2. Digita tu código maestro de 4 dígitos.<br>
        3. Presiona la tecla [AWAY/SALIR].<br><br>
        Tienes 30 segundos para abandonar el área antes de que se active por completo.<br><br>
        ¿Te fue útil esta información?`;
    }

    // 3. Simulate processing delay, then add Bot Message
    setTimeout(() => {
        const botMsg = `
            <div class="flex items-start max-w-[90%] mt-4 animate-fade-in">
                <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mr-2 flex-shrink-0 border border-brand-200">
                    <i data-lucide="bot" class="w-4 h-4 text-brand-600"></i>
                </div>
                <div class="bg-white border border-corp-border p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm text-gray-700">
                    <p>${botResponse}</p>
                </div>
            </div>
        `;
        history.insertAdjacentHTML('beforeend', botMsg);
        lucide.createIcons({root: history});
        history.scrollTop = history.scrollHeight;
    }, 800);
};

// --- UTILS ---
function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const isError = type === 'error';
    const bg = isError ? 'bg-red-500' : 'bg-emerald-500';
    const toast = document.createElement('div');
    toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in flex items-center max-w-md mb-2`;
    toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 mr-2"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    lucide.createIcons({root: toast});
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

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
