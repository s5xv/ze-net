# Z&E Net Discord Bot

Discord bot for Z&E Net with site search, AI assistant, marketplace, and staff moderation commands.

## Commands

| Command | Who | Description |
|---|---|---|
| `/search <query>` | Everyone | Search the site directory |
| `/ask <query>` | Everyone | Ask the Z&E Net AI assistant |
| `/site <slug>` | Everyone | Site details |
| `/top` | Everyone | Trending sites this week |
| `/leaderboard` | Everyone | Top sites by views |
| `/fiverr <query>` | Everyone | Search marketplace gigs |
| `/bookmark <slug>` | Everyone | Save a site (requires linked Discord account) |
| `/review <slug> <rating> <text>` | Everyone | Review a site (requires linked account) |
| `/watch <slug>` | Everyone | DM when a site opens/closes |
| `/patchnotes` | Everyone | Latest Z&E Net changelog |
| `/faq` | Everyone | Frequently asked questions |
| `/remind <minutes> <text>` | Everyone | DM reminder |
| `/poll` | Everyone | Quick poll |
| `/translate <text> <language>` | Everyone | Free translation |
| `/verify-mc <username>` | Everyone | Link MC username |
| `/donate` | Everyone | ZEC donation address |
| `/stats` | Everyone | Platform stats |
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
| `/sync-roles` | Owner/Engineer | Assign Verified Owner role to all verified site owners |
| `/shutdown` | Owner | Stop the bot |

Commands that need your Discord linked to Z&E Net (`/bookmark`, `/review`, `/verify-mc`) look up your site account via `profiles.discord_id` — just sign in on the site with Discord.

## Setup (local)

```bash
cd discord-bot
cp .env.example .env   # fill in your values
npm install
npm start
```

## Registering slash commands

Commands register automatically when the bot starts. If they don't show up (or after a big command update), run:

```bash
npm run deploy
```

For instant visibility in your server, set `GUILD_ID` in `.env` (guild commands appear immediately; global commands can take up to an hour).

## Deploy on Dokploy

1. Create a new **Docker Compose** service on Dokploy.
2. Point it at the `discord-bot/` directory of the repository.
3. Add environment variables (from `.env.example`).
4. Deploy — the bot starts automatically, registers its slash commands, and restarts on crash (`restart: unless-stopped`).

The `docker-compose.yml` in `discord-bot/` builds the image and runs the bot.

## Requirements

- **Supabase service role key** — for direct database access (search, moderation, announcements). Keep it secret; only the bot and server-side code should have it.
- **Discord bot token** with `applications.commands` scope for slash commands.
- **MISTRAL_API_KEY** stays on the site (Vercel) — the bot's `/ask` calls the site's `/api/app?action=summarize` endpoint.
- The **`discord_watches` table** must exist in the database (see full-schema.sql) for `/watch` to work.
