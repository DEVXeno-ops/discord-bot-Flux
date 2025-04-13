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
      option.setName('user_id').setDescription('The ID of the user to unblacklist').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for unblacklisting').setRequired(false)
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
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to unblacklist users!")
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
              .setTitle('❗ Troublemaker!')
              .setDescription("I don't have permission to manage bans!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Validate user ID
      if (!/^\d{17,19}$/.test(userId)) {
        logger.warn(`Invalid user ID ${userId} by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('Invalid user ID! Use a numeric ID (e.g., 123456789012345678).')
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
                .setTitle('❗ Troublemaker!')
                .setDescription('No blacklist entries exist.')
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }

      // Check if user is blacklisted
      const entry = blacklist.find(e => e.id === userId);
      if (!entry) {
        logger.info(`User ID ${userId} not blacklisted, attempted by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This user is not blacklisted.')
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
          logger.info(`No ban found for user ID ${userId} during unblacklist by ${interaction.user.tag}`);
        } else {
          // Revert blacklist change if unban fails
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
              { name: 'Reason', value: reason, inline: true },
              {
                name: 'Unbanned',
                value: unbanned ? 'Yes' : 'No (was not banned)',
                inline: true,
              }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in unblacklist for ID ${userId} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to unblacklist the user.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};