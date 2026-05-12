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
    console.log('Checking auth status:', user ? 'Logged in' : 'Not logged in');
    if (!user) {
        const path = window.location.pathname;
        if (!path.endsWith('index.html') && !path.endsWith('/') && !path.endsWith('login')) {
            console.log('Not logged in, redirecting to index.html');
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
    const nextBtn = document.getElementById('btn-next-step');

    // Check if already logged in
    const existing = DB.getCurrentUser();
    if (existing && existing.phone) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Register / Login
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const name = document.getElementById('user-name').value.trim();
            const email = document.getElementById('user-email').value.trim();
            const countryCode = document.getElementById('country-code').value;
            const phoneNumber = document.getElementById('phone-number').value.trim();

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
            if (!phoneNumber || phoneNumber.length < 7) {
                showToast('Ingresa un número de teléfono válido', 'error');
                document.getElementById('phone-number').focus();
                return;
            }

            nextBtn.disabled = true;
            nextBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;border-top-color:#fff;"></span> Registrando...';

            const fullPhone = countryCode + phoneNumber;

            const currentUser = {
                id: DB.generateId(),
                name: name,
                email: email,
                phone: fullPhone,
                provider: 'local',
                createdAt: new Date().toISOString()
            };

            // Save user to backend
            try {
                console.log('Sending registration to server:', currentUser);
                const savedUser = await DB.saveUser(currentUser);
                console.log('Server response:', savedUser);
                
                if (!savedUser || !savedUser.id) {
                    throw new Error('El servidor no devolvió un usuario válido');
                }

                DB.setCurrentUser(savedUser);
                console.log('User saved to localStorage:', DB.getCurrentUser());

                showToast(`¡Bienvenido, ${name}!`, 'success');

                setTimeout(() => {
                    console.log('Redirecting to dashboard.html...');
                    window.location.assign('dashboard.html');
                }, 1000);
            } catch (error) {
                console.error('Registration failed:', error);
                const errorMsg = error.message || 'Error al guardar el registro';
                showToast(`${errorMsg}. Intenta de nuevo.`, 'error');
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Registrarse y Entrar';
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
