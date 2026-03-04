// ===== Raffle Detail & Ticket Selection Logic =====

let currentRaffle = null;
let selectedTickets = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    currentUser = requireAuth();
    if (!currentUser) return;

    // Get raffle ID from URL
    const params = new URLSearchParams(window.location.search);
    const raffleId = params.get('id');

    if (!raffleId) {
        showToast('Rifa no encontrada', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }

    loadRaffle(raffleId);
});

function loadRaffle(raffleId) {
    const raffles = DB.getRaffles();
    currentRaffle = raffles.find(r => r.id === raffleId);

    if (!currentRaffle) {
        showToast('Rifa no encontrada', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }

    // Update page title
    document.title = `RifaMax — ${currentRaffle.name}`;
    document.getElementById('raffle-title').textContent = currentRaffle.name;
    document.getElementById('raffle-description').textContent = currentRaffle.description || '';

    // Update sidebar info
    document.getElementById('sidebar-title').textContent = currentRaffle.name;
    document.getElementById('sidebar-description').textContent = currentRaffle.description || '';
    document.getElementById('info-creator').textContent = currentRaffle.creatorName || 'Desconocido';
    document.getElementById('info-total-tickets').textContent = currentRaffle.totalTickets;
    document.getElementById('info-price').textContent = `$${currentRaffle.price.toFixed(2)}`;

    let dateStr = '—';
    if (currentRaffle.drawDate) {
        // Handle datetime-local format (e.g., "2026-03-15T18:00")
        const rawDate = currentRaffle.drawDate;
        const date = new Date(rawDate.includes('T') ? rawDate + ':00' : rawDate);
        if (!isNaN(date.getTime())) {
            dateStr = date.toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else {
            // Fallback: display the raw value
            dateStr = rawDate.replace('T', ' ');
        }
    }
    document.getElementById('info-date').textContent = dateStr;

    // Update sold count & progress
    updateProgress();

    // Show owner actions if creator
    if (currentRaffle.creatorId === currentUser.uid) {
        document.getElementById('owner-actions').style.display = 'block';
        if (currentRaffle.status === 'completed') {
            document.getElementById('btn-draw').disabled = true;
            document.getElementById('btn-draw').textContent = '✅ Sorteo realizado';
        }
    }

    // Show winner if exists
    if (currentRaffle.winnerId) {
        const winnerSection = document.getElementById('winner-section');
        winnerSection.style.display = 'block';
        document.getElementById('winner-name').textContent = currentRaffle.winnerName;
        document.getElementById('winner-ticket').textContent = `Boleto #${currentRaffle.winnerTicket}`;
    }

    // Render tickets
    renderTickets();
}

function updateProgress() {
    const soldCount = currentRaffle.tickets.filter(t => t.buyerId).length;
    const total = currentRaffle.totalTickets;
    const progress = total ? Math.round((soldCount / total) * 100) : 0;

    document.getElementById('info-sold-tickets').textContent = `${soldCount} / ${total}`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${progress}% vendido`;
}

function renderTickets() {
    const grid = document.getElementById('ticket-grid');
    if (!grid) return;

    grid.innerHTML = currentRaffle.tickets.map(ticket => {
        let className = 'ticket';
        let title = `Boleto #${ticket.number} - Disponible`;

        if (ticket.buyerId === currentUser.uid) {
            className += ' mine';
            title = `Boleto #${ticket.number} - Tu boleto`;
        } else if (ticket.buyerId) {
            className += ' sold';
            title = `Boleto #${ticket.number} - Vendido a ${ticket.buyerName || 'otro usuario'}`;
        }

        if (selectedTickets.includes(ticket.number)) {
            className += ' selected';
            title = `Boleto #${ticket.number} - Seleccionado`;
        }

        return `<div class="${className}" title="${title}" 
                 onclick="toggleTicket(${ticket.number})" 
                 id="ticket-${ticket.number}">
              ${ticket.number}
            </div>`;
    }).join('');
}

function toggleTicket(number) {
    if (currentRaffle.status === 'completed') {
        showToast('Esta rifa ya finalizó', 'warning');
        return;
    }

    const ticket = currentRaffle.tickets.find(t => t.number === number);

    // Can't select sold tickets or own tickets
    if (ticket.buyerId) {
        if (ticket.buyerId === currentUser.uid) {
            showToast('Ya tienes este boleto', 'warning');
        } else {
            showToast('Este boleto ya fue vendido', 'error');
        }
        return;
    }

    const index = selectedTickets.indexOf(number);
    if (index >= 0) {
        selectedTickets.splice(index, 1);
    } else {
        selectedTickets.push(number);
    }

    // Sort selected tickets
    selectedTickets.sort((a, b) => a - b);

    // Update ticket appearance
    renderTickets();
    updateSelectionSummary();
}

