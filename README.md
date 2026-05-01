# 🚀 Sai Shuru Nexus — Complete Website + Backend

## 📁 Project Structure

```
sai-shuru-nexus/
├── index.html          ← Main website (frontend)
├── admin.html          ← Advanced admin panel (connects to backend)
├── backend/
│   ├── server.js       ← Node.js + Express + SQLite backend
│   ├── package.json    ← Dependencies
│   ├── .env.example    ← Config template
│   └── ssn.db          ← SQLite database (auto-created on first run)
└── README.md
```

---

## ⚡ Quick Setup (5 Minutes)

### Step 1 — Install Node.js
Download from: https://nodejs.org (v18 or higher)

### Step 2 — Install Dependencies
```bash
cd backend
npm install
```

### Step 3 — Configure Environment
```bash
cp .env.example .env
# Open .env and set your values
```

### Step 4 — Start the Server
```bash
node server.js
```

You will see:
```
🚀 Sai Shuru Nexus Backend running at http://localhost:5000
📊 Admin Panel: http://localhost:5000/admin.html
🔑 Default login: admin / ssn2025
```

### Step 5 — Open in Browser
- **Website:**    http://localhost:5000/index.html
- **Admin Panel:** http://localhost:5000/admin.html

---

## 🔐 Default Admin Credentials

| Field    | Value     |
|----------|-----------|
| Username | `admin`   |
| Password | `ssn2025` |

> **⚠️ Change your password immediately after first login!**

---

## 📊 Admin Panel Features

### Dashboard
- Live order counts (Total, New, In Progress, Completed)
- Bar charts for orders by department and project type
- Recent orders table
- Activity log (all admin actions)

### Order Management
- View all orders with full details
- Search by name, phone, college, department
- Filter by status (New / In Progress / Completed / Cancelled)
- Update order status with one click
- Add private notes to each order
- WhatsApp quick-reply button per order
- View full order details in modal popup
- Delete individual orders or clear all
- Export all orders to CSV

### Project Topics
- Add new topics (name, department, type, description, tags)
- Show/Hide topics without deleting
- Remove topics
- Reset to default topics

### Services Editor
- Edit icon, title, description, tag for all 6 services
- Toggle services on/off
- Add custom services
- Remove services

### Testimonials
- Add student reviews (name, course, stars, text)
- Show/Hide reviews
- Remove reviews

### Site Settings
- Business name, tagline
- WhatsApp number, email
- Urgency message (shown in hero section)
- Email notification address for new orders

### Security
- Change admin password (with current password verification)
- JWT token authentication (expires in 12 hours)
- Bcrypt password hashing
- All admin routes protected

---

## 🗄️ Database (SQLite)

The database file `backend/ssn.db` is auto-created on first run.

### Tables
| Table           | Purpose                          |
|-----------------|----------------------------------|
| `admins`        | Admin login credentials          |
| `orders`        | Student project requests         |
| `projects`      | Project topics shown on site     |
| `testimonials`  | Student reviews                  |
| `services`      | Service cards                    |
| `settings`      | Site configuration               |
| `activity_log`  | Admin action history             |

---

## 🌐 API Endpoints

### Public (No Auth)
| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| POST   | `/api/orders`               | Submit order from website |
| GET    | `/api/public/projects`      | Get active topics         |
| GET    | `/api/public/testimonials`  | Get active reviews        |
| GET    | `/api/public/services`      | Get active services       |
| GET    | `/api/public/settings`      | Get site settings         |

### Admin (JWT Required)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/admin/login`              | Login → get JWT token    |
| GET    | `/api/admin/dashboard`          | Dashboard stats          |
| GET    | `/api/admin/orders`             | List orders (paginated)  |
| GET    | `/api/admin/orders/:id`         | Get single order         |
| PATCH  | `/api/admin/orders/:id`         | Update status/notes      |
| DELETE | `/api/admin/orders/:id`         | Delete order             |
| DELETE | `/api/admin/orders`             | Clear all orders         |
| GET    | `/api/admin/export/orders`      | Download CSV             |
| GET    | `/api/admin/projects`           | List all topics          |
| POST   | `/api/admin/projects`           | Add topic                |
| PATCH  | `/api/admin/projects/:id`       | Update topic             |
| DELETE | `/api/admin/projects/:id`       | Delete topic             |
| GET    | `/api/admin/testimonials`       | List reviews             |
| POST   | `/api/admin/testimonials`       | Add review               |
| PATCH  | `/api/admin/testimonials/:id`   | Update review            |
| DELETE | `/api/admin/testimonials/:id`   | Delete review            |
| GET    | `/api/admin/services`           | List services            |
| POST   | `/api/admin/services`           | Add service              |
| PATCH  | `/api/admin/services/:id`       | Update service           |
| DELETE | `/api/admin/services/:id`       | Delete service           |
| GET    | `/api/admin/settings`           | Get all settings         |
| PUT    | `/api/admin/settings`           | Save settings            |
| POST   | `/api/admin/change-password`    | Change password          |

---

## 📧 Email Notifications (Optional)

To receive email alerts when a student submits an order:

1. Enable 2-Factor Auth on your Gmail
2. Create an App Password: Google Account → Security → App Passwords
3. Set in `.env`:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```
4. In Admin Panel → Site Settings → set Notification Email

---

## 🚀 Deploy to Production

### Option A — Railway (Recommended, Free)
1. Push code to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Add environment variables from `.env`
5. Done! Railway gives you a live URL

### Option B — Render (Free)
1. Push to GitHub
2. Go to https://render.com
3. New Web Service → connect repo
4. Build command: `cd backend && npm install`
5. Start command: `node backend/server.js`

### Option C — VPS (DigitalOcean / Hostinger)
```bash
# On your VPS
git clone your-repo
cd backend
npm install
# Install PM2 for process management
npm install -g pm2
pm2 start server.js --name "ssn-backend"
pm2 startup  # auto-start on reboot
pm2 save
```

---

## 📱 Connecting Frontend to Live Backend

In `index.html` and `admin.html`, the API URL is set to `http://localhost:5000`.

When you deploy, update this line in `admin.html`:
```javascript
const API = 'https://your-deployed-url.railway.app/api';
```

And in `index.html` form submit function:
```javascript
// Change localhost:5000 to your live URL
await fetch('https://your-deployed-url.railway.app/api/orders', {...})
```

---

## 🔒 Security Checklist Before Going Live

- [ ] Change admin password from `ssn2025`
- [ ] Set a strong `JWT_SECRET` in `.env` (random 32+ character string)
- [ ] Set `FRONTEND_URL` to your actual domain (not `*`)
- [ ] Enable HTTPS on your server
- [ ] Set up email notifications for new orders
- [ ] Keep `ssn.db` file backed up regularly

---

## 💬 Support

**WhatsApp:** 8489298244  
**Email:** saishurunexus@gmail.com

---

*Built with ❤️ for Sai Shuru Nexus — Your Digital Growth Partner*
