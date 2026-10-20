# Jo's Rural Cars — Master Application Specification & System Blueprint

> **Complete system architecture, business logic, visual design tokens, database schemas, and AI application builder prompt for Jo's Rural Cars.**

---

## 1. Executive Business Profile

| Property | Details |
| :--- | :--- |
| **Brand Name** | **Jo's Rural Cars** (Airport Transfers & Chauffeur Services) |
| **Industry / Niche** | Executive Chauffeur & Premium Airport Transfers |
| **Geographic Hub** | The Cotswolds, Gloucestershire (Stroud, Cirencester, Cheltenham, Tetbury, Bath, Oxford) |
| **Service Coverage** | Major UK Airports: London Heathrow (LHR), London Gatwick (LGW), London Stansted (STN), London Luton (LTN), Birmingham Airport (BHX) |
| **24/7 Operations Line** | `01453 888 999` (International: `+44 1453 888999`) |
| **Dispatch Desk Email** | `dispatch@josruralcars.co.uk` |
| **Core Value Proposition** | Guaranteed fixed pricing (no surge fees), 60 minutes free airport wait time, real-time flight telemetry monitoring, vetted licensed chauffeurs, executive Mercedes-Benz fleet, and luxury meet-and-greet arrival services. |

---

## 2. Technical Stack & Infrastructure

- **Frontend Core**: Vanilla HTML5, CSS3 with Custom Properties (CSS variables), Modular Modern JavaScript (ES Modules).
- **Build System**: Vite 6.x (`npm run dev` on port `5173`).
- **Production Server**: Node.js static streaming server (`server.js`).
- **Database & Authentication**: Supabase (PostgreSQL with Row Level Security, Auth service, Realtime event streaming).
- **External OAuth**: Google Cloud Identity OAuth 2.0.

### Environment & Cloud Credentials

```env
# Supabase Cloud Project Configuration
VITE_SUPABASE_URL=https://thwamlzdialhwwsyqiyd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_1kclmq-EVFPWTW_7lh9qIA_vOvECE_T

NEXT_PUBLIC_SUPABASE_URL=https://thwamlzdialhwwsyqiyd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_1kclmq-EVFPWTW_7lh9qIA_vOvECE_T

# Google OAuth 2.0 Web Client
VITE_GOOGLE_CLIENT_ID=881921601418-lkphfap75b3tihgq29mjqcqib7kq7ij2.apps.googleusercontent.com
```

---

## 3. Brand Identity & Design System

The visual language follows a **Bespoke Light Golden & Royal Navy Luxury Aesthetic** inspired by British automotive heritage (Rolls-Royce, Bentley, Maybach).

### Color Palette Tokens

```css
:root {
  /* Signature Brand Gold (Sampled directly from vehicle crest) */
  --color-gold: #deb13b;
  --color-gold-hover: #e5b942;
  --color-gold-dark: #966c0e;
  --color-gold-light: #f6d87e;
  --color-gold-glow: rgba(222, 177, 59, 0.35);
  --color-gold-tint: rgba(222, 177, 59, 0.12);

  /* Primary Brand Accents */
  --color-primary: #c99622;
  --color-primary-dark: #ab7d15;
  --color-primary-light: #fcf7ec;
  
  /* Midnight Navy Contrasts */
  --color-navy: #0b132b;
  --color-navy-dark: #070d1e;
  --color-navy-light: #1c2541;
  
  /* Status Colors */
  --color-emerald: #10b981;
  --color-danger: #ef4444;

  /* Typography Colors */
  --color-text-main: #0f172a;
  --color-text-muted: #64748b;
  --color-text-light: #94a3b8;
  
  /* Light Golden Background Combination */
  --color-bg-page: #fbf8f1;       /* Warm luminous champagne silk */
  --color-bg-subtle: #f5ede0;     /* Light golden champagne section background */
  --color-bg-card: #ffffff;       /* Crisp warm pearl ivory */
  --color-bg-card-alt: #fdfbf6;
  --color-border: #ebdcc3;        /* Warm golden hairline border */
  --color-border-hover: #deb13b;
  --color-border-gold: rgba(222, 177, 59, 0.32);

  /* Gradients */
  --gradient-gold: linear-gradient(135deg, #deb13b 0%, #f6d87e 50%, #c4962c 100%);
  --gradient-gold-hover: linear-gradient(135deg, #e5b942 0%, #fae08f 50%, #d1a338 100%);
  --gradient-gold-subtle: linear-gradient(135deg, #faf4e6 0%, #f5ecda 100%);

  /* Typography */
  --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-heading: 'Outfit', sans-serif;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(180, 140, 50, 0.05);
  --shadow-md: 0 4px 8px -1px rgba(180, 140, 50, 0.08);
  --shadow-lg: 0 10px 20px -3px rgba(180, 140, 50, 0.10);
  --shadow-gold: 0 4px 18px rgba(218, 165, 32, 0.35);
}
```

