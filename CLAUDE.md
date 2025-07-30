# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

One Finance is a comprehensive FIRE (Financial Independence Retire Early) tracking application built with a simple but powerful tech stack. It combines a Node.js/Express backend with a vanilla HTML/CSS/JavaScript frontend to provide complete financial management capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Start the full application (backend + frontend)
npm start

# Development mode with auto-reload
npm run dev

# Client-only development (requires backend running separately)
npm run client
```

## Architecture & Structure

This is a **full-stack web application** with:
- **Backend**: Node.js with Express REST API
- **Database**: SQLite (file-based, zero configuration)
- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Charts**: Chart.js for data visualizations

### Backend Structure
- `server.js` - Express server entry point
- `backend/database.js` - SQLite database setup and helpers
- `backend/routes/` - API route handlers (auth, accounts, transactions, etc.)
- `backend/middleware/` - Authentication middleware
- `finance.db` - SQLite database file (created automatically)

### Frontend Structure
- `index.html` - SPA with authentication and navigation
- `assets/css/style.css` - Complete styling with CSS variables and glass morphism
- `assets/js/main.js` - Core app logic, authentication, navigation
- `assets/js/dashboard.js` - Dashboard with FIRE metrics and net worth tracking
- `assets/js/transactions.js` - Transaction management and CSV import
- `assets/js/analytics.js` - Charts and FIRE projections
- `assets/js/goals.js` - Financial goal tracking
- `assets/js/settings.js` - Account management and FIRE configuration

## Key Features

### Financial Tracking
- **Dashboard**: Net worth, percentile ranking, savings rate, FIRE progress
- **Transactions**: Full CRUD with filtering, sorting, and CSV import
- **Accounts**: Multiple account types (checking, savings, investment, credit, loans)
- **Categories**: Customizable transaction categorization

### FIRE-Specific Features
- **FIRE Calculator**: Years to FI, additional savings needed, scenario analysis
- **Analytics**: Spending breakdown, net worth progression, projection charts
- **Goals**: Visual progress tracking for financial milestones
- **Percentile Ranking**: Age-based net worth comparisons

### Technical Features
- **Authentication**: Secure user accounts with JWT
- **CSV Import**: Parse and validate transaction imports
- **Responsive Design**: Works on desktop and mobile
- **Real-time Charts**: Interactive visualizations with Chart.js

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Core Data
- `GET /api/dashboard` - Dashboard summary with FIRE metrics
- `GET /api/accounts` - User accounts
- `POST /api/accounts` - Create account
- `GET /api/transactions` - Paginated transactions with filtering
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/import` - CSV import
- `GET /api/categories` - Transaction categories
- `GET /api/goals` - Financial goals

### Analytics
- `GET /api/analytics/spending` - Category spending breakdown
- `GET /api/analytics/networth` - Net worth over time
- `GET /api/analytics/fire` - FIRE projections and scenarios
- `PUT /api/analytics/fire-settings` - Update FIRE parameters

## Database Schema

Key tables:
- `users` - User accounts with birth year for percentile calculations
- `accounts` - Financial accounts with balances and interest rates
- `transactions` - All financial transactions with categories
- `categories` - Customizable transaction categories
- `goals` - Financial goals with progress tracking
- `fire_settings` - FIRE calculation parameters per user

## Development Guidelines

- **Backend**: RESTful API design with proper error handling and input validation
- **Frontend**: Vanilla JavaScript with modular organization, no build process required
- **Security**: JWT authentication, bcrypt password hashing, input sanitization
- **Database**: SQLite with prepared statements to prevent SQL injection
- **Styling**: CSS custom properties for theming, glass morphism effects
- **Charts**: Chart.js with custom styling to match the dark theme
- **CSV Import**: Robust parsing with error reporting and data validation

## Testing the Application

1. Run `npm install` to install dependencies
2. Start with `npm start` - this creates the database automatically
3. Navigate to `http://localhost:3000`
4. Create an account and explore the features
5. Import sample CSV data to see the full functionality

The application is designed to work immediately after npm install with zero configuration required.