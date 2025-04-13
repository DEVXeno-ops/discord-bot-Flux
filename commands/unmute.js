const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member in the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to unmute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the unmute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        logger.warn(`Member ${target.tag} not found in the server`);
        return interaction.reply({ content: 'This member is not in the server!', ephemeral: true });
      }

      if (!member.isCommunicationDisabled()) {
        logger.warn(`Member ${target.tag} is not muted`);
        return interaction.reply({ content: 'This member is not currently muted!', ephemeral: true });
      }

      if (!member.moderatable) {
        logger.warn(`Cannot manage ${target.tag}: Higher or equal permissions`);
        return interaction.reply({ content: 'I cannot manage this member! They may have higher or equal permissions', ephemeral: true });
      }

      await member.timeout(null, reason);
      logger.info(`Unmuted ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      await interaction.reply(`✅ Unmuted **${target.tag}** successfully! Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in unmute command for ${interaction.options.getUser('user')?.tag}`, error);
      throw error;
    }
  },
};