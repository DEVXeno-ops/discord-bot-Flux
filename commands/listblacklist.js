const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listblacklist')
    .setDescription('List all blacklisted users')
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
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to view the blacklist!")
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
                .setDescription('The blacklist is empty.')
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
              .setDescription('The blacklist is empty.')
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
              .setTitle('❗ Troublemaker!')
              .setDescription(`Invalid page number. There are only ${totalPages} page(s).`)
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const start = (page - 1) * perPage;
      const end = start + perPage;
      const entries = blacklist.slice(start, end).map(
        e =>
          `**ID**: ${e.id}\n**Tag**: ${e.tag}\n**Reason**: ${e.reason}\n**Moderator**: ${e.moderator}\n**Time**: ${e.timestamp}`
      );

      logger.info(`Blacklist page ${page} viewed by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📜 Blacklist')
            .setDescription(entries.join('\n\n') || 'No entries on this page.')
            .setFooter({ text: `Page ${page} of ${totalPages} | Total: ${blacklist.length}` })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in listblacklist page ${page} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to list the blacklist.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};