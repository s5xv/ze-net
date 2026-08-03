import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SITE_URL = process.env.SITE_URL || 'https://zenet.redmont.app';

const OWNER_ID = process.env.OWNER_ID || '1250956931447652362';
const ROLE_TS = process.env.ROLE_TRUST_SAFETY || '1524727014106464296';
const ROLE_AD = process.env.ROLE_AD_MANAGER || '1524726940710211704';
const ROLE_ENG = process.env.ROLE_PLATFORM_ENGINEER || '1524726849685688483';
const ROLE_VERIFIED_OWNER = process.env.ROLE_VERIFIED_OWNER || '1524727552776867840';

const BLUE = 0x3b82f6;
const GREEN = 0x22c55e;
const RED = 0xef4444;
const YELLOW = 0xeab308;

const isOwner = (user) => user.id === OWNER_ID;
const hasRole = (member, roleId) => Boolean(member?.roles?.cache?.has(roleId));
const canTS = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_TS);
const canAD = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_AD);
const canENG = (interaction) => isOwner(interaction.user) || hasRole(interaction.member, ROLE_ENG);

const denied = (interaction) =>
  interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription('⛔ You do not have permission to use this command.')] });

const notLinked = (interaction) =>
  interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription(`You need to link your Discord account on Z&E Net first.\nSign in at ${SITE_URL}/login with Discord, then try again.`)] });

const getLinkedProfile = async (discordUserId) => {
  const { data } = await supabase.from('profiles').select('id, username, mc_username').eq('discord_id', String(discordUserId)).maybeSingle();
  return data;
};

const errorReply = (message) => ({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`⚠️ ${message}`)] });

const commands = [];
const handlers = {};

const addCommand = (data, handler, permission = 'public') => {
  commands.push(data.toJSON());
  handlers[data.name] = handler;
  return { data, handler, permission };
};

