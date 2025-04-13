const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('This member is not in the server!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      if (member.user.bot) {
        logger.warn(`Attempted to warn bot ${target.tag} by ${interaction.user.tag}`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('Cannot warn a bot!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        logger.warn(`Attempted to warn administrator ${target.tag} by ${interaction.user.tag}`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('Cannot warn a server administrator!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      try {
        await target.send(`You have been warned in **${interaction.guild.name}**!\n**Reason**: ${reason}\n**Warned by**: ${interaction.user.tag}`);
        logger.info(`Sent warning DM to ${target.tag}`);
      } catch (dmError) {
        logger.warn(`Could not send DM to ${target.tag}`, dmError);
      }

      logger.info(`Warned ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);
      const successEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('✅ Member Warned')
        .addFields(
          { name: 'User', value: `${target.tag}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error(`Error in warn command for ${interaction.options.getUser('user')?.tag}`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while warning the member!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};