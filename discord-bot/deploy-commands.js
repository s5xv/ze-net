import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands.js';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

const register = async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID || '', GUILD_ID), { body: commands });
      console.log(`✅ Registered ${commands.length} commands in guild ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || ''), { body: commands });
      console.log(`✅ Registered ${commands.length} global commands`);
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
};

register();
