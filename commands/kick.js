const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to kick').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        logger.warn(`Unauthorized kick attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to kick members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        logger.warn(`Bot lacks Kick Members permission for kick by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to kick members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for kick by ${interaction.user.tag}`);
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

      if (!member.kickable) {
        logger.warn(`Cannot kick ${target.tag}: Not kickable by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription(
                `I can't kick ${target.tag}. Their role is likely higher than mine.`
              )
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to kick themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't kick yourself!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      await member.kick(reason);
      logger.info(`Kicked ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Member Kicked')
            .addFields(
              { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in kick for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to kick the member.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};