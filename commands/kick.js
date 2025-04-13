const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('This member is not in the server!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      if (!member.kickable) {
        logger.warn(`Cannot kick ${target.tag}: Higher or equal permissions`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('I cannot kick this member! They may have higher or equal permissions')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await member.kick(reason);
      logger.info(`Kicked ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      const successEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('✅ Member Kicked')
        .addFields(
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error(`Error in kick command for ${interaction.options.getUser('user')?.tag}`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while kicking the member!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};