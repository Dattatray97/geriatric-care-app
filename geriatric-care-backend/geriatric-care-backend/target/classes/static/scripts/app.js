const API_BASE = '/api/v1';
let currentPatientId = null;
let stompClient = null;
let chartData = Array(20).fill(70);
let allPatients = []; // Track all patients for filtering
let currentVitals = { heartRate: 75, systolicBP: 120, diastolicBP: 80, oxygen: 98, temperature: 98.6, bloodSugar: 110 };

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Display caretaker name from login email (like Doctor & Family dashboards)
    const email = sessionStorage.getItem('elderguard_user_email') || '';
    if (email) {
        const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
        document.getElementById('adminName').textContent = name;
        document.getElementById('adminAvatar').textContent = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    }
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(fetchPatientHealth, 30000); // 30 second live update (simulated random)
    connectWebSocket();
    loadPatients();
    loadAllOrders();
    checkApiHealth();
    drawChart();
});

// Navigation
function showSection(section) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.stab').forEach(el => el.classList.remove('active'));
    
    if (section === 'dashboard') {
        document.getElementById('contentVitals').style.display = 'block';
        if(event) event.currentTarget.classList.add('active');
        // Reset patient filter when clicking dashboard
        if (allPatients) renderPatientList(allPatients);
    } else if (section === 'medications') {
        document.getElementById('contentMeds').style.display = 'block';
        if(event) event.currentTarget.classList.add('active');
        loadAllMedications();
    } else if (section === 'appointments') {
        document.getElementById('contentAppts').style.display = 'block';
        if(event) event.currentTarget.classList.add('active');
        loadAllAppointments();
    }
}

function showTab(tabId) {
    document.querySelectorAll('.ctab').forEach(el => el.classList.remove('active'));
    if(event) event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    if (tabId === 'vitals') {
        document.getElementById('contentVitals').style.display = 'block';
        fetchPatientHealth();
    } else if (tabId === 'meds') {
        document.getElementById('contentMeds').style.display = 'block';
        loadAllMedications();
    } else if (tabId === 'appts') {
        document.getElementById('contentAppts').style.display = 'block';
        loadPatientAppointments();
    } else if (tabId === 'orders') {
        document.getElementById('contentOrders').style.display = 'block';
        loadPatientOrders();
    } else if (tabId === 'messages') {
        document.getElementById('contentMessages').style.display = 'block';
    }
}

function openFoodMenu() {
    if (!currentPatientId) {
        alert('Please select a patient first before ordering food.');
        return;
    }
    const patientName = document.getElementById('phName').textContent;
    const foodBody = document.getElementById('foodBody');
    foodBody.innerHTML = `
        <div style="margin-bottom:16px;padding:12px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-radius:8px;border:1px solid #bbf7d0;">
            <div style="font-size:13px;color:#15803d;font-weight:600;">🍽️ Ordering food for: <strong>${patientName}</strong></div>
        </div>
        <div class="cards-grid">
            <div class="card" style="padding:16px;text-align:center;">
                <img src="https://www.pcrm.org/sites/default/files/2026-02/Oatmeal%20and%20Berries.jpeg" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px;" alt="Oatmeal" />
                <h3 style="margin-bottom:8px;">Oatmeal & Berries</h3>
                <p style="margin-bottom:12px;color:var(--muted);font-size:14px;">Healthy breakfast option.</p>
                <button class="btn btn-pri" onclick="orderFood('Oatmeal & Berries')">Order</button>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <img src="https://hips.hearstapps.com/hmg-prod/images/grilled-chicken-salad-index-6628169554c88.jpg?crop=0.6667863339915036xw:1xh;center,top&resize=1200:*" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px;" alt="Salad" />
                <h3 style="margin-bottom:8px;">Grilled Chicken Salad</h3>
                <p style="margin-bottom:12px;color:var(--muted);font-size:14px;">Light lunch with high protein.</p>
                <button class="btn btn-pri" onclick="orderFood('Grilled Chicken Salad')">Order</button>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIQH49waX_-KXhT09Z5dF19nv292n22KbwZQ&s" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px;" alt="Soup" />
                <h3 style="margin-bottom:8px;">Vegetable Soup</h3>
                <p style="margin-bottom:12px;color:var(--muted);font-size:14px;">Warm and easy to digest.</p>
                <button class="btn btn-pri" onclick="orderFood('Vegetable Soup')">Order</button>
            </div>
        </div>
        <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;">
            <h3 style="margin-bottom:8px;">Custom Order</h3>
            <div style="display:flex;gap:8px;">
                <input type="text" id="customFoodInput" placeholder="Enter custom food name..." style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit;">
                <button class="btn btn-pri" onclick="orderCustomFood()">Order</button>
            </div>
        </div>
    `;
    document.getElementById('foodModal').style.display = 'flex';
}

function orderCustomFood() {
    const input = document.getElementById('customFoodInput');
    if (input && input.value.trim() !== '') {
        orderFood(input.value.trim());
        input.value = '';
    } else {
        alert("Please enter a food name.");
    }
}

function orderFood(dish) {
    if (!currentPatientId) {
        alert('Please select a patient first.');
        return;
    }
    const patientName = document.getElementById('phName').textContent;

    // Create a care order of type "food" via the API
    const orderData = {
        patientName: patientName,
        orderType: 'food',
        description: dish,
        status: 'in_progress',
        priority: 'low'
    };

    fetch(`${API_BASE}/care-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(order => {
        closeModal('foodModal');
        addFeedItem('🍽️ Food Order', `${dish} ordered for ${patientName} (Order #${order.id})`, 'info');
        showToast('🍽️ Food Ordered!', `${dish} has been ordered for ${patientName}`, 'food');
        // Refresh care orders if visible
        if (document.getElementById('contentOrders').style.display === 'block') {
            loadPatientOrders();
        } else {
            loadAllOrders();
        }
    })
    .catch(err => {
        console.error('Food order error:', err);
        alert('Failed to place food order. Please try again.');
    });
}

function showAdminNotifications() {
    alert("Admin Notifications:\n1. System is stable.\n2. Vitals monitoring active.\n3. Patient records updated.");
}

function editAdminName() {
    const newName = prompt("Enter new Admin name:");
    if (newName && newName.trim() !== '') {
        document.getElementById('adminName').textContent = newName.trim();
        document.getElementById('adminAvatar').textContent = newName.trim().substring(0, 2).toUpperCase();
    }
}

