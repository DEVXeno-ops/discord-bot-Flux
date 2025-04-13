const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member in the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to mute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Duration (e.g., 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        logger.warn(`Member ${target.tag} not found in the server`);
        return interaction.reply({ content: 'This member is not in the server!', ephemeral: true });
      }

      if (!member.moderatable) {
        logger.warn(`Cannot mute ${target.tag}: Higher or equal permissions`);
        return interaction.reply({ content: 'I cannot mute this member! They may have higher or equal permissions', ephemeral: true });
      }

      const timeMatch = duration.match(/^(\d+)([smhd])$/);
      if (!timeMatch) {
        logger.warn(`Invalid duration format: ${duration} by ${interaction.user.tag}`);
        return interaction.reply({ content: 'Invalid duration format! Use e.g., 10m, 1h, 1d', ephemeral: true });
      }

      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      let ms;
      switch (unit) {
        case 's': ms = amount * 1000; break;
        case 'm': ms = amount * 60 * 1000; break;
        case 'h': ms = amount * 60 * 60 * 1000; break;
        case 'd': ms = amount * 24 * 60 * 60 * 1000; break;
        default: throw new Error('Invalid time unit');
      }

      if (ms > 28 * 24 * 60 * 60 * 1000) {
        logger.warn(`Mute duration exceeds 28 days: ${duration} by ${interaction.user.tag}`);
        return interaction.reply({ content: 'Mute duration cannot exceed 28 days!', ephemeral: true });
      }

      await member.timeout(ms, reason);
      logger.info(`Muted ${target.tag} by ${interaction.user.tag}, duration: ${duration}, reason: ${reason}`);
      await interaction.reply(`✅ Muted **${target.tag}** successfully! Duration: ${duration}, Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in mute command for ${interaction.options.getUser('user')?.tag}`, error);
      throw error;
    }
  },
};