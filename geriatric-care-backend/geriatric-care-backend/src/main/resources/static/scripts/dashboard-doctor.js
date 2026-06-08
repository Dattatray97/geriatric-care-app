// ============================================================
// ElderGuard Nexus — Doctor Dashboard Logic
// ============================================================
lucide.createIcons();

const API = '/api/v1';
let allPatients = [];
let currentPatientId = null;
let chartData = Array(20).fill(72);
let currentVitals = { heartRate: 72, systolicBP: 120, diastolicBP: 80, oxygen: 98, temperature: 98.6, bloodSugar: 105 };
let stompClient = null;

// ------------ INIT ------------
document.addEventListener('DOMContentLoaded', () => {
    // Auth check
    if (!sessionStorage.getItem('elderguard_logged_in')) { window.location.href = 'index.html'; return; }
    const email = sessionStorage.getItem('elderguard_user_email') || '';
    if (email) {
        const name = 'Dr. ' + email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
        document.getElementById('doctorName').textContent = name;
        document.getElementById('doctorAvatar').textContent = name.split(' ').slice(0,2).map(n=>n[0]).join('');
    }
    updateClock();
    setInterval(updateClock, 1000);
    loadPatients();
    connectWebSocket();
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeBtn').textContent = '🌙';
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

// ------------ WEBSOCKET ------------
function connectWebSocket() {
    try {
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, () => {
            stompClient.subscribe('/topic/alerts', msg => {
                addFeed('🚨 Alert', JSON.parse(msg.body).message || 'New alert', 'danger');
                loadAlerts();
            });
            stompClient.subscribe('/topic/care-orders', () => {
                addFeed('📋 Order', 'New care order updated', 'info');
                if (document.getElementById('viewOrders').style.display !== 'none') loadAllOrders();
            });
            stompClient.subscribe('/topic/health', msg => {
                const d = JSON.parse(msg.body);
                if (currentPatientId && document.getElementById('phName').textContent.includes(d.patientName || '')) {
                    updateVitalsUI(d);
                }
            });
        });
    } catch(e) {}
}

// ------------ NAVIGATION ------------
function showView(view) {
    document.querySelectorAll('.view-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.ntab').forEach(el => el.classList.remove('active'));
    document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1)).style.display = 'flex';
    document.getElementById('tab' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('active');

    if (view === 'meds') loadAllMedications();
    if (view === 'appts') loadAllAppointments();
    if (view === 'orders') loadAllOrders();
    if (view === 'alerts') loadAlerts();
    lucide.createIcons();
}

function showDetailTab(tab) {
    document.querySelectorAll('.detail-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.dtab').forEach(el => el.classList.remove('active'));
    const paneMap = { vitals:'paneVitals', rx:'paneRx', 'appts-detail':'paneApptsDetail', 'orders-detail':'paneOrdersDetail', notes:'paneNotes' };
    const el = document.getElementById(paneMap[tab]);
    if (el) el.style.display = 'block';
    event.currentTarget.classList.add('active');
    if (tab === 'rx' && currentPatientId) loadPatientMedications();
    if (tab === 'appts-detail' && currentPatientId) loadPatientAppointments();
    if (tab === 'orders-detail' && currentPatientId) loadPatientOrders();
}

// ------------ PATIENTS ------------
function loadPatients() {
    fetch(`${API}/patients`)
        .then(r => r.json())
        .then(patients => {
            allPatients = patients;
            document.getElementById('patientCnt').textContent = patients.length;
            document.getElementById('patientTotal').textContent = `${patients.length} total`;
            populateSelectDropdowns(patients);
            renderPatientList(patients);
            updateAlerts(patients);
        }).catch(() => {
            document.getElementById('patientList').innerHTML = '<div class="empty-state">Cannot connect to backend</div>';
        });
}

function renderPatientList(patients) {
    const list = document.getElementById('patientList');
    if (!patients.length) { list.innerHTML = '<div class="empty-state">No patients found</div>'; return; }
    list.innerHTML = '';
    patients.forEach(p => {
        const sc = p.status === 'STABLE' ? '#10b981' : p.status === 'ATTENTION' ? '#f59e0b' : '#ef4444';
        const initials = p.name.split(' ').map(n => n[0]).join('').substring(0,2);
        const div = document.createElement('div');
        div.className = `patient-item${p.id === currentPatientId ? ' active' : ''}`;
        div.onclick = () => selectPatient(p);
        div.innerHTML = `
            <div class="p-avatar" style="background:${sc}20;color:${sc}">${initials}</div>
            <div class="p-info">
                <div class="pname">${p.name}</div>
                <div class="pdesc">${p.room || 'No Room'} · ${p.age || '?'}y</div>
                <div class="pdesc" style="color:#818cf8;font-size:10px">🔑 ${p.referenceCode || '—'}</div>
            </div>
            <div class="p-dot" style="background:${sc}"></div>`;
        list.appendChild(div);
    });
}