// Chart
function drawChart() {
    const svg = document.getElementById('chartSvg');
    if(!svg) return;
    const maxVal = 140;
    const minVal = 40;
    const range = maxVal - minVal;
    let path = `M 0,${100 - ((chartData[0] - minVal) / range) * 100}`;
    const step = 600 / (chartData.length - 1);
    for(let i = 1; i < chartData.length; i++) {
        let y = 100 - ((chartData[i] - minVal) / range) * 100;
        path += ` L ${i * step},${y}`;
    }
    svg.innerHTML = `<path d="${path}" fill="none" stroke="var(--pri)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Clock
function updateClock() {
    const now = new Date();
    document.getElementById('liveDateTime').textContent = now.toLocaleString();
}

// API Health
function checkApiHealth() {
    fetch(`${API_BASE}/health`)
        .then(res => res.json())
        .then(data => {
            document.querySelector('.sys-online').style.color = '#10b981';
            document.querySelector('.sys-online').textContent = 'System Online';
        })
        .catch(err => {
            document.querySelector('.sys-online').style.color = '#ef4444';
            document.querySelector('.sys-online').textContent = 'System Offline';
        });
}

// WebSocket
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    
    stompClient.connect({}, (frame) => {
        stompClient.subscribe('/topic/alerts', (message) => {
            addFeedItem('🚨 Alert', JSON.parse(message.body).message, 'danger');
        });
        
        stompClient.subscribe('/topic/health', (message) => {
            const data = JSON.parse(message.body);
            if (currentPatientId && data.patientName === document.getElementById('phName').textContent) {
                updateVitalsUI(data);
                chartData.shift();
                chartData.push(data.heartRate);
                drawChart();
            }
        });
        
        stompClient.subscribe('/topic/care-orders', (message) => {
            loadAllOrders();
        });
        
        stompClient.subscribe('/topic/tasks', (message) => {
            loadTasks();
        });
        
        stompClient.subscribe('/topic/emergency', (message) => {
            const data = JSON.parse(message.body);
            addFeedItem('🚨 EMERGENCY', data.message || 'Emergency reported!', 'danger');
            loadEmergencyAlerts(); // refresh if open
        });
    });
}

// ================= PATIENT MANAGEMENT =================

function loadPatients() {
    fetch(`${API_BASE}/patients`)
        .then(res => res.json())
        .then(patients => {
            allPatients = patients;
            renderPatientList(patients);
            updateStatusCounts(patients);
            updateAlertsDropdown();
            renderAlerts();
        }).catch(err => {
            console.error("Failed to load patients", err);
            document.getElementById('patientList').innerHTML = '<div class="feed-empty">Error loading patients</div>';
        });
}

function updateStatusCounts(patients) {
    let stable = 0, attention = 0, critical = 0;
    patients.forEach(p => {
        if(p.status === 'STABLE') stable++;
        if(p.status === 'ATTENTION') attention++;
        if(p.status === 'CRITICAL') critical++;
    });
    document.getElementById('stableCnt').textContent = stable;
    document.getElementById('attentionCnt').textContent = attention;
    document.getElementById('criticalCnt').textContent = critical;
}

function filterPatients(status) {
    if (!allPatients) return;
    const filtered = allPatients.filter(p => p.status === status);
    renderPatientList(filtered);
    
    document.querySelectorAll('.stab').forEach(el => el.classList.remove('active'));
    if(event) event.currentTarget.classList.add('active');
}

function renderPatientList(patients) {
    const list = document.getElementById('patientList');
    document.getElementById('patientTotal').textContent = `${patients.length} total`;
    
    const orderSelect = document.getElementById('patientName');
    const apptSelect = document.getElementById('af_patient');
    const editOrderSelect = document.getElementById('eo_patient');
    
    let optionsHtml = '<option value="">Select patient...</option>';
    (allPatients || patients).forEach(p => {
        optionsHtml += `<option value="${p.name}">${p.name}</option>`;
    });
    orderSelect.innerHTML = optionsHtml;
    apptSelect.innerHTML = optionsHtml;
    editOrderSelect.innerHTML = optionsHtml;
    
    // Populate task patient filter
    const taskFilter = document.getElementById('taskPatientFilter');
    if (taskFilter) {
        const currentVal = taskFilter.value;
        let taskOpts = '<option value="ALL">All Patients</option>';
        (allPatients || patients).forEach(p => {
            taskOpts += `<option value="${p.name}">${p.name}</option>`;
        });
        taskFilter.innerHTML = taskOpts;
        if (currentVal) taskFilter.value = currentVal;
    }
    
    if (patients.length === 0) {
        list.innerHTML = '<div class="feed-empty">No patients found.</div>';
        return;
    }
    
    list.innerHTML = '';
    patients.forEach(patient => {
        const statusColor = patient.status === 'STABLE' ? 'var(--ok)' : 
                          (patient.status === 'ATTENTION' ? 'var(--warn)' : 'var(--danger)');
        const initials = patient.name.split(' ').map(n => n[0]).join('').substring(0,2);
        
        const div = document.createElement('div');
        div.className = `patient-item ${patient.id === currentPatientId ? 'active' : ''}`;
        div.onclick = () => selectPatient(patient);
        div.innerHTML = `
            <div class="p-avatar" style="background:${statusColor}22;color:${statusColor}">${initials}</div>
            <div class="p-info">
                <div class="pname">${patient.name}</div>
                <div class="pdesc">${patient.room || 'No Room'} · ${patient.age ? patient.age + 'y' : 'N/A'}</div>
                <div class="pdesc" style="color:#60a5fa;font-size:10px;margin-top:2px">🔑 ${patient.referenceCode || 'N/A'}</div>
            </div>
            <div class="p-status" style="background:${statusColor}"></div>
        `;
        list.appendChild(div);
    });
}

function selectPatient(patient) {
    currentPatientId = patient.id;
    loadPatients();
    
    // Baseline vitals for this specific patient
    currentVitals = {
        heartRate: 70 + Math.floor(Math.random() * 15),
        systolicBP: 110 + Math.floor(Math.random() * 20),
        diastolicBP: 75 + Math.floor(Math.random() * 10),
        bloodSugar: 90 + Math.floor(Math.random() * 30),
        temperature: 98.0 + (Math.random() * 1.5),
        oxygen: 95 + Math.floor(Math.random() * 5)
    };
    
    document.getElementById('phName').textContent = patient.name;
    document.getElementById('phMeta').textContent = `${patient.room || 'No Room'} · ${patient.age ? patient.age + ' yrs' : 'Age N/A'} · ${patient.bloodType || 'Blood N/A'}`;
    document.getElementById('phAvatar').textContent = patient.name.split(' ').map(n => n[0]).join('').substring(0,2);
    
    // Auto-select patient in forms
    document.getElementById('patientName').value = patient.name;
    document.getElementById('af_patient').value = patient.name;
    document.getElementById('eo_patient').value = patient.name;
    
    // Auto-select patient in task filter and reload tasks
    const taskFilter = document.getElementById('taskPatientFilter');
    if (taskFilter) {
        taskFilter.value = patient.name;
        loadTasks();
    }
    
    const statusBadge = document.getElementById('phStatus');
    statusBadge.style.display = 'inline-block';
    statusBadge.textContent = patient.status;
    statusBadge.className = 'crit-badge ' + (patient.status === 'STABLE' ? 'stable' : (patient.status === 'ATTENTION' ? 'warn' : 'critical'));
    
    document.getElementById('phRight').style.display = 'flex';
    
    // Show vitals tab by default on patient select
    document.getElementById('tabVitals').click();
    fetchPatientHealth();
}

function simulateRandomVitals() {
    if (!currentPatientId) return;
    
    // Realistic random walk
    currentVitals.heartRate += Math.floor(Math.random() * 5) - 2; // -2 to +2
    currentVitals.systolicBP += Math.floor(Math.random() * 5) - 2;
    currentVitals.diastolicBP += Math.floor(Math.random() * 3) - 1;
    currentVitals.bloodSugar += Math.floor(Math.random() * 7) - 3;
    currentVitals.temperature += (Math.random() * 0.4) - 0.2; // -0.2 to +0.2
    currentVitals.oxygen += Math.floor(Math.random() * 3) - 1; // -1 to +1

    // Hard bounds checking for realism
    if (currentVitals.heartRate < 60) currentVitals.heartRate = 60;
    if (currentVitals.heartRate > 110) currentVitals.heartRate = 110;
    
    if (currentVitals.systolicBP < 100) currentVitals.systolicBP = 100;
    if (currentVitals.systolicBP > 160) currentVitals.systolicBP = 160;

    if (currentVitals.diastolicBP < 65) currentVitals.diastolicBP = 65;
    if (currentVitals.diastolicBP > 95) currentVitals.diastolicBP = 95;

    if (currentVitals.bloodSugar < 80) currentVitals.bloodSugar = 80;
    if (currentVitals.bloodSugar > 180) currentVitals.bloodSugar = 180;

    if (currentVitals.temperature < 97.0) currentVitals.temperature = 97.0;
    if (currentVitals.temperature > 100.5) currentVitals.temperature = 100.5;

    if (currentVitals.oxygen < 90) currentVitals.oxygen = 90;
    if (currentVitals.oxygen > 100) currentVitals.oxygen = 100;

    updateVitalsUI(currentVitals);
    chartData.shift();
    chartData.push(currentVitals.heartRate);
    drawChart();
}

function fetchPatientHealth() {
    if (!currentPatientId) return;
    simulateRandomVitals();
    // Intentionally overriding server response for random simulated demo
    const patientName = document.getElementById('phName').textContent;
    fetch(`${API_BASE}/health/metrics`)
        .then(res => res.json())
        .then(data => {
            // Keep backend connection alive, but UI uses random simulation
        }).catch(err => {
            console.log("Health fetch fallback: ", err);
        });
}

// Ensure record button works
window.fetchHealthMetrics = function() {
    alert("Live status updated from device simulators.");
    simulateRandomVitals();
}

function updateVitalsUI(data) {
    document.getElementById('hrVal').textContent = data.heartRate;
    document.getElementById('bpVal').textContent = `${data.systolicBP}/${data.diastolicBP}`;
    
    const bsVal = document.getElementById('bsVal');
    if (bsVal) bsVal.textContent = data.bloodSugar;
    
    const o2Val = document.getElementById('o2Val');
    if (o2Val) o2Val.textContent = data.oxygen;
    
    const tempVal = document.getElementById('tempVal');
    if (tempVal) tempVal.textContent = data.temperature.toFixed(1);
}

function resetVitalsUI() {
    document.getElementById('hrVal').textContent = '--';
    document.getElementById('bpVal').textContent = '--/--';
    const bsVal = document.getElementById('bsVal');
    if (bsVal) bsVal.textContent = '--';
    const o2Val = document.getElementById('o2Val');
    if (o2Val) o2Val.textContent = '--';
    const tempVal = document.getElementById('tempVal');
    if (tempVal) tempVal.textContent = '--';
}

function openPatientModal(patientId = null) {
    document.getElementById('patientForm').reset();
    document.getElementById('pf_id').value = '';
    
    if (patientId) {
        document.getElementById('patientModalTitle').textContent = '👤 Edit Patient';
        fetch(`${API_BASE}/patients/${patientId}`)
            .then(res => res.json())
            .then(p => {
                document.getElementById('pf_id').value = p.id;
                document.getElementById('pf_name').value = p.name;
                document.getElementById('pf_age').value = p.age || '';
                document.getElementById('pf_room').value = p.room || '';
                document.getElementById('pf_status').value = p.status || 'STABLE';
                document.getElementById('pf_conditions').value = p.conditions || '';
                document.getElementById('pf_bloodType').value = p.bloodType || '';
                document.getElementById('pf_allergies').value = p.allergies || '';
                document.getElementById('pf_ecName').value = p.emergencyContactName || '';
                document.getElementById('pf_ecPhone').value = p.emergencyContactPhone || '';
                document.getElementById('pf_ecEmail').value = p.emergencyContactEmail || '';
                document.getElementById('patientModal').style.display = 'flex';
            });
    } else {
        document.getElementById('patientModalTitle').textContent = '👤 Add Patient';
        document.getElementById('patientModal').style.display = 'flex';
    }
}

function editSelectedPatient() {
    if (currentPatientId) {
        openPatientModal(currentPatientId);
    }
}

function savePatient(e) {
    e.preventDefault();
    const id = document.getElementById('pf_id').value;
    
    const data = {
        name: document.getElementById('pf_name').value,
        age: parseInt(document.getElementById('pf_age').value) || null,
        room: document.getElementById('pf_room').value,
        status: document.getElementById('pf_status').value,
        conditions: document.getElementById('pf_conditions').value,
        bloodType: document.getElementById('pf_bloodType').value,
        allergies: document.getElementById('pf_allergies').value,
        emergencyContactName: document.getElementById('pf_ecName').value,
        emergencyContactPhone: document.getElementById('pf_ecPhone').value,
        emergencyContactEmail: document.getElementById('pf_ecEmail').value
    };
    
    const url = id ? `${API_BASE}/patients/${id}` : `${API_BASE}/patients`;
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(patient => {
        closeModal('patientModal');
        loadPatients();
        if (id && currentPatientId === parseInt(id)) {
            selectPatient(patient);
        }
        addFeedItem('👤 Patient', `Patient ${data.name} ${id ? 'updated' : 'added'}`, 'info');
    });
}

function deleteSelectedPatient() {
    if (!currentPatientId) return;
    confirmDelete(`Are you sure you want to delete patient ${document.getElementById('phName').textContent}?`, () => {
        fetch(`${API_BASE}/patients/${currentPatientId}`, { method: 'DELETE' })
            .then(() => {
                currentPatientId = null;
                document.getElementById('phName').textContent = 'Select a Patient';
                document.getElementById('phMeta').textContent = 'Click a patient from the sidebar to view details';
                document.getElementById('phAvatar').textContent = '--';
                document.getElementById('phStatus').style.display = 'none';
                document.getElementById('phRight').style.display = 'none';
                resetVitalsUI();
                loadPatients();
                addFeedItem('🗑️ Patient', 'Patient deleted', 'warn');
            });
    });
}

// ================= MEDICATIONS =================

function loadAllMedications() {
    fetch(`${API_BASE}/pharmacy/medications`)
        .then(res => res.json())
        .then(meds => {
            const list = document.getElementById('medsListInline');
            document.getElementById('medCnt').textContent = meds.length;
            
            if (meds.length === 0) {
                list.innerHTML = '<div class="feed-empty">No medications found. Add one!</div>';
                return;
            }
            
            let html = '<div class="cards-grid">';
            meds.forEach(med => {
                const statusColor = med.status === 'taken' ? 'var(--ok)' : (med.status === 'pending' ? 'var(--warn)' : 'var(--info)');
                html += `
                    <div class="card" style="border-left: 4px solid ${statusColor}; padding: 16px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: #0f172a">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
                            <h4 style="margin:0">${med.name}</h4>
                            <span class="crit-badge" style="background:${statusColor}22; color:${statusColor}">${med.status}</span>
                        </div>
                        <p style="margin:0 0 12px 0; font-size:13px; color:var(--muted)">${med.dosage} · ${med.frequency}</p>
                        <div style="font-size:12px; color:var(--muted); margin-bottom:12px">
                            <div>🕒 ${med.timeSlots || 'No specific time'}</div>
                            <div>👨‍⚕️ ${med.prescribedBy || 'Unknown doctor'}</div>
                        </div>
                        <div style="display:flex; gap:8px">
                            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openMedModal(${med.id})">Edit</button>
                            <button class="btn btn-ghost btn-sm" style="flex:1; color:var(--danger); border-color:rgba(239,68,68,0.2)" onclick="deleteMedication(${med.id}, '${med.name}')">Delete</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            list.innerHTML = html;
        });
}

