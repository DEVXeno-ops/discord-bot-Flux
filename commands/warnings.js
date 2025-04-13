const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const warningsFile = path.join(__dirname, '../warnings.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a member’s warning history')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to check').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('user');

    try {
      // Permission check
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized warnings check by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Moderate Members** permission to view warnings.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Load warnings
      let warningsData = {};
      try {
        const data = await fs.readFile(warningsFile, 'utf8');
        warningsData = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info(`Warnings file not found for check by ${interaction.user.tag}`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚠️ Warning History')
                .setDescription(`${target.tag} (ID: ${target.id}) has no warnings.`)
                .setFooter({ text: 'Bot v1.0.0' })
                .setTimestamp(),
            ],
          });
        }
        throw error;
      }

      const userWarnings = warningsData[target.id] || [];
      if (userWarnings.length === 0) {
        logger.info(`No warnings found for ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('⚠️ Warning History')
              .setDescription(`${target.tag} (ID: ${target.id}) has no warnings.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
      }

      // Paginate warnings (5 per page)
      const perPage = 5;
      const entries = userWarnings.map(
        (w, i) =>
          `**#${i + 1}** <t:${Math.floor(new Date(w.timestamp) / 1000)}:R>\n**Reason**: ${w.reason}\n**Moderator**: ${w.moderator}`
      );

      logger.info(`Viewed warnings for ${target.tag} by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⚠️ Warning History')
            .setDescription(entries.join('\n\n') || 'No warnings found.')
            .addFields({
              name: 'Total Warnings',
              value: `${userWarnings.length}`,
              inline: true,
            })
            .setFooter({ text: 'Use /warn to add warnings | Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error viewing warnings for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while viewing warnings.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};