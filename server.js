const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory database
const roomsDB = {};
const reservationsDB = {};
const guestsDB = {};
const staffDB = {};
const billingDB = {};

// WebSocket connections
const clients = new Set();

// Broadcast to all connected clients
function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New WebSocket client connected');
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// Initialize sample rooms
function initializeRooms() {
    const roomTypes = ['Single', 'Double', 'Deluxe', 'Suite'];
    const prices = { Single: 80, Double: 120, Deluxe: 180, Suite: 250 };
    
    for (let i = 1; i <= 20; i++) {
        const type = roomTypes[i % 4];
        roomsDB[`ROOM${String(i).padStart(3, '0')}`] = {
            id: `ROOM${String(i).padStart(3, '0')}`,
            roomNumber: i,
            floor: Math.ceil(i / 5),
            type,
            pricePerNight: prices[type],
            status: 'Available',
            currentGuest: null,
            lastCleaned: new Date(),
            amenities: ['WiFi', 'AC', 'TV', 'Mini Bar']
        };
    }
}

initializeRooms();

// ==================== ROOM MANAGEMENT ====================

app.get('/api/rooms', (req, res) => {
    const rooms = Object.values(roomsDB);
    res.json(rooms);
});

app.get('/api/rooms/:id', (req, res) => {
    const room = roomsDB[req.params.id];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
});

app.put('/api/rooms/:id', (req, res) => {
    const room = roomsDB[req.params.id];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    Object.assign(room, req.body);
    broadcast({ type: 'room_updated', room });
    res.json(room);
});

app.put('/api/rooms/:id/status', (req, res) => {
    const room = roomsDB[req.params.id];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    room.status = req.body.status;
    room.lastCleaned = new Date();
    
    broadcast({ 
        type: 'room_status_changed',
        roomId: req.params.id,
        status: room.status,
        timestamp: new Date()
    });
    
    res.json(room);
});

// ==================== GUEST MANAGEMENT ====================

app.post('/api/guests', (req, res) => {
    const { firstName, lastName, email, phone, passportNumber, country } = req.body;
    
    if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const guestId = uuidv4();
    const guest = {
        id: guestId,
        firstName,
        lastName,
        email,
        phone,
        passportNumber,
        country,
        checkInDate: null,
        checkOutDate: null,
        registeredDate: new Date()
    };
    
    guestsDB[guestId] = guest;
    broadcast({ type: 'guest_registered', guest });
    res.status(201).json(guest);
});

app.get('/api/guests', (req, res) => {
    res.json(Object.values(guestsDB));
});

app.get('/api/guests/:id', (req, res) => {
    const guest = guestsDB[req.params.id];
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json(guest);
});

// ==================== RESERVATION MANAGEMENT ====================

