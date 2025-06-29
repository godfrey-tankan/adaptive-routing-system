Adaptive Routing System: Setup Guide
This guide will walk you through setting up the Adaptive Routing System project locally. The project consists of a Django (Python) backend and a React (TypeScript/Vite) frontend.

Prerequisites
Before you begin, ensure you have the following installed:

Git: For cloning the repository.

Python 3.8+: For the Django backend.

pip: Python package installer (usually comes with Python).

Node.js 18+ and npm 8+ (or Yarn): For the React frontend.

Docker and Docker Compose: Highly Recommended for easily setting up the PostgreSQL database with PostGIS. If you prefer not to use Docker, you will need to manually set up a PostgreSQL database with PostGIS extension enabled.

1. Clone the Repository
First, clone the project repository to your local machine:

git clone https://github.com/godfrey-tankan/adaptive-routing-system.git
cd adaptive-routing-system

2. Backend Setup (Django)
The backend is a Django application that handles API requests, database interactions, and integrates with external services (Google Maps, Gemini AI, OpenWeather).

2.1. Create a Python Virtual Environment
It's best practice to use a virtual environment to manage dependencies:

python -m venv venv
source venv/bin/activate # On Windows: .\venv\Scripts\activate

2.2. Install Backend Dependencies
Install all required Python packages from requirements.txt:

pip install -r requirements.txt

2.3. Database Setup (PostgreSQL with PostGIS)
This project uses PostgreSQL with the PostGIS extension for spatial data. Docker Compose provides the easiest way to get this running.

***Option 1***
Using Docker Compose (Recommended)
Create a docker-compose.yml file in the root of your project directory (alongside manage.py):

version: '3.8'

services:
  db:
    image: postgis/postgis:16-3.4 # Use a recent PostGIS image
    container_name: routing_db_container
    environment:
      POSTGRES_DB: routing_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_db_password # <--- CHANGE THIS TO A SECURE PASSWORD
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d routing_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  db_data:

IMPORTANT: Replace your_db_password with a strong, secure password.

Start the Database Container:

docker-compose up -d db

Wait a moment for the database to initialize and become ready. You can check its status with docker-compose ps.


***Option 2***
Manual PostgreSQL Setup (Alternative)
If you're not using Docker:

Install PostgreSQL (version 12+ recommended).

Install PostGIS extension for your PostgreSQL instance.

Create a database (e.g., routing_db) and a user with permissions to it.

2.4. Configure Environment Variables (.env)
Create a file named .env in the root of your project directory (where manage.py is located) and add the following, filling in your actual API keys and database credentials:

# .env file (in project root)

# Django Secret Key (IMPORTANT: Generate a strong, unique key for production)
SECRET_KEY=your_django_secret_key_here

# Django Debug Mode (Set to False in production)
DEBUG=True

# Environment (development or production)
ENVIRONMENT=development

# Database Configuration (for Docker Compose setup)
DB_NAME=routing_db
DB_USER=postgres
DB_PASSWORD=your_db_password # <--- MUST MATCH docker-compose.yml
DB_HOST=localhost
DB_PORT=5432

# API Keys (Replace with your actual keys)
Maps_API_KEY=your_google_maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Flag for location anonymization (Set to True in production for privacy)
ANONYMIZE_LOCATIONS=False

Note: For SECRET_KEY, you can generate a new one using Python:
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

2.5. Run Database Migrations
Apply the database migrations to create the necessary tables:

python manage.py migrate

2.6. Create a Superuser (Admin Account)
Create an admin account to access the Django admin panel:

python manage.py createsuperuser

Follow the prompts to set up your username, email, and password.

2.7. Start the Django Backend Server
Finally, start the Django development server:

python manage.py runserver

The backend should now be running at http://localhost:8000/.

3. Frontend Setup (React with Vite)
The frontend is a React application built with Vite, located in the frontend/ directory.

3.1. Navigate to the Frontend Directory
cd frontend/

3.2. Install Frontend Dependencies
Install Node.js packages using npm or Yarn:

npm install # or yarn install
3.3. Configure Frontend Environment Variables (.env)
Create a .env file in the frontend/ directory and add the backend URL:

# .env file (in frontend/ directory)
VITE_BACKEND_URL=http://localhost:8000

This variable is used by Axios to send requests to your Django backend.

3.4. Start the Frontend Development Server
npm run dev # or yarn dev

The frontend should now be running, typically at http://localhost:5173/ (Vite's default port), and automatically open in your browser.

4. Post-Setup Notes
API Keys: Ensure your Google Maps, Gemini, and OpenWeather API keys are properly enabled for the services required (Directions API, Places API, Gemini API, Weather API).

CORS: The CORS_ALLOWED_ORIGINS in core/settings.py is configured for local development. If deploying, adjust these to your production frontend URL.

Authentication: The system uses JWT for authentication. You will typically interact with /api/auth/register/ and /api/auth/login/ endpoints.

Database Admin: You can access the Django admin panel at http://localhost:8000/admin/ using the superuser credentials you created.

You are now ready to use the Adaptive Routing System!