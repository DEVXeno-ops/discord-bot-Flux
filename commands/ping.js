const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription("Check the bot's latency"),
  cooldown: 3,
  async execute(interaction) {
    try {
      const latency = Date.now() - interaction.createdTimestamp;
      logger.info(`Ping by ${interaction.user.tag}, latency: ${latency}ms`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🏓')
            .addFields({ name: 'Latency', value: `${latency}ms`, inline: true })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in ping by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to check latency.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};