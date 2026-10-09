const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory data storage
const rooms = new Map();
const reservations = new Map();
const guests = new Map();
const staff = new Map();
const billings = new Map();

// WebSocket connections
const connectedClients = new Set();

// Initialize rooms
function initializeRooms() {
  const roomTypes = [
    { type: 'Single', price: 100, capacity: 1 },
    { type: 'Double', price: 150, capacity: 2 },
    { type: 'Suite', price: 250, capacity: 4 },
    { type: 'Presidential', price: 500, capacity: 2 }
  ];
  
  let roomNumber = 101;
  roomTypes.forEach((roomType, idx) => {
    for (let i = 0; i < 5; i++) {
      const roomId = uuidv4();
      rooms.set(roomId, {
        id: roomId,
        roomNumber: roomNumber++,
        type: roomType.type,
        price: roomType.price,
        capacity: roomType.capacity,
        status: 'available',
        occupancy: 0,
        lastCleaned: new Date().toISOString(),
        condition: 'excellent'
      });
    }
  });
}

// Initialize staff
function initializeStaff() {
  const staffMembers = [
    { name: 'John Manager', role: 'Manager', status: 'on_duty' },
    { name: 'Sarah Receptionist', role: 'Receptionist', status: 'on_duty' },
    { name: 'Mike Housekeeping', role: 'Housekeeping', status: 'on_duty' },
    { name: 'Elena Chef', role: 'Chef', status: 'on_duty' }
  ];
  
  staffMembers.forEach(member => {
    const staffId = uuidv4();
    staff.set(staffId, {
      id: staffId,
      ...member,
      shiftStart: new Date().toISOString(),
      assignedTasks: []
    });
  });
}

initializeRooms();
initializeStaff();

// WebSocket broadcast function
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  connectedClients.add(ws);
  
  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      rooms: Array.from(rooms.values()),
      reservations: Array.from(reservations.values()),
      staff: Array.from(staff.values())
    }
  }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// ============ ROOM ENDPOINTS ============

app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values());
  res.json(roomsList);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

app.get('/api/rooms/available/count', (req, res) => {
  const { checkIn, checkOut } = req.query;
  const availableRooms = Array.from(rooms.values()).filter(r => r.status === 'available');
  res.json({ available: availableRooms.length, total: rooms.size });
});

app.put('/api/rooms/:id/status', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const { status, condition } = req.body;
  if (status) room.status = status;
  if (condition) room.condition = condition;
  
  rooms.set(req.params.id, room);
  broadcastUpdate('room_status_changed', room);
  res.json(room);
});

// ============ GUEST ENDPOINTS ============

app.post('/api/guests', (req, res) => {
  const { firstName, lastName, email, phone, idNumber, nationality } = req.body;
  
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const guestId = uuidv4();
  const guest = {
    id: guestId,
    firstName,
    lastName,
    email,
    phone: phone || '',
    idNumber: idNumber || '',
    nationality: nationality || '',
    registrationDate: new Date().toISOString(),
    status: 'active',
    totalStays: 0,
    loyaltyPoints: 0
  };
  
  guests.set(guestId, guest);
  broadcastUpdate('guest_registered', guest);
  res.status(201).json(guest);
});

app.get('/api/guests', (req, res) => {
  const guestsList = Array.from(guests.values());
  res.json(guestsList);
});

app.get('/api/guests/:id', (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }
  res.json(guest);
});

// ============ RESERVATION ENDPOINTS ============

app.post('/api/reservations', (req, res) => {
  const { guestId, roomId, checkInDate, checkOutDate, numberOfGuests, notes } = req.body;
  
  if (!guestId || !roomId || !checkInDate || !checkOutDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!guests.has(guestId)) {
    return res.status(404).json({ error: 'Guest not found' });
  }
  
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const room = rooms.get(roomId);
  if (room.status !== 'available') {
    return res.status(400).json({ error: 'Room is not available' });
  }
  
  const reservationId = uuidv4();
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  const reservation = {
    id: reservationId,
    guestId,
    roomId,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    nights,
    totalPrice: room.price * nights,
    status: 'confirmed',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    checkedIn: false,
    checkedOut: false
  };
  
  reservations.set(reservationId, reservation);
  
  // Update room status
  room.status = 'reserved';
  rooms.set(roomId, room);
  
  broadcastUpdate('reservation_created', reservation);
  res.status(201).json(reservation);
});

app.get('/api/reservations', (req, res) => {
  const reservationsList = Array.from(reservations.values())
    .map(r => ({
      ...r,
      guest: guests.get(r.guestId),
      room: rooms.get(r.roomId)
    }));
  
  res.json(reservationsList);
});

app.get('/api/reservations/:id', (req, res) => {
  const reservation = reservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  
  res.json({
    ...reservation,
    guest: guests.get(reservation.guestId),
    room: rooms.get(reservation.roomId)
  });
});

// Check-in
app.post('/api/reservations/:id/check-in', (req, res) => {
  const reservation = reservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  
  reservation.checkedIn = true;
  reservation.checkInTime = new Date().toISOString();
  reservation.status = 'checked_in';
  
  const room = rooms.get(reservation.roomId);
  room.status = 'occupied';
  room.occupancy = reservation.numberOfGuests;
  rooms.set(reservation.roomId, room);
  
  reservations.set(req.params.id, reservation);
  
  broadcastUpdate('guest_checked_in', reservation);
  res.json(reservation);
});

