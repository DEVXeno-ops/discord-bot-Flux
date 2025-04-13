const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listblacklist')
    .setDescription('View all blacklisted users')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number to view (default: 1)')
        .setRequired(false)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const page = interaction.options.getInteger('page') || 1;
    const perPage = 5;

    try {
      // Permission check
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Unauthorized listblacklist attempt by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Ban Members** permission to view the blacklist.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Load blacklist
      let blacklist = [];
      try {
        const data = await fs.readFile(blacklistFile, 'utf8');
        blacklist = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info(`Blacklist file not found for listblacklist by ${interaction.user.tag}`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Blacklist')
                .setDescription('No users are currently blacklisted.')
                .setFooter({ text: 'Bot v1.0.0' })
                .setTimestamp(),
            ],
          });
        }
        throw error;
      }

      if (blacklist.length === 0) {
        logger.info(`Empty blacklist viewed by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('📜 Blacklist')
              .setDescription('No users are currently blacklisted.')
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
      }

      // Pagination
      const totalPages = Math.ceil(blacklist.length / perPage);
      if (page > totalPages) {
        logger.info(`Invalid page ${page} requested by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`There are only ${totalPages} page(s). Try a lower page number.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const start = (page - 1) * perPage;
      const end = start + perPage;
      const entries = blacklist.slice(start, end).map(
        e =>
          `**ID**: ${e.id}\n**Tag**: ${e.tag}\n**Reason**: ${e.reason}\n**Moderator**: ${e.moderator}\n**Blacklisted**: <t:${Math.floor(new Date(e.timestamp) / 1000)}:R>`
      );

      logger.info(`Viewed blacklist page ${page} by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📜 Blacklist')
            .setDescription(entries.join('\n\n') || 'No entries on this page.')
            .addFields({
              name: 'Total Blacklisted',
              value: `${blacklist.length} user(s)`,
              inline: true,
            })
            .setFooter({
              text: `Page ${page} of ${totalPages} | Use /unblacklist to remove | Bot v1.0.0`,
            })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error listing blacklist page ${page} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while viewing the blacklist.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};