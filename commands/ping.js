const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency'),
  async execute(interaction) {
    try {
      const latency = Date.now() - interaction.createdTimestamp;
      logger.info(`Ping command by ${interaction.user.tag}, latency: ${latency}ms`);
      const pingEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('==')
        .setDescription(`Latency: **${latency}ms**`)
        .setTimestamp();
      await interaction.reply({ embeds: [pingEmbed] });
    } catch (error) {
      logger.error('Error in ping command', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while checking latency!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};