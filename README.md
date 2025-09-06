# Modern Webmail Client

This is a comprehensive, single-page webmail client application built with a modern tech stack. It features a clean, responsive, and intuitive user interface designed for both desktop and mobile use.

This project is architected as a full-stack application with a React frontend and a Node.js backend, demonstrating a complete client-server model with JWT authentication.

![Webmail Client Screenshot](https://storage.googleapis.com/proud-booth-3333/webmail_screenshot.png)

## Features

- **Responsive Three-Pane Layout**: Adapts seamlessly from a full desktop view to a navigable single-pane layout on mobile devices.
- **JWT Authentication**: Secure login flow with persistent sessions using JSON Web Tokens.
- **Advanced Folder Management**:
  - Hierarchical, collapsible folder tree structure.
  - Create new top-level or nested folders.
  - Aggregated unread counts for parent folders.
- **Conversation Threading**: Emails are grouped by conversation for a clean, organized inbox.
- **Rich Email Interaction**:
  - Reply, Reply All, Forward, Mark as Spam, and Move conversations.
  - View the raw HTML source of any email.
- **High-Performance Email List**:
  - Debounced search by subject, participants, and full email body.
- **Rich Text Composer**:
  - Auto-save drafts to local storage.
  - Undo/Redo functionality.
  - File attachments with image previews.
  - Manageable rich text signature.
- **Polished User Experience**:
  - Light and Dark modes.
  - Modern skeleton loaders for a smooth perceived performance.
  - Accessible design with focus-trapped modals.
- **Secure by Design**:
  - All email content is sanitized with DOMPurify to prevent XSS attacks.

## Tech Stack

- **Frontend**:
  - React 19 & TypeScript
  - Tailwind CSS for styling
  - Zustand for efficient, modern state management
  - DOMPurify for security
- **Backend**:
  - Node.js & Express.js for the API server
  - JSON Web Tokens (JWT) for authentication
  - CORS for cross-origin resource sharing

## Local Development Setup

The application is split into a frontend client and a backend server. You will need to run both concurrently.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or a compatible package manager

### 1. Backend Server Setup

The backend server is responsible for authentication and serving the mail data.

```bash
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Start the server
node server.js

# The server will start on http://localhost:3001
```

### 2. Frontend Client Setup

The frontend is the React application that you interact with in the browser.

- **Running the Frontend**: Follow the instructions provided by your development environment to serve the root directory. The application's `index.html` and associated assets will be served, and it will automatically connect to the backend server running on `localhost:3001`.

### How to Use

- Once both the backend and frontend are running, open your browser to the frontend's address.
- You will be presented with a login screen.
- Use the following mock credentials to log in:
  - **Email**: `jane.doe@example.com`
  - **Password**: `password`

## Architectural Overview

The application follows a modern client-server architecture:

1.  **React Frontend**: A Single-Page Application (SPA) that handles all UI rendering and user interaction. It uses the Zustand state management library to manage global state and communicates with the backend via a REST API.
2.  **Node.js Backend**: A stateless Express server that provides a RESTful API. It manages user authentication (issuing JWTs) and serves all mail data. In this prototype, it serves mock data, but it is architected to be easily connected to a real database and live IMAP/SMTP servers.
3.  **Authentication Flow**:
    - The user logs in with credentials on the frontend.
    - The frontend sends these to the backend's `/api/login` endpoint.
    - The backend validates the credentials and, if successful, issues a signed JWT.
    - The frontend stores this token in `localStorage`.
    - For all subsequent API requests, the frontend sends the token in the `Authorization: Bearer <token>` header.
    - The backend uses middleware to verify the token on protected routes, ensuring the user is authenticated.