function updateSelectionSummary() {
    const summary = document.getElementById('selection-summary');
    const list = document.getElementById('selected-tickets-list');
    const total = document.getElementById('selection-total');

    if (selectedTickets.length === 0) {
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';

    list.innerHTML = selectedTickets.map(num => `
    <span class="selected-ticket-tag">
      #${num}
      <span class="remove-tag" onclick="event.stopPropagation(); toggleTicket(${num})">✕</span>
    </span>
  `).join('');

    const totalPrice = selectedTickets.length * currentRaffle.price;
    total.textContent = `$${totalPrice.toFixed(2)}`;
}

function searchTicket() {
    const input = document.getElementById('ticket-search-input');
    const number = parseInt(input.value);

    if (!number || number < 1 || number > currentRaffle.totalTickets) {
        showToast(`Ingresa un número entre 1 y ${currentRaffle.totalTickets}`, 'error');
        return;
    }

    const ticketEl = document.getElementById(`ticket-${number}`);
    if (ticketEl) {
        ticketEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ticketEl.style.outline = '3px solid var(--accent-3)';
        ticketEl.style.outlineOffset = '2px';
        setTimeout(() => {
            ticketEl.style.outline = 'none';
        }, 2500);
    }
}

function confirmPurchase() {
    if (selectedTickets.length === 0) {
        showToast('Selecciona al menos un boleto', 'warning');
        return;
    }

    const totalPrice = selectedTickets.length * currentRaffle.price;
    document.getElementById('confirm-modal-text').textContent =
        `¿Confirmar la compra de ${selectedTickets.length} boleto(s) (#${selectedTickets.join(', #')}) por $${totalPrice.toFixed(2)}?`;

    document.getElementById('confirm-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('confirm-modal').classList.remove('active');
}

function processPurchase() {
    closeModal();

    // Mark tickets as sold
    const raffles = DB.getRaffles();
    const raffleIndex = raffles.findIndex(r => r.id === currentRaffle.id);

    if (raffleIndex < 0) {
        showToast('Error: rifa no encontrada', 'error');
        return;
    }

    selectedTickets.forEach(number => {
        const ticketIndex = raffles[raffleIndex].tickets.findIndex(t => t.number === number);
        if (ticketIndex >= 0 && !raffles[raffleIndex].tickets[ticketIndex].buyerId) {
            raffles[raffleIndex].tickets[ticketIndex].buyerId = currentUser.uid;
            raffles[raffleIndex].tickets[ticketIndex].buyerName = currentUser.name;
            raffles[raffleIndex].tickets[ticketIndex].purchasedAt = new Date().toISOString();
        }
    });

    DB.saveRaffles(raffles);
    currentRaffle = raffles[raffleIndex];
    selectedTickets = [];

    showToast('¡Boletos comprados exitosamente! 🎉', 'success');

    renderTickets();
    updateSelectionSummary();
    updateProgress();
}

function drawWinner() {
    if (currentRaffle.status === 'completed') {
        showToast('El sorteo ya se realizó', 'warning');
        return;
    }

    const soldTickets = currentRaffle.tickets.filter(t => t.buyerId);

    if (soldTickets.length === 0) {
        showToast('No hay boletos vendidos para realizar el sorteo', 'error');
        return;
    }

    // Random winner
    const winnerTicket = soldTickets[Math.floor(Math.random() * soldTickets.length)];

    // Update raffle
    const raffles = DB.getRaffles();
    const raffleIndex = raffles.findIndex(r => r.id === currentRaffle.id);

    raffles[raffleIndex].status = 'completed';
    raffles[raffleIndex].winnerId = winnerTicket.buyerId;
    raffles[raffleIndex].winnerName = winnerTicket.buyerName;
    raffles[raffleIndex].winnerTicket = winnerTicket.number;

    DB.saveRaffles(raffles);
    currentRaffle = raffles[raffleIndex];

    // Show winner animation
    showToast(`🏆 ¡El ganador es ${winnerTicket.buyerName} con el boleto #${winnerTicket.number}!`, 'success');

    // Update UI
    const winnerSection = document.getElementById('winner-section');
    winnerSection.style.display = 'block';
    document.getElementById('winner-name').textContent = winnerTicket.buyerName;
    document.getElementById('winner-ticket').textContent = `Boleto #${winnerTicket.number}`;

    document.getElementById('btn-draw').disabled = true;
    document.getElementById('btn-draw').textContent = '✅ Sorteo realizado';

    // Scroll to winner
    winnerSection.scrollIntoView({ behavior: 'smooth' });
}

function shareRaffle() {
    const url = window.location.href;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('¡Enlace copiado al portapapeles! 📋', 'success');
        }).catch(() => {
            prompt('Copia este enlace:', url);
        });
    } else {
        prompt('Copia este enlace:', url);
    }
}
