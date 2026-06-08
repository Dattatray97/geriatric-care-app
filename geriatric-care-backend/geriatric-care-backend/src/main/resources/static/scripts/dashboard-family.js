// ============================================================
// ElderGuard Nexus — Family Dashboard Logic
// ============================================================
lucide.createIcons();

const API = '/api/v1';
let currentPatient = null;
let chartData = Array(20).fill(72);
let currentVitals = { heartRate: 72, systolicBP: 120, diastolicBP: 80, oxygen: 98, temperature: 98.6, bloodSugar: 105 };
let stompClient = null;

// ------------ INIT ------------
document.addEventListener('DOMContentLoaded', () => {
    // Auth check
    if (!sessionStorage.getItem('elderguard_logged_in')) { window.location.href = 'index.html'; return; }
    
    const familyName = sessionStorage.getItem('elderguard_family_name') || '';
    const patientNumber = sessionStorage.getItem('elderguard_patient_number') || '';
    if (familyName) {
        document.getElementById('familyName').textContent = familyName;
        const avatar = document.getElementById('familyAvatar');
        if (avatar) avatar.textContent = familyName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    } else if (patientNumber) {
        document.getElementById('familyName').textContent = patientNumber;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
    
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeBtn').textContent = '🌙';
    }

    // Load Patient Data
    const refCode = sessionStorage.getItem('elderguard_patient_ref');
    if (!refCode) {
        showErrorModal();
    } else {
        loadPatientByRef(refCode);
    }
});

function updateClock() {
    document.getElementById('liveDateTime').textContent = new Date().toLocaleString();
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const light = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    document.getElementById('themeBtn').textContent = light ? '🌙' : '☀️';
}

function showErrorModal() {
    document.getElementById('errorModal').style.display = 'flex';
}

// ------------ WEBSOCKET ------------
function connectWebSocket() {
    if (!currentPatient) return;
    try {
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/alerts', msg => {
                const alertData = JSON.parse(msg.body);
                // Only show alerts for our patient
                addFeed('🚨 Alert', alertData.message || 'New alert for patient', 'danger');
            });
            stompClient.subscribe('/topic/care-orders', (msg) => {
                const data = JSON.parse(msg.body);
                const order = data.order;
                if (order && order.patientName === currentPatient.name) {
                    if (order.orderType === 'food') {
                        const dishName = (order.description || '').replace('Food Order: ', '');
                        addFeed('🍽️ Food Order', dishName || 'New food order', 'info');
                        showToast('🍽️ Food Ordered', dishName + ' has been ordered for ' + currentPatient.name, 'food');
                    } else {
                        addFeed('📋 Care Update', order.description || 'Care order updated', 'info');
                        showToast('📋 Care Update', order.description || 'A care order was updated', 'info');
                    }
                    // Always refresh Care Updates view
                    loadPatientOrders();
                }
            });
            stompClient.subscribe('/topic/health', msg => {
                const d = JSON.parse(msg.body);
                if (d.patientName === currentPatient.name || d.patientId == currentPatient.id) {
                    updateVitalsUI(d);
                }
            });
            stompClient.subscribe('/topic/emergency', msg => {
                const data = JSON.parse(msg.body);
                // alert property contains the emergency details
                if (data.alert && (data.alert.patientName === currentPatient.name || msg.body.includes(currentPatient.name))) {
                    document.getElementById('sosPatientName').textContent = currentPatient.name;
                    document.getElementById('sosAlertModal').style.display = 'flex';
                    lucide.createIcons();
                    addFeed('🚨 SOS EMERGENCY', 'An emergency alert was triggered for your relative!', 'danger');
                }
            });
        });
    } catch(e) {
        console.error("WebSocket connection failed", e);
    }
}

// ------------ NAVIGATION ------------
function showView(view) {
    if (!currentPatient) return;
    
    document.querySelectorAll('.view-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.ntab').forEach(el => el.classList.remove('active'));
    
    const targetId = 'view' + view.charAt(0).toUpperCase() + view.slice(1);
    const targetEl = document.getElementById(targetId);
    if(targetEl) targetEl.style.display = 'flex';
    
    const tabId = 'tab' + view.charAt(0).toUpperCase() + view.slice(1);
    const tabEl = document.getElementById(tabId);
    if(tabEl) tabEl.classList.add('active');

    if (view === 'meds') loadPatientMedications();
    if (view === 'appts') loadPatientAppointments();
    if (view === 'orders') loadPatientOrders();
    lucide.createIcons();
}

