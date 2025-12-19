# Homework

NX monorepo with a server and frontend application.

## Features

### Server

- SAX streaming XML parser for large files
- Composite key hashing (wnid::path) for uniqueness
- SQLite database with adjacency list tree structure
- REST API with lazy-loading support
- Cursor-based pagination
- Search endpoint with ancestor path reconstruction

### Frontend

- React application with hierarchical tree display
- shadcn/ui TreeView component
- Lazy-loading on node expansion
- Infinite scroll pagination
- Search with term highlighting
- Jotai atoms for state management

## Commands

### Server

- `npx nx parse server` - Parses the XML structure file and initializes the database
- `npx nx serve server` - Starts the development server on port 3000

### Frontend

- `npx nx serve frontend` - Starts the development server on port 8000

## Running Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Initialize the database:

   ```bash
   npx nx parse server
   ```

3. Start the server:

   ```bash
   npx nx serve server
   ```

4. In a separate terminal, start the frontend:
   ```bash
   npx nx serve frontend
   ```

The server will be available at `http://localhost:3000` and the frontend at `http://localhost:8000`.

## Running with Docker Compose

1. Start all services:

   ```bash
   docker compose up
   ```

2. To run services separately:

   ```bash
   # run server in background
   docker compose up -d server

   # run frontend separately
   docker compose up frontend --no-deps
   ```

The server will be available at `http://localhost:3000` and the frontend at `http://localhost:8000`.

> Note: The server automatically runs the parse script before starting when using Docker Compose.
