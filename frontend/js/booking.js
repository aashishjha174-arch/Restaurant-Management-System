// Reservation script for The Secret Garden by Phat Kath

document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById('table-booking-form');
  const dateInput = document.getElementById('booking-date');
  const seatsInput = document.getElementById('booking-seats');
  const slotsContainer = document.getElementById('booking-slots-container');
  const formCard = document.getElementById('booking-form-card');
  const successCard = document.getElementById('booking-success-card');

  if (!bookingForm) return;

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;

  // Global state for slots availability cache
  let currentSlotsCache = null;

  // Fetch slot counts from backend for the selected date
  async function checkAvailability() {
    const selectedDate = dateInput.value;
    if (!selectedDate) return;

    slotsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-size: 0.9rem;">Checking slot availability...</div>';

    try {
      const response = await fetch(`${API_BASE}/api/bookings/availability?date=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      currentSlotsCache = data.slots;
      renderSlots();
    } catch (error) {
      console.error('Error fetching availability:', error);
      slotsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--red); font-size: 0.9rem;">Failed to load slot capacities. Please refresh the page.</div>';
    }
  }

  // Render slots in HTML based on availability and required seats
  function renderSlots() {
    if (!currentSlotsCache) return;

    const seatsRequired = parseInt(seatsInput.value) || 1;
    slotsContainer.innerHTML = '';

    Object.entries(currentSlotsCache).forEach(([slot, remainingSeats], index) => {
      const isAvailable = remainingSeats >= seatsRequired;
      const slotId = `slot-${index}`;

      const optionWrapper = document.createElement('div');
      optionWrapper.className = 'slot-option';

      optionWrapper.innerHTML = `
        <input type="radio" name="timeSlot" id="${slotId}" value="${slot}" ${isAvailable ? '' : 'disabled'}>
        <label for="${slotId}" class="slot-label ${isAvailable ? '' : 'disabled'}">
          <span class="slot-time">${slot.split(' - ')[0]}</span>
          <span class="slot-seats">
            ${isAvailable ? `${remainingSeats} seats left` : 'Fully Booked'}
          </span>
        </label>
      `;

      slotsContainer.appendChild(optionWrapper);
    });
  }

  // Bind availability updates
  dateInput.addEventListener('change', checkAvailability);
  seatsInput.addEventListener('change', renderSlots);
  seatsInput.addEventListener('input', renderSlots);

  // Initial load
  checkAvailability();

  // Handle booking submissions
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('booking-name').value.trim();
    const email = document.getElementById('booking-email').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    const date = dateInput.value;
    const seats = parseInt(seatsInput.value);
    const selectedSlotRadio = document.querySelector('input[name="timeSlot"]:checked');
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const specialRequests = document.getElementById('booking-requests').value.trim();

    // Validate all fields
    if (!name || !email || !phone || !date || !seats || !selectedSlotRadio || !paymentMethod) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    // Basic phone validation
    if (phone.length < 7) {
      showToast('Please enter a valid phone number.', 'error');
      return;
    }

    const time = selectedSlotRadio.value;

    const payload = {
      name,
      email,
      phone,
      date,
      time,
      seats,
      paymentMethod,
      specialRequests
    };

    const submitBtn = bookingForm.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Securing Table...';

      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status === 201 && data.success) {
        showToast('Table booked successfully!', 'success');
        renderReceipt(data.booking);
      } else {
        showToast(data.message || 'Booking failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Book Table';
        checkAvailability();
      }
    } catch (error) {
      console.error('Submit booking failed:', error);
      showToast('Connection error. Please check your internet and try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Book Table';
    }
  });

  // Render reservation receipt dynamically
  function renderReceipt(booking) {
    // Hide form, reveal success receipt
    formCard.style.display = 'none';
    successCard.style.display = 'block';

    // Inject details
    document.getElementById('receipt-id').textContent = booking.bookingId;
    document.getElementById('receipt-name').textContent = booking.name;
    document.getElementById('receipt-date').textContent = booking.date;
    document.getElementById('receipt-time').textContent = booking.time;
    document.getElementById('receipt-seats').textContent = `${booking.seats} Seats`;
    document.getElementById('receipt-payment').textContent = `${booking.paymentMethod} (${booking.paymentStatus})`;

    // Scroll receipt to viewport
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});