const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        return interaction.reply({ content: 'This command can only be used in text channels!', ephemeral: true });
      }

      await channel.bulkDelete(amount, true);
      logger.info(`Deleted ${amount} messages in ${channel.name} by ${interaction.user.tag}`);
      await interaction.reply({ content: `✅ Deleted **${amount}** messages successfully!`, ephemeral: true });
    } catch (error) {
      logger.error(`Error in clear command`, error);
      await interaction.reply({ content: 'An error occurred while deleting messages!', ephemeral: true });
    }
  },
};