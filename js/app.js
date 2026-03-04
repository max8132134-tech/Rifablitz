// ===== Authentication & App Logic =====

// Toast notifications
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Check authentication
function checkAuth() {
    const user = DB.getCurrentUser();
    if (!user) {
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
        return null;
    }
    return user;
}

// Require auth - redirect if not logged in
function requireAuth() {
    const user = checkAuth();
    if (!user) return null;
    updateNavbar(user);
    return user;
}

// Update navbar with user info
function updateNavbar(user) {
    const userAvatar = document.querySelector('.navbar-user .user-avatar');
    const userName = document.querySelector('.navbar-user .user-name');
    if (userAvatar && user) {
        userAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
    }
    if (userName && user) {
        userName.textContent = user.name || 'Usuario';
    }
}

// Logout
function logout() {
    DB.setCurrentUser(null);
    window.location.href = 'index.html';
}

// Google Sign In (Demo Mode)
function googleSignIn() {
    return new Promise((resolve) => {
        // Simulate Google sign in with a mock user
        const mockGoogleUser = {
            uid: DB.generateId(),
            name: 'Usuario Google',
            email: 'usuario@gmail.com',
            photoURL: null,
            provider: 'google'
        };
        resolve(mockGoogleUser);
    });
}

// Auth page logic
function initAuthPage() {
    const step1 = document.getElementById('auth-step-1');
    const step2 = document.getElementById('auth-step-2');
    const step3 = document.getElementById('auth-step-3');
    const nextBtn = document.getElementById('btn-next-step');
    const phoneForm = document.getElementById('phone-form');
    const verifyBtn = document.getElementById('btn-verify-code');

    let currentUser = null;

    // Check if already logged in
    const existing = DB.getCurrentUser();
    if (existing && existing.phone) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Next Step / Login
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const name = document.getElementById('user-name').value.trim();
            const email = document.getElementById('user-email').value.trim();

            if (!name) {
                showToast('Ingresa tu nombre', 'error');
                document.getElementById('user-name').focus();
                return;
            }
            if (!email) {
                showToast('Ingresa tu email', 'error');
                document.getElementById('user-email').focus();
                return;
            }

            nextBtn.disabled = true;
            nextBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;border-top-color:#fff;"></span> Continuando...';

            // Simulate delay
            await new Promise(r => setTimeout(r, 800));

            currentUser = {
                id: DB.generateId(),
                name: name,
                email: email,
                provider: 'local',
                createdAt: new Date().toISOString()
            };

            showToast(`¡Hola, ${name}!`, 'success');

            // Move to step 2 (phone)
            step1.classList.remove('active');
            step2.classList.add('active');

            nextBtn.disabled = false;
            nextBtn.innerHTML = 'Siguiente';
        });
    }

    // Phone verification
    if (phoneForm) {
        phoneForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const countryCode = document.getElementById('country-code').value;
            const phoneNumber = document.getElementById('phone-number').value;

            if (!phoneNumber || phoneNumber.length < 7) {
                showToast('Ingresa un número de teléfono válido', 'error');
                return;
            }

            const fullPhone = countryCode + phoneNumber;

            if (currentUser) {
                currentUser.phone = fullPhone;
            }

            // Move to step 3 (verification code)
            step2.classList.remove('active');
            step3.classList.add('active');

            showToast('Código de verificación enviado (demo: usa 123456)', 'success');
        });
    }

    // Verify code
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            const code = document.getElementById('verification-code').value;

            if (!code || code.length < 4) {
                showToast('Ingresa el código de verificación', 'error');
                return;
            }

            // Demo: accept any code
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;"></span> Verificando...';

            await new Promise(r => setTimeout(r, 1000));

            // Save user to backend
            try {
                const savedUser = await DB.saveUser(currentUser);
                DB.setCurrentUser(savedUser);

                showToast('¡Registro completado exitosamente!', 'success');

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } catch (error) {
                console.error('Registration failed:', error);
                showToast('Error al guardar el registro. Intenta de nuevo.', 'error');
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '✅ Verificar y entrar';
            }
        });
    }
}

// Initialize auth page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('auth-step-1')) {
        initAuthPage();
    }
});
