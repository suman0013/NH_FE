# Complete API Documentation - Namahatta Management System

## Authentication APIs (`/api/auth/`)

### POST `/api/auth/login`
- **Purpose**: User login
- **Auth Required**: No
- **Rate Limited**: Yes (5 attempts per 15 minutes)
- **Request**:
```json
{
  "username": "string",
  "password": "string"
}
```
- **Response (Success 200)**:
```json
{
  "user": {
    "id": number,
    "username": "string",
    "role": "ADMIN|OFFICE|DISTRICT_SUPERVISOR",
    "districts": ["string"]
  }
}
```
- **Response (Error 401)**:
```json
{
  "error": "Invalid credentials"
}
```

### POST `/api/auth/logout`
- **Purpose**: User logout
- **Auth Required**: No (uses cookie)
- **Request**: Empty body
- **Response (Success 200)**:
```json
{
  "message": "Logged out successfully"
}
```

### GET `/api/auth/verify`
- **Purpose**: Verify JWT token and get user info
- **Auth Required**: Yes (cookie-based)
- **Request**: No body
- **Response (Success 200)**:
```json
{
  "user": {
    "id": number,
    "username": "string",
    "role": "ADMIN|OFFICE|DISTRICT_SUPERVISOR",
    "districts": ["string"]
  }
}
```

### GET `/api/auth/user-districts`
- **Purpose**: Get user's assigned districts
- **Auth Required**: Yes
- **Response (Success 200)**:
```json
{
  "districts": [
    {
      "code": "string",
      "name": "string"
    }
  ]
}
```

## System APIs

### GET `/api/health`
- **Purpose**: Health check
- **Auth Required**: No
- **Response (Success 200)**:
```json
{
  "status": "OK"
}
```

### GET `/api/about`
- **Purpose**: System information
- **Auth Required**: No
- **Response (Success 200)**:
```json
{
  "name": "Namahatta Management System",
  "version": "1.0.0",
  "description": "OpenAPI spec for Namahatta web and mobile-compatible system"
}
```

## Geography APIs

### GET `/api/countries`
- **Purpose**: Get all countries
- **Auth Required**: No
- **Response (Success 200)**:
```json
["India", "USA", "UK"]
```

### GET `/api/states?country=string`
- **Purpose**: Get states by country
- **Auth Required**: No
- **Query Params**: `country` (optional)
- **Response (Success 200)**:
```json
["West Bengal", "Odisha", "Maharashtra"]
```

### GET `/api/districts?state=string`
- **Purpose**: Get districts by state
- **Auth Required**: No
- **Query Params**: `state` (optional)
- **Response (Success 200)**:
```json
["Kolkata", "Howrah", "24 Parganas North"]
```

### GET `/api/sub-districts?district=string&pincode=string`
- **Purpose**: Get sub-districts
- **Auth Required**: No
- **Query Params**: `district`, `pincode` (both optional)
- **Response (Success 200)**:
```json
["Ballygunge", "Park Street", "Salt Lake"]
```

### GET `/api/villages?subDistrict=string&pincode=string`
- **Purpose**: Get villages
- **Auth Required**: No
- **Query Params**: `subDistrict`, `pincode` (both optional)
- **Response (Success 200)**:
```json
["Village 1", "Village 2"]
```

### GET `/api/pincodes?village=string&district=string&subDistrict=string`
- **Purpose**: Get pincodes
- **Auth Required**: No
- **Query Params**: `village`, `district`, `subDistrict` (all optional)
- **Response (Success 200)**:
```json
["700001", "700002", "700003"]
```

### GET `/api/pincodes/search?country=string&search=string&page=number&limit=number`
- **Purpose**: Search pincodes with pagination
- **Auth Required**: No
- **Query Params**: 
  - `country` (required)
  - `search` (optional, max 100 chars)
  - `page` (optional, default 1)
  - `limit` (optional, default 25, max 100)
- **Response (Success 200)**:
```json
{
  "pincodes": ["700001", "700002"],
  "total": 250,
  "hasMore": true
}
```

### GET `/api/address-by-pincode?pincode=string`
- **Purpose**: Get address details by pincode
- **Auth Required**: No
- **Query Params**: `pincode` (required, 6 digits)
- **Response (Success 200)**:
```json
{
  "country": "India",
  "state": "West Bengal",
  "district": "Kolkata",
  "subDistricts": ["Ballygunge", "Park Street"],
  "villages": ["Village 1", "Village 2"]
}
```

