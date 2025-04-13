const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages in the channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        logger.warn(`Unauthorized clear attempt by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to clear messages!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissionsIn(interaction.channel).has(PermissionFlagsBits.ManageMessages)) {
        logger.warn(`Bot lacks Manage Messages permission in ${interaction.channel.name} for clear by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to clear messages in this channel!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.channel.isTextBased()) {
        logger.warn(`Clear attempted in non-text channel by ${interaction.user.tag}`);
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

      const deleted = await interaction.channel.bulkDelete(amount, true);
      logger.info(`Cleared ${deleted.size} messages in ${interaction.channel.name} by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🗑️ Messages Cleared')
            .setDescription(`Deleted ${deleted.size} message(s).`)
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`Error in clear by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to clear messages.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};