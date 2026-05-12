// ===== Main App Logic =====

// Check authentication
function checkAuth() {
    const user = DB.getCurrentUser();
    if (!user) {
        const path = window.location.pathname;
        if (!path.endsWith('index.html') && !path.endsWith('/') && path.length > 1) {
            window.location.href = 'index.html';
        }
        return null;
    }
    return user;
}

function requireAuth() {
    const user = checkAuth();
    if (!user) return null;
    updateNavbar(user);
    return user;
}

function updateNavbar(user) {
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) userNameEl.textContent = user.name;
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

function logout() {
    DB.setCurrentUser(null);
    window.location.href = 'index.html';
}

// Auth Page Initialization
function initAuthPage() {
    const nextBtn = document.getElementById('btn-next-step');
    if (!nextBtn) return;

    nextBtn.addEventListener('click', async () => {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const phone = document.getElementById('user-phone').value.trim();

        if (!name || !email || !phone) {
            showToast('Por favor, completa todos los campos', 'error');
            return;
        }

        const currentUser = { id: 'u' + Date.now(), name, email, phone };
        
        // UI State: Loading
        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Registrando...';

        try {
            const savedUser = await DB.saveUser(currentUser);
            DB.setCurrentUser(savedUser);
            
            showToast(`¡Bienvenido, ${name}!`, 'success');
            
            // Success Screen
            const authCard = document.querySelector('.auth-card');
            if (authCard) {
                authCard.innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <h2 style="color:var(--accent-3);">¡Registro Exitoso!</h2>
                        <p>Ya puedes empezar a crear tus rifas.</p>
                        <br>
                        <a href="dashboard.html" class="btn btn-primary btn-block">Ir al Panel de Control</a>
                    </div>
                `;
            }
            
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);

        } catch (error) {
            console.error('Registration error:', error);
            nextBtn.disabled = false;
            nextBtn.innerHTML = 'Registrarse y Entrar';
            showToast('Error al conectar. Verifica los logs de Render.', 'error');
        }
    });
}

// Toast System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('auth-step-1')) {
        initAuthPage();
    }
});
