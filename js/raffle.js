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

async function loadRaffle(raffleId) {
    const raffles = await DB.getRaffles();
    currentRaffle = raffles.find(r => r.id === raffleId);

    if (!currentRaffle) {
        showToast('Rifa no encontrada', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }

    // Update page title
    document.title = `RifaMax — ${currentRaffle.title}`;
    document.getElementById('raffle-title').textContent = currentRaffle.title;
    document.getElementById('raffle-description').textContent = currentRaffle.description || '';

    // Update sidebar info
    document.getElementById('sidebar-title').textContent = currentRaffle.title;
    document.getElementById('sidebar-description').textContent = currentRaffle.description || '';
    document.getElementById('info-creator').textContent = currentRaffle.ownerName || 'Desconocido';
    document.getElementById('info-total-tickets').textContent = currentRaffle.totalTickets;
    document.getElementById('info-price').textContent = `$${parseFloat(currentRaffle.ticketPrice).toFixed(2)}`;

    let dateStr = '—';
    if (currentRaffle.drawDate) {
        const rawDate = currentRaffle.drawDate;
        const date = new Date(rawDate.includes('T') ? rawDate + ':00' : rawDate);
        if (!isNaN(date.getTime())) {
            dateStr = date.toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else {
            dateStr = rawDate.replace('T', ' ');
        }
    }
    document.getElementById('info-date').textContent = dateStr;

    // Update sold count & progress
    updateProgress();

    // Show owner actions if creator
    const userId = currentUser.id || currentUser.uid;
    if (currentRaffle.ownerId === userId) {
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
    const tickets = currentRaffle.tickets || [];
    const soldCount = tickets.filter(t => t.buyerId).length;
    const total = currentRaffle.totalTickets;
    const progress = total ? Math.round((soldCount / total) * 100) : 0;

    document.getElementById('info-sold-tickets').textContent = `${soldCount} / ${total}`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${progress}% vendido`;
}

function renderTickets() {
    const grid = document.getElementById('ticket-grid');
    if (!grid) return;

    const tickets = currentRaffle.tickets || [];
    const userId = currentUser.id || currentUser.uid;

    grid.innerHTML = tickets.map(ticket => {
        let className = 'ticket';
        let title = `Boleto #${ticket.number} - Disponible`;

        if (ticket.buyerId === userId) {
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

    const tickets = currentRaffle.tickets || [];
    const ticket = tickets.find(t => t.number === number);
    const userId = currentUser.id || currentUser.uid;

    // Can't select sold tickets or own tickets
    if (ticket.buyerId) {
        if (ticket.buyerId === userId) {
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

    const totalPrice = selectedTickets.length * currentRaffle.ticketPrice;
    total.textContent = `$${totalPrice.toFixed(2)}`;
}

// ... original searchTicket, confirmPurchase, closeModal stay similar ...

async function processPurchase() {
    closeModal();
    const userId = currentUser.id || currentUser.uid;

    // Local update of ticket array
    const updatedTickets = [...currentRaffle.tickets];
    selectedTickets.forEach(number => {
        const ticket = updatedTickets.find(t => t.number === number);
        if (ticket && !ticket.buyerId) {
            ticket.buyerId = userId;
            ticket.buyerName = currentUser.name;
            ticket.purchasedAt = new Date().toISOString();
        }
    });

    try {
        // Sync with Backend
        await DB.updateRaffle(currentRaffle.id, {
            status: currentRaffle.status,
            tickets: updatedTickets
        });

        currentRaffle.tickets = updatedTickets;
        selectedTickets = [];

        showToast('¡Boletos comprados exitosamente! 🎉', 'success');

        renderTickets();
        updateSelectionSummary();
        updateProgress();
    } catch (error) {
        console.error('Purchase error:', error);
        showToast('Error al procesar la compra.', 'error');
    }
}

async function drawWinner() {
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

    const updateData = {
        status: 'completed',
        winnerId: winnerTicket.buyerId,
        winnerName: winnerTicket.buyerName,
        winnerTicket: winnerTicket.number,
        tickets: currentRaffle.tickets
    };

    try {
        await DB.updateRaffle(currentRaffle.id, updateData);

        // Update local object
        Object.assign(currentRaffle, updateData);

        // Show winner animation
        showToast(`🏆 ¡El ganador es ${winnerTicket.buyerName} con el boleto #${winnerTicket.number}!`, 'success');

        // Update UI
        const winnerSection = document.getElementById('winner-section');
        winnerSection.style.display = 'block';
        document.getElementById('winner-name').textContent = winnerTicket.buyerName;
        document.getElementById('winner-ticket').textContent = `Boleto #${winnerTicket.number}`;

        document.getElementById('btn-draw').disabled = true;
        document.getElementById('btn-draw').textContent = '✅ Sorteo realizado';

        winnerSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Draw error:', error);
        showToast('Error al realizar el sorteo.', 'error');
    }
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
