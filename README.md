# Onchat
Real-time productivity app.

**About**
Onchat is a collaborative workspace application with real-time messaging, task management, pages, and AI-powered assistance.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env` file and set the right environment variables

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_LOGIN_URL=/login
VITE_GROQ_API_KEY=your-groq-api-key
```

Run the app: `npm run dev`

**Tech Stack**

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq API (Llama 3.3)
- **UI**: shadcn/ui components
