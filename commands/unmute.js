const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member in the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to unmute').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the unmute').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized unmute attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to unmute members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Bot lacks Moderate Members permission for unmute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to unmute members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for unmute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This user is not in the server.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!member.isCommunicationDisabled()) {
        logger.info(`User ${target.tag} not muted for unmute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This user is not muted.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!member.moderatable) {
        logger.warn(`Cannot unmute ${target.tag}: Not moderatable by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription(
                `I can't unmute ${target.tag}. Their role is likely higher than mine.`
              )
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      await member.timeout(null, reason);
      logger.info(`Unmuted ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔊 Member Unmuted')
            .addFields(
              { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in unmute for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to unmute the member.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};