## Map Data APIs

### GET `/api/map/countries`
- **Purpose**: Get Namahatta counts by country
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "country": "India",
    "count": 150
  }
]
```

### GET `/api/map/states`
- **Purpose**: Get Namahatta counts by state
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "state": "West Bengal",
    "country": "India",
    "count": 50
  }
]
```

### GET `/api/map/districts`
- **Purpose**: Get Namahatta counts by district
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "district": "Kolkata",
    "state": "West Bengal",
    "country": "India",
    "count": 25
  }
]
```

### GET `/api/map/sub-districts`
- **Purpose**: Get Namahatta counts by sub-district
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "subDistrict": "Ballygunge",
    "district": "Kolkata",
    "state": "West Bengal",
    "country": "India",
    "count": 10
  }
]
```

### GET `/api/map/villages`
- **Purpose**: Get Namahatta counts by village
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "village": "Village 1",
    "subDistrict": "Ballygunge",
    "district": "Kolkata",
    "state": "West Bengal",
    "country": "India",
    "count": 5
  }
]
```

## Dashboard APIs

### GET `/api/dashboard`
- **Purpose**: Get dashboard summary statistics
- **Auth Required**: Yes
- **Response (Success 200)**:
```json
{
  "totalDevotees": 1000,
  "totalNamahattas": 50,
  "recentUpdates": [
    {
      "namahattaId": 1,
      "namahattaName": "Sample Namahatta",
      "programType": "Weekly Meeting",
      "date": "2025-01-15",
      "attendance": 25
    }
  ]
}
```

### GET `/api/status-distribution`
- **Purpose**: Get devotional status distribution
- **Auth Required**: Yes
- **Response (Success 200)**:
```json
[
  {
    "statusName": "Sri Guru Charan Ashray",
    "count": 500,
    "percentage": 50.0
  }
]
```

## Hierarchy APIs

### GET `/api/hierarchy`
- **Purpose**: Get top-level hierarchy
- **Auth Required**: Yes
- **Response (Success 200)**:
```json
{
  "founder": [
    {
      "id": 1,
      "name": "His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
      "role": "FOUNDER"
    }
  ],
  "gbc": [],
  "regionalDirectors": [],
  "coRegionalDirectors": []
}
```

### GET `/api/hierarchy/:level`
- **Purpose**: Get leaders by hierarchy level
- **Auth Required**: No
- **Path Params**: `level` (DISTRICT_SUPERVISOR, MALA_SENAPOTI, etc.)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "name": "Leader Name",
    "role": "DISTRICT_SUPERVISOR",
    "reportingTo": null,
    "location": {
      "country": "India",
      "state": "West Bengal",
      "district": "Kolkata"
    }
  }
]
```

## Devotees APIs

### GET `/api/devotees?page=number&size=number&search=string&country=string&state=string&district=string&statusId=string&sortBy=string&sortOrder=string`
- **Purpose**: Get paginated devotees list with filters
- **Auth Required**: Yes (with district filtering for DISTRICT_SUPERVISOR)
- **Query Params**: All optional with defaults
- **Response (Success 200)**:
```json
{
  "data": [
    {
      "id": 1,
      "legalName": "John Doe",
      "name": "Bhakta John",
      "email": "john@email.com",
      "phone": "1234567890",
      "devotionalStatusId": 1,
      "devotionalStatusName": "Sri Guru Charan Ashray",
      "namahattaId": 1,
      "presentAddress": {
        "country": "India",
        "state": "West Bengal",
        "district": "Kolkata",
        "landmark": "Near Temple"
      }
    }
  ],
  "total": 100
}
```