---

## 4. User Roles & Access Control

1. **Guest / Public Visitor**:
   - Calculate rates between UK postcodes/airports.
   - View fleet specs, pricing tiers, and terminal guidelines.
   - Submit booking inquiries and sign up.
2. **Passenger Client (Authenticated)**:
   - Access **Customer Dashboard** (`#dashboard`).
   - Real-time journey telemetry and active driver radar.
   - Review past transfer history, tax receipts, and VAT invoices.
   - Amend flight numbers or special requirements.
   - Dedicated **Log Out** button located in the left sidebar.
3. **Super Administrator / Dispatcher**:
   - Access **Dispatch Control Center** (`#admin`).
   - Default master account: `admin@josruralcars.co.uk` (Name: *Marcus Vance*, Role: *Super Dispatcher*).
   - Control live fleet dispatches, driver allocations, and flight statuses.
   - Overwrite rates, system policies, and customer database.
   - Dedicated **Log Out** button in the admin sidebar footer.

---

## 5. End-to-End Customer Booking Engine

### Step 1: Journey Route & Schedule
- **Pickup Address**: Autocomplete postcodes, towns (Stroud, Cirencester, Tetbury, Bath, Cheltenham, Oxford).
- **Drop-off Destination**: Heathrow (Terminals 2, 3, 4, 5), Gatwick (North/South), Stansted, Luton, Birmingham.
- **Date & Time Picker**: 24/7 calendar selector.
- **Passenger & Luggage Counts**: Used to filter compatible vehicles.

### Step 2: Vehicle Selection

| Vehicle Model | Category | Capacity | Luggage | Base Fare | Key Highlights |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Mercedes-Benz E-Class Saloon** | Executive Sedan | 3 Pax | 2 Large | £40+ | Leather interior, climate control, silent cabin |
| **Mercedes-Benz S-Class LWB** | Business Class | 3 Pax | 2 Large | £68+ | Extended legroom, onboard WiFi, bottled water, flagship luxury |
| **Mercedes-Benz E-Class Estate** | Executive Estate | 4 Pax | 4 Large | £48+ | Extra boot capacity, ideal for family luggage & skis |
| **Mercedes-Benz V-Class XLWB** | Luxury MPV | 8 Pax | 8 Large | £85+ | Conference seating, 8 suitcases, USB chargers |

### Step 3: Passenger & Flight Details
- Passenger full name, contact mobile (`+44`), and notification email.
- Commercial Flight Number (e.g., `BA1472`, `VS003`, `EK005`) enabling automatic flight tracking.
- Special Requests: Meet & greet name board, forward-facing child safety seats, silent journey mode.

### Step 4: Transparent Fare Review & Payment
- Fixed fare calculation: `Base Fare + Airport Terminal Fee (£7.00) = Total Fare`.
- Instant confirmation booking reference (e.g., `#JR-7921`).
- Confirmation voucher and dispatch allocation to nearby chauffeur.

---

## 6. Real-Time Tracking & Telemetry System

The application incorporates an interactive SVG vector tracking map:
- **Depot Origin**: Chauffeur base station in Gloucestershire.
- **Pickup Beacon**: Pulsing green radar wave at passenger pickup point.
- **Motorway Corridor**: Dynamic dotted route line along M4/M25.
- **Airport Terminus**: Red arrival destination beacon.
- **Active Chauffeur Blip**: Real-time vehicle simulation showing assigned driver name and vehicle registration.

### Ride Status Lifecycle:
1. `Booking Confirmed` (Initial verification)
2. `Driver Assigned` (Chauffeur standby)
3. `En Route` (Vehicle approaching pickup location)
4. `Completed` (Terminal arrival)

