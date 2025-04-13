const { SlashCommandBuilder } = require('discord.js');
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
      await interaction.reply(`📜 Command List:\n${commandList}`);
      logger.info(`Help command by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in help command', error);
      throw error;
    }
  },
};