function filterPatientList(q) {
    const filtered = allPatients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.room||'').toLowerCase().includes(q.toLowerCase()));
    renderPatientList(filtered);
}

function selectPatient(p) {
    currentPatientId = p.id;
    renderPatientList(allPatients);

    document.getElementById('phAvatar').textContent = p.name.split(' ').map(n=>n[0]).join('').substring(0,2);
    document.getElementById('phName').textContent = p.name;
    document.getElementById('phMeta').textContent = `${p.room || 'No Room'} · ${p.age || '?'} yrs · ${p.bloodType || 'Blood N/A'}`;
    document.getElementById('phActions').style.display = 'flex';
    document.getElementById('phRefCode').textContent = `REF: ${p.referenceCode || '—'}`;

    const sb = document.getElementById('phStatus');
    sb.style.display = 'inline-block';
    sb.textContent = p.status;
    sb.className = `status-badge status-${(p.status||'stable').toLowerCase()}`;

    // Fill medical info
    document.getElementById('patConditions').textContent = p.conditions || '—';
    document.getElementById('patAllergies').textContent = p.allergies || 'None';
    document.getElementById('patBloodType').textContent = p.bloodType || '—';
    document.getElementById('patEmergencyContact').textContent = p.emergencyContactName ? `${p.emergencyContactName} · ${p.emergencyContactPhone || ''}` : '—';

    // Update modal selects
    document.getElementById('rx_patient').value = p.name;
    document.getElementById('af_patient').value = p.name;
    document.getElementById('co_patient').value = p.name;
    document.getElementById('rxPatientName').textContent = p.name;
    document.getElementById('apptPatientName').textContent = p.name;
    document.getElementById('orderPatientName').textContent = p.name;
    document.getElementById('notesPatientName').textContent = p.name;

    // Show vitals view
    showView('patients');
    document.querySelectorAll('.detail-pane').forEach(el => el.style.display = 'none');
    document.getElementById('paneVitals').style.display = 'block';
    document.querySelectorAll('.dtab').forEach(el => el.classList.remove('active'));
    document.querySelector('.dtab').classList.add('active');

    simulateVitals();
    addFeed('👤 Patient', `Selected: ${p.name}`, 'info');
}

// ------------ VITALS ------------
function simulateVitals() {
    currentVitals.heartRate = 68 + Math.floor(Math.random() * 20);
    currentVitals.systolicBP = 112 + Math.floor(Math.random() * 24);
    currentVitals.diastolicBP = 72 + Math.floor(Math.random() * 14);
    currentVitals.oxygen = 94 + Math.floor(Math.random() * 6);
    currentVitals.temperature = +(98.0 + Math.random() * 2.0).toFixed(1);
    currentVitals.bloodSugar = 90 + Math.floor(Math.random() * 50);
    updateVitalsUI(currentVitals);
    chartData.shift(); chartData.push(currentVitals.heartRate);
    drawChart();
}

function updateVitalsUI(d) {
    const setVal = (id, val, cls) => { const el = document.getElementById(id); if(el){el.textContent=val;el.className=`vi-val ${cls}`;} };
    const hr = d.heartRate || d.heart_rate || 72;
    setVal('hrVal', hr, hr > 100 || hr < 55 ? 'danger' : 'ok');
    setVal('bpVal', `${d.systolicBP||d.systolic_bp||120}/${d.diastolicBP||d.diastolic_bp||80}`, 'normal');
    setVal('o2Val', d.oxygen||d.oxygenLevel||98, (d.oxygen||98) < 95 ? 'warn' : 'ok');
    setVal('tempVal', typeof d.temperature === 'number' ? d.temperature.toFixed(1) : d.temperature || 98.6, 'normal');
    setVal('bsVal', d.bloodSugar||d.blood_sugar||105, (d.bloodSugar||105) > 140 ? 'warn' : 'ok');
}

