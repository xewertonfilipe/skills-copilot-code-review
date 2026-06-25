# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities
- View active announcements in the homepage banner
- Manage announcements (create, edit, delete) for signed-in users

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity                                             |
| GET    | `/announcements`                                                  | Get currently active announcements                                  |
| GET    | `/announcements/manage?teacher_username=principal`               | Get all announcements for management (authenticated)                |
| POST   | `/announcements?teacher_username=principal`                      | Create announcement (authenticated)                                 |
| PUT    | `/announcements/{id}?teacher_username=principal`                 | Update announcement (authenticated)                                 |
| DELETE | `/announcements/{id}?teacher_username=principal`                 | Delete announcement (authenticated)                                 |

Announcement management endpoints require:
- `Authorization: Bearer <session_token>` header from `/auth/login`
- `teacher_username` query param matching the authenticated session

### Announcements Rules

- `expires_date` is required and must be in `YYYY-MM-DD` format.
- `start_date` is optional and must be in `YYYY-MM-DD` format when provided.
- `start_date` cannot be later than `expires_date`.
- Only signed-in users can manage announcements.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
