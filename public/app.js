const API_BASE = 'http://localhost:4000/api';
const WS_URL = 'ws://localhost:4000';

let ws = null;
let activityLog = [];
const MAX_ACTIVITY_ITEMS = 50;

// ============ WEBSOCKET CONNECTION ============

function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    updateWSStatus(true);
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'initial_state') {
      console.log('Received initial state');
    } else {
      handleRealtimeUpdate(message);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateWSStatus(false);
    setTimeout(connectWebSocket, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateWSStatus(false);
  };
}

function updateWSStatus(connected) {
  const badge = document.getElementById('wsStatus');
  if (connected) {
    badge.textContent = '● Online';
    badge.classList.remove('offline');
    badge.classList.add('online');
  } else {
    badge.textContent = '● Offline';
    badge.classList.add('offline');
    badge.classList.remove('online');
  }
}

function handleRealtimeUpdate(message) {
  const { type, data, timestamp } = message;
  
  addActivityLog(type, data);
  
  switch (type) {
    case 'room_status_changed':
      updateRoomDisplay();
      break;
    case 'reservation_created':
      loadReservations();
      loadRooms();
      break;
    case 'guest_checked_in':
    case 'guest_checked_out':
      loadReservations();
      updateDashboard();
      break;
    case 'payment_received':
      loadBillings();
      break;
    case 'task_assigned':
      loadStaff();
      break;
    case 'task_completed':
      loadStaff();
      loadRooms();
      break;
  }
}

function addActivityLog(type, data) {
  const timestamp = new Date().toLocaleTimeString();
  const messages = {
    'guest_registered': `Guest registered: ${data.firstName} ${data.lastName}`,
    'reservation_created': 'New reservation created',
    'guest_checked_in': 'Guest checked in',
    'guest_checked_out': 'Guest checked out',
    'room_status_changed': `Room ${data.roomNumber} status changed to ${data.status}`,
    'billing_created': 'New billing record created',
    'payment_received': 'Payment received',
    'task_assigned': 'New task assigned to staff',
    'task_completed': 'Task completed',
    'reservation_cancelled': 'Reservation cancelled'
  };
  
  const message = messages[type] || type;
  activityLog.unshift(`[${timestamp}] ${message}`);
  
  if (activityLog.length > MAX_ACTIVITY_ITEMS) {
    activityLog.pop();
  }
  
  updateActivityDisplay();
}

function updateActivityDisplay() {
  const activityDiv = document.getElementById('activityLog');
  if (!activityDiv) return;
  
  activityDiv.innerHTML = activityLog
    .map(item => {
      const [time, msg] = item.split('] ');
      return `<div class="activity-item"><span class="activity-time">${time.substring(1)}</span><br>${msg}</div>`;
    })
    .join('');
}

// ============ UTILITY FUNCTIONS ============

function showSection(sectionId) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  
  if (sectionId === 'dashboard') {
    updateDashboard();
  } else if (sectionId === 'rooms') {
    loadRooms();
  } else if (sectionId === 'reservations') {
    loadReservations();
  } else if (sectionId === 'guests') {
    loadGuests();
  } else if (sectionId === 'billing') {
    loadBillings();
  } else if (sectionId === 'staff') {
    loadStaff();
  }
}

async function fetchAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    showNotification(error.message, 'error');
    throw error;
  }
}

function showNotification(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  document.body.insertBefore(alertDiv, document.body.firstChild);
  
  setTimeout(() => alertDiv.remove(), 4000);
}

