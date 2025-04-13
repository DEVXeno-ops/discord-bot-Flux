const { SlashCommandBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency'),
  async execute(interaction) {
    try {
      const latency = Date.now() - interaction.createdTimestamp;
      await interaction.reply(`Pong! Latency: ${latency}ms`);
      logger.info(`Ping command by ${interaction.user.tag}, latency: ${latency}ms`);
    } catch (error) {
      logger.error('Error in ping command', error);
      throw error;
    }
  },
};