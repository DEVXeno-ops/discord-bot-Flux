const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel to allow sending messages')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to unlock (default: current)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for unlocking').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        logger.warn(`Unauthorized unlock attempt by ${interaction.user.tag} for ${channel.name}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to unlock channels!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        logger.warn(`Bot lacks Manage Channels permission in ${channel.name} for unlock by ${interaction.user.tag}`);
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
        logger.warn(`Unlock attempted in non-text channel ${channel.name} by ${interaction.user.tag}`);
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

      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      }, { reason });
      logger.info(`Unlocked ${channel.name} by ${interaction.user.tag}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔓 Channel Unlocked')
            .addFields(
              { name: 'Channel', value: channel.toString(), inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in unlock for ${channel.name} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to unlock the channel.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};