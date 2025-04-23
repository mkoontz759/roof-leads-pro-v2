# Roof Leads Pro

A real estate SaaS platform for managing property listings, agents, and transactions.

## Features

- Property listing management
- Agent profiles and management
- Transaction tracking
- MLS integration
- Dashboard with analytics
- User authentication and authorization

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Development**: Cursor with Claude 3.5 Sonnet
- **Deployment**: Replit (already have a subscription)

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MongoDB instance

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd roof-leads-pro
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   Create a `.env.local` file in the root directory with the following variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<your-nextauth-secret>
   MLS_API_KEY=<your-mls-api-key>
   ```

4. Run the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `development`: Active development branch
- Feature branches: Created from `development` for specific features

### Commit Guidelines

- Use descriptive commit messages
- Reference issue numbers when applicable

### Pre-commit Hooks

The project uses Husky for pre-commit hooks to ensure code quality:
- Linting runs automatically before each commit

## API Routes

The application includes various API routes for different functionalities:

- `/api/auth/*`: Authentication endpoints
- `/api/mls/*`: MLS integration endpoints
- `/api/debug/*`: Debugging endpoints (not for production use)

## Deployment

The application is configured for deployment on Vercel with the following features:
- Automatic deployments from the `main` branch
- Preview deployments for pull requests
- Scheduled cron jobs for data synchronization

## License

[Specify your license here]
