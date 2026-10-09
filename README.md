# Hotel Management System

A modern, full-featured hotel management system built with Node.js, Express, and WebSocket technology. This system provides real-time updates for room bookings, guest management, reservations, billing, and staff coordination.

## Features

### ✅ Room Management
- **Room Inventory**: Manage multiple room types (Single, Double, Suite, Presidential)
- **Room Status Tracking**: Real-time room status (available, occupied, reserved, cleaning)
- **Room Conditions**: Track room maintenance status
- **Occupancy Tracking**: Monitor current room occupancy
- **Last Cleaned Tracking**: Keep records of room maintenance

### ✅ Guest Management
- **Guest Registration**: Register guests with detailed information
- **Guest Profiles**: Store guest details and contact information
- **Loyalty Program**: Track guest loyalty points and stay history
- **Guest Search**: Quickly find guest records

### ✅ Reservation Management
- **Create Reservations**: Book rooms with date ranges and guest count
- **Automatic Pricing**: Dynamic pricing based on room type and duration
- **Reservation Status**: Track reservation states (confirmed, checked-in, completed, cancelled)
- **Check-in/Check-out**: Streamlined guest arrival and departure process
- **Cancellation Support**: Easy reservation cancellation with status updates

### ✅ Billing & Payments
- **Automatic Billing**: Generate bills with room charges, food, services
- **Tax Calculation**: Automatic tax computation (10% default)
- **Payment Processing**: Process multiple payment methods
- **Payment Status**: Track pending and paid invoices
- **Bill Tracking**: View all billing records with details

### ✅ Staff Management
- **Staff Directory**: Manage staff members and their roles
- **Task Assignment**: Assign tasks to staff members
- **Priority Management**: Set task priorities (normal, high, urgent)
- **Task Completion**: Mark tasks as complete
- **Task Types**: Cleaning, maintenance, laundry, repair
- **Shift Tracking**: Monitor staff shifts and availability

### ✅ Real-time Features
- **WebSocket Support**: Real-time updates across all connected clients
- **Activity Logging**: Complete audit trail of all activities
- **Instant Notifications**: Immediate updates on reservations, payments, and tasks
- **Live Room Status**: Real-time room status synchronization
- **Guest Online Status**: See when guests check in/out

### ✅ Dashboard
- **Overview Statistics**: Total rooms, occupied, available, reserved, cleaning
- **Room Status Distribution**: Visual breakdown of room statuses
- **Active Guests**: Current number of checked-in guests
- **Revenue Tracking**: Total revenue from paid invoices
- **Activity Log**: Real-time activity feed

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **WebSocket (ws)** - Real-time bidirectional communication
- **body-parser** - Request parsing
- **cors** - Cross-Origin Resource Sharing
- **uuid** - Unique ID generation

### Frontend
- **HTML5** - Markup structure
- **CSS3** - Responsive styling with animations
- **Vanilla JavaScript** - Client-side logic
- **WebSocket API** - Real-time communication
- **Canvas API** - Chart rendering

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   The application will run on `http://localhost:4000` with WebSocket on the same port

3. **Access the Dashboard**
   Open your browser and navigate to `http://localhost:4000`

## Project Structure

```
/
├── server.js              # Express server, WebSocket, and API endpoints
├── package.json           # Project dependencies
├── public/
│   ├── index.html         # Main HTML structure
│   ├── app.js             # Client-side logic and WebSocket handling
│   └── styles.css         # Responsive styling
```

## API Endpoints

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room details
- `GET /api/rooms/available/count` - Get availability count
- `PUT /api/rooms/:id/status` - Update room status

### Guests
- `POST /api/guests` - Register new guest
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get guest details

### Reservations
- `POST /api/reservations` - Create reservation
- `GET /api/reservations` - Get all reservations
- `GET /api/reservations/:id` - Get reservation details
- `POST /api/reservations/:id/check-in` - Check in guest
- `POST /api/reservations/:id/check-out` - Check out guest
- `POST /api/reservations/:id/cancel` - Cancel reservation

### Billing
- `POST /api/billings` - Create billing record
- `GET /api/billings` - Get all billings
- `GET /api/billings/:id` - Get billing details
- `POST /api/billings/:id/pay` - Process payment

