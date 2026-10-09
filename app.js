const API_BASE = 'http://localhost:3002/api';
const WS_URL = 'ws://localhost:3002';

let allRooms = [];
let allGuests = [];
let allReservations = [];
let allBilling = [];
let allStaff = [];
let ws = null;

// ==================== WEBSOCKET CONNECTION ====================

function initWebSocket() {
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            document.getElementById('wsStatus').classList.remove('offline');
            showNotification('Connected to real-time updates', 'success');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            document.getElementById('wsStatus').classList.add('offline');
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            document.getElementById('wsStatus').classList.add('offline');
            setTimeout(initWebSocket, 3000);
        };
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        document.getElementById('wsStatus').classList.add('offline');
    }
}

function handleWebSocketMessage(data) {
    console.log('WebSocket message:', data.type);
    
    switch(data.type) {
        case 'room_updated':
            loadRooms();
            break;
        case 'room_status_changed':
            showNotification(`Room ${data.roomId} status changed to ${data.status}`, 'info');
            loadRooms();
            break;
        case 'guest_registered':
            showNotification(`New guest: ${data.guest.firstName} ${data.guest.lastName}`, 'success');
            loadGuests();
            break;
        case 'reservation_created':
            showNotification('New reservation created', 'success');
            loadReservations();
            loadRooms();
            break;
        case 'guest_checked_in':
            showNotification('Guest checked in successfully', 'success');
            loadDashboard();
            loadRooms();
            break;
        case 'guest_checked_out':
            showNotification('Guest checked out', 'success');
            loadDashboard();
            loadBilling();
            loadRooms();
            break;
        case 'payment_received':
            showNotification(`Payment received: $${data.amount.toFixed(2)}`, 'success');
            loadBilling();
            break;
        case 'task_assigned':
            showNotification(`New task assigned to staff member`, 'info');
            loadStaff();
            break;
    }
}