// Check-out
app.post('/api/reservations/:id/check-out', (req, res) => {
  const reservation = reservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  
  reservation.checkedOut = true;
  reservation.checkOutTime = new Date().toISOString();
  reservation.status = 'completed';
  
  const room = rooms.get(reservation.roomId);
  room.status = 'cleaning';
  room.occupancy = 0;
  rooms.set(reservation.roomId, room);
  
  // Update guest stats
  const guest = guests.get(reservation.guestId);
  guest.totalStays = (guest.totalStays || 0) + 1;
  guest.loyaltyPoints = (guest.loyaltyPoints || 0) + Math.floor(reservation.totalPrice / 10);
  guests.set(reservation.guestId, guest);
  
  reservations.set(req.params.id, reservation);
  
  broadcastUpdate('guest_checked_out', reservation);
  res.json(reservation);
});

// Cancel reservation
app.post('/api/reservations/:id/cancel', (req, res) => {
  const reservation = reservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  
  reservation.status = 'cancelled';
  
  const room = rooms.get(reservation.roomId);
  room.status = 'available';
  rooms.set(reservation.roomId, room);
  
  reservations.set(req.params.id, reservation);
  
  broadcastUpdate('reservation_cancelled', reservation);
  res.json(reservation);
});

// ============ BILLING ENDPOINTS ============

app.post('/api/billings', (req, res) => {
  const { reservationId, roomCharges, foodCharges, serviceCharges, otherCharges, paymentMethod } = req.body;
  
  if (!reservationId) {
    return res.status(400).json({ error: 'Missing reservationId' });
  }
  
  if (!reservations.has(reservationId)) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  
  const billingId = uuidv4();
  const reservation = reservations.get(reservationId);
  
  const billing = {
    id: billingId,
    reservationId,
    guestId: reservation.guestId,
    roomCharges: roomCharges || reservation.totalPrice,
    foodCharges: foodCharges || 0,
    serviceCharges: serviceCharges || 0,
    otherCharges: otherCharges || 0,
    subtotal: (roomCharges || reservation.totalPrice) + (foodCharges || 0) + (serviceCharges || 0) + (otherCharges || 0),
    taxRate: 0.1,
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: paymentMethod || 'pending',
    status: paymentMethod ? 'paid' : 'pending'
  };
  
  billing.total = billing.subtotal + (billing.subtotal * billing.taxRate);
  
  billings.set(billingId, billing);
  broadcastUpdate('billing_created', billing);
  res.status(201).json(billing);
});

app.get('/api/billings', (req, res) => {
  const billingsList = Array.from(billings.values());
  res.json(billingsList);
});

app.get('/api/billings/:id', (req, res) => {
  const billing = billings.get(req.params.id);
  if (!billing) {
    return res.status(404).json({ error: 'Billing not found' });
  }
  res.json(billing);
});

app.post('/api/billings/:id/pay', (req, res) => {
  const billing = billings.get(req.params.id);
  if (!billing) {
    return res.status(404).json({ error: 'Billing not found' });
  }
  
  const { paymentMethod, amount } = req.body;
  
  if (amount < billing.total) {
    return res.status(400).json({ error: 'Insufficient payment amount' });
  }
  
  billing.paymentMethod = paymentMethod;
  billing.status = 'paid';
  billing.paidAt = new Date().toISOString();
  
  billings.set(req.params.id, billing);
  broadcastUpdate('payment_received', billing);
  res.json(billing);
});

// ============ STAFF ENDPOINTS ============

app.get('/api/staff', (req, res) => {
  const staffList = Array.from(staff.values());
  res.json(staffList);
});

app.post('/api/staff/:id/assign-task', (req, res) => {
  const staffMember = staff.get(req.params.id);
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  const { roomId, taskType, priority, description } = req.body;
  
  const task = {
    id: uuidv4(),
    roomId,
    taskType,
    priority: priority || 'normal',
    description: description || '',
    assignedAt: new Date().toISOString(),
    status: 'pending',
    completedAt: null
  };
  
  staffMember.assignedTasks.push(task);
  staff.set(req.params.id, staffMember);
  
  broadcastUpdate('task_assigned', { staffId: req.params.id, task });
  res.status(201).json(task);
});

app.post('/api/staff/:staffId/tasks/:taskId/complete', (req, res) => {
  const staffMember = staff.get(req.params.staffId);
  if (!staffMember) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  const task = staffMember.assignedTasks.find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  
  staff.set(req.params.staffId, staffMember);
  
  // Update room status if it was cleaning
  if (task.taskType === 'cleaning') {
    const room = rooms.get(task.roomId);
    if (room) {
      room.status = 'available';
      room.lastCleaned = new Date().toISOString();
      rooms.set(task.roomId, room);
    }
  }
  
  broadcastUpdate('task_completed', { staffId: req.params.staffId, task });
  res.json(task);
});

// ============ DASHBOARD ENDPOINTS ============

app.get('/api/dashboard/overview', (req, res) => {
  const overview = {
    totalRooms: rooms.size,
    occupiedRooms: Array.from(rooms.values()).filter(r => r.status === 'occupied').length,
    availableRooms: Array.from(rooms.values()).filter(r => r.status === 'available').length,
    reservedRooms: Array.from(rooms.values()).filter(r => r.status === 'reserved').length,
    cleaningRooms: Array.from(rooms.values()).filter(r => r.status === 'cleaning').length,
    totalGuests: guests.size,
    totalReservations: reservations.size,
    activeReservations: Array.from(reservations.values()).filter(r => r.status === 'checked_in').length,
    staffOnDuty: Array.from(staff.values()).filter(s => s.status === 'on_duty').length,
    totalRevenue: Array.from(billings.values())
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.total, 0)
      .toFixed(2)
  };
  
  res.json(overview);
});

// Start server
server.listen(PORT, () => {
  console.log(`Hotel Management System running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for real-time updates`);
});