### GET `/api/devotees/:id`
- **Purpose**: Get single devotee details
- **Auth Required**: Yes
- **Path Params**: `id` (number)
- **Response (Success 200)**:
```json
{
  "id": 1,
  "legalName": "John Doe",
  "name": "Bhakta John",
  "dob": "1990-01-15",
  "email": "john@email.com",
  "phone": "1234567890",
  "fatherName": "Father Name",
  "motherName": "Mother Name",
  "gender": "MALE",
  "bloodGroup": "O+",
  "maritalStatus": "MARRIED",
  "devotionalStatusId": 1,
  "devotionalStatusName": "Sri Guru Charan Ashray",
  "namahattaId": 1,
  "education": "Graduate",
  "occupation": "Engineer",
  "devotionalCourses": [
    {
      "name": "Course Name",
      "date": "2024-01-01",
      "institute": "Institute Name"
    }
  ],
  "additionalComments": "Comments",
  "presentAddress": {
    "country": "India",
    "state": "West Bengal",
    "district": "Kolkata",
    "subDistrict": "Ballygunge",
    "village": "Village 1",
    "postalCode": "700019",
    "landmark": "Near Temple"
  },
  "permanentAddress": {
    "country": "India",
    "state": "Odisha",
    "district": "Khorda",
    "landmark": "Village Home"
  }
}
```

### POST `/api/devotees`
- **Purpose**: Create new devotee
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Rate Limited**: Yes (10 requests per minute)
- **Request**:
```json
{
  "legalName": "John Doe",
  "name": "Bhakta John",
  "dob": "1990-01-15",
  "email": "john@email.com",
  "phone": "1234567890",
  "fatherName": "Father Name",
  "motherName": "Mother Name",
  "gender": "MALE",
  "bloodGroup": "O+",
  "maritalStatus": "MARRIED",
  "devotionalStatusId": 1,
  "namahattaId": 1,
  "harinamInitiationGurudevId": 1,
  "pancharatrikInitiationGurudevId": 1,
  "initiatedName": "Initiated Name",
  "harinamDate": "2020-01-01",
  "pancharatrikDate": "2021-01-01",
  "education": "Graduate",
  "occupation": "Engineer",
  "devotionalCourses": [
    {
      "name": "Course Name",
      "date": "2024-01-01",
      "institute": "Institute Name"
    }
  ],
  "additionalComments": "Comments",
  "shraddhakutirId": 1,
  "presentAddress": {
    "country": "India",
    "state": "West Bengal",
    "district": "Kolkata",
    "subDistrict": "Ballygunge",
    "village": "Village 1",
    "postalCode": "700019",
    "landmark": "Near Temple"
  },
  "permanentAddress": {
    "country": "India",
    "state": "Odisha",
    "district": "Khorda",
    "landmark": "Village Home"
  }
}
```
- **Response (Success 201)**: Same as GET devotee response

### POST `/api/devotees/:namahattaId`
- **Purpose**: Create devotee for specific Namahatta
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Rate Limited**: Yes
- **Path Params**: `namahattaId` (number)
- **Request**: Same as POST `/api/devotees`
- **Response (Success 201)**: Same as GET devotee response

### PUT `/api/devotees/:id`
- **Purpose**: Update devotee
- **Auth Required**: Yes (ADMIN, OFFICE, DISTRICT_SUPERVISOR)
- **Rate Limited**: Yes
- **Path Params**: `id` (number)
- **Request**: Partial devotee object (same fields as POST, all optional)
- **Response (Success 200)**: Updated devotee object

### POST `/api/devotees/:id/upgrade-status`
- **Purpose**: Upgrade devotee's devotional status
- **Auth Required**: Yes (ADMIN, OFFICE, DISTRICT_SUPERVISOR)
- **Path Params**: `id` (number)
- **Request**:
```json
{
  "newStatusId": number,
  "notes": "string (optional)",
  "allowedDistricts": ["string (for DISTRICT_SUPERVISOR)"]
}
```
- **Response (Success 200)**:
```json
{
  "message": "Status updated successfully"
}
```

