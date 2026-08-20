// public/shared.js - Lógica del Cotizador Público Interactivo

let currentQuote = null;
let quoteHash = "";
let isDrawing = false;
let canvas, ctx;
let ws = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener el hash de la URL
    const urlParams = new URLSearchParams(window.location.search);
    quoteHash = urlParams.get('hash') || window.location.pathname.split('/').pop();

    if (!quoteHash || quoteHash === 'shared.html') {
        showErrorState("No se especificó un identificador de cotización.");
        return;
    }

    // 2. Inicializar Canvas de Firma
    initSignatureCanvas();

    // 3. Cargar la cotización
    loadSharedQuote(quoteHash);

    // 4. Conectar WebSocket para Chat y Notificaciones en tiempo real
    setupWebSocket();
});

// --- CARGA DE LA COTIZACIÓN ---
async function loadSharedQuote(hash) {
    try {
        const res = await fetch(`/api/bpm/shared/quote/${hash}`);
        if (!res.ok) {
            showErrorState("La cotización no fue encontrada o el enlace no es válido.");
            return;
        }

        currentQuote = await res.json();
        renderQuoteDetails();
        loadChatComments();
    } catch (e) {
        console.error("Error al cargar cotización:", e);
        showErrorState("Error de comunicación al consultar la cotización.");
    }
}

function showErrorState(msg) {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("error-state").classList.remove("hidden");
    if (msg) {
        document.querySelector("#error-state p").innerText = msg;
    }
}

