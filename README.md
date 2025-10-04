# Deepcut API (Backend)

This is the backend for [Deepcut](https://deepcut.twxntytwo.com). The API is built with **Vercel Serverless Functions** and uses a PostgreSQL database with Prisma to manage and serve data to the front-end.

## Technologies Used

- **Runtime:** [Node.js](https://nodejs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **API Framework:** [Vercel Serverless Functions](https://vercel.com/docs/functions)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)

## Project Setup

To get the backend server running locally, follow these steps:

1.  **Clone the repository** (if you haven't already):

    ```bash
    git clone https://github.com/samyAlliche/deepcut.git
    cd deepcut
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create your environment file:**
    You will need a to create a Postgresql DB on Prisma in order to use this. Enter all the variables needed in your .env file. SYNC_SECRET is a variable you can chose yourself, as long as it's the same in the Backend and Frontend.

    ```bash
    POSTGRES_URL="*****"
    PRISMA_DATABASE_URL="*****"
    PRISMA_DATABASE_URL="*****"
    YOUTUBE_API_KEY="*****"
    SYNC_SECRET="*****"
    NODE_ENV="development"
    ```

4.  **Run database migrations:**
    This command will sync your Prisma schema with your PostgreSQL database, creating the necessary tables.

    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```

5.  **Start the development server:**
    ```bash
    vercel dev
    ```
    The server should now be running on `http://localhost:3000` (or the port you've configured).

## Data Model

The data is structured around four main models managed by Prisma: `Channel`, `Playlist`, `Video`, and `PlaylistItem`. A `Channel` can have multiple `Playlists` and `Videos`. The `PlaylistItem` model links `Videos` to `Playlists` in a many-to-many relationship, creating the contents of each playlist. The full schema is defined in `prisma/schema.prisma`.

## API Endpoints

The server exposes the following endpoints:

| Method | Endpoint                | Description                                                                   |
| :----- | :---------------------- | :---------------------------------------------------------------------------- |
| `POST` | `/api/playlist/add`     | Adds a new playlist to the database to be tracked.                            |
| `POST` | `/api/playlist/sync`    | **(Protected)** Forces a sync for a single, existing playlist.                |
| `POST` | `/api/playlist/syncAll` | **(Protected)** Triggers a synchronization for all tracked playlists.         |
| `GET`  | `/api/blindpicks`       | **Core Feature:** Fetches a random selection of "deep cuts" for the user.     |
| `GET`  | `/api/dev-sync`         | **(Development Only)** Utility endpoint for force-syncing a playlist via URL. |
| `GET`  | `/api/hello`            | A simple health-check endpoint to verify that the server is running.          |