// ------------ PATIENT DATA ------------
function loadPatientByRef(refCode) {
    fetch(`${API}/patients/ref/${refCode}`)
        .then(r => {
            if (!r.ok) throw new Error('Patient not found');
            return r.json();
        })
        .then(patient => {
            currentPatient = patient;
            setupPatientUI(patient);
            connectWebSocket();
            
            // Start simulated vitals for the dashboard visual
            simulateVitals();
            setInterval(simulateVitals, 5000);
            
            // Load initial counts
            loadPatientMedications(true);
            loadPatientAppointments(true);
            loadPatientOrders(true);
            
            addFeed('👤 Connected', `Successfully connected to ${patient.name}'s profile`, 'ok');
        })
        .catch(err => {
            console.error(err);
            showErrorModal();
        });
}

function setupPatientUI(p) {
    document.getElementById('phAvatar').textContent = p.name.split(' ').map(n=>n[0]).join('').substring(0,2);
    document.getElementById('phName').textContent = p.name;
    document.getElementById('phMeta').textContent = `Room: ${p.room || 'N/A'} · Age: ${p.age || '?'} yrs`;
    document.getElementById('phRefCode').textContent = `REF: ${p.referenceCode}`;

    const sb = document.getElementById('phStatus');
    sb.style.display = 'inline-block';
    sb.textContent = p.status;
    sb.className = `status-badge status-${(p.status||'stable').toLowerCase()}`;

    // Fill medical info
    document.getElementById('patConditions').textContent = p.conditions || 'None recorded';
    document.getElementById('patAllergies').textContent = p.allergies || 'No known allergies';
    document.getElementById('patBloodType').textContent = p.bloodType || 'Unknown';
}

// ------------ VITALS ------------
function simulateVitals() {
    if(!currentPatient) return;
    
    // Different base values depending on patient status
    let baseHR = 72, baseSys = 120, baseDia = 80, baseO2 = 98;
    
    if(currentPatient.status === 'CRITICAL') {
        baseHR = 95; baseSys = 145; baseDia = 95; baseO2 = 93;
    } else if (currentPatient.status === 'ATTENTION') {
        baseHR = 85; baseSys = 135; baseDia = 85; baseO2 = 95;
    }
    
    currentVitals.heartRate = baseHR - 5 + Math.floor(Math.random() * 10);
    currentVitals.systolicBP = baseSys - 8 + Math.floor(Math.random() * 16);
    currentVitals.diastolicBP = baseDia - 5 + Math.floor(Math.random() * 10);
    currentVitals.oxygen = baseO2 - 2 + Math.floor(Math.random() * 4);
    currentVitals.temperature = +(98.0 + Math.random() * 1.5).toFixed(1);
    currentVitals.bloodSugar = 95 + Math.floor(Math.random() * 20);
    
    updateVitalsUI(currentVitals);
    
    chartData.shift(); 
    chartData.push(currentVitals.heartRate);
    drawChart();
}

function updateVitalsUI(d) {
    const setVal = (id, val, cls) => { const el = document.getElementById(id); if(el){el.textContent=val;el.className=`vi-val ${cls}`;} };
    const hr = d.heartRate || d.heart_rate || 72;
    setVal('hrVal', hr, hr > 100 || hr < 55 ? 'danger' : hr > 85 ? 'warn' : 'ok');
    setVal('bpVal', `${d.systolicBP||d.systolic_bp||120}/${d.diastolicBP||d.diastolic_bp||80}`, 'normal');
    setVal('o2Val', d.oxygen||d.oxygenLevel||98, (d.oxygen||98) < 95 ? 'warn' : 'ok');
    setVal('tempVal', typeof d.temperature === 'number' ? d.temperature.toFixed(1) : d.temperature || 98.6, 'normal');
    setVal('bsVal', d.bloodSugar||d.blood_sugar||105, (d.bloodSugar||105) > 140 ? 'warn' : 'ok');
}