---

## 7. Database Entity Schemas (Supabase / PostgreSQL)

### 1. `bookings` Table
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  ref_code TEXT UNIQUE NOT NULL,
  user_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  passengers INT DEFAULT 1,
  luggage INT DEFAULT 1,
  vehicle_name TEXT NOT NULL,
  vehicle_category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'Confirmed',     -- Confirmed, In Transit, Completed, Cancelled
  payment_status TEXT DEFAULT 'Paid',  -- Paid, Pending, Refunded
  assigned_driver TEXT,
  assigned_plate TEXT,
  flight_number TEXT,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `users` Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'customer',        -- customer, admin, driver
  tier TEXT DEFAULT 'Standard',        -- Standard, Corporate, Executive Super Admin
  location TEXT,
  notes TEXT,
  rides_count INT DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `fleet_cars` Table
```sql
CREATE TABLE fleet_cars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plate TEXT NOT NULL,
  category TEXT NOT NULL,
  passengers INT NOT NULL,
  luggage INT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  driver_name TEXT,
  status TEXT DEFAULT 'Available',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `payments` Table
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  method TEXT DEFAULT 'Card',
  status TEXT DEFAULT 'Completed',
  stripe_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 8. Complete System Prompt for AI Application Builders

You can copy and paste the prompt below into an LLM or agent to generate a mobile application (Flutter, React Native, Swift, Kotlin) or backend service replicating this system:

```text
You are an expert full-stack software architect building a mobile/web application for "Jo's Rural Cars", a luxury UK airport transfer and executive chauffeur service.

### Business & Design Identity:
- Name: Jo's Rural Cars (Airport Transfers)
- Coverage: The Cotswolds, Gloucestershire (Stroud, Cirencester, Bath, Cheltenham, Oxford) to all major UK airports (London Heathrow, Gatwick, Stansted, Luton, Birmingham).
- Visual Theme: Ultra-premium Light Golden & Midnight Navy palette.
  - Page Background: #fbf8f1 (champagne silk)
  - Alternating Sections: #f5ede0 (soft light golden champagne)
  - Cards: #ffffff with subtle #ebdcc3 warm golden hairline borders
  - Primary Brand Gold: #deb13b with metallic gradients linear-gradient(135deg, #deb13b, #f6d87e, #c4962c)
  - Navy Elements: #0b132b and #070d1e
  - Typography: Outfit (Headings) and Plus Jakarta Sans (Body)

### Key Functional Requirements:
1. Authentication:
   - Supabase Auth supporting Email/Password and Google OAuth.
   - Roles: 'customer' (client dashboard) and 'admin' (dispatch command center for Marcus Vance).
   - Only place the working "Log Out" action within the application sidebars.

2. 4-Step Booking Engine:
   - Step 1: Pickup, drop-off, date, time, passengers, luggage.
   - Step 2: Vehicle selection (Mercedes E-Class Saloon £40+, Mercedes S-Class LWB £68+, Mercedes E-Class Estate £48+, Mercedes V-Class MPV £85+).
   - Step 3: Passenger details, contact phone (+44), commercial flight number tracking, meet & greet toggle.
   - Step 4: Fare breakdown (£7 airport fee included), card checkout simulation, instant ref code (#JR-XXXX).

3. Client Dashboard:
   - Active journey tracker with 4-stage stepper (Confirmed -> Driver Assigned -> En Route -> Completed).
   - Real-time driver allocation blip with car plate and live flight status.
   - Booking history with search and filter tabs.
   - Downloadable VAT receipts and trip amendments.

4. Admin Dispatch Command Center:
   - KPI metrics: Confirmed Revenue (£), Total Bookings, Pending Action, Active Chauffeurs.
   - Dispatch table with manual assignment of vetted drivers (Sarah Jenkins, Arthur Pendelton, David Miller, Marcus Brody).
   - Route rate overrides (Heathrow £45, Gatwick £65, Luton £55, Stansted £60, Birmingham £75).
   - Customer directory and system radar toggle controls.

5. Data Persistence:
   - Connect to Supabase tables: bookings, users, fleet_cars, payments.
   - Fall back to local persistent storage when offline.
```