### Staff
- `GET /api/staff` - Get all staff members
- `POST /api/staff/:id/assign-task` - Assign task to staff
- `POST /api/staff/:staffId/tasks/:taskId/complete` - Complete task

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard statistics

## WebSocket Events

### Client to Server
- `user_join` - User connects and joins real-time updates

### Server to Client
- `initial_state` - Send initial data on connection
- `room_status_changed` - Room status update
- `reservation_created` - New reservation
- `guest_checked_in` - Guest arrival
- `guest_checked_out` - Guest departure
- `payment_received` - Payment processed
- `task_assigned` - New task assignment
- `task_completed` - Task completion
- `reservation_cancelled` - Reservation cancelled
- `notification` - User-specific notification

## Data Models

### Room
```javascript
{
  id: string,
  roomNumber: number,
  type: "Single" | "Double" | "Suite" | "Presidential",
  price: number,
  capacity: number,
  status: "available" | "occupied" | "reserved" | "cleaning",
  occupancy: number,
  lastCleaned: ISO8601,
  condition: string
}
```

### Guest
```javascript
{
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  idNumber: string,
  nationality: string,
  registrationDate: ISO8601,
  status: "active",
  totalStays: number,
  loyaltyPoints: number
}
```

### Reservation
```javascript
{
  id: string,
  guestId: string,
  roomId: string,
  checkInDate: ISO8601,
  checkOutDate: ISO8601,
  numberOfGuests: number,
  nights: number,
  totalPrice: number,
  status: "confirmed" | "checked_in" | "completed" | "cancelled",
  notes: string,
  createdAt: ISO8601,
  checkedIn: boolean,
  checkedOut: boolean
}
```

### Billing
```javascript
{
  id: string,
  reservationId: string,
  guestId: string,
  roomCharges: number,
  foodCharges: number,
  serviceCharges: number,
  otherCharges: number,
  subtotal: number,
  taxRate: number,
  total: number,
  paymentMethod: string | null,
  status: "pending" | "paid",
  createdAt: ISO8601
}
```

## Usage Guide

### Registering a Guest
1. Navigate to **Guests** section
2. Fill in guest details (name, email, phone, etc.)
3. Click **Register Guest**

### Creating a Reservation
1. Go to **Reservations** section
2. Select or register a guest
3. Choose available room
4. Set check-in and check-out dates
5. Enter number of guests
6. Click **Create Reservation**

### Guest Check-in
1. Find the reservation in the reservations table
2. Click **Check In** button
3. Room status automatically changes to occupied
4. Guest loyalty points begin accumulating

### Processing Payment
1. Navigate to **Billing** section
2. Create a bill for the reservation
3. Add charges (room, food, services)
4. Click **Create Bill**
5. Process payment using various payment methods
6. Bill status updates to "paid"

### Assigning Tasks to Staff
1. Go to **Staff** section
2. Use the "Assign Task" form
3. Select staff member and room
4. Choose task type and priority
5. Add task description
6. Click **Assign Task**

### Completing Tasks
1. View staff member's assigned tasks
2. Click **View Tasks** to see details
3. Click **Mark Complete** when done
4. Task status updates automatically

## Features Highlights

### Real-time Updates
- WebSocket ensures all users see updates instantly
- No need to refresh the page
- Activity feed shows live updates

### Revenue Tracking
- Automatic calculation of total revenue
- Payment status monitoring
- Detailed billing reports

### Staff Coordination
- Efficient task assignment system
- Priority-based task management
- Room-specific task tracking

### Guest Experience
- Loyalty program tracking
- Quick check-in/check-out process
- Guest history preservation

## Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations
- In-memory data storage for demonstration
- Real-time synchronization via WebSocket
- Scalable architecture ready for database integration

## Future Enhancements
- Database integration (MongoDB/PostgreSQL)
- Advanced booking analytics
- Room pricing rules engine
- Guest reviews and ratings
- Integration with payment gateways
- Email and SMS notifications
- Mobile app support
- Housekeeping mobile app
- Advanced reporting and analytics

## Security Considerations
- Input validation on all endpoints
- CORS protection
- WebSocket message validation
- Production deployment recommendations needed

## License
MIT License

## Support
For issues or questions, please contact the development team.