// ================= PUBLIC COMMANDS =================

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
);

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
      return interaction.editReply(errorReply(`AI request failed: ${err.message}`));
    }
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('site')
    .setDescription('Get details for a specific site')
    .addStringOption(o => o.setName('slug').setDescription('Site slug or name').setRequired(true)),
  async (interaction) => {
    const slug = interaction.options.getString('slug');
    let { data: site } = await supabase.from('sites').select('*').eq('slug', slug).maybeSingle();
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
);

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
      return interaction.reply(errorReply(err.message));
    }
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top sites by views'),
  async (interaction) => {
    const { data: sites } = await supabase
      .from('sites')
      .select('name, slug, category, view_count, is_verified')
      .eq('status', 'approved')
      .order('view_count', { ascending: false })
      .limit(10);
    if (!sites || sites.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription('No sites yet.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(GREEN)
      .setTitle('🏆 Top sites on Z&E Net')
      .setDescription(sites.map((s, i) =>
        `**${i + 1}.** ${s.is_verified ? '✅ ' : ''}${s.name} — ${s.category} — 👁 ${s.view_count || 0}\n${SITE_URL}/site/${s.slug}`
      ).join('\n'))
      .setFooter({ text: 'By total views' });
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('fiverr')
    .setDescription('Search the marketplace for services and gigs')
    .addStringOption(o => o.setName('query').setDescription('What service do you need?').setRequired(true))
    .addStringOption(o => o.setName('category').setDescription('Filter by category')
      .addChoices(
        { name: 'Building', value: 'Building' },
        { name: 'Redstone', value: 'Redstone' },
        { name: 'Design', value: 'Design' },
        { name: 'Writing', value: 'Writing' },
        { name: 'Editing', value: 'Editing' },
        { name: 'Programming', value: 'Programming' },
        { name: 'Consulting', value: 'Consulting' },
        { name: 'Management', value: 'Management' },
        { name: 'Farming', value: 'Farming' },
        { name: 'Mining', value: 'Mining' },
        { name: 'Transport', value: 'Transport' },
        { name: 'Security', value: 'Security' },
        { name: 'Other', value: 'Other' }
      )),
  async (interaction) => {
    const q = interaction.options.getString('query');
    const category = interaction.options.getString('category');
    let query = supabase.from('gigs').select('*').eq('status', 'active');
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (category) query = query.eq('category', category);
    query = query.order('created_at', { ascending: false }).limit(5);
    const { data: gigs } = await query;
    if (!gigs || gigs.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription(`No gigs found${category ? ` in ${category}` : ''} for **"${q}"**. Check the marketplace: ${SITE_URL}/marketplace`)] });
    }
    const embed = new EmbedBuilder()
      .setColor(BLUE)
      .setTitle(`🛠️ Marketplace gigs${category ? ` — ${category}` : ''}`)
      .setURL(`${SITE_URL}/marketplace`)
      .setDescription(gigs.map(g =>
        `**${g.title}** — $${parseFloat(g.price).toFixed(2)}${g.price_type === 'hourly' ? '/hr' : ''}\n${(g.description || '').substring(0, 120)}\n${SITE_URL}/marketplace/${g.id} • ⏱ ${g.delivery_days || 7}d delivery`
      ).join('\n\n'));
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('bookmark')
    .setDescription('Save a site to your bookmarks')
    .addStringOption(o => o.setName('slug').setDescription('Site slug').setRequired(true)),
  async (interaction) => {
    const profile = await getLinkedProfile(interaction.user.id);
    if (!profile) return notLinked(interaction);
    const slug = interaction.options.getString('slug');
    const { data: site } = await supabase.from('sites').select('id, name').eq('slug', slug).maybeSingle();
    if (!site) return interaction.reply(errorReply(`Site "${slug}" not found.`));
    const { data: existing } = await supabase.from('bookmarks').select('id').eq('user_id', profile.id).eq('site_id', site.id).maybeSingle();
    if (existing) return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription(`**${site.name}** is already bookmarked.`)] });
    await supabase.from('bookmarks').insert({ user_id: profile.id, site_id: site.id });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`⭐ Bookmarked **${site.name}** for ${profile.username}. View: ${SITE_URL}/collections`)] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('review')
    .setDescription('Leave a review on a site')
    .addStringOption(o => o.setName('slug').setDescription('Site slug').setRequired(true))
    .addIntegerOption(o => o.setName('rating').setDescription('Rating 1-5').setRequired(true).setMinValue(1).setMaxValue(5))
    .addStringOption(o => o.setName('text').setDescription('Review text').setRequired(true)),
  async (interaction) => {
    const profile = await getLinkedProfile(interaction.user.id);
    if (!profile) return notLinked(interaction);
    const slug = interaction.options.getString('slug');
    const rating = interaction.options.getInteger('rating');
    const text = interaction.options.getString('text');
    const { data: site } = await supabase.from('sites').select('id, name').eq('slug', slug).maybeSingle();
    if (!site) return interaction.reply(errorReply(`Site "${slug}" not found.`));
    const { data: existing } = await supabase.from('site_reviews').select('id').eq('user_id', profile.id).eq('site_id', site.id).maybeSingle();
    if (existing) {
      await supabase.from('site_reviews').update({ rating, comment: text }).eq('id', existing.id);
    } else {
      await supabase.from('site_reviews').insert({ site_id: site.id, user_id: profile.id, rating, comment: text });
    }
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`⭐ ${'⭐'.repeat(rating)} Posted review on **${site.name}**`)] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('watch')
    .setDescription('Get a DM when a site opens or closes')
    .addStringOption(o => o.setName('slug').setDescription('Site slug to watch').setRequired(true)),
  async (interaction) => {
    const slug = interaction.options.getString('slug');
    const { data: site } = await supabase.from('sites').select('id, name, is_active').eq('slug', slug).maybeSingle();
    if (!site) return interaction.reply(errorReply(`Site "${slug}" not found.`));
    const { data: existing } = await supabase.from('discord_watches').select('id').eq('discord_user_id', String(interaction.user.id)).eq('site_slug', slug).maybeSingle();
    if (existing) {
      await supabase.from('discord_watches').delete().eq('id', existing.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription(`🔕 Stopped watching **${site.name}**.`)] });
    }
    await supabase.from('discord_watches').insert({ discord_user_id: String(interaction.user.id), site_slug: slug, last_active: site.is_active });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`🔔 Watching **${site.name}** — you'll be DMed when it opens or closes. Run again to stop.`)] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('patchnotes')
    .setDescription('Latest Z&E Net changelog'),
  async (interaction) => {
    const { data } = await supabase.from('changelog').select('*').order('created_at', { ascending: false }).limit(5);
    if (!data || data.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(YELLOW).setDescription('No changelog entries yet.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(BLUE)
      .setTitle('📝 Latest Z&E Net updates')
      .setURL(`${SITE_URL}/changelog`)
      .setDescription(data.map(e => `**${e.date_label}**\n${e.content}`).join('\n\n'));
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Z&E Net frequently asked questions'),
  async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(BLUE)
      .setTitle('❓ Z&E Net FAQ')
      .addFields(
        { name: 'What is Z&E Net?', value: 'A search directory for the DemocracyCraft Minecraft server. Find shops, services, government departments, and businesses.' },
        { name: 'How do I add my business?', value: `Submit it at ${SITE_URL}/register-business` },
        { name: 'How do I get my site verified?', value: `Submit a verification request at ${SITE_URL}/verify-site` },
        { name: 'How do I advertise?', value: `Submit an ad at ${SITE_URL}/submit-ad` },
        { name: 'How do I hire someone?', value: `Check the marketplace at ${SITE_URL}/marketplace` },
        { name: 'How do I link my Discord/MC account?', value: `Sign in at ${SITE_URL}/login and link at ${SITE_URL}/link-account` }
      );
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder — I will DM you')
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes from now').setRequired(true).setMinValue(1).setMaxValue(1440))
    .addStringOption(o => o.setName('message').setDescription('Reminder text').setRequired(true)),
  async (interaction) => {
    const minutes = interaction.options.getInteger('minutes');
    const message = interaction.options.getString('message');
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`⏰ Reminder set — I'll DM you in **${minutes} minute(s)**: "${message}"`)] });
    setTimeout(async () => {
      try {
        await interaction.user.send(`⏰ **Reminder:** ${message}`);
      } catch (_) {}
    }, minutes * 60000);
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a quick poll')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3 (optional)'))
    .addStringOption(o => o.setName('option4').setDescription('Option 4 (optional)')),
  async (interaction) => {
    const question = interaction.options.getString('question');
    const options = [1, 2, 3, 4].map(n => interaction.options.getString(`option${n}`)).filter(Boolean);
    try {
      const poll = {
        question: { text: question },
        answers: options.map(o => ({ text: o })),
        duration: 24,
        allowMultiselect: false,
        layoutType: 1,
      };
      const reply = await interaction.reply({ content: `📊 **${question}**`, poll, fetchReply: true });
      if (!reply.poll) throw new Error('native polls not supported here');
    } catch (_) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(BLUE).setTitle(`📊 ${question}`).setDescription(options.map((o, i) => `${i + 1}. ${o}`).join('\n')).setFooter({ text: 'React to vote (fallback poll)' })] });
    }
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text (free translator)')
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(o => o.setName('language').setDescription('Target language code (e.g. es, fr, de, ja, ar)').setRequired(true)),
  async (interaction) => {
    const text = interaction.options.getString('text');
    const lang = interaction.options.getString('language').toLowerCase();
    await interaction.deferReply();
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`);
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (!translated || translated === text) throw new Error('translation failed');
      const embed = new EmbedBuilder()
        .setColor(BLUE)
        .setTitle(`🌐 Translation (${lang})`)
        .setDescription(`**Original:** ${text}\n\n**Translated:** ${translated}`);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(errorReply(`Could not translate to "${lang}" — use a language code like es, fr, de.`));
    }
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('verify-mc')
    .setDescription('Link your Minecraft username to your account')
    .addStringOption(o => o.setName('username').setDescription('Your Minecraft username').setRequired(true)),
  async (interaction) => {
    const profile = await getLinkedProfile(interaction.user.id);
    if (!profile) return notLinked(interaction);
    const username = interaction.options.getString('username');
    await supabase.from('profiles').update({ mc_username: username }).eq('id', profile.id);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`✅ Linked Minecraft username **${username}** to your account. Note: staff must verify it on the site (${SITE_URL}/link-account).`)] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Support Z&E Net'),
  async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(GREEN)
      .setTitle('💠 Support Z&E Net')
      .setDescription('Help keep the directory running! Donations are accepted on our crowdfunding page:')
      .addFields({ name: 'Donate', value: '[gnomefundme.org — Z&E Net](https://gnomefundme.org/c/ze-net-build-the-duckduckgo-of-democracycraft)' })
      .setFooter({ text: 'Thank you for supporting Z&E Net!' });
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Z&E Net platform stats'),
  async (interaction) => {
    const { count: siteCount } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: gigCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const embed = new EmbedBuilder()
      .setColor(BLUE)
      .setTitle('📊 Z&E Net stats')
      .addFields(
        { name: '🌐 Sites', value: `${siteCount || 0}`, inline: true },
        { name: '👥 Users', value: `${userCount || 0}`, inline: true },
        { name: '🛠️ Active gigs', value: `${gigCount || 0}`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
);

addCommand(
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  async (interaction) => {
    const sent = Date.now();
    await interaction.reply('Pinging...');
    const latency = Date.now() - sent;
    return interaction.editReply(`🏓 Pong! **${latency}ms** (API latency: ${Math.round(interaction.client.ws.ping)}ms)`);
  }
);

addCommand(
  new SlashCommandBuilder().setName('help').setDescription('Show available commands'),
  async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(BLUE)
      .setTitle('🤖 Z&E Net Bot Commands')
      .addFields(
        { name: 'Public', value: '`/search <query>` — search sites\n`/ask <query>` — AI assistant\n`/site <slug>` — site details\n`/top` — trending\n`/leaderboard` — top sites\n`/fiverr <query>` — marketplace gigs\n`/bookmark <slug>` — save a site\n`/review <slug> <rating>` — review a site\n`/watch <slug>` — DM on open/close\n`/patchnotes` — latest updates\n`/faq` — questions\n`/remind <min> <text>` — reminders\n`/poll` — quick poll\n`/translate` — translate text\n`/verify-mc <name>` — link MC\n`/donate` — support Z&E Net\n`/stats` — platform stats\n`/ping` — latency\n`/help` — this menu' },
        { name: '🛡️ Trust & Safety', value: '`/reports` — pending reports\n`/report-resolve <id> <dismiss|action>` — handle a report', inline: false },
        { name: '📢 Ad Manager', value: '`/ads-pending` — pending ad requests\n`/ads-decide <id> <approve|reject>` — decide\n`/ads-stats` — ad click stats', inline: false },
        { name: '🔧 Platform Engineer', value: '`/health` — API + database health check', inline: false },
        { name: '👑 Owner', value: '`/announce <title> <content>` — site announcement\n`/moderate <slug> <hide|show>` — hide/show site\n`/news-mod <id> <approve|reject>` — moderate news\n`/sync-roles` — sync Verified Owner role\n`/shutdown` — stop the bot', inline: false }
      );
    return interaction.reply({ embeds: [embed] });
  }
);

// ================= TRUST & SAFETY =================

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
);

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
    if (!report) return interaction.reply(errorReply(`Report #${id} not found.`));
    if (action === 'remove') {
      await supabase.from('sites').update({ is_active: false }).eq('id', report.site_id);
    }
    await supabase.from('site_reports').update({ status: action === 'remove' ? 'resolved' : 'dismissed' }).eq('id', id);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`Report **#${id}** ${action === 'remove' ? 'resolved — site content removed' : 'dismissed'}.`)] });
  }
);