// --- RENDERIZADO DE DETALLES ---
function renderQuoteDetails() {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("quote-content").classList.remove("hidden");

    // Datos generales
    document.getElementById("quote-title").innerText = `Cotización ${currentQuote.id}`;
    document.getElementById("quote-date").innerText = new Date(currentQuote.date).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    
    // Estado
    const badge = document.getElementById("badge-state");
    badge.innerText = currentQuote.state;
    if (currentQuote.state === "Pedido de venta") {
        badge.className = "px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200";
    } else if (currentQuote.state === "Enviado") {
        badge.className = "px-3 py-1 text-xs font-extrabold rounded-full bg-brand-50 text-brand-700 border border-brand-200";
    } else {
        badge.className = "px-3 py-1 text-xs font-extrabold rounded-full bg-sky-50 text-sky-700 border border-sky-200";
    }

    // Cliente y Asesor
    document.getElementById("client-name").innerText = currentQuote.client || "Cliente";
    document.getElementById("client-contact").innerText = currentQuote.contact || "N/A";
    document.getElementById("client-address").innerText = currentQuote.invoice_address || "N/A";
    document.getElementById("quote-salesperson").innerText = currentQuote.salesperson || "Mitchell Admin";
    document.getElementById("quote-payment-terms").innerText = currentQuote.payment_terms || "30 días";
    document.getElementById("client-ref").innerText = currentQuote.client_ref || "N/A";
    document.getElementById("quote-currency-info").innerText = currentQuote.currency === "USD" ? "Dólares (USD)" : "Pesos Mexicanos (MXN)";

    // Renderizar Líneas
    renderLinesTable();
    recalculateTotalsLocally(false);

    // Verificar si ya está firmada
    if (currentQuote.firma_cliente) {
        document.getElementById("sign-pad-container").classList.add("hidden");
        const cert = document.getElementById("signed-certificate");
        cert.classList.remove("hidden");
        document.getElementById("signed-signature-img").src = currentQuote.firma_cliente;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderLinesTable() {
    const tbody = document.getElementById("interactive-lines-body");
    tbody.innerHTML = "";

    const isConfirmed = currentQuote.state === "Pedido de venta";

    (currentQuote.lines || []).forEach((line, index) => {
        const isOptional = !!line.opcional;
        const isSelected = (line.seleccionado !== 0 && line.seleccionado !== false);
        const lineTotal = line.quantity * line.price;
        const currencyStr = currentQuote.currency || "MXN";

        const tr = document.createElement("tr");
        tr.className = `transition-colors ${isSelected ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/60 opacity-60'}`;
        tr.id = `quote-row-${line.id || index}`;

        tr.innerHTML = `
            <td class="py-3.5 px-4 text-center">
                <input type="checkbox" 
                    ${isSelected ? 'checked' : ''} 
                    ${isConfirmed ? 'disabled' : ''} 
                    onchange="toggleLineOption(${index}, this.checked)"
                    class="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer">
            </td>
            <td class="py-3.5 px-4">
                <div class="font-bold text-slate-800">${line.product}</div>
                ${isOptional ? '<span class="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">Opcional</span>' : ''}
            </td>
            <td class="py-3.5 px-4 text-center">
                <div class="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                    <button type="button" onclick="changeQty(${index}, -1)" ${isConfirmed || !isSelected ? 'disabled' : ''} class="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 text-xs font-black">-</button>
                    <span class="px-2.5 py-1 font-bold text-slate-700 min-w-[28px] text-center" id="qty-span-${index}">${line.quantity}</span>
                    <button type="button" onclick="changeQty(${index}, 1)" ${isConfirmed || !isSelected ? 'disabled' : ''} class="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 text-xs font-black">+</button>
                </div>
            </td>
            <td class="py-3.5 px-4 text-right font-medium text-slate-600">$${line.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="py-3.5 px-4 text-center text-slate-500 font-semibold">${line.tax || '16%'}</td>
            <td class="py-3.5 px-4 text-right font-bold text-slate-800" id="row-total-${index}">$${lineTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleLineOption(index, isChecked) {
    if (!currentQuote || !currentQuote.lines[index]) return;
    currentQuote.lines[index].seleccionado = isChecked ? 1 : 0;
    
    // Actualizar estilo visual de la fila
    const row = document.getElementById(`quote-row-${currentQuote.lines[index].id || index}`);
    if (row) {
        if (isChecked) {
            row.classList.remove('opacity-60', 'bg-slate-50/60');
            row.classList.add('bg-white');
        } else {
            row.classList.remove('bg-white');
            row.classList.add('opacity-60', 'bg-slate-50/60');
        }
    }

    recalculateTotalsLocally(true);
}

function changeQty(index, delta) {
    if (!currentQuote || !currentQuote.lines[index]) return;
    let newQty = (currentQuote.lines[index].quantity || 1) + delta;
    if (newQty < 1) newQty = 1;
    
    currentQuote.lines[index].quantity = newQty;
    
    const qtySpan = document.getElementById(`qty-span-${index}`);
    if (qtySpan) qtySpan.innerText = newQty;

    const rowTotal = document.getElementById(`row-total-${index}`);
    const lineTotal = newQty * currentQuote.lines[index].price;
    const currencyStr = currentQuote.currency || "MXN";
    if (rowTotal) rowTotal.innerText = `$${lineTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}`;

    recalculateTotalsLocally(true);
}

function recalculateTotalsLocally(persistToServer = false) {
    let subtotal = 0;
    (currentQuote.lines || []).forEach(l => {
        if (l.seleccionado !== 0 && l.seleccionado !== false) {
            subtotal += l.quantity * l.price;
        }
    });

    const discountPercent = currentQuote.descuento_negociado || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const tax = discountedSubtotal * 0.16; // 16% IVA
    const grandTotal = discountedSubtotal + tax;
    const currencyStr = currentQuote.currency || "MXN";

    // Actualizar UI
    document.getElementById("subtotal-val").innerText = `$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}`;
    document.getElementById("tax-val").innerText = `$${tax.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}`;
    document.getElementById("total-val").innerText = `$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}`;
    document.getElementById("quote-total-banner").innerText = `$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} ${currencyStr}`;

    const discRow = document.getElementById("row-discount");
    if (discountPercent > 0) {
        discRow.classList.remove("hidden");
        document.getElementById("discount-val").innerText = `-$${discountAmount.toLocaleString('en-US', {minimumFractionDigits: 2})} (${discountPercent}%)`;
    } else {
        discRow.classList.add("hidden");
    }

    currentQuote.total = grandTotal;

    if (persistToServer) {
        persistOptionsUpdate();
    }
}

let updateDebounce = null;
function persistOptionsUpdate() {
    clearTimeout(updateDebounce);
    updateDebounce = setTimeout(async () => {
        try {
            await fetch(`/api/bpm/shared/quote/${quoteHash}/update-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lines: currentQuote.lines,
                    total: currentQuote.total
                })
            });
        } catch(e) {
            console.error("Error al persistir opciones:", e);
        }
    }, 400);
}

