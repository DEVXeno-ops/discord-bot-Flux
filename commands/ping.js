// commands/ping.js
// Displays bot and API latency with a neon-themed embed

const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed } = require('../utils/embeds');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Measure bot and API response times'),
  cooldown: 3,
  async execute(interaction) {
    try {
      // Measure latency
      const startTime = Date.now();
      await interaction.deferReply();

      const apiLatency = interaction.client.ws.ping;
      const botLatency = Date.now() - startTime;

      logger.info(`Ping command by ${interaction.user.tag}`);
      return interaction.editReply(
        createSuccessEmbed({
          title: 'ping',
          description: 'Response times are lightning-fast!',
          fields: [
            { name: '🌩️ API', value: `${apiLatency}ms`, inline: true },
            { name: '⚡ Bot', value: `${botLatency}ms`, inline: true },
          ],
          thumbnail: interaction.client.user.avatarURL(),
        })
      );
    } catch (error) {
      logger.error(`Error in ping by ${interaction.user.tag}`, error);
      return interaction.editReply(
        createErrorEmbed({
          description: 'Couldn’t measure latency.',
        })
      );
    }
  },
};