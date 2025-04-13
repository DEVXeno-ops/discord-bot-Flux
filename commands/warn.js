const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member in the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to warn').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the warning').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        logger.warn(`Unauthorized warn attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to warn members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for warn by ${interaction.user.tag}`);
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

      if (target.bot) {
        logger.warn(`Attempted to warn bot ${target.tag} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't warn a bot!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to warn themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't warn yourself!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('⚠️ Warning')
              .setDescription(
                `You have been warned in **${interaction.guild.name}**.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}`
              )
              .setTimestamp(),
          ],
        });
        logger.info(`Sent warning DM to ${target.tag} by ${interaction.user.tag}`);
      } catch (dmError) {
        logger.warn(`Failed to DM warning to ${target.tag}: ${dmError.message}`);
      }

      logger.info(`Warned ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('⚠️ Member Warned')
            .addFields(
              { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in warn for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to warn the member.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};