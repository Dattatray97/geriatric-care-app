// Initialize Lucide Icons
lucide.createIcons();

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.setAttribute('data-lucide', 'eye-off');
    } else {
        passwordInput.type = 'password';
        eyeIcon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

function showLoginError(msg) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        // Shake animation
        errorEl.style.animation = 'none';
        errorEl.offsetHeight; // trigger reflow
        errorEl.style.animation = 'shake 0.4s ease';
    }
}

function hideLoginError() {
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.style.display = 'none';
}

function handleLogin(event, role) {
    event.preventDefault();
    hideLoginError();

    const btn = document.getElementById('loginBtn') || document.querySelector('.btn-login');

    // Each role goes to its own dedicated dashboard
    const roleMap = {
        caretaker: { label: 'Caretaker', dashboard: 'dashboard.html' },
        doctor:    { label: 'Doctor',    dashboard: 'dashboard-doctor.html' },
        family:    { label: 'Family',    dashboard: 'dashboard-family.html' },
    };
    const roleInfo = roleMap[role] || roleMap['caretaker'];

    // ── FAMILY LOGIN: Validate against emergency contact name ──
    if (role === 'family') {
        const familyNameEl = document.getElementById('familyName');
        const patientNumberEl = document.getElementById('patientNumber');
        const passwordEl = document.getElementById('password');
        const relationEl = document.getElementById('relation');

        // Client-side required field checks
        if (!familyNameEl || !familyNameEl.value.trim()) {
            showLoginError('Please enter your full name.');
            return;
        }
        if (!patientNumberEl || !patientNumberEl.value.trim()) {
            showLoginError('Please enter the EG Patient Number.');
            return;
        }
        if (!passwordEl || !passwordEl.value.trim()) {
            showLoginError('Please enter your password.');
            return;
        }
        if (!relationEl || !relationEl.value) {
            showLoginError('Please select your relationship to the patient.');
            return;
        }

        // Show loading state
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Verifying Identity...</span>';
        btn.style.opacity = '0.8';
        btn.disabled = true;
        lucide.createIcons();

        // Call backend to validate name against emergency contacts
        fetch('/api/v1/patients/validate-family', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: familyNameEl.value.trim(), patientNumber: patientNumberEl.value.trim() })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (ok && data.success) {
                // Validation successful — store session data and redirect
                sessionStorage.setItem('elderguard_role', role);
                sessionStorage.setItem('elderguard_role_label', roleInfo.label);
                sessionStorage.setItem('elderguard_logged_in', 'true');
                sessionStorage.setItem('elderguard_patient_number', patientNumberEl.value.trim());
                sessionStorage.setItem('elderguard_patient_ref', data.referenceCode);
                sessionStorage.setItem('elderguard_family_name', familyNameEl.value.trim());
                sessionStorage.setItem('elderguard_patient_name', data.patientName);

                // Brief delay for UX then redirect
                setTimeout(() => {
                    window.location.href = roleInfo.dashboard;
                }, 800);
            } else {
                // Validation failed
                btn.innerHTML = '<span>Sign In as Family</span><i data-lucide="arrow-right"></i>';
                btn.style.opacity = '1';
                btn.disabled = false;
                lucide.createIcons();
                showLoginError(data.message || 'No patient found with the provided details. Please check your name and patient number.');
            }
        })
        .catch(err => {
            console.error('Family login error:', err);
            btn.innerHTML = '<span>Sign In as Family</span><i data-lucide="arrow-right"></i>';
            btn.style.opacity = '1';
            btn.disabled = false;
            lucide.createIcons();
            showLoginError('Unable to verify. Please check your connection and try again.');
        });

        return; // Don't continue to the default flow
    }

    // ── CARETAKER / DOCTOR LOGIN: Validate all required fields ──
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');

    if (!emailEl || !emailEl.value.trim()) {
        showLoginError('Please enter your email address.');
        return;
    }
    if (!passwordEl || !passwordEl.value.trim()) {
        showLoginError('Please enter your password.');
        return;
    }

    // Role-specific validations
    if (role === 'caretaker') {
        const wardEl = document.getElementById('ward');
        if (!wardEl || !wardEl.value) {
            showLoginError('Please select your ward / unit.');
            return;
        }
    }
    if (role === 'doctor') {
        const licenseEl = document.getElementById('license');
        const specialtyEl = document.getElementById('specialty');
        if (!licenseEl || !licenseEl.value.trim()) {
            showLoginError('Please enter your medical license number.');
            return;
        }
        if (!specialtyEl || !specialtyEl.value) {
            showLoginError('Please select your specialty.');
            return;
        }
    }

    // Show loading state
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Authenticating...</span>';
    btn.style.opacity = '0.8';
    btn.disabled = true;
    lucide.createIcons();

    setTimeout(() => {
        try {
            sessionStorage.setItem('elderguard_role', role);
            sessionStorage.setItem('elderguard_role_label', roleInfo.label);
            sessionStorage.setItem('elderguard_logged_in', 'true');
            if (emailEl && emailEl.value) sessionStorage.setItem('elderguard_user_email', emailEl.value);
        } catch(e) {}
        window.location.href = roleInfo.dashboard;
    }, 1600);
}

window.addEventListener('pageshow', () => {
    const btn = document.getElementById('loginBtn') || document.querySelector('.btn-login');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
});

// Add shake animation style dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);
