const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const warningsFile = path.join(__dirname, '../warnings.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to warn').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are they warned?').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized warn attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Moderate Members** permission to warn members.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for warn by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} is not in this server.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.bot) {
        logger.warn(`Attempted to warn bot ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You can't warn bots.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to warn themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You can't warn yourself!")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Store warning
      let warningsData = {};
      try {
        const data = await fs.readFile(warningsFile, 'utf8');
        warningsData = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      if (!warningsData[target.id]) warningsData[target.id] = [];
      warningsData[target.id].push({
        reason,
        moderator: interaction.user.tag,
        timestamp: new Date().toISOString(),
      });

      await fs.writeFile(warningsFile, JSON.stringify(warningsData, null, 2));
      logger.info(`Warned ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);

      // Send DM
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('⚠️ Warning Received')
              .setDescription(
                `You were warned in **${interaction.guild.name}**.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}`
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
        logger.info(`Sent warning DM to ${target.tag}`);
      } catch (dmError) {
        logger.warn(`Failed to send warning DM to ${target.tag}: ${dmError.message}`);
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⚠️ Member Warned')
            .addFields(
              { name: 'User', value: `${target.tag} (ID: ${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /warnings to view history | Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error warning ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while issuing the warning.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};