# Hostel Allotment System - Backend

This repository contains the backend server for the Hostel Allotment System. It is a Node.js/Express application that provides a REST API and real-time WebSocket services to manage students, groups, and the live allotment process.

---

### Key Features

* **Secure Authentication:** Role-based access control (Student vs. Admin) using JSON Web Tokens (JWT).
* **Real-time Allotment:** Manages a timed, turn-based room selection process using Socket.IO.
* **Data Management:** Full CRUD (Create, Read, Update, Delete) operations for all major entities like students, rooms, and groups.
* **Admin Controls:** Dedicated API endpoints for administrators to manage the system (upload data, lock groups, start/cancel allotment).

---

### Tech Stack

* **Framework:** Node.js, Express.js
* **Database:** MongoDB with Mongoose ODM
* **Authentication:** JSON Web Tokens (JWT), bcrypt.js
* **Real-time:** Socket.IO
* **Deployment:** Render

---

### Getting Started

#### Prerequisites

* Node.js (v18 or later)
* MongoDB Atlas account

#### Setup and Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Abhi-1803-6/Hostel-Allotment-Backend.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd Hostel-Allotment-Backend
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Create a `.env` file in the root and add the following variables:
    ```
    MONGO_URI=your_mongodb_atlas_connection_string
    JWT_SECRET=your_super_secret_key
    ```
5.  Run the server:
    ```bash
    node server.js
    ```
The server will be running on `http://localhost:5000`.