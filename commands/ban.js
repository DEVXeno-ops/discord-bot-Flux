const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Unauthorized ban attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to ban members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Bot lacks Ban Members permission for ban by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to ban members!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to ban themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't ban yourself!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (target.bot) {
        logger.warn(`User ${interaction.user.tag} attempted to ban bot ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't ban a bot!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      try {
        await interaction.guild.members.ban(target, { reason });
        logger.info(`Banned ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('✅ Member Banned')
              .addFields(
                { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true }
              )
              .setTimestamp(),
          ],
        });
      } catch (error) {
        if (error.code === 50013) {
          logger.warn(`Failed to ban ${target.tag}: Role hierarchy or permissions issue`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Troublemaker!')
                .setDescription(
                  `I can't ban ${target.tag}. Ensure my role is above theirs.`
                )
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Error in ban for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to ban the member.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};