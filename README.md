# Revere City Insights Dashboard

A comprehensive real-time data analytics platform for the City of Revere, Massachusetts, providing municipal data visualization, AI-powered insights, and citizen engagement tools.

## Features

### 📊 Data Visualization & Analytics
- **Police Logs**: Real-time monitoring and analysis of police department activity
- **Budget Analysis**: Interactive budget data exploration with AI-powered insights
- **Demographics**: Population statistics and trends
- **Economy & Revenue**: Economic indicators and city revenue tracking
- **Transportation**: MBTA Blue Line integration and transit analytics
- **Weather & Climate**: Real-time weather data and climate trends

### 🤖 AI-Powered Features
- AI chatbot with RAG (Retrieval-Augmented Generation) capabilities
- Natural language queries for city data
- Document analysis and insights generation
- Voice-enabled interactions

### 📈 Comprehensive Dashboards
- Housing market analytics
- Education statistics
- Health metrics
- Social indicators
- Interactive charts and visualizations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage)
- **AI/ML**: Google Gemini AI, LangChain, OpenAI
- **Data Visualization**: Recharts
- **State Management**: React Query, Context API

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun runtime)
- npm or bun package manager
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd revere-city-insights
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```env
# Required: Google Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

> **Note**: See `.env.example` for a template

4. Run database migrations:
```bash
# Apply migrations in your Supabase dashboard
# See: supabase/migrations/
```

5. Start the development server:
```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:8080`

## Project Structure

```
revere-city-insights/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Application pages/routes
│   ├── services/        # API and data services
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React context providers
│   ├── lib/             # Utility functions
│   └── integrations/    # Third-party integrations
├── supabase/
│   ├── functions/       # Supabase Edge Functions
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── scripts/             # Utility scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features

### Police Logs Integration
- Automated daily sync from Revere Police Department
- Full-text search and filtering
- Analytics dashboards with call type distribution
- Historical trend analysis

### Budget Visualization
- Interactive budget data exploration
- AI-powered budget insights and Q&A
- Document upload and analysis
- Vector search capabilities

### Real-Time Data
- MBTA Blue Line predictions
- Current weather conditions
- Live city data updates

### AI Chatbot
- Natural language interface for city data
- Context-aware responses
- Document analysis capabilities
- Voice interaction support

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | Yes |

## Database Setup

The application requires several database tables and functions. Apply migrations in order:

1. `20241005_create_police_logs.sql` - Police logs tables and indexes
2. `20241007_create_budget_vectors.sql` - Budget vector search
3. `20241026_create_document_tables.sql` - Document storage
4. `20241026_create_chat_history.sql` - Chat history

See the `supabase/migrations/` directory for SQL migration files.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- Never commit `.env` files or API keys to the repository
- Rotate any exposed API keys immediately
- Use environment variables for all sensitive configuration
- Review the `.gitignore` file before committing

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- City of Revere, Massachusetts
- Revere Police Department for public safety data
- MBTA for transit data API
- Visual Crossing Weather API
