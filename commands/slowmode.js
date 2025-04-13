const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .addIntegerOption(option =>
      option
        .setName('seconds')
        .setDescription('Slowmode duration in seconds (0 to disable, max 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to set slowmode (default: current)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for slowmode').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        logger.warn(`Unauthorized slowmode attempt by ${interaction.user.tag} for ${channel.name}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to set slowmode!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        logger.warn(`Bot lacks Manage Channels permission in ${channel.name} for slowmode by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to manage this channel!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!channel.isTextBased()) {
        logger.warn(`Slowmode attempted in non-text channel ${channel.name} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This command only works in text channels.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      await channel.setRateLimitPerUser(seconds, reason);
      logger.info(`Set slowmode to ${seconds}s in ${channel.name} by ${interaction.user.tag}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⏳ Slowmode Set')
            .addFields(
              { name: 'Channel', value: channel.toString(), inline: true },
              { name: 'Slowmode', value: seconds === 0 ? 'Disabled' : `${seconds} seconds`, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in slowmode for ${channel.name} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to set slowmode.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};