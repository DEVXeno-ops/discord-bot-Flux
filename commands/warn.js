const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member in the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
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

      if (member.user.bot) {
        logger.warn(`Attempted to warn bot ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({ content: 'Cannot warn a bot!', ephemeral: true });
      }

      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        logger.warn(`Attempted to warn administrator ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({ content: 'Cannot warn a server administrator!', ephemeral: true });
      }

      // Send DM to the member (if possible)
      try {
        await target.send(`You have been warned in **${interaction.guild.name}**!\nReason: ${reason}\nWarned by: ${interaction.user.tag}`);
        logger.info(`Sent warning DM to ${target.tag}`);
      } catch (dmError) {
        logger.warn(`Could not send DM to ${target.tag}`, dmError);
      }

      logger.info(`Warned ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      await interaction.reply(`✅ Warned **${target.tag}** successfully! Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in warn command for ${interaction.options.getUser('user')?.tag}`, error);
      throw error;
    }
  },
};