// --- FIRMA DIGITAL CANVAS ---
function initSignatureCanvas() {
    canvas = document.getElementById("signature-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDraw(e) {
        isDrawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    }

    function stopDraw(e) {
        if (isDrawing) {
            isDrawing = false;
        }
    }

    // Mouse Events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDraw);

    // Touch Events
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    window.addEventListener("touchend", stopDraw);
}

function clearSignatureCanvas() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

async function submitClientSignature() {
    if (!canvas) return;

    // Verificar si el canvas no está vacío
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
        alert("Por favor trace su firma en el recuadro antes de continuar.");
        return;
    }

    const signatureData = canvas.toDataURL("image/png");
    const btn = document.getElementById("btn-submit-sign");
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Procesando Firma...`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const res = await fetch(`/api/bpm/shared/quote/${quoteHash}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature: signatureData })
        });

        const data = await res.json();
        if (res.ok) {
            currentQuote.state = "Pedido de venta";
            currentQuote.firma_cliente = signatureData;
            renderQuoteDetails();
            alert("¡Firma registrada con éxito! La cotización ha sido aprobada y convertida en Pedido de Venta.");
        } else {
            alert("Error al firmar: " + (data.error || "Intente nuevamente"));
        }
    } catch(e) {
        console.error("Error al enviar firma:", e);
        alert("Error de comunicación al enviar la firma.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// --- CHAT Y NEGOCIACIÓN EN VIVO ---
function toggleChatDrawer() {
    const drawer = document.getElementById("chat-drawer");
    drawer.classList.toggle("translate-x-full");
    document.getElementById("chat-unread-dot").classList.add("hidden");
}

async function loadChatComments() {
    try {
        const res = await fetch(`/api/bpm/shared/quote/${quoteHash}/comments`);
        if (res.ok) {
            const comments = await res.json();
            const container = document.getElementById("chat-messages-container");
            container.innerHTML = "";
            comments.forEach(c => appendChatMessageToUI(c));
            container.scrollTop = container.scrollHeight;
        }
    } catch(e) {
        console.error("Error al cargar comentarios:", e);
    }
}

function appendChatMessageToUI(comment) {
    const container = document.getElementById("chat-messages-container");
    const isClient = (comment.remitente === "Cliente");
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
    } else if (isClient) {
        msgDiv.className = "flex flex-col items-end";
        msgDiv.innerHTML = `
            <div class="max-w-[85%] bg-brand-500 text-white rounded-2xl rounded-tr-xs p-3 shadow-xs">
                <p class="leading-relaxed">${comment.mensaje}</p>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 font-medium">Tú • ${timeStr}</span>
        `;
    } else {
        msgDiv.className = "flex flex-col items-start";
        msgDiv.innerHTML = `
            <div class="max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs p-3 shadow-xs">
                <p class="leading-relaxed font-normal">${comment.mensaje}</p>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 font-medium">Asesor Comercial • ${timeStr}</span>
        `;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

async function sendClientChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";

    try {
        const res = await fetch(`/api/bpm/shared/quote/${quoteHash}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: msg })
        });

        if (res.ok) {
            const data = await res.json();
            appendChatMessageToUI({
                remitente: 'Cliente',
                mensaje: msg,
                fecha: data.fecha || new Date().toISOString()
            });
        }
    } catch(err) {
        console.error("Error al enviar mensaje:", err);
    }
}

// --- WEBSOCKET CLIENT ---
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (currentQuote && data.orderId === currentQuote.id) {
                    if (data.type === 'QUOTE_NEW_CHAT_MESSAGE' && data.remitente !== 'Cliente') {
                        appendChatMessageToUI(data);
                        // Mostrar punto de no leído si el drawer está cerrado
                        const drawer = document.getElementById("chat-drawer");
                        if (drawer.classList.contains("translate-x-full")) {
                            document.getElementById("chat-unread-dot").classList.remove("hidden");
                        }
                    } else if (data.type === 'QUOTE_DISCOUNT_APPLIED') {
                        currentQuote.descuento_negociado = data.discountPercent;
                        recalculateTotalsLocally(false);
                        appendChatMessageToUI({
                            remitente: 'Sistema',
                            mensaje: data.sysMessage,
                            fecha: new Date().toISOString()
                        });
                    }
                }
            } catch(e) {}
        };

        ws.onclose = () => {
            setTimeout(setupWebSocket, 3000);
        };
    } catch(e) {
        console.warn("WebSocket no disponible:", e);
    }
}
