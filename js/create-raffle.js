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

async function createRaffle(user) {
    const name = document.getElementById('raffle-name').value.trim();
    const description = document.getElementById('raffle-description').value.trim();
    const totalTickets = parseInt(document.getElementById('raffle-tickets').value);
    const price = parseFloat(document.getElementById('raffle-price').value);
    const drawDate = document.getElementById('raffle-date').value;
    const imageUrl = document.getElementById('raffle-image').value.trim();

    // Validations (same as before)
    if (!name || !totalTickets || isNaN(price) || !drawDate) {
        showToast('Completa todos los campos obligatorios', 'error');
        return;
    }

    const submitBtn = document.querySelector('#create-raffle-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creando...';

    // Create raffle object
    const raffle = {
        id: DB.generateId(),
        title: name, // Backend expects 'title'
        description: description,
        totalTickets: totalTickets,
        ticketPrice: price, // Backend expects 'ticketPrice'
        drawDate: drawDate,
        imageUrl: imageUrl || null,
        ownerId: user.id || user.uid, // Support both just in case
        ownerName: user.name,
        status: 'active',
        createdAt: new Date().toISOString(),
        tickets: []
    };

    // Initialize tickets (same as before)
    for (let i = 1; i <= totalTickets; i++) {
        raffle.tickets.push({
            number: i,
            buyerId: null,
            buyerName: null,
            purchasedAt: null
        });
    }

    try {
        // Save to Backend
        await DB.saveRaffle(raffle);
        showToast('¡Rifa creada exitosamente! 🎉', 'success');

        // Redirect
        setTimeout(() => {
            window.location.href = `raffle.html?id=${raffle.id}`;
        }, 1000);
    } catch (error) {
        console.error('Failed to create raffle:', error);
        showToast('Error al crear la rifa. Intenta de nuevo.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Crear Rifa';
    }
}