function openModal(modalId) {
  document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ============ DASHBOARD ============

async function updateDashboard() {
  try {
    const overview = await fetchAPI('/dashboard/overview');
    
    document.getElementById('totalRooms').textContent = overview.totalRooms;
    document.getElementById('occupiedRooms').textContent = overview.occupiedRooms;
    document.getElementById('availableRooms').textContent = overview.availableRooms;
    document.getElementById('totalGuests').textContent = overview.totalGuests;
    document.getElementById('activeReservations').textContent = overview.activeReservations;
    document.getElementById('totalRevenue').textContent = `$${overview.totalRevenue}`;
    
    // Draw room status chart
    drawRoomStatusChart(overview);
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function drawRoomStatusChart(overview) {
  const canvas = document.getElementById('roomStatusChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const statuses = [
    { label: 'Available', value: overview.availableRooms, color: '#2ecc71' },
    { label: 'Occupied', value: overview.occupiedRooms, color: '#e74c3c' },
    { label: 'Reserved', value: overview.reservedRooms, color: '#3498db' },
    { label: 'Cleaning', value: overview.cleaningRooms, color: '#f39c12' }
  ];
  
  const total = overview.totalRooms;
  let currentAngle = 0;
  
  statuses.forEach(status => {
    const sliceAngle = (status.value / total) * 2 * Math.PI;
    
    ctx.fillStyle = status.color;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 60, currentAngle, currentAngle + sliceAngle);
    ctx.lineTo(width / 2, height / 2);
    ctx.fill();
    
    currentAngle += sliceAngle;
  });
}

// ============ ROOMS ============

async function loadRooms() {
  try {
    const rooms = await fetchAPI('/rooms');
    
    const tbody = document.querySelector('#roomsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    rooms.forEach(room => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${room.roomNumber}</td>
        <td>${room.type}</td>
        <td>${room.capacity}</td>
        <td>$${room.price}</td>
        <td><span class="status-badge status-${room.status}">${room.status}</span></td>
        <td>${room.condition}</td>
        <td>
          <button onclick="viewRoomDetails('${room.id}')" class="btn-secondary">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    populateRoomSelects(rooms);
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

function populateRoomSelects(rooms) {
  const selects = document.querySelectorAll('#resRoomSelect, #taskRoomSelect');
  selects.forEach(select => {
    select.innerHTML = '<option value="">Select Room</option>';
    rooms.forEach(room => {
      if (room.status === 'available' || select.id === 'taskRoomSelect') {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = `Room ${room.roomNumber} - ${room.type} ($${room.price})`;
        select.appendChild(option);
      }
    });
  });
}

function viewRoomDetails(roomId) {
  fetchAPI(`/rooms/${roomId}`).then(room => {
    const content = document.getElementById('roomModalContent');
    content.innerHTML = `
      <p><strong>Room Number:</strong> ${room.roomNumber}</p>
      <p><strong>Type:</strong> ${room.type}</p>
      <p><strong>Capacity:</strong> ${room.capacity} guests</p>
      <p><strong>Price/Night:</strong> $${room.price}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${room.status}">${room.status}</span></p>
      <p><strong>Condition:</strong> ${room.condition}</p>
      <p><strong>Current Occupancy:</strong> ${room.occupancy} guests</p>
      <p><strong>Last Cleaned:</strong> ${new Date(room.lastCleaned).toLocaleString()}</p>
    `;
    openModal('roomModal');
  });
}

async function updateRoomDisplay() {
  loadRooms();
  updateDashboard();
}

// ============ GUESTS ============

async function loadGuests() {
  try {
    const guests = await fetchAPI('/guests');
    
    const tbody = document.querySelector('#guestsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    guests.forEach(guest => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${guest.firstName} ${guest.lastName}</td>
        <td>${guest.email}</td>
        <td>${guest.phone || 'N/A'}</td>
        <td>${guest.totalStays}</td>
        <td>${guest.loyaltyPoints} pts</td>
        <td>${new Date(guest.registrationDate).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
    
    populateGuestSelects(guests);
  } catch (error) {
    console.error('Error loading guests:', error);
  }
}

function populateGuestSelects(guests) {
  const select = document.getElementById('resGuestSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select Guest</option>';
  guests.forEach(guest => {
    const option = document.createElement('option');
    option.value = guest.id;
    option.textContent = `${guest.firstName} ${guest.lastName} (${guest.email})`;
    select.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const guestForm = document.getElementById('guestForm');
  if (guestForm) {
    guestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const guestData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        idNumber: document.getElementById('idNumber').value,
        nationality: document.getElementById('nationality').value
      };
      
      try {
        await fetchAPI('/guests', 'POST', guestData);
        showNotification('Guest registered successfully!', 'success');
        guestForm.reset();
        loadGuests();
      } catch (error) {
        console.error('Error registering guest:', error);
      }
    });
  }
});

// ============ RESERVATIONS ============

async function loadReservations() {
  try {
    const reservations = await fetchAPI('/reservations');
    const rooms = await fetchAPI('/rooms');
    
    const tbody = document.querySelector('#reservationsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    reservations.forEach(res => {
      const checkIn = new Date(res.checkInDate);
      const checkOut = new Date(res.checkOutDate);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${res.guest.firstName} ${res.guest.lastName}</td>
        <td>Room ${res.room.roomNumber}</td>
        <td>${checkIn.toLocaleDateString()}</td>
        <td>${checkOut.toLocaleDateString()}</td>
        <td>${res.nights}</td>
        <td>$${res.totalPrice}</td>
        <td><span class="status-badge status-${res.status}">${res.status}</span></td>
        <td>
          ${res.status === 'confirmed' ? `
            <button onclick="checkInGuest('${res.id}')" class="btn-success">Check In</button>
            <button onclick="cancelReservation('${res.id}')" class="btn-danger">Cancel</button>
          ` : res.status === 'checked_in' ? `
            <button onclick="checkOutGuest('${res.id}')" class="btn-success">Check Out</button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    populateReservationSelects(reservations);
    loadGuests();
  } catch (error) {
    console.error('Error loading reservations:', error);
  }
}

function populateReservationSelects(reservations) {
  const select = document.getElementById('billingResSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select Reservation</option>';
  reservations.forEach(res => {
    const option = document.createElement('option');
    option.value = res.id;
    option.textContent = `${res.guest.firstName} ${res.guest.lastName} - Room ${res.room.roomNumber}`;
    select.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const registerGuestBtn = document.getElementById('registerGuestBtn');
  if (registerGuestBtn) {
    registerGuestBtn.addEventListener('click', () => {
      const form = document.getElementById('newGuestForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  const createGuestBtn = document.getElementById('createGuestBtn');
  if (createGuestBtn) {
    createGuestBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const guestData = {
        firstName: document.getElementById('guestFirstName').value,
        lastName: document.getElementById('guestLastName').value,
        email: document.getElementById('guestEmail').value
      };
      
      try {
        const guest = await fetchAPI('/guests', 'POST', guestData);
        document.getElementById('resGuestSelect').value = guest.id;
        document.getElementById('newGuestForm').style.display = 'none';
        document.getElementById('guestFirstName').value = '';
        document.getElementById('guestLastName').value = '';
        document.getElementById('guestEmail').value = '';
        showNotification('Guest created successfully!', 'success');
      } catch (error) {
        console.error('Error creating guest:', error);
      }
    });
  }
  
  const reservationForm = document.getElementById('reservationForm');
  if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const reservationData = {
        guestId: document.getElementById('resGuestSelect').value,
        roomId: document.getElementById('resRoomSelect').value,
        checkInDate: document.getElementById('checkInDate').value,
        checkOutDate: document.getElementById('checkOutDate').value,
        numberOfGuests: parseInt(document.getElementById('numberOfGuests').value),
        notes: document.getElementById('resNotes').value
      };
      
      try {
        await fetchAPI('/reservations', 'POST', reservationData);
        showNotification('Reservation created successfully!', 'success');
        reservationForm.reset();
        loadReservations();
      } catch (error) {
        console.error('Error creating reservation:', error);
      }
    });
  }
});

async function checkInGuest(reservationId) {
  try {
    await fetchAPI(`/reservations/${reservationId}/check-in`, 'POST');
    showNotification('Guest checked in successfully!', 'success');
    loadReservations();
  } catch (error) {
    console.error('Error checking in guest:', error);
  }
}

async function checkOutGuest(reservationId) {
  try {
    const reservation = await fetchAPI(`/reservations/${reservationId}/check-out`, 'POST');
    showNotification('Guest checked out successfully!', 'success');
    
    // Automatically create billing
    const billingData = {
      reservationId: reservationId,
      roomCharges: reservation.totalPrice
    };
    await fetchAPI('/billings', 'POST', billingData);
    
    loadReservations();
  } catch (error) {
    console.error('Error checking out guest:', error);
  }
}

async function cancelReservation(reservationId) {
  if (confirm('Are you sure you want to cancel this reservation?')) {
    try {
      await fetchAPI(`/reservations/${reservationId}/cancel`, 'POST');
      showNotification('Reservation cancelled!', 'success');
      loadReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    }
  }
}

// ============ BILLING ============

async function loadBillings() {
  try {
    const billings = await fetchAPI('/billings');
    
    const tbody = document.querySelector('#billingsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    billings.forEach(billing => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${billing.id.substring(0, 8)}</td>
        <td>${billing.guestId.substring(0, 8)}</td>
        <td>$${billing.subtotal.toFixed(2)}</td>
        <td>$${(billing.subtotal * billing.taxRate).toFixed(2)}</td>
        <td>$${billing.total.toFixed(2)}</td>
        <td><span class="status-badge status-${billing.status}">${billing.status}</span></td>
        <td>${billing.paymentMethod || 'Pending'}</td>
        <td>
          ${billing.status === 'pending' ? `
            <button onclick="payBilling('${billing.id}')" class="btn-success">Process Payment</button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    loadReservations();
  } catch (error) {
    console.error('Error loading billings:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const billingForm = document.getElementById('billingForm');
  if (billingForm) {
    billingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const billingData = {
        reservationId: document.getElementById('billingResSelect').value,
        roomCharges: parseFloat(document.getElementById('roomCharges').value),
        foodCharges: parseFloat(document.getElementById('foodCharges').value) || 0,
        serviceCharges: parseFloat(document.getElementById('serviceCharges').value) || 0,
        otherCharges: parseFloat(document.getElementById('otherCharges').value) || 0,
        paymentMethod: document.getElementById('paymentMethod').value || null
      };
      
      try {
        await fetchAPI('/billings', 'POST', billingData);
        showNotification('Bill created successfully!', 'success');
        billingForm.reset();
        loadBillings();
      } catch (error) {
        console.error('Error creating billing:', error);
      }
    });
  }
});

async function payBilling(billingId) {
  try {
    const billing = await fetchAPI(`/billings/${billingId}`);
    const paymentMethod = prompt('Enter payment method (credit_card, debit_card, cash, bank_transfer):');
    
    if (paymentMethod) {
      await fetchAPI(`/billings/${billingId}/pay`, 'POST', {
        paymentMethod,
        amount: billing.total
      });
      showNotification('Payment processed successfully!', 'success');
      loadBillings();
    }
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

// ============ STAFF ============

async function loadStaff() {
  try {
    const staffMembers = await fetchAPI('/staff');
    const rooms = await fetchAPI('/rooms');
    
    const tbody = document.querySelector('#staffTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    staffMembers.forEach(member => {
      const tr = document.createElement('tr');
      const tasksCount = member.assignedTasks ? member.assignedTasks.length : 0;
      const pendingTasks = member.assignedTasks ? member.assignedTasks.filter(t => t.status === 'pending').length : 0;
      
      tr.innerHTML = `
        <td>${member.name}</td>
        <td>${member.role}</td>
        <td><span class="status-badge status-${member.status}">${member.status}</span></td>
        <td>${pendingTasks}/${tasksCount} tasks</td>
        <td>
          <button onclick="viewTasks('${member.id}')" class="btn-secondary">View Tasks</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    populateStaffSelects(staffMembers);
    populateRoomSelects(rooms);
  } catch (error) {
    console.error('Error loading staff:', error);
  }
}

function populateStaffSelects(staffMembers) {
  const select = document.getElementById('staffSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select Staff Member</option>';
  staffMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = `${member.name} (${member.role})`;
    select.appendChild(option);
  });
}

function viewTasks(staffId) {
  fetchAPI(`/staff`).then(staffMembers => {
    const member = staffMembers.find(m => m.id === staffId);
    const content = document.getElementById('tasksContent');
    
    if (member.assignedTasks && member.assignedTasks.length > 0) {
      content.innerHTML = member.assignedTasks.map(task => `
        <div class="report-item">
          <h4>Task: ${task.taskType}</h4>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Status:</strong> ${task.status}</p>
          <p><strong>Description:</strong> ${task.description}</p>
          ${task.status === 'pending' ? `
            <button onclick="completeTask('${staffId}', '${task.id}')" class="btn-success">Mark Complete</button>
          ` : ''}
        </div>
      `).join('');
    } else {
      content.innerHTML = '<p>No tasks assigned</p>';
    }
    
    openModal('taskModal');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const taskData = {
        roomId: document.getElementById('taskRoomSelect').value,
        taskType: document.getElementById('taskType').value,
        priority: document.getElementById('taskPriority').value,
        description: document.getElementById('taskDescription').value
      };
      
      try {
        await fetchAPI(`/staff/${document.getElementById('staffSelect').value}/assign-task`, 'POST', taskData);
        showNotification('Task assigned successfully!', 'success');
        taskForm.reset();
        loadStaff();
      } catch (error) {
        console.error('Error assigning task:', error);
      }
    });
  }
});

async function completeTask(staffId, taskId) {
  try {
    await fetchAPI(`/staff/${staffId}/tasks/${taskId}/complete`, 'POST');
    showNotification('Task marked as complete!', 'success');
    viewTasks(staffId);
    loadStaff();
  } catch (error) {
    console.error('Error completing task:', error);
  }
}

// Initialize on page load
window.addEventListener('load', () => {
  connectWebSocket();
  updateDashboard();
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
});
