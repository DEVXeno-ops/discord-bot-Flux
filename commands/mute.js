const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member in the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to mute').setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Duration (e.g., 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the mute').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized mute attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to mute members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Bot lacks Moderate Members permission for mute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to mute members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for mute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This user is not in the server.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!member.moderatable) {
        logger.warn(`Cannot mute ${target.tag}: Not moderatable by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription(
                `I can't mute ${target.tag}. Their role is likely higher than mine.`
              )
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to mute themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't mute yourself!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const timeMatch = duration.match(/^(\d+)([smhd])$/);
      if (!timeMatch) {
        logger.info(`Invalid duration ${duration} for mute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('Invalid duration! Use e.g., 10m, 1h, 1d.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      const ms = {
        s: amount * 1000,
        m: amount * 60 * 1000,
        h: amount * 60 * 60 * 1000,
        d: amount * 24 * 60 * 60 * 1000,
      }[unit];

      if (ms > 28 * 24 * 60 * 60 * 1000) {
        logger.info(`Duration ${duration} exceeds 28d for mute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('Mute duration cannot exceed 28 days.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      await member.timeout(ms, reason);
      logger.info(`Muted ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, duration: ${duration}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔇 Member Muted')
            .addFields(
              { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
              { name: 'Duration', value: duration, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in mute for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to mute the member.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};