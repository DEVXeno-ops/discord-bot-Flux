const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const warningsFile = path.join(__dirname, '../warnings.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to clear warnings for').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are warnings cleared?').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      // Permission check
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized clearwarnings attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Moderate Members** permission to clear warnings.")
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
          logger.info(`No warnings file found for clearwarnings by ${interaction.user.tag}`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Oops!')
                .setDescription(`${target.tag} has no warnings to clear.`)
                .setFooter({ text: 'Bot v1.0.0' })
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }

      if (!warningsData[target.id] || warningsData[target.id].length === 0) {
        logger.info(`No warnings found for ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} has no warnings to clear.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Clear warnings
      delete warningsData[target.id];
      await fs.writeFile(warningsFile, JSON.stringify(warningsData, null, 2));
      logger.info(`Cleared warnings for ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);

      // Notify user
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('✅ Warnings Cleared')
              .setDescription(
                `Your warnings in **${interaction.guild.name}** have been cleared.\n**Reason**: ${reason}`
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
        logger.info(`Notified ${target.tag} of cleared warnings`);
      } catch (dmError) {
        logger.warn(`Failed to DM ${target.tag} for cleared warnings: ${dmError.message}`);
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Warnings Cleared')
            .addFields(
              { name: 'User', value: `${target.tag} (ID: ${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /warnings to check | Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error clearing warnings for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while clearing warnings.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};