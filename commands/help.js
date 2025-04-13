const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show a list of all commands'),
  async execute(interaction) {
    try {
      const commandList = interaction.client.commands
        .map(cmd => `**/${cmd.data.name}**: ${cmd.data.description}`)
        .join('\n') || 'No commands available';
      logger.info(`Help command by ${interaction.user.tag}`);
      const helpEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📜 Command List')
        .setDescription(commandList)
        .setFooter({ text: 'Bot v1.0.0' })
        .setTimestamp();
      await interaction.reply({ embeds: [helpEmbed] });
    } catch (error) {
      logger.error('Error in help command', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while listing commands!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};