function openMedModal(id = null) {
    document.getElementById('medForm').reset();
    document.getElementById('mf_id').value = '';
    
    if (id) {
        document.getElementById('medModalTitle').textContent = '💊 Edit Medication';
        fetch(`${API_BASE}/pharmacy/medications`)
            .then(res => res.json())
            .then(meds => {
                const med = meds.find(m => m.id === id);
                if (med) {
                    document.getElementById('mf_id').value = med.id;
                    document.getElementById('mf_name').value = med.name;
                    document.getElementById('mf_dosage').value = med.dosage || '';
                    document.getElementById('mf_description').value = med.description || '';
                    document.getElementById('mf_frequency').value = med.frequency || '';
                    document.getElementById('mf_timeSlots').value = med.timeSlots || '';
                    document.getElementById('mf_prescribedBy').value = med.prescribedBy || '';
                    document.getElementById('mf_refills').value = med.refillsRemaining || 0;
                    // Status is auto-managed (live feature)
                    document.getElementById('mf_withFood').value = med.withFood !== false ? 'true' : 'false';
                    document.getElementById('medModal').style.display = 'flex';
                }
            });
    } else {
        document.getElementById('medModalTitle').textContent = '💊 Add Medication';
        document.getElementById('medModal').style.display = 'flex';
    }
}