### GET `/api/devotees/:id/status-history`
- **Purpose**: Get devotee's status history
- **Auth Required**: Yes
- **Path Params**: `id` (number)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "devoteeId": 1,
    "previousStatus": "Previous Status",
    "newStatus": "New Status",
    "updatedAt": "2025-01-15T10:00:00Z",
    "comment": "Upgrade notes"
  }
]
```

### GET `/api/devotees/:id/addresses`
- **Purpose**: Get devotee's addresses
- **Auth Required**: Yes
- **Path Params**: `id` (number)
- **Response (Success 200)**:
```json
{
  "present": {
    "country": "India",
    "state": "West Bengal",
    "district": "Kolkata",
    "landmark": "Near Temple"
  },
  "permanent": {
    "country": "India",
    "state": "Odisha",
    "district": "Khorda",
    "landmark": "Village Home"
  }
}
```

## Namahattas APIs

### GET `/api/namahattas?page=number&size=number&search=string&country=string&state=string&district=string&subDistrict=string&village=string&status=string&sortBy=string&sortOrder=string`
- **Purpose**: Get paginated Namahattas list with filters
- **Auth Required**: Yes (with district filtering for DISTRICT_SUPERVISOR)
- **Query Params**: All optional with defaults
- **Response (Success 200)**:
```json
{
  "data": [
    {
      "id": 1,
      "code": "NMH001",
      "name": "Sample Namahatta",
      "meetingDay": "Sunday",
      "meetingTime": "10:00 AM",
      "malaSenapoti": "Leader Name",
      "mahaChakraSenapoti": "Leader Name",
      "chakraSenapoti": "Leader Name",
      "upaChakraSenapoti": "Leader Name",
      "secretary": "Secretary Name",
      "districtSupervisorId": 1,
      "districtSupervisorName": "Supervisor Name",
      "status": "APPROVED",
      "devoteeCount": 25,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 50
}
```

### GET `/api/namahattas/pending?page=number&size=number`
- **Purpose**: Get pending approval Namahattas
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Query Params**: `page`, `size` (optional)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "code": "NMH001",
    "name": "Sample Namahatta",
    "status": "PENDING_APPROVAL"
  }
]
```

### GET `/api/namahattas/:id`
- **Purpose**: Get single Namahatta details
- **Auth Required**: Yes
- **Path Params**: `id` (number)
- **Response (Success 200)**: Single Namahatta object (same structure as array item above)

### GET `/api/namahattas/check-code/:code`
- **Purpose**: Check if Namahatta code exists
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Path Params**: `code` (string)
- **Response (Success 200)**:
```json
{
  "exists": true
}
```

### POST `/api/namahattas`
- **Purpose**: Create new Namahatta
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Rate Limited**: Yes
- **Request**:
```json
{
  "code": "NMH001",
  "name": "Sample Namahatta",
  "meetingDay": "Sunday",
  "meetingTime": "10:00 AM",
  "malaSenapoti": "Leader Name",
  "mahaChakraSenapoti": "Leader Name",
  "chakraSenapoti": "Leader Name",
  "upaChakraSenapoti": "Leader Name",
  "secretary": "Secretary Name",
  "districtSupervisorId": 1,
  "status": "PENDING_APPROVAL",
  "address": {
    "country": "India",
    "state": "West Bengal",
    "district": "Kolkata",
    "subDistrict": "Ballygunge",
    "village": "Village 1",
    "postalCode": "700019",
    "landmark": "Near Temple"
  }
}
```
- **Response (Success 201)**: Created Namahatta object

### PUT `/api/namahattas/:id`
- **Purpose**: Update Namahatta
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Rate Limited**: Yes
- **Path Params**: `id` (number)
- **Request**: Partial Namahatta object (same fields as POST, all optional)
- **Response (Success 200)**: Updated Namahatta object

### GET `/api/namahattas/:id/devotees?page=number&size=number&statusId=number`
- **Purpose**: Get devotees in specific Namahatta
- **Auth Required**: No
- **Path Params**: `id` (number)
- **Query Params**: `page`, `size`, `statusId` (all optional)
- **Response (Success 200)**:
```json
{
  "data": [
    {
      "id": 1,
      "legalName": "John Doe",
      "name": "Bhakta John",
      "devotionalStatusName": "Sri Guru Charan Ashray"
    }
  ],
  "total": 25
}
```

### POST `/api/namahattas/:id/approve`
- **Purpose**: Approve pending Namahatta
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Path Params**: `id` (number)
- **Request**: Empty body
- **Response (Success 200)**:
```json
{
  "message": "Namahatta approved successfully"
}
```

### POST `/api/namahattas/:id/reject`
- **Purpose**: Reject pending Namahatta
- **Auth Required**: Yes (ADMIN, OFFICE only)
- **Path Params**: `id` (number)
- **Request**:
```json
{
  "reason": "string (optional)"
}
```
- **Response (Success 200)**:
```json
{
  "message": "Namahatta rejected successfully"
}
```

### GET `/api/namahattas/:id/updates`
- **Purpose**: Get updates for specific Namahatta
- **Auth Required**: No
- **Path Params**: `id` (number)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "namahattaId": 1,
    "programType": "Weekly Meeting",
    "date": "2025-01-15",
    "attendance": 25,
    "prasadDistribution": 30,
    "nagarKirtan": 0,
    "bookDistribution": 5,
    "chanting": 0,
    "arati": 1,
    "bhagwatPath": 1,
    "imageUrls": ["url1.jpg", "url2.jpg"],
    "facebookLink": "https://facebook.com/post",
    "youtubeLink": "https://youtube.com/video",
    "specialAttraction": "Special event details",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### GET `/api/namahattas/:id/devotee-status-count`
- **Purpose**: Get devotee count by status for Namahatta
- **Auth Required**: No
- **Path Params**: `id` (number)
- **Response (Success 200)**:
```json
{
  "Sri Guru Charan Ashray": 20,
  "Harinama Initiation": 5,
  "Pancharatrik Initiation": 0
}
```

### GET `/api/namahattas/:id/status-history?page=number&size=number`
- **Purpose**: Get status history for Namahatta
- **Auth Required**: No
- **Path Params**: `id` (number)
- **Query Params**: `page`, `size` (optional)
- **Response (Success 200)**:
```json
{
  "data": [
    {
      "id": 1,
      "devoteeId": 1,
      "previousStatus": "Previous Status",
      "newStatus": "New Status",
      "updatedAt": "2025-01-15T10:00:00Z",
      "comment": "Status upgrade"
    }
  ],
  "total": 10
}
```

## Statuses APIs

### GET `/api/statuses`
- **Purpose**: Get all devotional statuses
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "name": "Sri Guru Charan Ashray",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### POST `/api/statuses`
- **Purpose**: Create new devotional status
- **Auth Required**: No
- **Request**:
```json
{
  "name": "New Status Name"
}
```
- **Response (Success 201)**: Created status object

### POST `/api/statuses/:id/rename`
- **Purpose**: Rename devotional status
- **Auth Required**: No
- **Path Params**: `id` (number)
- **Request**:
```json
{
  "newName": "Updated Status Name"
}
```
- **Response (Success 200)**:
```json
{
  "message": "Status renamed successfully"
}
```

## Gurudevs APIs

### GET `/api/gurudevs`
- **Purpose**: Get all Gurudevs
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "name": "His Holiness Example Swami",
    "title": "HH",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### POST `/api/gurudevs`
- **Purpose**: Create new Gurudev
- **Auth Required**: No
- **Request**:
```json
{
  "name": "His Holiness New Swami",
  "title": "HH"
}
```
- **Response (Success 201)**: Created Gurudev object

## Shraddhakutirs APIs

### GET `/api/shraddhakutirs?district=string`
- **Purpose**: Get Shraddhakutirs, optionally filtered by district
- **Auth Required**: No
- **Query Params**: `district` (optional)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "name": "Sample Shraddhakutir",
    "districtCode": "KOL",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### POST `/api/shraddhakutirs`
- **Purpose**: Create new Shraddhakutir
- **Auth Required**: No
- **Request**:
```json
{
  "name": "New Shraddhakutir",
  "districtCode": "KOL"
}
```
- **Response (Success 201)**: Created Shraddhakutir object

## Updates APIs

### GET `/api/updates/all`
- **Purpose**: Get all updates from all Namahattas
- **Auth Required**: No
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "namahattaId": 1,
    "namahattaName": "Sample Namahatta",
    "programType": "Weekly Meeting",
    "date": "2025-01-15",
    "attendance": 25,
    "prasadDistribution": 30,
    "nagarKirtan": 0,
    "bookDistribution": 5,
    "chanting": 0,
    "arati": 1,
    "bhagwatPath": 1,
    "imageUrls": ["url1.jpg"],
    "facebookLink": "https://facebook.com/post",
    "youtubeLink": "https://youtube.com/video",
    "specialAttraction": "Special event",
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### POST `/api/updates`
- **Purpose**: Create new Namahatta update
- **Auth Required**: No
- **Request**:
```json
{
  "namahattaId": 1,
  "programType": "Weekly Meeting",
  "date": "2025-01-15",
  "attendance": 25,
  "prasadDistribution": 30,
  "nagarKirtan": 0,
  "bookDistribution": 5,
  "chanting": 0,
  "arati": 1,
  "bhagwatPath": 1,
  "imageUrls": ["url1.jpg", "url2.jpg"],
  "facebookLink": "https://facebook.com/post",
  "youtubeLink": "https://youtube.com/video",
  "specialAttraction": "Special event details"
}
```
- **Response (Success 201)**: Created update object

## Admin APIs (`/api/admin/`)

### POST `/api/admin/register-supervisor`
- **Purpose**: Register new District Supervisor
- **Auth Required**: Yes (ADMIN only)
- **Request**:
```json
{
  "username": "supervisor1",
  "fullName": "Supervisor Full Name",
  "email": "supervisor@email.com",
  "password": "SecurePassword123!",
  "districts": ["KOL", "HOW"]
}
```
- **Response (Success 201)**:
```json
{
  "message": "District supervisor created successfully",
  "supervisor": {
    "id": 1,
    "username": "supervisor1",
    "fullName": "Supervisor Full Name",
    "email": "supervisor@email.com",
    "districts": ["KOL", "HOW"]
  }
}
```

### GET `/api/admin/users`
- **Purpose**: Get all users
- **Auth Required**: Yes (ADMIN only)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "fullName": "Admin User",
    "email": "admin@email.com",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

### GET `/api/admin/available-districts`
- **Purpose**: Get available districts for assignment
- **Auth Required**: Yes (ADMIN only)
- **Response (Success 200)**:
```json
[
  {
    "code": "KOL",
    "name": "Kolkata"
  }
]
```

### PUT `/api/admin/users/:id`
- **Purpose**: Update user
- **Auth Required**: Yes (ADMIN only)
- **Path Params**: `id` (number)
- **Request**:
```json
{
  "fullName": "Updated Full Name",
  "email": "updated@email.com",
  "password": "NewPassword123! (optional)"
}
```
- **Response (Success 200)**:
```json
{
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "fullName": "Updated Full Name",
    "email": "updated@email.com"
  }
}
```

### DELETE `/api/admin/users/:id`
- **Purpose**: Deactivate user
- **Auth Required**: Yes (ADMIN only)
- **Path Params**: `id` (number)
- **Request**: Empty body
- **Response (Success 200)**:
```json
{
  "message": "User deactivated successfully"
}
```

## District Supervisor APIs

### GET `/api/district-supervisors?district=string`
- **Purpose**: Get district supervisors for a district
- **Auth Required**: Yes
- **Query Params**: `district` (required)
- **Response (Success 200)**:
```json
[
  {
    "id": 1,
    "username": "supervisor1",
    "fullName": "Supervisor Name",
    "email": "supervisor@email.com"
  }
]
```

## User Profile APIs

### GET `/api/user/address-defaults`
- **Purpose**: Get user's address defaults (for District Supervisors)
- **Auth Required**: Yes
- **Response (Success 200)**:
```json
{
  "country": "India",
  "state": "West Bengal",
  "district": "Kolkata",
  "readonly": ["country", "state", "district"]
}
```

## Development APIs (Development Only)

### GET `/api/dev/users`
- **Purpose**: Get development user info
- **Auth Required**: No (development only)
- **Response (Success 200)**:
```json
{
  "admin": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN",
    "isActive": true,
    "passwordHashLength": 60
  },
  "office1": null,
  "supervisor1": null
}
```

### GET `/api/auth/dev/status`
- **Purpose**: Get authentication status in development
- **Auth Required**: No (development only)
- **Response (Success 200)**:
```json
{
  "authEnabled": "true",
  "environment": "development",
  "devMode": false
}
```

### POST `/api/auth/dev/toggle`
- **Purpose**: Toggle authentication in development
- **Auth Required**: No (development only)
- **Request**:
```json
{
  "enabled": true
}
```
- **Response (Success 200)**:
```json
{
  "authEnabled": "true",
  "message": "Authentication enabled (restart required for full effect)"
}
```

## Error Response Format

All APIs use consistent error response format:
```json
{
  "error": "Error message",
  "message": "Detailed error message (sometimes)",
  "details": "Validation errors array (for validation failures)"
}
```

## Rate Limiting

- **Login API**: 5 attempts per 15 minutes per IP
- **General APIs**: 100 requests per 15 minutes per IP
- **Modification APIs** (POST/PUT/DELETE): 10 requests per minute per IP

## Authentication

- **Method**: JWT tokens stored in HTTP-only cookies
- **Session Duration**: 1 hour
- **Single Login**: Only one active session per user
- **Token Blacklisting**: Logout invalidates tokens immediately

This completes the comprehensive API documentation for your Namahatta Management System backend.