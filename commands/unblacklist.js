const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Remove a user from the blacklist and unban them')
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('The user ID to unblacklist (e.g., 123456789012345678)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are they unblacklisted?').setRequired(false)
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
        logger.warn(`Unauthorized unblacklist attempt by ${interaction.user.tag} for ID ${userId}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Ban Members** permission to use this command.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Bot lacks Ban Members permission for unblacklist by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                "I need **Ban Members** permission to unblacklist users. Please update my role in Server Settings > Roles."
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Validate ID
      if (!/^\d{17,19}$/.test(userId)) {
        logger.warn(`Invalid user ID ${userId} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                'Please enter a valid user ID (e.g., 123456789012345678). Find it via `/listblacklist` or user profile.'
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Load blacklist
      let blacklist = [];
      try {
        const data = await fs.readFile(blacklistFile, 'utf8');
        blacklist = JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info(`Blacklist file not found for unblacklist by ${interaction.user.tag}`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Oops!')
                .setDescription('No users are currently blacklisted.')
                .setFooter({ text: 'Bot v1.0.0' })
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }

      // Check blacklist
      const entry = blacklist.find(e => e.id === userId);
      if (!entry) {
        logger.info(`User ID ${userId} not blacklisted, attempted by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`User ID ${userId} is not on the blacklist. Check with /listblacklist.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Update blacklist
      blacklist = blacklist.filter(e => e.id !== userId);
      await fs.writeFile(blacklistFile, JSON.stringify(blacklist, null, 2));
      logger.info(`Removed user ID ${userId} from blacklist by ${interaction.user.tag}`);

      // Attempt unban
      let unbanned = false;
      try {
        await interaction.guild.members.unban(userId, reason);
        logger.info(`Unbanned user ID ${userId} by ${interaction.user.tag}, reason: ${reason}`);
        unbanned = true;
      } catch (error) {
        if (error.code === 10026) {
          logger.info(`No ban found for user ID ${userId} during unblacklist`);
        } else {
          blacklist.push(entry);
          await fs.writeFile(blacklistFile, JSON.stringify(blacklist, null, 2));
          logger.warn(`Reverted blacklist removal for ID ${userId} due to unban failure`);
          throw error;
        }
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ User Unblacklisted')
            .addFields(
              { name: 'User ID', value: userId, inline: true },
              { name: 'Previous Reason', value: entry.reason, inline: true },
              { name: 'Unban Reason', value: reason, inline: true },
              { name: 'Status', value: unbanned ? 'Unbanned from server' : 'Was not banned', inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error unblacklisting ID ${userId} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while unblacklisting. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};