Build: docker-compose -f docker-compose.prod.yml up -d --build

Run migrations: docker exec routing-web python manage.py migrate

Create superuser: docker exec -it routing-web python manage.py createsuperuser


creating postgres db locally:
-----

### **Step 1: Install PostgreSQL and PostGIS Locally**

The installation steps vary depending on your operating system.

#### **For macOS (using Homebrew - Recommended):**

1.  **Install Homebrew** (if you don't have it):
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
2.  **Install PostgreSQL and PostGIS:**
    ```bash
    brew install postgresql@16 postgis
    ```
    (Note: `postgresql@16` specifies version 16, adjust if you prefer a different version. PostGIS will be installed as an extension.)
3.  **Start PostgreSQL:**
    ```bash
    brew services start postgresql@16
    ```
4.  **Verify installation (optional):**
    ```bash
    psql -V
    ```

#### **For Ubuntu/Debian Linux:**

1.  **Update package lists:**
    ```bash
    sudo apt update
    ```
2.  **Install PostgreSQL and PostGIS:**
    ```bash
    sudo apt install postgresql postgresql-contrib postgis
    ```
3.  **Verify installation:**
    ```bash
    psql --version
    ```
4.  **PostgreSQL service usually starts automatically.** Check its status:
    ```bash
    sudo systemctl status postgresql
    ```

#### **For Windows (using PostgreSQL Installer):**

1.  **Download the PostgreSQL installer:** Go to the official PostgreSQL website: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2.  **Run the installer:** During installation, make sure to:
      * Select **PostGIS** as a component to install (it's usually an option).
      * Remember the **password** you set for the `postgres` user.
      * Note the **port number** (default is 5432).
3.  **Stack Builder (PostGIS part):** The installer might launch Stack Builder at the end. Use it to install PostGIS if you missed it or if it's not directly integrated.
4.  **Verify installation:** Open a command prompt and try:
    ```bash
    psql --version
    ```
    You might need to add PostgreSQL's `bin` directory to your system's PATH environment variable if `psql` is not found. (e.g., `C:\Program Files\PostgreSQL\16\bin`)

-----

### **Step 2: Create a PostgreSQL Database and User**

After installing PostgreSQL, you need to create a database and a user for your Django project.

1.  **Connect to PostgreSQL as the default `postgres` user:**

      * **Linux/macOS:**
        ```bash
        sudo -u postgres psql
        ```
        or just `psql -U postgres` if you've set up authentication differently.
      * **Windows:** Open the "SQL Shell (psql)" application from the PostgreSQL program group. It will prompt for server, database (`postgres`), port, username (`postgres`), and password.

2.  **Inside the `psql` prompt, create a database and a user for your project:**

    ```sql
    CREATE DATABASE routing_db;
    CREATE USER routing_user WITH PASSWORD 'your_secure_local_password';
    GRANT ALL PRIVILEGES ON DATABASE routing_db TO routing_user;
    ALTER USER routing_user WITH SUPERUSER;
    \q -- To exit psql
    ```

      * **Important**: Replace `routing_db` and `routing_user` with your preferred names if different, and replace `'your_secure_local_password'` with a strong password. You'll use these credentials in your Django settings.
      * We specifically named the database `routing_db` and user `routing_user` to match the default values in your `core/settings.py` and `.env` for consistency.

### **Step 3: Update Your Local `.env` File**

Ensure your local `.env` file reflects the correct PostgreSQL connection details.

```ini
# .env (in your project root)

ENVIRONMENT=development
SECRET_KEY='your-insecure-dev-secret-key-change-this-for-prod!'
DEBUG=1

# Database (for local PostgreSQL)
DB_NAME=routing_db       # Use the name you created
DB_USER=routing_user     # Use the user you created
DB_PASSWORD=your_secure_local_password # Use the password you set
DB_HOST=localhost        # Connect to your local PostgreSQL server
DB_PORT=5432             # Default PostgreSQL port

# API Keys (get these from Google Cloud Console and Google AI Studio)
Maps_API_KEY=your_Maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Security
ANONYMIZE_LOCATIONS=False
```

### **Step 4: Install Python Dependencies**

Make sure you've installed all your Python dependencies, especially `psycopg2-binary` for PostgreSQL connectivity.

```bash
pip install -r requirements.txt
```

### **Step 5: Run Django Migrations**

Now, with your local PostgreSQL database running and configured, you can apply your Django migrations.

1.  **Activate your virtual environment** (if not already active):
    ```bash
    source venv/bin/activate # macOS/Linux
    # venv\Scripts\activate # Windows
    ```
2.  **Make migrations** (Django generates files for table creation):
    ```bash
    python manage.py makemigrations
    ```
3.  **Apply migrations** (Django creates the tables in your local PostgreSQL database):
    ```bash
    python manage.py migrate
    ```

### **Step 6: Create a Superuser**

```bash
python manage.py createsuperuser
```

Follow the prompts to set up your admin user.

### **Step 7: Start the Development Server**

```bash
python manage.py runserver
```