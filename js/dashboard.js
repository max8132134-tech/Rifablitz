// ===== Dashboard Logic =====

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user) return;

  // Welcome title
  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) {
    welcomeTitle.textContent = `¡Hola, ${user.name}!`;
  }

  loadDashboard(user);
});

async function loadDashboard(user) {
  const userId = user.id || user.uid;
  const raffles = await DB.getRaffles();

  // My raffles (created by me)
  const myRaffles = raffles.filter(r => r.ownerId === userId);

  // Participating (have tickets in)
  const participating = raffles.filter(r => {
    if (r.ownerId === userId) return false;
    return r.tickets && r.tickets.some(t => t.buyerId === userId);
  });

  // All active raffles (for explore)
  const allActive = raffles.filter(r => r.status === 'active');

  // My total tickets bought
  let totalTickets = 0;
  raffles.forEach(r => {
    if (r.tickets) {
      totalTickets += r.tickets.filter(t => t.buyerId === userId).length;
    }
  });

  // Won raffles
  const wonRaffles = raffles.filter(r => r.winnerId === userId);

  // Update stats
  document.getElementById('stat-created').textContent = myRaffles.length;
  document.getElementById('stat-participating').textContent = participating.length;
  document.getElementById('stat-tickets').textContent = totalTickets;
  document.getElementById('stat-won').textContent = wonRaffles.length;

  // Render grids
  renderRaffleGrid('my-raffles-grid', myRaffles, user, true);
  renderRaffleGrid('participating-grid', participating, user, false);
  renderRaffleGrid('all-raffles-grid', allActive, user, false);
}

function renderRaffleGrid(containerId, raffles, user, isOwner) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (raffles.length === 0) {
    const messages = {
      'my-raffles-grid': { icon: '🎰', title: 'No has creado rifas aún', text: 'Crea tu primera rifa y empieza a vender boletos', btn: true },
      'participating-grid': { icon: '🎟️', title: 'No participas en ninguna rifa', text: 'Explora las rifas disponibles y compra boletos', btn: false },
      'all-raffles-grid': { icon: '🔍', title: 'No hay rifas disponibles', text: 'Sé el primero en crear una rifa', btn: true }
    };
    const msg = messages[containerId] || { icon: '📭', title: 'Vacío', text: '', btn: false };
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">${msg.icon}</div>
        <h3>${msg.title}</h3>
        <p>${msg.text}</p>
        ${msg.btn ? '<a href="create-raffle.html" class="btn btn-primary">+ Crear Rifa</a>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = raffles.map(raffle => {
    const soldTickets = raffle.tickets ? raffle.tickets.filter(t => t.buyerId).length : 0;
    const totalTickets = raffle.totalTickets || 0;
    const progress = totalTickets ? Math.round((soldTickets / totalTickets) * 100) : 0;
    const date = new Date(raffle.drawDate);
    const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

    let statusBadge = '';
    if (raffle.status === 'active') {
      statusBadge = '<span class="badge badge-active">Activa</span>';
    } else if (raffle.status === 'completed') {
      statusBadge = '<span class="badge badge-completed">Finalizada</span>';
    }

    return `
      <div class="card" onclick="window.location.href='raffle.html?id=${raffle.id}'" style="cursor:pointer;">
        <div class="card-header">
          <h3 class="card-title">${escapeHtml(raffle.title)}</h3>
          ${statusBadge}
        </div>
        <p class="card-description">${escapeHtml(raffle.description || 'Sin descripción')}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
          <span>${soldTickets}/${totalTickets} boletos</span>
          <span>${progress}%</span>
        </div>
        <div class="card-footer">
          <span style="font-size:0.85rem; color:var(--text-muted);">📅 ${dateStr}</span>
          <span style="font-size:0.95rem; font-weight:700; color:var(--accent-3);">$${raffle.price}</span>
        </div>
      </div>
    `;
  }).join('');
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  // Show/hide content
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`tab-${tabName}`).style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
