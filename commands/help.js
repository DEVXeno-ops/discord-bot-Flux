const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('List all commands'),
  cooldown: 3,
  async execute(interaction) {
    try {
      const commands = interaction.client.commands
        .map(c => `**/${c.data.name}**: ${c.data.description}`)
        .sort()
        .join('\n');
      logger.info(`Help viewed by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📜 Commands')
            .setDescription(commands || 'No commands available.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in help by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to list commands.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};