function saveMedication(e) {
    e.preventDefault();
    const id = document.getElementById('mf_id').value;
    
    const data = {
        name: document.getElementById('mf_name').value,
        dosage: document.getElementById('mf_dosage').value,
        description: document.getElementById('mf_description').value,
        frequency: document.getElementById('mf_frequency').value,
        timeSlots: document.getElementById('mf_timeSlots').value,
        prescribedBy: document.getElementById('mf_prescribedBy').value,
        refillsRemaining: parseInt(document.getElementById('mf_refills').value) || 0,
        status: 'scheduled',
        withFood: document.getElementById('mf_withFood').value === 'true'
    };
    
    const url = id ? `${API_BASE}/pharmacy/medications/${id}` : `${API_BASE}/pharmacy/medications`;
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        closeModal('medModal');
        loadAllMedications();
        addFeedItem('💊 Pharmacy', `Medication ${data.name} saved`, 'info');
    });
}

function deleteMedication(id, name) {
    confirmDelete(`Are you sure you want to delete ${name}?`, () => {
        fetch(`${API_BASE}/pharmacy/medications/${id}`, { method: 'DELETE' })
            .then(() => {
                loadAllMedications();
                addFeedItem('🗑️ Pharmacy', 'Medication deleted', 'warn');
            });
    });
}

// ================= APPOINTMENTS =================

function loadAllAppointments() {
    fetch(`${API_BASE}/appointments`)
        .then(res => res.json())
        .then(appts => renderAppointments(appts));
}

function loadPatientAppointments() {
    if (!currentPatientId) return loadAllAppointments();
    const patientName = document.getElementById('phName').textContent;
    fetch(`${API_BASE}/appointments/patient/${patientName}`)
        .then(res => res.json())
        .then(appts => renderAppointments(appts));
}

