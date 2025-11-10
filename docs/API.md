# MindLink API Documentation

## Overview

The MindLink API provides endpoints for user authentication, therapist management, room creation, and real-time communication.

## Base URL

- Development: `http://localhost:5001`
- Production: `https://your-api-domain.com`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /api/auth/register/user
Register a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### POST /api/auth/register/therapist
Register a new therapist account.

**Request Body:**
```json
{
  "fullName": "Dr. Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "specialties": ["Anxiety", "Depression"],
  "experienceYears": 5
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

### Users

#### GET /api/users/profile
Get current user profile.

#### PUT /api/users/profile
Update user profile.

### Therapists

#### GET /api/therapists
Get list of all therapists.

#### GET /api/therapists/:id
Get specific therapist details.

### Rooms

#### GET /api/rooms
Get list of available rooms.

#### POST /api/rooms
Create a new support room.

#### GET /api/rooms/:id
Get specific room details.

### Appointments

#### GET /api/appointments
Get user's appointments.

#### POST /api/appointments
Create a new appointment.

#### PUT /api/appointments/:id
Update appointment.

#### DELETE /api/appointments/:id
Cancel appointment.

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
