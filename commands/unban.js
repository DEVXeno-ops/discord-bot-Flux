const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server (non-blacklist bans)')
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('The user ID to unban (e.g., 123456789012345678)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are they unbanned?').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      // Permission checks
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Unauthorized unban attempt by ${interaction.user.tag} for ID ${userId}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Ban Members** permission to unban users.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Bot lacks Ban Members permission for unban by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                "I need **Ban Members** permission to unban users. Check my role in Server Settings > Roles."
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Validate ID
      if (!/^\d{17,19}$/.test(userId)) {
        logger.warn(`Invalid user ID ${userId} for unban by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription('Please enter a valid user ID (e.g., 123456789012345678).')
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Check blacklist
      let blacklist = [];
      try {
        const data = await fs.readFile(blacklistFile, 'utf8');
        blacklist = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      if (blacklist.some(e => e.id === userId)) {
        logger.info(`User ID ${userId} is blacklisted, unban attempted by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                `User ID ${userId} is blacklisted. Use **/unblacklist ${userId}** to remove them from the blacklist and unban.`
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Attempt unban
      try {
        await interaction.guild.members.unban(userId, reason);
        logger.info(`Unbanned user ID ${userId} by ${interaction.user.tag}, reason: ${reason}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('✅ User Unbanned')
              .addFields(
                { name: 'User ID', value: userId, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
      } catch (error) {
        if (error.code === 10026) {
          logger.info(`No ban found for user ID ${userId} during unban by ${interaction.user.tag}`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Oops!')
                .setDescription(`User ID ${userId} is not banned in this server.`)
                .setFooter({ text: 'Bot v1.0.0' })
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Error unbanning ID ${userId} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while unbanning. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};