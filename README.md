# 🍔 HIVAGO — On-Demand Food Delivery Platform

**HIVAGO** is a modern, high-performance, full-featured hyper-local food delivery web application built with React 18, Vite, TypeScript, and TailwindCSS.

---

## 🚀 Features Overview

### 🏬 1. Restaurant Discovery & Catalog
* **Distance-Aware Spatial Listing**: Real-time distance computation between user coordinates and restaurant locations using the **Haversine formula**, enforcing an optimized local delivery radius (e.g., 5 km).
* **Google Place Ratings & Reviews**: Integrated live Google ratings (`rating`), review counts (`userRatingCount`), and interactive Google Customer Review carousels.
* **Smart Filter & Search Overlay**: Instant fuzzy search across dish names, cuisines, and restaurant names with quick-result overlays.
* **Dietary & Lifestyle Tags**: One-tap toggles for **Pure Veg**, **Vegan-Friendly**, and **Jain Options**.
* **Comprehensive Sorting & Filtering**: Sort by *Relevance*, *Nearest Distance*, *Rating*, *Fastest Delivery*, or *Price (Low to High / High to Low)*.
* **Fulfillment Modes**: Filter by *Delivery*, *Pickup Available*, or *Both*.

### 🍽️ 2. Dynamic Menu & Customization
* **Rich Categorized Menus**: Organized dish navigation with category quick-scroll and dish image previews.
* **Item Customization & Add-Ons**: Item detail modal supporting mandatory/optional options, extra toppings, and custom instructions.
* **Cross-Restaurant Cart Guard**: Modal confirmation prompt preventing accidental mixing of items from different restaurants.

### 📍 3. Precise Location & Address Management
* **Automatic Geolocation**: Browser location detection with seamless fallback prompts and location permission guides.
* **Interactive Map Selector**: Integrated Google Maps (`@react-google-maps/api`) pin selector for setting precise delivery points.
* **Address Book**: Save and label custom locations (*Home*, *Work*, *Other*) with detailed landmarks and contact numbers.
* **Location Enforcement Modals**: UX safeguards ensuring valid location availability before browsing or checking out.

### 🛒 4. Cart, Discounts & Checkout Engine
* **Floating Cart & Drawer**: Persistent cart status indicator displaying item count, subtotal, and instant access to cart contents.
* **Promo Code & Coupon System**: Real-time coupon application with instant price adjustment and minimum order validation.
* **Flexible Payment Methods**: Support for Online Payment Gateway (UPI, Credit/Debit Cards, Net Banking) and Cash on Delivery (COD).
* **Itemized Price Breakdown**: Transparent calculation of item totals, delivery fees, taxes, and promotional discounts.

### 📦 5. Real-Time Order Tracking & Management
* **Live Order Updates**: Real-time order state updates powered by **Microsoft SignalR** WebSockets (*Order Placed ➔ Preparing ➔ Out for Delivery ➔ Delivered*).
* **Interactive Delivery Map**: Real-time tracking interface showing delivery driver location and destination route.
* **Order History**: Access past orders, re-order favorite meals in one click, and view itemized digital receipts.

### 🔐 6. Authentication & User Profile
* **JWT Authentication System**: Secure login & registration flow with automatic token storage, refresh interceptors, and protected routes.
* **User Profile Portal**: Personal details management, active orders tracker, address book manager, and favorite restaurants wishlist.

### 🎨 7. UI/UX & Frontend Architecture
* **Rich Animations**: Fluid entrance and layout transitions powered by **Framer Motion** and **GSAP**.
* **Skeleton Loaders**: Skeleton shimmer states during asynchronous data fetching for seamless loading feedback.
* **PWA Capability**: Progressive Web App install prompt integration (`PWAInstallOverlay`).
* **Toast Notifications**: Crisp feedback popups using `react-hot-toast`.
* **State Management**: Optimized server-state caching and invalidation using **TanStack React Query (v5)**.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 (Vite + TypeScript) |
| **Styling & UI** | TailwindCSS, Lucide Icons, Framer Motion, GSAP |
| **State & API Handling** | TanStack React Query v5, Axios |
| **Real-Time Communication** | Microsoft SignalR (`@microsoft/signalr`) |
| **Maps & Location** | `@react-google-maps/api`, Haversine Algorithm |
| **Notifications** | `react-hot-toast` |

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/adie253/hivago.git
   cd hivago
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=https://rally-staging-9ae8.up.railway.app
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for Production**
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```
src/
├── data/              # API services, repository layers, and mock data
├── domain/            # Domain models and business logic use cases
├── hooks/             # Custom React hooks (React Query integrations)
├── lib/               # Utility libraries (Axios instance, API root configs)
├── presentation/      # UI Layer
│   ├── components/    # Reusable UI components (Cards, Modals, Overlays)
│   ├── context/       # React Context providers (Filter, Location, Cart, Favorites)
│   └── pages/         # Application page components
├── types/             # TypeScript type interfaces
└── utils/             # Helper utilities (Distance calculations, image utilities)
```