app.post('/api/reservations', (req, res) => {
    const { guestId, roomId, checkInDate, checkOutDate, numberOfGuests } = req.body;
    
    if (!guestId || !roomId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!guestsDB[guestId]) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    
    if (!roomsDB[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomsDB[roomId];
    
    // Check room availability
    const conflictingReservations = Object.values(reservationsDB).filter(r => 
        r.roomId === roomId &&
        r.status !== 'Cancelled' &&
        new Date(r.checkOutDate) > new Date(checkInDate) &&
        new Date(r.checkInDate) < new Date(checkOutDate)
    );
    
    if (conflictingReservations.length > 0) {
        return res.status(409).json({ error: 'Room not available for these dates' });
    }
    
    const reservationId = uuidv4();
    const numberOfNights = Math.ceil(
        (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
    );
    
    const totalPrice = room.pricePerNight * numberOfNights;
    
    const reservation = {
        id: reservationId,
        guestId,
        roomId,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        numberOfNights,
        totalPrice,
        status: 'Confirmed',
        specialRequests: '',
        createdDate: new Date()
    };
    
    reservationsDB[reservationId] = reservation;
    
    broadcast({ 
        type: 'reservation_created',
        reservation,
        roomId
    });
    
    res.status(201).json(reservation);
});

app.get('/api/reservations', (req, res) => {
    res.json(Object.values(reservationsDB));
});

app.get('/api/reservations/:id', (req, res) => {
    const reservation = reservationsDB[req.params.id];
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
});

app.put('/api/reservations/:id', (req, res) => {
    const reservation = reservationsDB[req.params.id];
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    
    Object.assign(reservation, req.body);
    broadcast({ type: 'reservation_updated', reservation });
    res.json(reservation);
});

app.delete('/api/reservations/:id', (req, res) => {
    const reservation = reservationsDB[req.params.id];
    if (reservation) {
        reservation.status = 'Cancelled';
        broadcast({ 
            type: 'reservation_cancelled',
            reservationId: req.params.id,
            roomId: reservation.roomId
        });
    }
    res.json({ message: 'Reservation cancelled' });
});

// ==================== CHECK-IN / CHECK-OUT ====================

app.post('/api/check-in/:reservationId', (req, res) => {
    const reservation = reservationsDB[req.reservationId];
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    
    const room = roomsDB[reservation.roomId];
    const guest = guestsDB[reservation.guestId];
    
    reservation.status = 'Checked In';
    room.status = 'Occupied';
    room.currentGuest = guest.id;
    
    guest.checkInDate = new Date();
    
    broadcast({ 
        type: 'guest_checked_in',
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        timestamp: new Date()
    });
    
    res.json({ message: 'Check-in successful', reservation, room, guest });
});

app.post('/api/check-out/:reservationId', (req, res) => {
    const reservation = reservationsDB[req.params.reservationId];
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    
    const room = roomsDB[reservation.roomId];
    const guest = guestsDB[reservation.guestId];
    
    reservation.status = 'Checked Out';
    room.status = 'Cleaning';
    room.currentGuest = null;
    
    guest.checkOutDate = new Date();
    
    // Create billing record
    const billingId = uuidv4();
    const roomCharge = reservation.totalPrice;
    const serviceCharge = roomCharge * 0.1;
    const tax = (roomCharge + serviceCharge) * 0.1;
    const totalBill = roomCharge + serviceCharge + tax;
    
    billingDB[billingId] = {
        id: billingId,
        reservationId: reservation.id,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: reservation.checkInDate,
        checkOutDate: new Date(),
        roomCharge,
        serviceCharge,
        tax,
        totalBill,
        status: 'Pending',
        paymentMethod: req.body.paymentMethod || 'Credit Card',
        createdDate: new Date()
    };
    
    broadcast({ 
        type: 'guest_checked_out',
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        billing: billingDB[billingId],
        timestamp: new Date()
    });
    
    res.json({ message: 'Check-out successful', reservation, billing: billingDB[billingId] });
});

// ==================== BILLING ====================

app.get('/api/billing/:guestId', (req, res) => {
    const bills = Object.values(billingDB).filter(b => b.guestId === req.params.guestId);
    res.json(bills);
});

app.get('/api/billing', (req, res) => {
    res.json(Object.values(billingDB));
});

app.post('/api/billing/:id/payment', (req, res) => {
    const bill = billingDB[req.params.id];
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    bill.status = 'Paid';
    bill.paymentDate = new Date();
    bill.paymentMethod = req.body.paymentMethod;
    
    broadcast({ 
        type: 'payment_received',
        billId: req.params.id,
        amount: bill.totalBill,
        timestamp: new Date()
    });
    
    res.json(bill);
});

// ==================== STAFF MANAGEMENT ====================

app.post('/api/staff', (req, res) => {
    const { firstName, lastName, position, department, phone } = req.body;
    
    if (!firstName || !lastName || !position) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const staffId = uuidv4();
    const staff = {
        id: staffId,
        firstName,
        lastName,
        position,
        department,
        phone,
        status: 'Active',
        hireDate: new Date(),
        assignedTasks: []
    };
    
    staffDB[staffId] = staff;
    broadcast({ type: 'staff_added', staff });
    res.status(201).json(staff);
});

app.get('/api/staff', (req, res) => {
    res.json(Object.values(staffDB));
});

app.get('/api/staff/:id', (req, res) => {
    const staff = staffDB[req.params.id];
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
});

app.post('/api/staff/:id/assign-task', (req, res) => {
    const staff = staffDB[req.params.id];
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    
    const task = {
        id: uuidv4(),
        description: req.body.description,
        roomId: req.body.roomId,
        priority: req.body.priority || 'Normal',
        assignedDate: new Date(),
        status: 'Pending'
    };
    
    staff.assignedTasks.push(task);
    
    broadcast({ 
        type: 'task_assigned',
        staffId: req.params.id,
        task
    });
    
    res.json(task);
});

app.put('/api/staff/:staffId/task/:taskId', (req, res) => {
    const staff = staffDB[req.params.staffId];
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    
    const task = staff.assignedTasks.find(t => t.id === req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    task.status = req.body.status;
    task.completedDate = new Date();
    
    // If task is cleaning a room, update room status
    if (task.status === 'Completed' && task.roomId) {
        const room = roomsDB[task.roomId];
        if (room && room.status === 'Cleaning') {
            room.status = 'Available';
        }
    }
    
    broadcast({ 
        type: 'task_updated',
        staffId: req.params.staffId,
        task
    });
    
    res.json(task);
});

// ==================== REPORTS & ANALYTICS ====================

app.get('/api/analytics/occupancy', (req, res) => {
    const today = new Date();
    const occupiedRooms = Object.values(roomsDB).filter(r => r.status === 'Occupied').length;
    const availableRooms = Object.values(roomsDB).filter(r => r.status === 'Available').length;
    const cleaningRooms = Object.values(roomsDB).filter(r => r.status === 'Cleaning').length;
    
    const occupancyRate = ((occupiedRooms / Object.keys(roomsDB).length) * 100).toFixed(2);
    
    res.json({
        totalRooms: Object.keys(roomsDB).length,
        occupiedRooms,
        availableRooms,
        cleaningRooms,
        occupancyRate,
        timestamp: today
    });
});

app.get('/api/analytics/revenue', (req, res) => {
    const completedBills = Object.values(billingDB).filter(b => b.status === 'Paid');
    const totalRevenue = completedBills.reduce((sum, b) => sum + b.totalBill, 0);
    const averageRevenue = completedBills.length > 0 ? (totalRevenue / completedBills.length).toFixed(2) : 0;
    
    res.json({
        totalRevenue: totalRevenue.toFixed(2),
        completedTransactions: completedBills.length,
        averagePerGuest: averageRevenue,
        pendingPayments: Object.values(billingDB).filter(b => b.status === 'Pending').length
    });
});

app.get('/api/analytics/dashboard', (req, res) => {
    const stats = {
        totalGuests: Object.keys(guestsDB).length,
        totalReservations: Object.keys(reservationsDB).length,
        activeReservations: Object.values(reservationsDB).filter(r => r.status === 'Confirmed').length,
        checkedInGuests: Object.values(reservationsDB).filter(r => r.status === 'Checked In').length,
        staffMembers: Object.keys(staffDB).length,
        pendingTasks: Object.values(staffDB).reduce((sum, s) => 
            sum + s.assignedTasks.filter(t => t.status === 'Pending').length, 0
        )
    };
    
    res.json(stats);
});

app.listen(PORT, () => {
    console.log(`Hotel Management System running on port ${PORT}`);
    console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});