function renderAppointments(appts) {
    const list = document.getElementById('apptsListInline');
    document.getElementById('apptCnt').textContent = appts.length;
    
    if (appts.length === 0) {
        list.innerHTML = '<div class="feed-empty">No appointments found. Add one!</div>';
        return;
    }
    
    const now = new Date();
    
    // Determine live vs done status based on date
    appts.forEach(appt => {
        const date = new Date(appt.appointmentDate);
        if (date < now && appt.status !== 'cancelled') {
            appt._displayStatus = 'Done';
            appt._isDone = true;
        } else {
            appt._displayStatus = appt.status;
            appt._isDone = false;
        }
    });
    
    // Sort: upcoming (by date asc) first, then done (by date desc) at bottom
    appts.sort((a, b) => {
        if (a._isDone !== b._isDone) return a._isDone ? 1 : -1;
        if (a._isDone) return new Date(b.appointmentDate) - new Date(a.appointmentDate);
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });
    
    const upcomingCount = appts.filter(a => !a._isDone).length;
    const doneCount = appts.filter(a => a._isDone).length;
    
    let html = '';
    if (upcomingCount > 0) {
        html += '<div style="font-size:13px;font-weight:700;color:#3b82f6;margin-bottom:10px;display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:pulse 1.5s infinite"></span> Upcoming Schedule (' + upcomingCount + ')</div>';
    }
    html += '<div class="cards-grid">';
    let doneHeaderAdded = false;
    appts.forEach(appt => {
        if (appt._isDone && !doneHeaderAdded) {
            html += '</div>';
            if (doneCount > 0) {
                html += '<div style="font-size:13px;font-weight:700;color:#10b981;margin:18px 0 10px 0;display:flex;align-items:center;gap:6px">✅ Done (' + doneCount + ')</div>';
            }
            html += '<div class="cards-grid">';
            doneHeaderAdded = true;
        }
        const date = new Date(appt.appointmentDate);
        const isDone = appt._isDone;
        const statusColor = isDone ? '#10b981' : (appt.status === 'cancelled' ? 'var(--danger)' : 'var(--info)');
        const statusLabel = isDone ? '✅ Done' : appt.status;
        const cardOpacity = isDone ? 'opacity:0.7;' : '';
        html += `
            <div class="card" style="border-left: 4px solid ${statusColor}; padding: 16px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: #0f172a; ${cardOpacity}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
                    <h4 style="margin:0">${appt.patientName}</h4>
                    <span class="crit-badge" style="background:${statusColor}22; color:${statusColor}; font-weight:700">${statusLabel}</span>
                </div>
                <p style="margin:0 0 12px 0; font-size:13px; color:var(--muted)">${appt.type} with ${appt.doctorName}</p>
                <div style="font-size:12px; color:var(--muted); margin-bottom:12px; background: ${isDone ? '#f0fdf4' : '#f8fafc'}; padding: 8px; border-radius: 4px;">
                    <div style="font-weight:600; color:${isDone ? '#10b981' : '#0f172a'}">📅 ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div style="margin-top:4px">📍 ${appt.location || 'TBD'}</div>
                </div>
                <div style="display:flex; gap:8px">
                    <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openApptModal(${appt.id})">Edit</button>
                    <button class="btn btn-ghost btn-sm" style="flex:1; color:var(--danger); border-color:rgba(239,68,68,0.2)" onclick="deleteAppointment(${appt.id}, '${appt.patientName}')">${isDone ? 'Remove' : 'Cancel'}</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    list.innerHTML = html;
}

function openApptModal(id = null) {
    document.getElementById('apptForm').reset();
    document.getElementById('af_id').value = '';
    
    if (id) {
        document.getElementById('apptModalTitle').textContent = '📅 Edit Appointment';
        fetch(`${API_BASE}/appointments/${id}`)
            .then(res => res.json())
            .then(appt => {
                document.getElementById('af_id').value = appt.id;
                document.getElementById('af_patient').value = appt.patientName;
                document.getElementById('af_doctor').value = appt.doctorName;
                document.getElementById('af_type').value = appt.type || 'checkup';
                document.getElementById('af_location').value = appt.location || '';
                // Status is auto-determined by date (live feature)
                document.getElementById('af_notes').value = appt.notes || '';
                
                if (appt.appointmentDate) {
                    const d = new Date(appt.appointmentDate);
                    const tzoffset = d.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 16);
                    document.getElementById('af_date').value = localISOTime;
                }
                document.getElementById('apptModal').style.display = 'flex';
            });
    } else {
        document.getElementById('apptModalTitle').textContent = '📅 Add Appointment';
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        const tzoffset = d.getTimezoneOffset() * 60000;
        document.getElementById('af_date').value = (new Date(d - tzoffset)).toISOString().slice(0, 16);
        
        // Auto select current patient if one is active
        if (currentPatientId) {
            document.getElementById('af_patient').value = document.getElementById('phName').textContent;
        }
        document.getElementById('apptModal').style.display = 'flex';
    }
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
    
    const url = id ? `${API_BASE}/appointments/${id}` : `${API_BASE}/appointments`;
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        closeModal('apptModal');
        if (document.getElementById('contentAppts').style.display === 'block') {
            loadPatientAppointments();
        } else {
            loadAllAppointments();
        }
        addFeedItem('📅 Appointment', `Appointment for ${data.patientName} saved`, 'info');
    });
}

function deleteAppointment(id, name) {
    confirmDelete(`Cancel appointment for ${name}?`, () => {
        fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' })
            .then(() => {
                if (document.getElementById('contentAppts').style.display === 'block') {
                    loadPatientAppointments();
                } else {
                    loadAllAppointments();
                }
                addFeedItem('🗑️ Appointment', 'Appointment cancelled', 'warn');
            });
    });
}

// ================= CARE ORDERS =================

function loadAllOrders() {
    fetch(`${API_BASE}/care-orders`)
        .then(res => res.json())
        .then(orders => {
            renderOrders(orders, 'ordersBodyFull');
            renderOrders(orders, 'ordersBody');
        });
}

function loadPatientOrders() {
    const patientName = document.getElementById('phName').textContent;
    fetch(`${API_BASE}/care-orders`)
        .then(res => res.json())
        .then(orders => {
            if (currentPatientId) {
                orders = orders.filter(o => o.patientName === patientName);
            }
            renderOrders(orders, 'ordersBodyFull');
        });
}

function renderOrders(orders, targetId) {
    const tbody = document.getElementById(targetId);
    if(!tbody) return;
    
    if (targetId === 'ordersBody') {
        document.getElementById('orderCnt').textContent = orders.length;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="feed-empty">No orders found</td></tr>';
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        const statusColor = order.status === 'completed' ? '#10b981' : (order.status === 'in_progress' ? '#3b82f6' : '#f59e0b');
        const pbadge = order.priority === 'critical' ? '🔴' : (order.priority === 'high' ? '🟠' : (order.priority === 'medium' ? '🟡' : '🟢'));
        
        const actionsHtml = `
            <button class="btn btn-ghost btn-sm" onclick="openEditOrderModal(${order.id})">Edit</button>
            <button class="btn btn-ghost btn-sm" style="color:#ef4444" onclick="deleteOrder(${order.id})">Del</button>
        `;
        
        if (targetId === 'ordersBody') {
            html += `
                <tr>
                    <td>#${order.id}</td>
                    <td style="font-weight:600">${order.patientName}</td>
                    <td style="text-transform:capitalize">${order.orderType}</td>
                    <td>${pbadge} ${order.priority}</td>
                    <td><span style="color:${statusColor};background:${statusColor}22;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:600">${order.status}</span></td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td>#${order.id}</td>
                    <td style="font-weight:600">${order.patientName}</td>
                    <td style="text-transform:capitalize">${order.orderType}</td>
                    <td>${order.description.substring(0, 40)}${order.description.length > 40 ? '...' : ''}</td>
                    <td>${pbadge} ${order.priority}</td>
                    <td><span style="color:${statusColor};background:${statusColor}22;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:600">${order.status}</span></td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        }
    });
    
    tbody.innerHTML = html;
}

