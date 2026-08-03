import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { commands, handlers } from './commands.js';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars. Check .env (see .env.example)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
});

// ---------- watch loop: DM users when a watched site opens/closes ----------
const checkWatches = async () => {
  try {
    const { data: watches } = await supabase.from('discord_watches').select('*');
    if (!watches || watches.length === 0) return;
    const slugs = [...new Set(watches.map(w => w.site_slug))];
    const { data: sites } = await supabase.from('sites').select('slug, name, is_active').in('slug', slugs);
    const siteMap = Object.fromEntries((sites || []).map(s => [s.slug, s]));

    for (const watch of watches) {
      const site = siteMap[watch.site_slug];
      if (!site) continue;
      const isActive = site.is_active === true;
      if (watch.last_active === null || watch.last_active === undefined) {
        await supabase.from('discord_watches').update({ last_active: isActive }).eq('id', watch.id);
        continue;
      }
      if (watch.last_active !== isActive) {
        await supabase.from('discord_watches').update({ last_active: isActive }).eq('id', watch.id);
        try {
          const dm = await client.users.fetch(watch.discord_user_id);
          const embed = new EmbedBuilder()
            .setColor(isActive ? 0x22c55e : 0xef4444)
            .setTitle(isActive ? '🟢 Now Open' : '🔴 Now Closed')
            .setDescription(`**${site.name}** is now ${isActive ? 'open' : 'closed'}!\n${process.env.SITE_URL || 'https://zenet.redmont.app'}/site/${site.slug}`);
          await dm.send({ embeds: [embed] });
          console.log(`🔔 Notified ${watch.discord_user_id} about ${site.slug} (${isActive ? 'open' : 'closed'})`);
        } catch (e) {
          console.error(`Failed to DM ${watch.discord_user_id}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('Watch check error:', err);
  }
};

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const GUILD_ID = process.env.GUILD_ID;
  try {
    if (GUILD_ID) {
      const guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);
      await guild.commands.set(commands);
      console.log(`✅ Registered ${commands.length} slash commands in guild ${guild.name} (instant)`);
    } else {
      await client.application.commands.set(commands);
      console.log(`✅ Registered ${commands.length} slash commands globally (can take up to 1 hour to show up)`);
    }
  } catch (err) {
    console.error('Command sync failed (try npm run deploy):', err.message);
  }
  console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);

  setInterval(checkWatches, 5 * 60 * 1000);
  console.log('👁 Site watch loop started (checks every 5 min)');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = handlers[interaction.commandName];
  if (!handler) return;
  try {
    await handler(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const reply = { embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`⚠️ Command failed: ${err.message}`)] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

client.login(TOKEN);