function drawChart() {
    const svg = document.getElementById('chartSvg'); if(!svg) return;
    const max=130, min=50, range=max-min, step=600/(chartData.length-1);
    let d = `M 0,${100-((chartData[0]-min)/range)*100}`;
    for(let i=1;i<chartData.length;i++) d+=` L ${i*step},${100-((chartData[i]-min)/range)*100}`;
    svg.innerHTML = `<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs>
        <path d="${d} L 600,100 L 0,100 Z" fill="url(#lg)"/>
        <path d="${d}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ------------ DATA FETCHING ------------
function loadPatientMedications(countOnly = false) {
    if(!currentPatient) return;
    fetch(`${API}/pharmacy/medications`)
        .then(r => r.json())
        .then(meds => {
            const filtered = meds.filter(m => (m.patientName||'').includes(currentPatient.name) || true); // Simple match, in real app use ID
            document.getElementById('medCnt').textContent = filtered.length;
            if(!countOnly) renderMedList(filtered);
        });
}

function loadPatientAppointments(countOnly = false) {
    if(!currentPatient) return;
    fetch(`${API}/appointments`)
        .then(r => r.json())
        .then(appts => {
            const filtered = appts.filter(a => a.patientName === currentPatient.name);
            document.getElementById('apptCnt').textContent = filtered.length;
            if(!countOnly) renderApptList(filtered);
        });
}

function loadPatientOrders(countOnly = false) {
    if(!currentPatient) return;
    fetch(`${API}/care-orders`)
        .then(r => r.json())
        .then(orders => {
            const filtered = orders.filter(o => o.patientName === currentPatient.name);
            document.getElementById('orderCnt').textContent = filtered.length;
            if(!countOnly) renderOrderList(filtered);
        });
}

// ------------ RENDERING ------------
function renderMedList(meds) {
    const el = document.getElementById('rxList');
    if (!meds.length) { el.innerHTML = '<div class="empty-state">No current medications listed.</div>'; return; }
    el.innerHTML = meds.map(m => `
        <div class="list-card">
            <div class="lc-left">
                <h4>💊 ${m.name}</h4>
                <p>${m.description || 'Routine medication'}</p>
                <div class="lc-meta">
                    <span>Dosage: ${m.dosage || '—'}</span>
                    <span>Freq: ${m.frequency || '—'}</span>
                    <span>Time: ${m.timeSlots || '—'}</span>
                    <span style="border-color:var(--pri)">By: ${m.prescribedBy || 'Doctor'}</span>
                </div>
            </div>
        </div>`).join('');
}

function renderApptList(appts) {
    const el = document.getElementById('apptListDetail');
    if(!appts.length) { el.innerHTML = '<div class="empty-state">No appointments scheduled.</div>'; return; }
    
    const now = new Date();
    
    // Determine live vs done status based on date
    appts.forEach(a => {
        const date = new Date(a.appointmentDate);
        if (date < now && a.status !== 'cancelled') {
            a._isDone = true;
        } else {
            a._isDone = false;
        }
    });
    
    // Sort: upcoming first (asc), then done (desc)
    appts.sort((a, b) => {
        if (a._isDone !== b._isDone) return a._isDone ? 1 : -1;
        if (a._isDone) return new Date(b.appointmentDate) - new Date(a.appointmentDate);
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });
    
    const upcomingCount = appts.filter(a => !a._isDone).length;
    const doneCount = appts.filter(a => a._isDone).length;
    
    let html = '';
    if (upcomingCount > 0) {
        html += '<div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:10px;display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:pulse 1.5s infinite"></span> Upcoming Schedule (' + upcomingCount + ')</div>';
    }
    
    let doneHeaderAdded = false;
    
    el.innerHTML = html + appts.map(a => {
        let sectionHeader = '';
        if (a._isDone && !doneHeaderAdded) {
            doneHeaderAdded = true;
            sectionHeader = '<div style="font-size:13px;font-weight:700;color:#10b981;margin:18px 0 10px 0;display:flex;align-items:center;gap:6px">✅ Done (' + doneCount + ')</div>';
        }
        const d = new Date(a.appointmentDate);
        const isDone = a._isDone;
        const statusColor = isDone ? '#10b981' : '#f59e0b';
        const statusLabel = isDone ? '✅ Done' : a.status;
        return sectionHeader + `
        <div class="list-card" style="${isDone ? 'opacity:0.65;' : ''}">
            <div class="lc-left">
                <h4>📅 ${a.type} with ${a.doctorName}</h4>
                <div class="lc-meta">
                    <span style="color:${isDone ? '#10b981' : 'var(--text)'};border-color:${statusColor};background:${statusColor}15">
                        🕒 ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span>📍 ${a.location || 'TBD'}</span>
                    <span style="text-transform:uppercase;font-weight:700;color:${statusColor}">${statusLabel}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderOrderList(orders) {
    const el = document.getElementById('ordersListDetail');
    if(!orders.length) { el.innerHTML = '<div class="empty-state">No recent care updates.</div>'; return; }
    
    // Sort by ID descending (newest first)
    orders.sort((a,b) => b.id - a.id);
    
    const sc = s => s==='completed'?'#10b981':s==='in_progress'?'#fbbf24':'#cbd5e1';
    
    const statusIcon = s => {
        if(s === 'completed') return '✅';
        if(s === 'in_progress') return '🔄';
        if(s === 'cancelled') return '❌';
        return '⏳';
    };
    const statusLabel = s => {
        if(s === 'completed') return 'Delivered';
        if(s === 'in_progress') return 'In Progress';
        if(s === 'cancelled') return 'Cancelled';
        return 'Pending';
    };
    
    el.innerHTML = orders.map(o => {
        // For food orders: show just the dish name as the title
        const isFood = o.orderType === 'food';
        const icon = isFood ? '🍽️' : '📋';
        let title;
        if (isFood) {
            title = (o.description || '').replace('Food Order: ', '') || 'Food Order';
        } else {
            title = (o.orderType || 'care').charAt(0).toUpperCase() + (o.orderType || 'care').slice(1) + ' Update';
        }
        const description = isFood ? '' : o.description;
        const sColor = sc(o.status);
        
        return `
        <div class="list-card">
            <div class="lc-left" style="width:100%">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <h4 style="margin:0">${icon} ${title}</h4>
                    <span style="font-size:11px;font-weight:800;color:${sColor};text-transform:uppercase;display:flex;align-items:center;gap:4px">
                        ${statusIcon(o.status)} ${statusLabel(o.status)}
                    </span>
                </div>
                ${description ? `<p style="font-size:14px">${description}</p>` : ''}
                <div class="lc-meta" style="margin-top:8px">
                    <span style="text-transform:capitalize;border-color:${isFood ? '#f59e0b' : 'var(--border)'};color:${isFood ? '#f59e0b' : 'inherit'};background:${isFood ? '#f59e0b15' : 'transparent'}">${o.orderType}</span>
                    <span>Priority: ${o.priority}</span>
                    <span>Order #${o.id}</span>
                    ${o.createdAt ? `<span>🕒 ${new Date(o.createdAt).toLocaleString()}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

// ------------ CHAT / MESSAGING ------------
function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    const chatBox = document.getElementById('chatBox');
    
    // Add User Message
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg sent';
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Simulate Auto-Reply after delay
    setTimeout(() => {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'chat-msg received';
        replyDiv.textContent = "Thank you for your message. A member of the care team has been notified and will review your note shortly.";
        chatBox.appendChild(replyDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1500);
}

// ------------ UTILS ------------
function addFeed(title, desc, type='info') {
    const feed = document.getElementById('liveFeed');
    const empty = document.getElementById('feedEmpty');
    if(empty) empty.remove();
    const div = document.createElement('div');
    div.className = `feed-item ${type}`;
    div.innerHTML = `<div class="feed-dot"></div><div class="feed-text"><strong>${title}</strong>${desc}</div>`;
    feed.insertBefore(div, feed.firstChild);
    if(feed.children.length > 20) feed.lastChild.remove();
}

// ------------ TOAST POPUP NOTIFICATIONS ------------
function showToast(title, message, type='info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const colors = {
        food: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '🍽️' },
        info: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', icon: '📋' },
        danger: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '🚨' },
        ok: { bg: 'linear-gradient(135deg, #10b981, #059669)', icon: '✅' }
    };
    const c = colors[type] || colors.info;
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        pointer-events:auto;
        background:${c.bg};
        color:#fff;
        padding:16px 20px;
        border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.3);
        min-width:300px;
        max-width:400px;
        animation: toastSlideIn 0.4s ease, toastFadeOut 0.4s ease 4.6s forwards;
        font-family:inherit;
        backdrop-filter:blur(10px);
    `;
    toast.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="font-size:24px;line-height:1;">${c.icon}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${title}</div>
                <div style="font-size:12px;opacity:0.9;line-height:1.4;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;opacity:0.7;padding:0;line-height:1;">&times;</button>
        </div>
    `;
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 5000);
}

// Inject toast animation styles
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastFadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(toastStyle);