function drawChart() {
    const svg = document.getElementById('chartSvg'); if(!svg) return;
    const max=140, min=50, range=max-min, step=600/(chartData.length-1);
    let d = `M 0,${100-((chartData[0]-min)/range)*100}`;
    for(let i=1;i<chartData.length;i++) d+=` L ${i*step},${100-((chartData[i]-min)/range)*100}`;
    svg.innerHTML = `<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs>
        <path d="${d} L 600,100 L 0,100 Z" fill="url(#lg)"/>
        <path d="${d}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ------------ MEDICATIONS ------------
function loadAllMedications() {
    fetch(`${API}/pharmacy/medications`)
        .then(r => r.json())
        .then(meds => {
            document.getElementById('medCnt').textContent = meds.length;
            renderMedList(meds, 'allMedsList');
        });
}

function loadPatientMedications() {
    fetch(`${API}/pharmacy/medications`)
        .then(r => r.json())
        .then(meds => {
            const name = document.getElementById('phName').textContent;
            const filtered = name === 'Select a Patient' ? meds : meds.filter(m => (m.patientName||'').includes(name) || true);
            renderMedList(filtered, 'rxList');
        });
}

function renderMedList(meds, containerId) {
    const el = document.getElementById(containerId);
    if (!meds.length) { el.innerHTML = '<div class="empty-state">No prescriptions found</div>'; return; }
    el.innerHTML = meds.map(m => `
        <div class="rx-card">
            <div class="rx-left">
                <h4>💊 ${m.name}</h4>
                <p>${m.description || 'No description'}</p>
                <div class="rx-meta">
                    <span>${m.dosage || '—'}</span>
                    <span>${m.frequency || '—'}</span>
                    <span>${m.timeSlots || '—'}</span>
                    <span class="status-badge status-${m.status||'scheduled'}">${m.status||'scheduled'}</span>
                </div>
            </div>
            <div class="rx-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteMed(${m.id},'${m.name}')">Delete</button>
            </div>
        </div>`).join('');
}

function openPrescribeModal() {
    document.getElementById('prescribeForm').reset();
    if(currentPatientId) {
        const p = allPatients.find(x => x.id === currentPatientId);
        if(p) document.getElementById('rx_patient').value = p.name;
    }
    showModal('prescribeModal');
}

function savePrescription(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('rx_name').value,
        dosage: document.getElementById('rx_dosage').value,
        frequency: document.getElementById('rx_frequency').value,
        timeSlots: document.getElementById('rx_timeSlots').value,
        description: document.getElementById('rx_description').value,
        withFood: document.getElementById('rx_withFood').value === 'true',
        prescribedBy: document.getElementById('doctorName').textContent,
        status: 'scheduled'
    };
    fetch(`${API}/pharmacy/medications`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    }).then(r => r.json()).then(() => {
        closeModal('prescribeModal');
        loadAllMedications();
        addFeed('💊 Rx', `Prescribed ${data.name}`, 'ok');
    });
}

function deleteMed(id, name) {
    if(!confirm(`Delete ${name}?`)) return;
    fetch(`${API}/pharmacy/medications/${id}`, {method:'DELETE'}).then(() => {
        loadAllMedications();
        addFeed('🗑️ Rx', `Removed ${name}`, 'warn');
    });
}

// ------------ APPOINTMENTS ------------
function loadAllAppointments() {
    fetch(`${API}/appointments`)
        .then(r => r.json())
        .then(appts => {
            document.getElementById('apptCnt').textContent = appts.length;
            renderApptList(appts, 'allApptsList');
        });
}

function loadPatientAppointments() {
    const name = document.getElementById('phName').textContent;
    fetch(`${API}/appointments`)
        .then(r => r.json())
        .then(appts => {
            const filtered = name === 'Select a Patient' ? appts : appts.filter(a => a.patientName === name);
            renderApptList(filtered, 'apptListDetail');
        });
}

function renderApptList(appts, containerId) {
    const el = document.getElementById(containerId);
    if(!appts.length) { el.innerHTML = '<div class="empty-state">No appointments found</div>'; return; }
    
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
        html += '<div style="font-size:13px;font-weight:700;color:#6366f1;margin:0 16px 10px;display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6366f1;animation:pulse 1.5s infinite"></span> Upcoming (' + upcomingCount + ')</div>';
    }
    
    const sc = s => s === 'completed' ? '#10b981' : s === 'scheduled' ? '#6366f1' : '#ef4444';
    let doneHeaderAdded = false;
    
    html += appts.map(a => {
        let sectionHeader = '';
        if (a._isDone && !doneHeaderAdded) {
            doneHeaderAdded = true;
            sectionHeader = '<div style="font-size:13px;font-weight:700;color:#10b981;margin:18px 16px 10px;display:flex;align-items:center;gap:6px">✅ Done (' + doneCount + ')</div>';
        }
        const isDone = a._isDone;
        const statusColor = isDone ? '#10b981' : sc(a.status);
        const statusLabel = isDone ? '✅ Done' : a.status;
        return sectionHeader + `
        <div class="appt-card" style="${isDone ? 'opacity:0.7;' : ''}">
            <div class="appt-left">
                <h4>📅 ${a.patientName} — ${a.type}</h4>
                <div class="appt-meta">
                    <span>👨‍⚕️ ${a.doctorName}</span>
                    <span>📍 ${a.location || 'TBD'}</span>
                    <span style="${isDone ? 'color:#10b981' : ''}">🕒 ${new Date(a.appointmentDate).toLocaleString()}</span>
                    <span class="priority-badge priority-${a.status||'scheduled'}" style="background:${statusColor}22;color:${statusColor};font-weight:700">${statusLabel}</span>
                </div>
                ${a.notes ? `<p style="font-size:11px;color:var(--muted);margin-top:8px">📝 ${a.notes}</p>` : ''}
            </div>
            <div class="rx-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteAppt(${a.id})">${isDone ? 'Remove' : 'Cancel'}</button>
            </div>
        </div>`;
    }).join('');
    el.innerHTML = html;
}

function openApptModal(id = null) {
    document.getElementById('apptForm').reset();
    document.getElementById('af_id').value = '';
    const d = new Date(); d.setDate(d.getDate()+1); d.setHours(10,0,0,0);
    document.getElementById('af_date').value = new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById('af_doctor').value = document.getElementById('doctorName').textContent;
    if(currentPatientId) {
        const p = allPatients.find(x => x.id === currentPatientId);
        if(p) document.getElementById('af_patient').value = p.name;
    }
    showModal('apptModal');
}

function saveAppointment(e) {
    e.preventDefault();
    const id = document.getElementById('af_id').value;
    const data = {
        patientName: document.getElementById('af_patient').value,
        doctorName: document.getElementById('af_doctor').value,
        type: document.getElementById('af_type').value,
        appointmentDate: document.getElementById('af_date').value + ':00',
        location: document.getElementById('af_location').value,
        status: 'scheduled',
        notes: document.getElementById('af_notes').value
    };
    fetch(id ? `${API}/appointments/${id}` : `${API}/appointments`, {
        method: id ? 'PUT' : 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    }).then(r => r.json()).then(() => {
        closeModal('apptModal');
        loadAllAppointments();
        addFeed('📅 Appt', `Appointment for ${data.patientName} saved`, 'ok');
    });
}

function deleteAppt(id) {
    if(!confirm('Cancel this appointment?')) return;
    fetch(`${API}/appointments/${id}`, {method:'DELETE'}).then(() => {
        loadAllAppointments();
        if(currentPatientId) loadPatientAppointments();
        addFeed('🗑️ Appt', 'Appointment cancelled', 'warn');
    });
}

// ------------ CARE ORDERS ------------
function loadAllOrders() {
    fetch(`${API}/care-orders`)
        .then(r => r.json())
        .then(orders => {
            document.getElementById('orderCnt').textContent = orders.length;
            const body = document.getElementById('allOrdersBody');
            if(!orders.length) { body.innerHTML = '<tr><td colspan="6" class="empty-state">No orders</td></tr>'; return; }
            const pc = {'critical':'priority-critical','high':'priority-high','medium':'priority-medium','low':'priority-low'};
            const sc = s => s==='completed'?'#10b981':s==='in_progress'?'#6366f1':'#f59e0b';
            body.innerHTML = orders.map(o => `
                <tr>
                    <td>#${o.id}</td>
                    <td style="font-weight:600">${o.patientName}</td>
                    <td style="text-transform:capitalize">${o.orderType}</td>
                    <td>${(o.description||'').substring(0,50)}${(o.description||'').length>50?'...':''}</td>
                    <td><span class="priority-badge ${pc[o.priority]||'priority-medium'}">${o.priority}</span></td>
                    <td><span style="font-size:11px;font-weight:700;color:${sc(o.status)}">${o.status.replace('_', ' ')}</span></td>
                </tr>`).join('');
        });
}

function loadPatientOrders() {
    const name = document.getElementById('phName').textContent;
    fetch(`${API}/care-orders`)
        .then(r => r.json())
        .then(orders => {
            const filtered = name === 'Select a Patient' ? orders : orders.filter(o => o.patientName === name);
            const el = document.getElementById('ordersListDetail');
            if(!filtered.length) { el.innerHTML = '<div class="empty-state">No care orders for this patient</div>'; return; }
            const sc = s => s==='completed'?'#10b981':s==='in_progress'?'#6366f1':'#f59e0b';
            el.innerHTML = filtered.map(o => `
                <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <span style="font-weight:700">#${o.id} · ${o.orderType} — ${o.patientName}</span>
                        <span style="font-size:11px;font-weight:700;color:${sc(o.status)}">${o.status.replace('_', ' ')}</span>
                    </div>
                    <p style="font-size:12px;color:var(--text)">${o.description}</p>
                </div>`).join('');
        });
}

function openOrderModal() {
    document.getElementById('orderForm').reset();
    if(currentPatientId) {
        const p = allPatients.find(x => x.id === currentPatientId);
        if(p) document.getElementById('co_patient').value = p.name;
    }
    showModal('orderModal');
}

function saveCareOrder(e) {
    e.preventDefault();
    const data = {
        patientName: document.getElementById('co_patient').value,
        orderType: document.getElementById('co_type').value,
        priority: document.getElementById('co_priority').value,
        status: document.getElementById('co_status').value,
        description: document.getElementById('co_desc').value
    };
    fetch(`${API}/care-orders`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    }).then(r => r.json()).then(() => {
        closeModal('orderModal');
        loadAllOrders();
        addFeed('📋 Order', `New order for ${data.patientName}`, 'info');
    });
}

// ------------ CLINICAL NOTES ------------
function saveNotes() {
    const text = document.getElementById('clinicalNotes').value.trim();
    if(!text || !currentPatientId) return;
    const p = allPatients.find(x => x.id === currentPatientId);
    const container = document.getElementById('savedNotes');
    const entry = document.createElement('div');
    entry.className = 'note-entry';
    entry.innerHTML = `<div class="note-meta">👨‍⚕️ ${document.getElementById('doctorName').textContent} · ${new Date().toLocaleString()}${p?' · '+p.name:''}</div><p>${text}</p>`;
    container.insertBefore(entry, container.firstChild);
    document.getElementById('clinicalNotes').value = '';
    addFeed('🩺 Notes', 'Clinical note saved', 'ok');
}

// ------------ ALERTS ------------
function loadAlerts() {
    const el = document.getElementById('allAlertsList');
    const criticals = allPatients.filter(p => p.status === 'CRITICAL');
    const attentions = allPatients.filter(p => p.status === 'ATTENTION');
    document.getElementById('alertCnt').textContent = criticals.length + attentions.length;
    if(!criticals.length && !attentions.length) { el.innerHTML = '<div class="empty-state">✅ No active alerts</div>'; return; }
    el.innerHTML = `<div style="padding:16px">` +
        criticals.map(p => `<div class="alert-card"><h4>🔴 CRITICAL: ${p.name}</h4><p>${p.room||'No Room'} · ${p.conditions||'Unknown condition'} · Immediate attention required</p></div>`).join('') +
        attentions.map(p => `<div class="alert-card warn"><h4>⚠️ ATTENTION: ${p.name}</h4><p>${p.room||'No Room'} · ${p.conditions||'Unknown condition'} · Close monitoring needed</p></div>`).join('') +
        `</div>`;
}

function updateAlerts(patients) {
    const cnt = patients.filter(p => p.status === 'CRITICAL' || p.status === 'ATTENTION').length;
    document.getElementById('alertCnt').textContent = cnt;
}

// ------------ UTILS ------------
function populateSelectDropdowns(patients) {
    const opts = '<option value="">Select patient...</option>' + patients.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    ['rx_patient','af_patient','co_patient'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = opts;
    });
}

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

function clearFeed() {
    document.getElementById('liveFeed').innerHTML = '<div class="empty-state" id="feedEmpty">No recent activity</div>';
}

function showModal(id) { document.getElementById(id).style.display = 'flex'; lucide.createIcons(); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