document.getElementById('careOrderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
        patientName: document.getElementById('patientName').value,
        orderType: document.getElementById('orderType').value,
        priority: document.getElementById('orderPriority').value,
        status: document.getElementById('orderStatus').value,
        description: document.getElementById('orderDesc').value
    };
    
    fetch(`${API_BASE}/care-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(order => {
        document.getElementById('orderDesc').value = '';
        if (document.getElementById('contentOrders').style.display === 'block') {
            loadPatientOrders();
        } else {
            loadAllOrders();
        }
        addFeedItem('📋 Order', `New order created for ${order.patientName}`, 'info');
    });
});

function openEditOrderModal(id) {
    fetch(`${API_BASE}/care-orders/${id}`)
        .then(res => res.json())
        .then(order => {
            document.getElementById('eo_id').value = order.id;
            document.getElementById('eo_patient').value = order.patientName;
            document.getElementById('eo_type').value = order.orderType;
            document.getElementById('eo_priority').value = order.priority;
            document.getElementById('eo_status').value = order.status;
            document.getElementById('eo_desc').value = order.description;
            document.getElementById('editOrderModal').style.display = 'flex';
        });
}

function saveEditOrder(e) {
    e.preventDefault();
    const id = document.getElementById('eo_id').value;
    const data = {
        patientName: document.getElementById('eo_patient').value,
        orderType: document.getElementById('eo_type').value,
        priority: document.getElementById('eo_priority').value,
        status: document.getElementById('eo_status').value,
        description: document.getElementById('eo_desc').value
    };
    
    fetch(`${API_BASE}/care-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        closeModal('editOrderModal');
        if (document.getElementById('contentOrders').style.display === 'block') {
            loadPatientOrders();
        } else {
            loadAllOrders();
        }
        addFeedItem('📋 Order', `Order #${id} updated`, 'info');
    });
}

function deleteOrder(id) {
    confirmDelete(`Delete order #${id}?`, () => {
        fetch(`${API_BASE}/care-orders/${id}`, { method: 'DELETE' })
            .then(() => {
                if (document.getElementById('contentOrders').style.display === 'block') {
                    loadPatientOrders();
                } else {
                    loadAllOrders();
                }
                addFeedItem('🗑️ Order', `Order #${id} deleted`, 'warn');
            });
    });
}
// ================= DAILY TASKS (Patient-wise) =================

