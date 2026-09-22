# Kebab Gyros

A modern restaurant website for **Kebab Gyros Greek & Italian Eatery** in Nashville, Tennessee.

## Technology

* Next.js
* TypeScript
* CSS Modules
* Node.js
* MySQL

## Project Structure

```text
Kebab-gyros/
├── frontend/   # Next.js customer website and admin interface
├── backend/    # API, MySQL connection, and server logic
└── README.md
```

## Main Features

* Responsive restaurant website
* Interactive food menu
* Food gallery
* Business hours and location
* External SkyTab online-ordering integration
* Admin management for menu items, prices, images, and restaurant information

## Local Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Backend

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as the template and add the required MySQL credentials.

## Online Ordering

The website redirects customers to the restaurant’s existing SkyTab ordering system. It does not process orders or payments directly.

## Status

This project is currently under development.

## Contributors

* Frontend development and project coordination: Natenal Tsega
* Backend development: ADACloudTech development team
