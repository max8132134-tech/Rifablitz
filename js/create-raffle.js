// ===== Create Raffle Logic =====

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth();
    if (!user) return;

    // Set min date to now
    const dateInput = document.getElementById('raffle-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }

    // Live preview
    setupLivePreview();

    // Form submission
    const form = document.getElementById('create-raffle-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            createRaffle(user);
        });
    }
});

function setupLivePreview() {
    const nameInput = document.getElementById('raffle-name');
    const ticketsInput = document.getElementById('raffle-tickets');
    const priceInput = document.getElementById('raffle-price');
    const dateInput = document.getElementById('raffle-date');

    function update() {
        const name = nameInput.value || '—';
        const tickets = ticketsInput.value || '—';
        const price = priceInput.value || '—';
        const date = dateInput.value;

        document.getElementById('preview-name').textContent = name;
        document.getElementById('preview-tickets').textContent = tickets !== '—' ? `${tickets} boletos` : '—';
        document.getElementById('preview-price').textContent = price !== '—' ? `$${parseFloat(price).toFixed(2)}` : '—';

        if (tickets !== '—' && price !== '—') {
            const total = parseInt(tickets) * parseFloat(price);
            document.getElementById('preview-total').textContent = `$${total.toFixed(2)}`;
        } else {
            document.getElementById('preview-total').textContent = '—';
        }

        if (date) {
            const d = new Date(date);
            document.getElementById('preview-date').textContent = d.toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else {
            document.getElementById('preview-date').textContent = '—';
        }
    }

    [nameInput, ticketsInput, priceInput, dateInput].forEach(input => {
        if (input) input.addEventListener('input', update);
    });
}

function createRaffle(user) {
    const name = document.getElementById('raffle-name').value.trim();
    const description = document.getElementById('raffle-description').value.trim();
    const totalTickets = parseInt(document.getElementById('raffle-tickets').value);
    const price = parseFloat(document.getElementById('raffle-price').value);
    const drawDate = document.getElementById('raffle-date').value;
    const imageUrl = document.getElementById('raffle-image').value.trim();

    // Validations
    if (!name) {
        showToast('Ingresa el nombre de la rifa', 'error');
        return;
    }
    if (!totalTickets || totalTickets < 2) {
        showToast('El número de boletos debe ser al menos 2', 'error');
        return;
    }
    if (totalTickets > 10000) {
        showToast('Máximo 10,000 boletos por rifa', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Ingresa un precio válido', 'error');
        return;
    }
    if (!drawDate) {
        showToast('Selecciona la fecha del sorteo', 'error');
        return;
    }

    // Create raffle object
    const raffle = {
        id: DB.generateId(),
        name: name,
        description: description,
        totalTickets: totalTickets,
        price: price,
        drawDate: drawDate,
        imageUrl: imageUrl || null,
        creatorId: user.uid,
        creatorName: user.name,
        status: 'active',
        tickets: [],
        winnerId: null,
        winnerName: null,
        winnerTicket: null,
        createdAt: new Date().toISOString()
    };

    // Initialize tickets (empty, all available)
    for (let i = 1; i <= totalTickets; i++) {
        raffle.tickets.push({
            number: i,
            buyerId: null,
            buyerName: null,
            purchasedAt: null
        });
    }

    // Save
    const raffles = DB.getRaffles();
    raffles.push(raffle);
    DB.saveRaffles(raffles);

    showToast('¡Rifa creada exitosamente! 🎉', 'success');

    // Redirect to raffle page
    setTimeout(() => {
        window.location.href = `raffle.html?id=${raffle.id}`;
    }, 1000);
}