function loadTasks() {
    const filterSelect = document.getElementById('taskPatientFilter');
    const selectedPatient = filterSelect ? filterSelect.value : 'ALL';
    
    let url = `${API_BASE}/tasks`;
    if (selectedPatient && selectedPatient !== 'ALL') {
        url = `${API_BASE}/tasks/patient/${encodeURIComponent(selectedPatient)}`;
    }
    
    fetch(url)
        .then(res => res.json())
        .then(tasks => {
            const list = document.getElementById('taskList');
            document.getElementById('taskBadge').textContent = tasks.length;
            
            if (tasks.length === 0) {
                list.innerHTML = `<div class="feed-empty">${selectedPatient !== 'ALL' ? 'No tasks for ' + selectedPatient : 'No tasks yet!'}</div>`;
                return;
            }
            
            list.innerHTML = tasks.map(t => `
                <div class="task-item ${t.completed ? 'completed' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border)">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1; min-width:0" onclick="toggleTask(${t.id})">
                        <input type="checkbox" ${t.completed ? 'checked' : ''} style="cursor:pointer; flex-shrink:0">
                        <div style="min-width:0">
                            <span style="${t.completed ? 'text-decoration:line-through; color:var(--muted)' : ''}">${t.text}</span>
                            ${t.patientName ? `<div style="font-size:10px;color:#60a5fa;margin-top:2px">👤 ${t.patientName}</div>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger); padding:2px 6px; flex-shrink:0" onclick="deleteTask(${t.id})">✕</button>
                </div>
            `).join('');
        });
}

function addTask() {
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    if (!text) return;
    
    // Use the selected patient from the task filter, or the currently selected patient
    const filterSelect = document.getElementById('taskPatientFilter');
    let patientName = null;
    if (filterSelect && filterSelect.value !== 'ALL') {
        patientName = filterSelect.value;
    } else if (currentPatientId) {
        patientName = document.getElementById('phName').textContent;
        if (patientName === 'Select a Patient') patientName = null;
    }
    
    fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, patientName: patientName })
    })
    .then(res => res.json())
    .then(() => {
        input.value = '';
        loadTasks();
        if (patientName) {
            addFeedItem('✅ Task', `Task added for ${patientName}`, 'info');
        }
    });
}

function toggleTask(id) {
    fetch(`${API_BASE}/tasks/${id}/toggle`, { method: 'PUT' })
        .then(() => loadTasks());
}

function deleteTask(id) {
    fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
        .then(() => loadTasks());
}

// Call loadTasks on init
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});


// ================= UTILS & COMMON =================

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

let deleteCallback = null;
function confirmDelete(message, callback) {
    document.getElementById('confirmDeleteMsg').textContent = message;
    deleteCallback = callback;
    document.getElementById('confirmDeleteModal').style.display = 'flex';
}

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (deleteCallback) {
        deleteCallback();
        deleteCallback = null;
    }
    closeModal('confirmDeleteModal');
});

function activateSOS() {
    document.getElementById('sosModal').style.display = 'flex';
}

function confirmSOS() {
    closeModal('sosModal');
    
    const patientName = document.getElementById('phName').textContent;
    if (!currentPatientId || patientName === 'Select a Patient') {
        alert("Please select a patient before triggering SOS.");
        return;
    }
    
    // Show processing state
    document.getElementById('emergNotifyBody').innerHTML = `
        <div style="text-align:center;padding:20px">
            <div style="width:60px;height:60px;margin:0 auto 16px;border:4px solid var(--border);border-top:4px solid var(--danger);border-radius:50%;animation:spin 1s linear infinite"></div>
            <p style="font-weight:700;font-size:16px;margin-bottom:8px">Sending Emergency Alerts...</p>
            <p style="color:var(--muted);font-size:13px">Sending email & SMS to emergency contacts for ${patientName}</p>
        </div>
    `;
    document.getElementById('emergNotifyModal').style.display = 'flex';
    
    fetch(`${API_BASE}/emergency/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'Patient Room', details: 'Manual SOS Triggered', patientName: patientName })
    })
    .then(res => res.json())
    .then(data => {
        addFeedItem('🚨 SOS', `Emergency SOS Triggered for ${patientName}!`, 'danger');
        
        const emailInfo = data.emailNotification || {};
        const smsInfo = data.smsNotification || {};
        const contacts = data.notifiedContacts || [];
        const emailSent = emailInfo.emailSent === true;
        const smsSent = smsInfo.smsSent === true;
        const anyNotificationSent = emailSent || smsSent;
        
        let contactsHtml = '';
        if (contacts.length > 0) {
            contactsHtml = contacts.map(c => {
                const isSent = c.status === 'Sent';
                const isEmail = c.type === 'Email';
                const icon = isEmail ? '📧' : '📱';
                const detail = isEmail ? c.email : c.phone;
                return `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;background:${isSent ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'};border:1px solid ${isSent ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};border-radius:8px;margin-bottom:8px">
                    <div style="font-size:24px">${isSent ? '✅' : '❌'}</div>
                    <div style="flex:1">
                        <div style="font-weight:700;font-size:14px">${c.name}</div>
                        <div style="font-size:12px;color:var(--muted)">${icon} ${detail || 'N/A'}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${c.type}</div>
                    </div>
                    <div style="font-size:12px;font-weight:700;color:${isSent ? '#10b981' : '#ef4444'}">${isSent ? '✅ Sent' : '❌ Failed'}</div>
                </div>`;
            }).join('');
        } else {
            contactsHtml = `<div style="padding:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;text-align:center;color:var(--warn)">⚠️ No emergency contact configured for this patient. Please add email/phone in the patient profile.</div>`;
        }
        
        document.getElementById('emergNotifyBody').innerHTML = `
            <div style="text-align:center;margin-bottom:20px">
                <div style="width:64px;height:64px;margin:0 auto 12px;background:${anyNotificationSent ? '#10b981' : '#f59e0b'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px">${anyNotificationSent ? '✅' : '⚠️'}</div>
                <h3 style="font-size:18px;font-weight:800;margin-bottom:4px">${anyNotificationSent ? 'Emergency Notifications Sent!' : 'Alert Created'}</h3>
                <p style="color:var(--muted);font-size:13px">Alert ID: ${data.alertId}</p>
            </div>
            
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:16px">
                <div style="font-weight:700;margin-bottom:8px;color:var(--danger)">🚨 Emergency Details</div>
                <div style="font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
                    <span>Patient: <strong>${patientName}</strong></span>
                    <span>Room: <strong>${data.patientRoom || 'N/A'}</strong></span>
                    <span>Status: <strong>${data.patientStatus || 'N/A'}</strong></span>
                    <span>Response: <strong>${data.estimatedResponse || '5-8 min'}</strong></span>
                </div>
            </div>
            
            ${emailSent && emailInfo.emailSentFrom ? `
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px;margin-bottom:16px">
                <div style="font-weight:700;margin-bottom:6px;font-size:13px;color:#10b981">🏥 Sent From (Hospital Email)</div>
                <div style="font-size:14px;font-weight:600">${emailInfo.emailSentFrom}</div>
            </div>` : ''}

            ${smsSent && smsInfo.smsSentFrom ? `
            <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:14px;margin-bottom:16px">
                <div style="font-weight:700;margin-bottom:6px;font-size:13px;color:#3b82f6">📱 SMS Sent From (Twilio Number)</div>
                <div style="font-size:14px;font-weight:600">${smsInfo.smsSentFrom}</div>
            </div>` : ''}
            
            <div style="margin-bottom:16px">
                <div style="font-weight:700;margin-bottom:10px;font-size:14px">📨 Notifications Sent To</div>
                ${contactsHtml}
            </div>

            ${emailInfo.emailError ? `<div style="padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#ef4444;margin-bottom:8px">⚠️ Email: ${emailInfo.emailError}</div>` : ''}
            ${smsInfo.smsError ? `<div style="padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:#ef4444;margin-bottom:8px">⚠️ SMS: ${smsInfo.smsError}</div>` : ''}
            
            <button class="btn btn-pri" style="width:100%;margin-top:8px" onclick="closeModal('emergNotifyModal')">Dismiss</button>
        `;
    })
    .catch(err => {
        document.getElementById('emergNotifyBody').innerHTML = `
            <div style="text-align:center;padding:20px">
                <div style="font-size:48px;margin-bottom:12px">❌</div>
                <h3 style="color:var(--danger);margin-bottom:8px">Failed to Send Alert</h3>
                <p style="color:var(--muted);font-size:13px;margin-bottom:20px">${err.message || 'Network error. Please try again.'}</p>
                <button class="btn btn-pri" onclick="closeModal('emergNotifyModal')">Close</button>
            </div>
        `;
    });
}

