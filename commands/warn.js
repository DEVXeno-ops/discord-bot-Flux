// commands/warn.js
// Issues warnings with a modal for reason input

const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs/promises');
const { createSuccessEmbed, createErrorEmbed, checkPermissions } = require('../utils/embeds');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member for rule-breaking')
    .addUserOption(option =>
      option.setName('user').setDescription('Who to warn').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');

    try {
      // Check permissions
      const permCheck = checkPermissions(interaction.member, PermissionFlagsBits.ModerateMembers, 'warn', logger);
      if (permCheck) return interaction.reply(permCheck);

      // Validate target
      if (target.bot) {
        return interaction.reply(
          createErrorEmbed({
            description: 'Cannot warn bots.',
          })
        );
      }
      if (target.id === interaction.user.id) {
        return interaction.reply(
          createErrorEmbed({
            description: 'Cannot warn yourself.',
          })
        );
      }

      // Show modal for reason
      const modal = new ModalBuilder()
        .setCustomId('warn_reason')
        .setTitle('Warn Reason');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for Warning')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('E.g., Spamming in general chat')
        .setMaxLength(500)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);

      // Handle modal submission
      const filter = i => i.customId === 'warn_reason' && i.user.id === interaction.user.id;
      const submission = await interaction.awaitModalSubmit({ filter, time: 5 * 60 * 1000 }).catch(() => null);

      if (!submission) {
        return interaction.followUp(
          createErrorEmbed({
            description: 'No reason provided. Warning cancelled.',
          })
        );
      }

      const reason = submission.fields.getTextInputValue('reason');
      await submission.deferReply();

      // Log warning
      const warnings = JSON.parse(await fs.readFile('warnings.json', 'utf-8').catch(() => '{}'));
      warnings[target.id] = warnings[target.id] || [];
      warnings[target.id].push({
        reason,
        moderator: interaction.user.tag,
        timestamp: new Date().toISOString(),
      });
      await fs.writeFile('warnings.json', JSON.stringify(warnings, null, 2));

      // Notify user
      await target.send(
        createWarningEmbed({
          title: 'Warning Received',
          description: `You were warned in **${interaction.guild.name}**.\n**Reason**: ${reason}`,
        })
      ).catch(() => logger.warn(`Couldn’t DM warning to ${target.tag}`));

      logger.info(`Warned ${target.tag} by ${interaction.user.tag}: ${reason}`);
      return submission.editReply(
        createSuccessEmbed({
          title: 'User Warned',
          description: `**${target.tag}** has been warned.`,
          fields: [{ name: 'Reason', value: reason, inline: false }],
          thumbnail: target.avatarURL(),
        })
      );
    } catch (error) {
      logger.error(`Error in warn by ${interaction.user.tag}`, error);
      return interaction.followUp(
        createErrorEmbed({
          description: 'Couldn’t issue warning.',
        })
      );
    }
  },
};