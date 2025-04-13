const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages in the channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    try {
      const amount = interaction.options.getInteger('amount');
      const channel = interaction.channel;

      if (!channel.isTextBased()) {
        logger.warn(`Attempted clear in non-text channel by ${interaction.user.tag}`);
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❗ Error')
          .setDescription('This command can only be used in text channels!')
          .setTimestamp();
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      await channel.bulkDelete(amount, true);
      logger.info(`Deleted ${amount} messages in ${channel.name} by ${interaction.user.tag}`);
      const successEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('✅ Messages Cleared')
        .setDescription(`Deleted **${amount}** messages successfully!`)
        .setTimestamp();
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      logger.error(`Error in clear command`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while deleting messages!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};