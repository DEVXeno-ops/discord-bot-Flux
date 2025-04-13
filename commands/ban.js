const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      await interaction.guild.members.ban(target, { reason });
      logger.info(`Banned ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      await interaction.reply(`✅ Banned **${target.tag}** from the server! Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in ban command for ${interaction.options.getUser('user')?.tag}`, error);
      throw error;
    }
  },
};