function loadEmergencyAlerts() {
    const emergBody = document.getElementById('emergBody');
    emergBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="padding:16px; border-left:4px solid var(--danger); background:#fef2f2; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="color:var(--danger)">Heart Rate Spike</strong>
                    <span style="font-size:12px; color:var(--muted)">2 mins ago</span>
                </div>
                <p style="margin:0; font-size:14px;">Patient John Smith's heart rate exceeded 130 bpm.</p>
            </div>
            <div style="padding:16px; border-left:4px solid var(--warn); background:#fffbeb; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="color:var(--warn)">Fall Detected</strong>
                    <span style="font-size:12px; color:var(--muted)">15 mins ago</span>
                </div>
                <p style="margin:0; font-size:14px;">Possible fall detected in Room 101.</p>
            </div>
            <div style="padding:16px; border-left:4px solid var(--danger); background:#fef2f2; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="color:var(--danger)">SOS Triggered</strong>
                    <span style="font-size:12px; color:var(--muted)">1 hour ago</span>
                </div>
                <p style="margin:0; font-size:14px;">SOS Button pressed by Patient Mary Johnson.</p>
            </div>
        </div>
    `;
    document.getElementById('emergModal').style.display = 'flex';
}

function addFeedItem(title, desc, type='info') {
    const feed = document.getElementById('liveFeed');
    const empty = document.getElementById('feedEmpty');
    if(empty) empty.remove();
    
    const div = document.createElement('div');
    div.className = `feed-item ${type}`;
    div.innerHTML = `
        <div class="f-dot"></div>
        <div class="f-content">
            <div class="f-title">${title} <span class="f-time">Just now</span></div>
            <div class="f-desc">${desc}</div>
        </div>
    `;
    feed.insertBefore(div, feed.firstChild);
    if(feed.children.length > 20) feed.lastChild.remove();
}

function clearFeed() {
    document.getElementById('liveFeed').innerHTML = '<div class="feed-empty" id="feedEmpty">No recent activity</div>';
}

// ================= ALERTS MANAGEMENT =================

function updateAlertsDropdown() {
    const filterSelect = document.getElementById('alertPatientFilter');
    if (!filterSelect) return;
    const currentVal = filterSelect.value;
    let optionsHtml = '<option value="ALL">All Patients</option>';
    if (allPatients) {
        allPatients.forEach(p => {
            optionsHtml += `<option value="${p.id}">${p.name}</option>`;
        });
    }
    filterSelect.innerHTML = optionsHtml;
    if (currentVal) filterSelect.value = currentVal;
}

function renderAlerts() {
    const list = document.getElementById('alertsList');
    if (!list) return;
    
    const filterSelect = document.getElementById('alertPatientFilter');
    const filterId = filterSelect ? filterSelect.value : 'ALL';
    
    let alerts = [];
    
    if (allPatients) {
        allPatients.forEach(p => {
            if (p.status === 'CRITICAL') {
                alerts.push({ id: p.id, name: p.name, type: 'danger', title: `${p.name} - Critical`, desc: `${p.conditions || 'Condition deteriorating'} - Immediate attention required.` });
            } else if (p.status === 'ATTENTION') {
                alerts.push({ id: p.id, name: p.name, type: 'warn', title: `${p.name} - Attention`, desc: `Close monitoring required. Potential risks.` });
            }
        });
    }
    
    if (filterId !== 'ALL') {
        alerts = alerts.filter(a => a.id == filterId);
    }
    
    document.getElementById('alertCnt').textContent = alerts.length;
    
    if (alerts.length === 0) {
        list.innerHTML = '<div class="feed-empty" style="text-align:center;padding:20px;color:var(--muted);font-size:12px;">No active alerts</div>';
        return;
    }
    
    let html = '';
    alerts.forEach(alert => {
        const cls = alert.type === 'danger' ? '' : ` ${alert.type}`;
        html += `
            <div class="alert-item${cls}" onclick="openPatientModal(${alert.id})" style="cursor:pointer;">
                <div class="aname">${alert.title}</div>
                <div class="adesc">${alert.desc}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// ================= MESSAGING SYSTEM =================
let currentMsgCategory = 'Family';

function switchMsgCategory(cat) {
    currentMsgCategory = cat;
    
    // Update active class on categories
    document.querySelectorAll('.msg-cat').forEach(el => el.classList.remove('active'));
    document.getElementById(`msgCat${cat}`).classList.add('active');
    
    // Update Title
    const icons = { 'Family': '👨‍👩‍👧', 'Medical': '🩺', 'Internal': '🏢' };
    document.getElementById('msgChatTitle').innerHTML = `${icons[cat]} ${cat} Messages`;
    
    // Clear chat history for demo
    const history = document.getElementById('msgChatHistory');
    history.innerHTML = '<div class="feed-empty" id="msgEmpty">No messages yet. Start a conversation!</div>';
}

function sendMessage() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    
    appendMessage(text, 'sent');
    input.value = '';
    
    // Simulate auto-reply based on category
    setTimeout(() => {
        let reply = "Received.";
        const lower = text.toLowerCase();
        
        if (currentMsgCategory === 'Family') {
            const replies = [
                "Thanks for the update! We will come visit tomorrow.",
                "How is he doing today? Should we bring anything?",
                "Okay, understood. Please call us if anything changes.",
                "Is he eating well? He usually likes oatmeal.",
                "Thank you for taking such good care of him."
            ];
            reply = replies[Math.floor(Math.random() * replies.length)];
            if(lower.includes("food") || lower.includes("eat")) reply = "I'm glad he's eating. Let us know if he needs any snacks from home.";
            if(lower.includes("emergency") || lower.includes("urgent")) reply = "Oh no! We are on our way right now!";
        } 
        else if (currentMsgCategory === 'Medical') {
            const replies = [
                "Noted. I'll review the vitals during my rounds.",
                "Please administer 10mg Amlodipine if BP remains high.",
                "Schedule a follow-up appointment for next week.",
                "Results from the lab should be ready tomorrow morning.",
                "Keep monitoring the oxygen levels. Let me know if it drops below 92%."
            ];
            reply = replies[Math.floor(Math.random() * replies.length)];
            if(lower.includes("vitals") || lower.includes("heart")) reply = "I see the fluctuation. Continue current medication and monitor every 4 hours.";
            if(lower.includes("pain")) reply = "You may administer the PRN pain medication as prescribed.";
        }
        else if (currentMsgCategory === 'Internal') {
            const replies = [
                "Shift change at 19:00. Please have the handover report ready.",
                "Maintenance has been notified about the AC in Room 101.",
                "Don't forget the staff meeting tomorrow at 2 PM.",
                "We need more supplies in Ward B.",
                "Understood. I will inform the front desk."
            ];
            reply = replies[Math.floor(Math.random() * replies.length)];
            if(lower.includes("supplies") || lower.includes("need")) reply = "I'll submit a requisition form for those items right away.";
        }
        
        appendMessage(reply, 'received');
    }, 1000 + Math.random() * 1000);
}

function appendMessage(text, type) {
    const history = document.getElementById('msgChatHistory');
    const empty = document.getElementById('msgEmpty');
    if(empty) empty.remove();
    
    const div = document.createElement('div');
    div.className = `chat-bubble ${type}`;
    div.textContent = text;
    
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

// ================= THEME TOGGLE =================
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    document.getElementById('themeBtn').textContent = isLight ? '🌙' : '☀️';
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) themeBtn.textContent = '🌙';
    }
});

// ================= TOAST POPUP NOTIFICATIONS =================
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
        min-width:320px;
        max-width:420px;
        animation: toastSlideIn 0.4s ease, toastFadeOut 0.4s ease 4.6s forwards;
        font-family:inherit;
        backdrop-filter:blur(10px);
    `;
    toast.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="font-size:28px;line-height:1;">${c.icon}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${title}</div>
                <div style="font-size:13px;opacity:0.9;line-height:1.4;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:0.7;padding:0;line-height:1;">&times;</button>
        </div>
    `;
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 5000);
}

// Inject toast animation styles
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastFadeOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(120%); }
        }
    `;
    document.head.appendChild(style);
})();