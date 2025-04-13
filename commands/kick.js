const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
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

      if (!member.kickable) {
        logger.warn(`Cannot kick ${target.tag}: Higher or equal permissions`);
        return interaction.reply({ content: 'I cannot kick this member! They may have higher or equal permissions', ephemeral: true });
      }

      await member.kick(reason);
      logger.info(`Kicked ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      await interaction.reply(`✅ Kicked **${target.tag}** from the server! Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in kick command for ${interaction.options.getUser('user')?.tag}`, error);
      throw error;
    }
  },
};