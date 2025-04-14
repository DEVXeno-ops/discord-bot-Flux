// commands/giveaway.js
const { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const ms = require('ms');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createProgressBar, checkPermissions } = require('../utils/embeds');
const logger = require('../logger');

// Initialize lowdb with default data
const defaultData = { giveaways: [] };
const db = new Low(new JSONFile(path.join(__dirname, '../data/giveaways.json')), defaultData);
db.read().then(() => {
  if (!db.data) db.data = defaultData;
  return db.write();
}).catch(error => {
  logger.error('Failed to initialize giveaway database', error);
});

// Localization
const i18n = {
  en: {
    invalid_duration: 'Duration must be between 1 minute and 7 days (e.g., 10m, 1h, 1d).',
    invalid_prize: 'Prize name must be at least 3 characters long.',
    giveaway_started: 'Giveaway Launched!',
    prize: 'Prize',
    winners: 'Winners',
    ends: 'Ends',
    role_needed: 'Role Needed',
    join_to_enter: 'Hit **Join** to enter!',
    entries: 'Entries',
    progress: 'Progress',
    entry_confirmed: 'Entry Confirmed!',
    entered_prize: 'You’re in for **{prize}**!',
    entry_removed: 'Entry Removed',
    left_giveaway: 'You’ve left the giveaway for **{prize}**.',
    no_role: 'You need the **{role}** role to join this giveaway.',
    giveaway_ended: 'Giveaway Concluded!',
    no_entries: 'No one entered the giveaway.',
    winners_announced: 'Winners: {winners}',
    rate_limit: 'Please wait a moment before trying again.',
    error: 'An error occurred. Please try again later.',
    channel_not_found: 'The giveaway channel could not be found.',
    message_not_found: 'The giveaway message could not be found.',
    guild_not_found: 'The giveaway guild could not be found.',
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway with a prize and optional role')
    .addStringOption(option =>
      option.setName('duration').setDescription('Duration (e.g., 10m, 1h)').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(10)
    )
    .addStringOption(option =>
      option.setName('prize').setDescription('Prize name').setRequired(true).setMaxLength(100)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('Required role to enter').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  cooldown: 10,

  async execute(interaction) {
    const lang = 'en';
    const t = i18n[lang];

    const duration = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize').trim();
    const role = interaction.options.getRole('role');

    try {
      // Check permissions
      const permCheck = checkPermissions(interaction.member, PermissionFlagsBits.ManageGuild, 'giveaway', logger);
      if (permCheck) return interaction.reply(permCheck);

      // Validate inputs
      const durationMs = ms(duration);
      if (!durationMs || durationMs < ms('1m') || durationMs > ms('7d')) {
        logger.warn(`Invalid giveaway duration ${duration} by ${interaction.user.tag}`);
        return interaction.reply(createErrorEmbed({ description: t.invalid_duration }));
      }

      if (prize.length < 3) {
        return interaction.reply(createErrorEmbed({ description: t.invalid_prize }));
      }

      // Create unique button IDs
      const giveawayId = `${interaction.id}-${Date.now()}`;
      const joinButton = new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveawayId}`)
        .setLabel('Join')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉');
      const leaveButton = new ButtonBuilder()
        .setCustomId(`giveaway_leave_${giveawayId}`)
        .setLabel('Leave')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪');
      const row = new ActionRowBuilder().addComponents(joinButton, leaveButton);

      // Create initial embed
      const endTime = Date.now() + durationMs;
      const embed = createSuccessEmbed({
        title: t.giveaway_started,
        description: `**${t.prize}**: ${prize}\n**${t.winners}**: ${winners}\n**${t.ends}**: <t:${Math.floor(endTime / 1000)}:R>\n${
          role ? `**${t.role_needed}**: ${role.name}\n` : ''
        }${t.join_to_enter}`,
        fields: [
          { name: t.entries, value: '0', inline: true },
          { name: t.progress, value: createProgressBar(0, durationMs), inline: true },
        ],
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
      });

      // Reply and fetch the Message object
      await interaction.reply({ embeds: embed.embeds, components: [...embed.components, row] });
      const message = await interaction.fetchReply();
      logger.info(`Giveaway started by ${interaction.user.tag}: ${prize}, ${winners} winners (ID: ${giveawayId})`);

      // Store giveaway data
      const giveawayData = {
        id: message.id,
        giveawayId,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        prize,
        winners,
        durationMs,
        endTime,
        roleId: role?.id,
        entries: [],
        startTime: Date.now(),
        active: true,
      };
      db.data.giveaways.push(giveawayData);
      await db.write();

      // Start giveaway logic
      await this.runGiveaway(interaction.client, giveawayData, message, role, t);
    } catch (error) {
      logger.error(`Error in giveaway command by ${interaction.user.tag}`, error);
      await interaction.reply(createErrorEmbed({ description: t.error }));
    }
  },

  async handleButton(interaction) {
    const lang = 'en';
    const t = i18n[lang];
    const rateLimits = new Map();

    try {
      const [, action, giveawayId] = interaction.customId.split('_');
      await db.read();
      const giveawayData = db.data.giveaways.find(g => g.giveawayId === giveawayId);
      if (!giveawayData || !giveawayData.active) {
        return interaction.reply(createErrorEmbed({ description: t.error }));
      }

      // Rate limiting
      const now = Date.now();
      const lastInteraction = rateLimits.get(interaction.user.id) || 0;
      if (now - lastInteraction < 5000) {
        return interaction.reply(createErrorEmbed({ description: t.rate_limit }));
      }
      rateLimits.set(interaction.user.id, now);

      // Check role
      const role = giveawayData.roleId ? await interaction.guild.roles.fetch(giveawayData.roleId).catch(() => null) : null;
      if (role && !interaction.member.roles.cache.has(role.id)) {
        return interaction.reply(createErrorEmbed({ description: t.no_role.replace('{role}', role.name) }));
      }

      if (action === 'join') {
        if (!giveawayData.entries.includes(interaction.user.id)) {
          giveawayData.entries.push(interaction.user.id);
          await interaction.reply(createSuccessEmbed({
            title: t.entry_confirmed,
            description: t.entered_prize.replace('{prize}', giveawayData.prize),
            thumbnail: interaction.user.avatarURL(),
          }));
        } else {
          await interaction.reply(createWarningEmbed({
            title: 'Already Entered',
            description: 'You’re already in the giveaway!',
          }));
        }
      } else if (action === 'leave') {
        if (giveawayData.entries.includes(interaction.user.id)) {
          giveawayData.entries = giveawayData.entries.filter(id => id !== interaction.user.id);
          await interaction.reply(createWarningEmbed({
            title: t.entry_removed,
            description: t.left_giveaway.replace('{prize}', giveawayData.prize),
          }));
        } else {
          await interaction.reply(createWarningEmbed({
            title: 'Not Entered',
            description: 'You’re not in the giveaway!',
          }));
        }
      }

      await db.write();
      logger.info(`User ${interaction.user.tag} ${action}ed giveaway (ID: ${giveawayData.id})`);
    } catch (error) {
      logger.error(`Error processing giveaway button by ${interaction.user.tag}`, error);
      await interaction.reply(createErrorEmbed({ description: t.error }));
    }
  },

  async runGiveaway(client, giveaway, message, role, t) {
    try {
      const updateInterval = setInterval(async () => {
        try {
          await db.read();
          const giveawayData = db.data.giveaways.find(g => g.id === giveaway.id);
          if (!giveawayData || !giveawayData.active) return clearInterval(updateInterval);

          const elapsed = Date.now() - giveawayData.startTime;
          if (elapsed >= giveawayData.durationMs) return;

          const updatedEmbed = createSuccessEmbed({
            title: t.giveaway_started,
            description: `**${t.prize}**: ${giveawayData.prize}\n**${t.winners}**: ${giveawayData.winners}\n**${t.ends}**: <t:${Math.floor(giveawayData.endTime / 1000)}:R>\n${
              role ? `**${t.role_needed}**: ${role.name}\n` : ''
            }${t.join_to_enter}`,
            fields: [
              { name: t.entries, value: `${giveawayData.entries.length}`, inline: true },
              { name: t.progress, value: createProgressBar(elapsed, giveawayData.durationMs), inline: true },
            ],
            thumbnail: message.guild.iconURL({ dynamic: true }),
          });

          await message.edit({ embeds: updatedEmbed.embeds, components: message.components });
        } catch (error) {
          logger.error(`Error updating giveaway embed (ID: ${giveaway.id})`, error);
          clearInterval(updateInterval);
        }
      }, 60000); // Update every 60 seconds

      setTimeout(async () => {
        try {
          await db.read();
          const giveawayData = db.data.giveaways.find(g => g.id === giveaway.id);
          if (!giveawayData) return logger.warn(`Giveaway ${giveaway.id} not found at end`);

          giveawayData.active = false;
          const joinButton = ButtonBuilder.from(message.components[0].components[0]).setDisabled(true);
          const leaveButton = ButtonBuilder.from(message.components[0].components[1]).setDisabled(true);
          const row = new ActionRowBuilder().addComponents(joinButton, leaveButton);

          // Select winners
          let winnerText = t.no_entries;
          if (giveawayData.entries.length > 0) {
            const shuffled = [...giveawayData.entries].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(giveawayData.winners, giveawayData.entries.length));
            winnerText = t.winners_announced.replace('{winners}', selected.map(id => `<@${id}>`).join(', '));
          }

          const finalEmbed = createSuccessEmbed({
            title: t.giveaway_ended,
            description: `**${t.prize}**: ${giveawayData.prize}\n**${t.winners}**: ${giveawayData.winners}\n**${t.entries}**: ${giveawayData.entries.length}\n${winnerText}`,
            thumbnail: message.guild.iconURL({ dynamic: true }),
          });

          await message.edit({ embeds: finalEmbed.embeds, components: [row] });
          logger.info(`Giveaway (ID: ${giveaway.id}) ended with ${giveawayData.entries.length} entries`);

          if (giveawayData.entries.length > 0) {
            await message.channel.send({ content: `Congratulations to the winners of **${giveawayData.prize}**: ${winnerText}!` });
          }

          // Clean up database
          db.data.giveaways = db.data.giveaways.filter(g => g.id !== giveaway.id);
          await db.write();
        } catch (error) {
          logger.error(`Error ending giveaway (ID: ${giveaway.id})`, error);
        }
      }, giveaway.durationMs);
    } catch (error) {
      logger.error(`Error running giveaway (ID: ${giveaway.id})`, error);
    }
  },

  async initialize(client) {
    try {
      await db.read();
      if (!db.data) db.data = defaultData;
      const now = Date.now();
      const activeGiveaways = db.data.giveaways.filter(g => g.active && now < g.endTime);
      const expiredGiveaways = db.data.giveaways.filter(g => g.active && now >= g.endTime);

      // Handle expired giveaways
      for (const giveaway of expiredGiveaways) {
        try {
          const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
          if (!guild) {
            logger.warn(`Guild not found for expired giveaway (ID: ${giveaway.id})`);
            continue;
          }
          const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
          if (!channel) {
            logger.warn(`Channel not found for expired giveaway (ID: ${giveaway.id})`);
            continue;
          }
          const message = await channel.messages.fetch(giveaway.id).catch(() => null);
          if (!message) {
            logger.warn(`Message not found for expired giveaway (ID: ${giveaway.id})`);
            continue;
          }

          giveaway.active = false;
          let winnerText = i18n.en.no_entries;
          if (giveaway.entries.length > 0) {
            const shuffled = [...giveaway.entries].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(giveaway.winners, giveaway.entries.length));
            winnerText = i18n.en.winners_announced.replace('{winners}', selected.map(id => `<@${id}>`).join(', '));
          }

          const finalEmbed = createSuccessEmbed({
            title: i18n.en.giveaway_ended,
            description: `**${i18n.en.prize}**: ${giveaway.prize}\n**${i18n.en.winners}**: ${giveaway.winners}\n**${i18n.en.entries}**: ${giveaway.entries.length}\n${winnerText}`,
            thumbnail: guild.iconURL({ dynamic: true }),
          });

          await message.edit({ embeds: finalEmbed.embeds, components: [] });
          if (giveaway.entries.length > 0) {
            await channel.send({ content: `Congratulations to the winners of **${giveaway.prize}**: ${winnerText}!` });
          }
          logger.info(`Ended expired giveaway (ID: ${giveaway.id}) on startup`);
        } catch (error) {
          logger.error(`Error ending expired giveaway (ID: ${giveaway.id})`, error);
        }
      }

      // Resume active giveaways
      for (const giveaway of activeGiveaways) {
        try {
          const guild = await client.guilds.fetch(giveaway.guildId).catch(() => null);
          if (!guild) {
            logger.warn(`Guild not found for active giveaway (ID: ${giveaway.id})`);
            giveaway.active = false;
            continue;
          }
          const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
          if (!channel) {
            logger.warn(`Channel not found for active giveaway (ID: ${giveaway.id})`);
            giveaway.active = false;
            continue;
          }
          const message = await channel.messages.fetch(giveaway.id).catch(() => null);
          if (!message) {
            logger.warn(`Message not found for active giveaway (ID: ${giveaway.id})`);
            giveaway.active = false;
            continue;
          }

          const role = giveaway.roleId ? await guild.roles.fetch(giveaway.roleId).catch(() => null) : null;
          const remainingTime = giveaway.endTime - now;

          if (remainingTime <= 0) {
            giveaway.active = false;
            continue;
          }

          // Update giveaway duration
          giveaway.durationMs = remainingTime;
          await db.write();

          // Resume giveaway
          await this.runGiveaway(client, giveaway, message, role, i18n.en);
          logger.info(`Resumed active giveaway (ID: ${giveaway.id})`);
        } catch (error) {
          logger.error(`Error resuming active giveaway (ID: ${giveaway.id})`, error);
          giveaway.active = false;
        }
      }

      // Clean up inactive giveaways
      db.data.giveaways = db.data.giveaways.filter(g => g.active);
      await db.write();
    } catch (error) {
      logger.error('Error during giveaway initialization', error);
    }
  },
};