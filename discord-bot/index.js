import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL || 'https://zenet.redmont.app';

const OWNER_ID = process.env.OWNER_ID || '1250956931447652362';
const ROLE_TS = process.env.ROLE_TRUST_SAFETY || '1524727014106464296';
const ROLE_AD = process.env.ROLE_AD_MANAGER || '1524726940710211704';
const ROLE_ENG = process.env.ROLE_PLATFORM_ENGINEER || '1524726849685688483';

if (!TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars. Check .env (see .env.example)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const BLUE = 0x3b82f6;
const GREEN = 0x22c55e;
const RED = 0xef4444;
const YELLOW = 0xeab308;

// ---------- permission helpers ----------
const isOwner = (user) => user.id === OWNER_ID;
const hasRole = (member, roleId) => Boolean(member?.roles?.cache?.has(roleId));
const canTS = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_TS);
const canAD = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_AD);
const canENG = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_ENG);

// ---------- command registry ----------
const commands = [];
const addCommand = (data, handler, permission = 'public') => {
  commands.push(data.toJSON());
  return { data, handler, permission };
};

const commandsList = [
  addCommand(
    new SlashCommandBuilder()
      .setName('search')
      .setDescription('Search the Z&E Net site directory')
      .addStringOption(o => o.setName('query').setDescription('What are you looking for?').setRequired(true)),
    async (interaction) => {
      const q = interaction.options.getString('query');
      const { data } = await supabase
        .from('sites')
        .select('name, slug, category, description, view_count, is_verified, is_active')
        .eq('status', 'approved')
        .eq('is_active', true)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
        .order('view_count', { ascending: false })
        .limit(5);
      if (!data || data.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`No sites found for **"${q}"**. Try a different term or check the website: ${SITE_URL}`)] });
      }
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle(`🔍 Search results for "${q}"`)
        .setURL(`${SITE_URL}/search?q=${encodeURIComponent(q)}`)
        .setDescription(data.map(s =>
          `**${s.is_verified ? '✅ ' : ''}${s.name}** — ${s.category}${s.is_active === false ? ' *(closed)*' : ''}\n${s.description ? s.description.substring(0, 120) : ''}\n${SITE_URL}/site/${s.slug} • 👁 ${s.view_count || 0}`
        ).join('\n\n'))
        .setFooter({ text: `Z&E Net • ${data.length} result(s)` });
      return interaction.reply({ embeds: [embed] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Ask the Z&E Net AI assistant anything about DemocracyCraft')
      .addStringOption(o => o.setName('query').setDescription('Your question').setRequired(true)),
    async (interaction) => {
      const q = interaction.options.getString('query');
      await interaction.deferReply();
      try {
        const { data: results } = await supabase
          .from('sites')
          .select('name, slug, category, description, view_count, shortcut, is_verified')
          .eq('status', 'approved')
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
          .limit(10);
        const res = await fetch(`${SITE_URL}/api/app?action=summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, results: results || [] }),
        });
        const data = await res.json();
        const embed = new EmbedBuilder()
          .setColor(BLUE)
          .setTitle(`🤖 Z&E Net AI — "${q}"`)
          .setDescription(data.summary || 'No answer generated.')
          .setFooter({ text: 'Powered by Mistral AI' });
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`AI request failed: ${err.message}`)] });
      }
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('site')
      .setDescription('Get details for a specific site')
      .addStringOption(o => o.setName('slug').setDescription('Site slug or name').setRequired(true)),
    async (interaction) => {
      const slug = interaction.options.getString('slug');
      const { data: site } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
      if (!site) {
        const { data: byName } = await supabase.from('sites').select('*').eq('status', 'approved').ilike('name', `%${slug}%`).limit(1);
        if (!byName || byName.length === 0) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`Site not found: ${slug}`)] });
        }
        site = byName[0];
      }
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle(`${site.is_verified ? '✅ ' : ''}${site.name}`)
        .setURL(`${SITE_URL}/site/${site.slug}`)
        .addFields(
          { name: 'Category', value: site.category || 'Other', inline: true },
          { name: 'Status', value: site.is_active === false ? 'Closed' : 'Open', inline: true },
          { name: 'Views', value: `${site.view_count || 0}`, inline: true },
          { name: 'Description', value: site.description?.substring(0, 500) || 'No description' }
        );
      return interaction.reply({ embeds: [embed] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('top')
      .setDescription('Trending sites this week'),
    async (interaction) => {
      try {
        const res = await fetch(`${SITE_URL}/api/app?action=get-trending`);
        const data = await res.json();
        const sites = data.sites || [];
        if (sites.length === 0) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription('No trending data yet this week.')] });
        }
        const embed = new EmbedBuilder()
          .setColor(GREEN)
          .setTitle('📈 Trending this week')
          .setDescription(sites.slice(0, 10).map((s, i) => `**${i + 1}. ${s.name}** — ${s.category}\n${SITE_URL}/site/${s.slug}`).join('\n'))
          .setFooter({ text: 'Z&E Net trending' });
        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`Error: ${err.message}`)] });
      }
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('DemocracyCraft server status and Z&E Net stats'),
    async (interaction) => {
      let server = null;
      try {
        const res = await fetch('https://api.mcsrvstat.us/2/play.democracycraft.net');
        server = await res.json();
      } catch (_) {}
      const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle('📊 Z&E Net stats')
        .addFields(
          { name: '🟢 Server', value: server?.online ? `Online — ${server.players?.online || 0} players` : 'Offline', inline: true },
          { name: '🌐 Sites', value: `${siteCount || 0}`, inline: true },
          { name: '👥 Users', value: `${userCount || 0}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }
  ),

  addCommand(
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    async (interaction) => {
      const sent = Date.now();
      await interaction.reply('Pinging...');
      const latency = Date.now() - sent;
      return interaction.editReply(`🏓 Pong! **${latency}ms** (API latency: ${Math.round(client.ws.ping)}ms)`);
    }
  ),

  addCommand(
    new SlashCommandBuilder().setName('help').setDescription('Show available commands'),
    async (interaction) => {
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle('🤖 Z&E Net Bot Commands')
        .addFields(
          { name: 'Public', value: '`/search <query>` — search sites\n`/ask <query>` — AI assistant\n`/site <slug>` — site details\n`/top` — trending\n`/stats` — server stats\n`/ping` — latency\n`/help` — this menu' },
          { name: '🛡️ Trust & Safety', value: '`/reports` — pending reports\n`/report-resolve <id> <dismiss|action>` — handle a report', inline: false },
          { name: '📢 Ad Manager', value: '`/ads-pending` — pending ad requests\n`/ads-decide <id> <approve|reject>` — decide\n`/ads-stats` — ad click stats', inline: false },
          { name: '🔧 Platform Engineer', value: '`/health` — API + database health check', inline: false },
          { name: '👑 Owner', value: '`/announce <title> <content>` — site announcement\n`/moderate <slug> <hide|show>` — hide/show site\n`/news-mod <id> <approve|reject>` — moderate news\n`/shutdown` — stop the bot', inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }
  ),

  // ---- Trust & Safety (1524727014106464296) ----
  addCommand(
    new SlashCommandBuilder()
      .setName('reports')
      .setDescription('List pending site reports (Trust & Safety)'),
    async (interaction) => {
      if (!canTS(interaction)) return denied(interaction);
      const { data: reports } = await supabase
        .from('site_reports')
        .select('id, reason, status, created_at, sites(name, slug), profiles:user_id(username)')
        .eq('status', 'pending')
        .limit(10);
      if (!reports || reports.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription('No pending reports. 🎉')] });
      }
      const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle(`🚩 Pending reports (${reports.length})`)
        .setDescription(reports.map(r =>
          `**#${r.id}** — ${r.sites?.name || 'Unknown'} (${r.sites?.slug || '?'})\nReason: ${r.reason}\nBy: ${r.profiles?.username || 'Unknown'} • ${new Date(r.created_at).toLocaleString()}`
        ).join('\n\n'));
      return interaction.reply({ embeds: [embed] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('report-resolve')
      .setDescription('Resolve a report (Trust & Safety)')
      .addIntegerOption(o => o.setName('id').setDescription('Report ID').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true)
        .addChoices({ name: 'Dismiss (no action)', value: 'dismiss' }, { name: 'Remove site content', value: 'remove' })),
    async (interaction) => {
      if (!canTS(interaction)) return denied(interaction);
      const id = interaction.options.getInteger('id');
      const action = interaction.options.getString('action');
      const { data: report } = await supabase.from('site_reports').select('*').eq('id', id).maybeSingle();
      if (!report) return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`Report #${id} not found.`)] });
      if (action === 'remove') {
        await supabase.from('sites').update({ is_active: false }).eq('id', report.site_id);
      }
      await supabase.from('site_reports').update({ status: action === 'remove' ? 'resolved' : 'dismissed' }).eq('id', id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`Report **#${id}** ${action === 'remove' ? 'resolved — site content removed' : 'dismissed'}.`)] });
    }
  ),

  // ---- Ad Manager (1524726940710211704) ----
  addCommand(
    new SlashCommandBuilder()
      .setName('ads-pending')
      .setDescription('List pending ad requests (Ad Manager)'),
    async (interaction) => {
      if (!canAD(interaction)) return denied(interaction);
      const { data } = await supabase.from('ad_requests').select('*').eq('status', 'pending').limit(10);
      if (!data || data.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription('No pending ad requests.')] });
      }
      const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle(`📢 Pending ad requests (${data.length})`)
        .setDescription(data.map(a =>
          `**#${a.id}** — ${a.site_name || 'Unknown'} (${a.tier}) — $${a.price}\n${SITE_URL}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('ads-decide')
      .setDescription('Approve or reject an ad request (Ad Manager)')
      .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true))
      .addStringOption(o => o.setName('decision').setDescription('Decision').setRequired(true)
        .addChoices({ name: 'Approve', value: 'approve' }, { name: 'Reject', value: 'reject' })),
    async (interaction) => {
      if (!canAD(interaction)) return denied(interaction);
      const id = interaction.options.getInteger('id');
      const decision = interaction.options.getString('decision');
      const { data: req } = await supabase.from('ad_requests').select('*').eq('id', id).maybeSingle();
      if (!req) return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`Request #${id} not found.`)] });
      if (decision === 'approve') {
        await supabase.from('ads').insert({
          title: req.site_name || 'Ad',
          description: req.description || '',
          image_url: req.image_url,
          link_url: SITE_URL,
          tier: req.tier,
          duration_days: req.duration_days || 7,
          is_active: true,
        });
      }
      await supabase.from('ad_requests').update({ status: decision === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`Request **#${id}** ${decision}d.`)] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('ads-stats')
      .setDescription('Ad performance stats (Ad Manager)'),
    async (interaction) => {
      if (!canAD(interaction)) return denied(interaction);
      const { data: ads } = await supabase.from('ads').select('title, tier, click_count, is_active');
      const totalClicks = (ads || []).reduce((s, a) => s + (a.click_count || 0), 0);
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle('📊 Ad stats')
        .addFields(
          { name: 'Total ads', value: `${(ads || []).length}`, inline: true },
          { name: 'Active ads', value: `${(ads || []).filter(a => a.is_active).length}`, inline: true },
          { name: 'Total clicks', value: `${totalClicks}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }
  ),

  // ---- Platform Engineer (1524726849685688483) ----
  addCommand(
    new SlashCommandBuilder()
      .setName('health')
      .setDescription('API and database health check (Platform Engineer)'),
    async (interaction) => {
      if (!canENG(interaction)) return denied(interaction);
      const results = [];
      try {
        const res = await fetch(`${SITE_URL}/api/app?action=get-trending`);
        results.push(`🌐 API: ${res.ok ? '✅ OK' : `❌ ${res.status}`}`);
      } catch (e) { results.push(`🌐 API: ❌ ${e.message}`); }
      try {
        const { data } = await supabase.from('sites').select('id').limit(1);
        results.push(`🗄️ Database: ${data ? '✅ OK' : '❌ no data'}`);
      } catch (e) { results.push(`🗄️ Database: ❌ ${e.message}`); }
      const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setTitle('🩺 Health check')
        .setDescription(results.join('\n'))
        .setFooter({ text: `Bot latency: ${Math.round(client.ws.ping)}ms` });
      return interaction.reply({ embeds: [embed] });
    }
  ),

  // ---- Owner (1250956931447652362) ----
  addCommand(
    new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Post a site announcement (Owner)')
      .addStringOption(o => o.setName('title').setDescription('Announcement title').setRequired(true))
      .addStringOption(o => o.setName('content').setDescription('Announcement content').setRequired(true)),
    async (interaction) => {
      if (!isOwner(interaction.user)) return denied(interaction);
      const title = interaction.options.getString('title');
      const content = interaction.options.getString('content');
      await supabase.from('announcements').insert({ title, content, created_by: interaction.user.id });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`📣 Announcement posted: **${title}**`)] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('moderate')
      .setDescription('Hide or show a site (Owner)')
      .addStringOption(o => o.setName('slug').setDescription('Site slug').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true)
        .addChoices({ name: 'Hide', value: 'hide' }, { name: 'Show', value: 'show' })),
    async (interaction) => {
      if (!isOwner(interaction.user)) return denied(interaction);
      const slug = interaction.options.getString('slug');
      const action = interaction.options.getString('action');
      const { data, error } = await supabase.from('sites').update({ is_active: action === 'show' }).eq('slug', slug).select('name');
      if (error || !data || data.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`Site "${slug}" not found.`)] });
      }
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`**${data[0].name}** is now ${action === 'show' ? 'visible' : 'hidden'}.`)] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('news-mod')
      .setDescription('Approve or reject a news post (Owner)')
      .addIntegerOption(o => o.setName('id').setDescription('News ID').setRequired(true))
      .addStringOption(o => o.setName('decision').setDescription('Decision').setRequired(true)
        .addChoices({ name: 'Approve', value: 'approve' }, { name: 'Reject', value: 'reject' })),
    async (interaction) => {
      if (!isOwner(interaction.user)) return denied(interaction);
      const id = interaction.options.getInteger('id');
      const decision = interaction.options.getString('decision');
      const { data, error } = await supabase
        .from('news')
        .update({ status: decision === 'approve' ? 'approved' : 'rejected' })
        .eq('id', id)
        .select('title');
      if (error || !data || data.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`News #${id} not found.`)] });
      }
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`News **#${id} — ${data[0].title}** ${decision}d.`)] });
    }
  ),

  addCommand(
    new SlashCommandBuilder()
      .setName('shutdown')
      .setDescription('Stop the bot (Owner)'),
    async (interaction) => {
      if (!isOwner(interaction.user)) return denied(interaction);
      await interaction.reply('👋 Shutting down...');
      await client.destroy();
      process.exit(0);
    }
  ),
];

const denied = (interaction) =>
  interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription('⛔ You do not have permission to use this command.')] });

// ---------- startup ----------
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ Registered ${commands.length} slash commands`);
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
  const count = client.guilds.cache.size;
  console.log(`📡 Serving ${count} guild(s)`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const entry = commandsList.find(c => c.data.name === interaction.commandName);
  if (!entry) return;
  try {
    await entry.handler(interaction);
  } catch (err) {
    console.error(`Error in /${entry.data.name}:`, err);
    const reply = { embeds: [new EmbedBuilder().setColor(RED).setDescription(`⚠️ Command failed: ${err.message}`)] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(reply);
    else await interaction.reply(reply).catch(() => {});
  }
});

client.login(TOKEN);