// ==================== TAB NAVIGATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            showTab(tabName);
            
            if (tabName === 'dashboard') loadDashboard();
            if (tabName === 'rooms') loadRooms();
            if (tabName === 'reservations') loadReservations();
            if (tabName === 'guests') loadGuests();
            if (tabName === 'billing') loadBilling();
            if (tabName === 'staff') loadStaff();
        });
    });
    
    loadDashboard();
});

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    try {
        const dashResponse = await fetch(`${API_BASE}/analytics/dashboard`);
        const dashStats = await dashResponse.json();
        
        const occupancyResponse = await fetch(`${API_BASE}/analytics/occupancy`);
        const occupancyStats = await occupancyResponse.json();
        
        const revenueResponse = await fetch(`${API_BASE}/analytics/revenue`);
        const revenueStats = await revenueResponse.json();
        
        document.getElementById('statTotalGuests').textContent = dashStats.totalGuests;
        document.getElementById('statActiveReservations').textContent = dashStats.activeReservations;
        document.getElementById('statCheckedIn').textContent = dashStats.checkedInGuests;
        document.getElementById('statOccupancy').textContent = occupancyStats.occupancyRate + '%';
        document.getElementById('statRevenue').textContent = '$' + revenueStats.totalRevenue;
        document.getElementById('statTasks').textContent = dashStats.pendingTasks;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==================== ROOM MANAGEMENT ====================

async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE}/rooms`);
        allRooms = await response.json();
        renderRooms(allRooms);
        populateRoomSelects();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

function renderRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    grid.innerHTML = rooms.map(room => `
        <div class="room-card ${room.status.toLowerCase()}" onclick="viewRoom('${room.id}')">
            <div class="room-number">Room ${room.roomNumber}</div>
            <div class="room-type">${room.type}</div>
            <div class="room-price">$${room.pricePerNight}/night</div>
            <div style="margin-top:8px;">
                <span class="badge badge-${room.status === 'Available' ? 'success' : room.status === 'Occupied' ? 'danger' : 'warning'}">
                    ${room.status}
                </span>
            </div>
        </div>
    `).join('');
}

function filterRooms() {
    const status = event.target.value;
    const filtered = status ? allRooms.filter(r => r.status === status) : allRooms;
    renderRooms(filtered);
}

function viewRoom(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        alert(`
Room ${room.roomNumber}
Type: ${room.type}
Floor: ${room.floor}
Price: $${room.pricePerNight}/night
Status: ${room.status}
Amenities: ${room.amenities.join(', ')}
        `);
    }
}

// ==================== GUEST MANAGEMENT ====================

async function loadGuests() {
    try {
        const response = await fetch(`${API_BASE}/guests`);
        allGuests = await response.json();
        
        const tbody = document.getElementById('guestsTableBody');
        tbody.innerHTML = allGuests.map(guest => `
            <tr>
                <td>${guest.firstName} ${guest.lastName}</td>
                <td>${guest.email || '-'}</td>
                <td>${guest.phone || '-'}</td>
                <td>${guest.country || '-'}</td>
                <td>${new Date(guest.registeredDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-secondary" onclick="viewGuest('${guest.id}')" style="font-size:12px">View</button>
                </td>
            </tr>
        `).join('');
        
        populateGuestSelects();
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

function showGuestModal() {
    document.getElementById('guestModal').classList.add('show');
}

function closeGuestModal() {
    document.getElementById('guestModal').classList.remove('show');
    document.getElementById('guestFirstName').value = '';
    document.getElementById('guestLastName').value = '';
    document.getElementById('guestEmail').value = '';
    document.getElementById('guestPhone').value = '';
    document.getElementById('guestCountry').value = '';
    document.getElementById('guestPassport').value = '';
}

async function saveGuest(e) {
    e.preventDefault();
    
    const guest = {
        firstName: document.getElementById('guestFirstName').value,
        lastName: document.getElementById('guestLastName').value,
        email: document.getElementById('guestEmail').value,
        phone: document.getElementById('guestPhone').value,
        country: document.getElementById('guestCountry').value,
        passportNumber: document.getElementById('guestPassport').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guest)
        });
        
        if (response.ok) {
            closeGuestModal();
            loadGuests();
            showNotification('Guest registered successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving guest:', error);
        showNotification('Error registering guest', 'error');
    }
}

function viewGuest(guestId) {
    const guest = allGuests.find(g => g.id === guestId);
    if (guest) {
        alert(`
Guest: ${guest.firstName} ${guest.lastName}
Email: ${guest.email || 'N/A'}
Phone: ${guest.phone || 'N/A'}
Country: ${guest.country || 'N/A'}
Passport: ${guest.passportNumber || 'N/A'}
Registered: ${new Date(guest.registeredDate).toLocaleDateString()}
        `);
    }
}

// ==================== RESERVATION MANAGEMENT ====================

async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE}/reservations`);
        allReservations = await response.json();
        
        const tbody = document.getElementById('reservationsTableBody');
        tbody.innerHTML = allReservations.map(res => {
            const guest = allGuests.find(g => g.id === res.guestId);
            const room = allRooms.find(r => r.id === res.roomId);
            
            return `
                <tr>
                    <td>${guest ? guest.firstName + ' ' + guest.lastName : 'Unknown'}</td>
                    <td>${room ? room.roomNumber : 'N/A'}</td>
                    <td>${new Date(res.checkInDate).toLocaleDateString()}</td>
                    <td>${new Date(res.checkOutDate).toLocaleDateString()}</td>
                    <td>${res.numberOfNights}</td>
                    <td>$${res.totalPrice.toFixed(2)}</td>
                    <td><span class="badge badge-${res.status === 'Confirmed' ? 'info' : 'success'}">${res.status}</span></td>
                    <td>
                        ${res.status === 'Confirmed' ? `
                            <button class="btn-success" onclick="checkIn('${res.id}')" style="font-size:12px">Check In</button>
                        ` : res.status === 'Checked In' ? `
                            <button class="btn-danger" onclick="checkOut('${res.id}')" style="font-size:12px">Check Out</button>
                        ` : `
                            <button class="btn-secondary" onclick="cancelReservation('${res.id}')" style="font-size:12px">Cancel</button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

function showReservationModal() {
    document.getElementById('reservationModal').classList.add('show');
}

function closeReservationModal() {
    document.getElementById('reservationModal').classList.remove('show');
    document.getElementById('reservationGuestId').value = '';
    document.getElementById('reservationRoomId').value = '';
    document.getElementById('checkInDate').value = '';
    document.getElementById('checkOutDate').value = '';
}

async function saveReservation(e) {
    e.preventDefault();
    
    const reservation = {
        guestId: document.getElementById('reservationGuestId').value,
        roomId: document.getElementById('reservationRoomId').value,
        checkInDate: document.getElementById('checkInDate').value,
        checkOutDate: document.getElementById('checkOutDate').value,
        numberOfGuests: parseInt(document.getElementById('numberOfGuests').value)
    };
    
    try {
        const response = await fetch(`${API_BASE}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservation)
        });
        
        if (response.ok) {
            closeReservationModal();
            loadReservations();
            loadRooms();
            showNotification('Reservation created successfully!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        console.error('Error saving reservation:', error);
        showNotification('Error creating reservation', 'error');
    }
}

async function checkIn(reservationId) {
    try {
        const response = await fetch(`${API_BASE}/check-in/${reservationId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadReservations();
            loadRooms();
            showNotification('Guest checked in successfully!', 'success');
        }
    } catch (error) {
        console.error('Error checking in:', error);
        showNotification('Error checking in guest', 'error');
    }
}

async function checkOut(reservationId) {
    try {
        const response = await fetch(`${API_BASE}/check-out/${reservationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod: 'Credit Card' })
        });
        
        if (response.ok) {
            loadReservations();
            loadRooms();
            loadBilling();
            showNotification('Guest checked out successfully!', 'success');
        }
    } catch (error) {
        console.error('Error checking out:', error);
        showNotification('Error checking out guest', 'error');
    }
}

async function cancelReservation(reservationId) {
    if (confirm('Are you sure you want to cancel this reservation?')) {
        try {
            await fetch(`${API_BASE}/reservations/${reservationId}`, { method: 'DELETE' });
            loadReservations();
            loadRooms();
            showNotification('Reservation cancelled', 'success');
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            showNotification('Error cancelling reservation', 'error');
        }
    }
}

// ==================== BILLING MANAGEMENT ====================

async function loadBilling() {
    try {
        const response = await fetch(`${API_BASE}/billing`);
        allBilling = await response.json();
        
        const tbody = document.getElementById('billingTableBody');
        tbody.innerHTML = allBilling.map(bill => {
            const guest = allGuests.find(g => g.id === bill.guestId);
            
            return `
                <tr>
                    <td>${guest ? guest.firstName + ' ' + guest.lastName : 'Unknown'}</td>
                    <td>Room ${bill.roomId.substring(4)}</td>
                    <td>${new Date(bill.checkOutDate).toLocaleDateString()}</td>
                    <td>$${bill.roomCharge.toFixed(2)}</td>
                    <td>$${bill.serviceCharge.toFixed(2)}</td>
                    <td>$${bill.tax.toFixed(2)}</td>
                    <td>$${bill.totalBill.toFixed(2)}</td>
                    <td><span class="badge badge-${bill.status === 'Paid' ? 'success' : 'warning'}">${bill.status}</span></td>
                    <td>
                        ${bill.status === 'Pending' ? `
                            <button class="btn-primary" onclick="processPayment('${bill.id}')" style="font-size:12px">Process Payment</button>
                        ` : 'Paid'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading billing:', error);
    }
}

async function processPayment(billId) {
    try {
        const response = await fetch(`${API_BASE}/billing/${billId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod: 'Credit Card' })
        });
        
        if (response.ok) {
            loadBilling();
            showNotification('Payment processed successfully!', 'success');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Error processing payment', 'error');
    }
}

// ==================== STAFF MANAGEMENT ====================

async function loadStaff() {
    try {
        const response = await fetch(`${API_BASE}/staff`);
        allStaff = await response.json();
        
        const tbody = document.getElementById('staffTableBody');
        tbody.innerHTML = allStaff.map(staff => `
            <tr>
                <td>${staff.firstName} ${staff.lastName}</td>
                <td>${staff.position}</td>
                <td>${staff.department || '-'}</td>
                <td>${staff.phone || '-'}</td>
                <td><span class="badge badge-success">${staff.status}</span></td>
                <td>${staff.assignedTasks.length}</td>
                <td>
                    <button class="btn-primary" onclick="assignTask('${staff.id}')" style="font-size:12px">Assign Task</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

function showStaffModal() {
    document.getElementById('staffModal').classList.add('show');
}

function closeStaffModal() {
    document.getElementById('staffModal').classList.remove('show');
    document.getElementById('staffFirstName').value = '';
    document.getElementById('staffLastName').value = '';
    document.getElementById('staffPosition').value = '';
    document.getElementById('staffDepartment').value = '';
    document.getElementById('staffPhone').value = '';
}

async function saveStaff(e) {
    e.preventDefault();
    
    const staff = {
        firstName: document.getElementById('staffFirstName').value,
        lastName: document.getElementById('staffLastName').value,
        position: document.getElementById('staffPosition').value,
        department: document.getElementById('staffDepartment').value,
        phone: document.getElementById('staffPhone').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staff)
        });
        
        if (response.ok) {
            closeStaffModal();
            loadStaff();
            showNotification('Staff member added successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving staff:', error);
        showNotification('Error adding staff', 'error');
    }
}

function assignTask(staffId) {
    const taskDescription = prompt('Enter task description:');
    if (taskDescription) {
        const roomId = prompt('Enter room ID (optional):') || null;
        const priority = prompt('Priority (Low/Normal/High):', 'Normal');
        
        fetch(`${API_BASE}/staff/${staffId}/assign-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: taskDescription,
                roomId,
                priority
            })
        })
        .then(res => res.ok && (showNotification('Task assigned!', 'success'), loadStaff()))
        .catch(err => showNotification('Error assigning task', 'error'));
    }
}

// ==================== UTILITIES ====================

function populateGuestSelects() {
    const select = document.getElementById('reservationGuestId');
    select.innerHTML = '<option value="">Choose a guest</option>' +
        allGuests.map(g => `<option value="${g.id}">${g.firstName} ${g.lastName}</option>`).join('');
}

function populateRoomSelects() {
    const select = document.getElementById('reservationRoomId');
    const availableRooms = allRooms.filter(r => r.status === 'Available');
    select.innerHTML = '<option value="">Choose a room</option>' +
        availableRooms.map(r => `<option value="${r.id}">Room ${r.roomNumber} (${r.type}) - $${r.pricePerNight}</option>`).join('');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.borderLeftColor = type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#4dabf7';
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

window.onclick = (event) => {
    ['guestModal', 'reservationModal', 'staffModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
};
