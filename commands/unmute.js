const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('This member is not in the server!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      if (!member.isCommunicationDisabled()) {
        logger.warn(`Member ${target.tag} is not muted`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('This member is not currently muted!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      if (!member.moderatable) {
        logger.warn(`Cannot manage ${target.tag}: Higher or equal permissions`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('I cannot manage this member! They may have higher or equal permissions')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await member.timeout(null, reason);
      logger.info(`Unmuted ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      const successEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('✅ Member Unmuted')
        .addFields(
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error(`Error in unmute command for ${interaction.options.getUser('user')?.tag}`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while unmuting the member!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};