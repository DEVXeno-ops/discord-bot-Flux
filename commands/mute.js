const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Temporarily silence a member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to mute').setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('How long? (e.g., 10s, 5m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are they muted?').setRequired(false)
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
              .setTitle('❗ Oops!')
              .setDescription("You need **Moderate Members** permission to mute users.")
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription(
                "I need **Moderate Members** permission to mute users. Check my role in Server Settings > Roles."
              )
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} is not in this server.`)
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription(
                `I can’t mute ${target.tag} (ID: ${target.id}). My role must be higher than theirs in Server Settings > Roles.`
              )
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription("You can’t mute yourself!")
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription(
                'Invalid duration format. Use a number followed by s (seconds), m (minutes), h (hours), or d (days). Example: `10m`'
              )
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription('Mute duration cannot exceed 28 days. Try a shorter time.')
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (ms < 1000) {
        logger.info(`Duration ${duration} too short for mute by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription('Mute duration must be at least 1 second.')
              .setFooter({ text: 'Bot v1.0.0' })
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
              { name: 'User', value: `${target.tag} (ID: ${target.id})`, inline: true },
              { name: 'Duration', value: duration, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error muting ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while muting. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};