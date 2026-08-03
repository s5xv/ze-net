# Z&E Net Discord Bot

Discord bot for Z&E Net with site search, AI assistant, and staff moderation commands.

## Commands

| Command | Who | Description |
|---|---|---|
| `/search <query>` | Everyone | Search the site directory |
| `/ask <query>` | Everyone | Ask the Z&E Net AI assistant |
| `/site <slug>` | Everyone | Site details |
| `/top` | Everyone | Trending sites this week |
| `/stats` | Everyone | Server + platform stats |
| `/ping` | Everyone | Bot latency |
| `/help` | Everyone | Command list |
| `/reports` | Trust & Safety | Pending site reports |
| `/report-resolve <id> <action>` | Trust & Safety | Dismiss or remove report content |
| `/ads-pending` | Ad Manager | Pending ad requests |
| `/ads-decide <id> <decision>` | Ad Manager | Approve/reject ad |
| `/ads-stats` | Ad Manager | Ad performance |
| `/health` | Platform Engineer | API + DB health check |
| `/announce <title> <content>` | Owner | Post site announcement |
| `/moderate <slug> <action>` | Owner | Hide/show site |
| `/news-mod <id> <decision>` | Owner | Approve/reject news |
| `/shutdown` | Owner | Stop the bot |

## Setup (local)

```bash
cd discord-bot
cp .env.example .env   # fill in your values
npm install
npm start
```

## Deploy on Dokploy

1. Create a new **Docker Compose** service on Dokploy.
2. Point it at the `discord-bot/` directory of the repository.
3. Add environment variables (from `.env.example`).
4. Deploy — the bot starts automatically, registers its slash commands, and restarts on crash.

The `docker-compose.yml` in `discord-bot/` builds the image and runs the bot with `restart: unless-stopped`.

## Requirements

- **Supabase service role key** — for direct database access (search, moderation, announcements). Keep it secret; only the bot and server-side code should have it.
- **Discord bot token** with `applications.commands` scope for slash commands.
- **MISTRAL_API_KEY** stays on the site (Vercel) — the bot's `/ask` calls the site's `/api/app?action=summarize` endpoint.