// ================= AD MANAGER =================

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
);

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
    if (!req) return interaction.reply(errorReply(`Request #${id} not found.`));
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
);

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
);

// ================= PLATFORM ENGINEER =================

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
      .setFooter({ text: `Bot latency: ${Math.round(interaction.client.ws.ping)}ms` });
    return interaction.reply({ embeds: [embed] });
  }
);

// ================= OWNER =================

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
);

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
      return interaction.reply(errorReply(`Site "${slug}" not found.`));
    }
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`**${data[0].name}** is now ${action === 'show' ? 'visible' : 'hidden'}.`)] });
  }
);

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
      return interaction.reply(errorReply(`News #${id} not found.`));
    }
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`News **#${id} — ${data[0].title}** ${decision}d.`)] });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('sync-roles')
    .setDescription('Sync Verified Owner roles for all verified sites (Owner/Engineer)'),
  async (interaction) => {
    if (!isOwner(interaction.user) && !canENG(interaction)) return denied(interaction);
    await interaction.deferReply();
    const { data: verifiedSites } = await supabase.from('sites').select('name, slug, owner_discord, owner_user_id').eq('status', 'approved').eq('is_verified', true).limit(500);
    const { data: profiles } = await supabase.from('profiles').select('id, username, discord_id').not('discord_id', 'is', null);
    const profileByDiscordId = Object.fromEntries((profiles || []).map(p => [p.discord_id, p]));

    const guild = interaction.guild;
    const verifiedRole = guild.roles.cache.get(ROLE_VERIFIED_OWNER);
    if (!verifiedRole) return interaction.editReply({ embeds: [errorReply(`Verified Owner role not found (ID ${ROLE_VERIFIED_OWNER}).`)] });

    let assigned = 0, skipped = 0;
    const already = [];

    for (const site of verifiedSites || []) {
      const ownerDiscordId = site.owner_user_id ? profileByDiscordId[site.owner_user_id]?.discord_id : null;
      if (!ownerDiscordId) continue;
      try {
        const member = await guild.members.fetch(ownerDiscordId).catch(() => null);
        if (!member) { skipped++; continue; }
        if (member.roles.cache.has(ROLE_VERIFIED_OWNER)) { already.push(member.user.username); continue; }
        await member.roles.add(ROLE_VERIFIED_OWNER);
        assigned++;
      } catch { skipped++; }
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(GREEN).setTitle('✅ Role Sync Complete')
        .setDescription(`**Verified Owner** role (${verifiedRole.name}) synced.\n🆕 Assigned: ${assigned}\n👥 Already had it: ${already.length}\n🚫 Skipped (not in server): ${skipped}\n\nSites checked: ${verifiedSites?.length || 0}`)]
    });
  }
);

addCommand(
  new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Stop the bot (Owner)'),
  async (interaction) => {
    if (!isOwner(interaction.user)) return denied(interaction);
    await interaction.reply('👋 Shutting down...');
    await interaction.client.destroy();
    process.exit(0);
  }
);

// Commands whose replies should be visible to everyone (all others reply only to the user who ran them)
const PUBLIC_REPLY_COMMANDS = new Set(['poll', 'announce']);

export { commands, handlers, PUBLIC_REPLY_COMMANDS };
