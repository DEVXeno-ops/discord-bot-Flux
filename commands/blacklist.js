const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Ban and blacklist a user from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to blacklist').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the blacklist').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      // Permission checks
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Unauthorized blacklist attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You don't have permission to blacklist users!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        logger.warn(`Bot lacks Ban Members permission for blacklist by ${interaction.user.tag}`);
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

      // Prevent self-targeting or bot
      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to blacklist themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't blacklist yourself!")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }
      if (target.bot) {
        logger.warn(`User ${interaction.user.tag} attempted to blacklist bot ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription("You can't blacklist a bot!")
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
        if (error.code !== 'ENOENT') throw error;
      }

      // Check if already blacklisted
      if (blacklist.some(e => e.id === target.id)) {
        logger.info(`User ${target.tag} already blacklisted, attempted by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Troublemaker!')
              .setDescription('This user is already blacklisted.')
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Attempt ban
      try {
        await interaction.guild.members.ban(target, { reason });
        logger.info(`Banned ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}`);
      } catch (error) {
        if (error.code === 50013) {
          logger.warn(`Failed to ban ${target.tag}: Role hierarchy or permissions issue`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Troublemaker!')
                .setDescription(
                  `I can't ban ${target.tag}. Ensure my role is above theirs in the server settings.`
                )
                .setTimestamp(),
            ],
            ephemeral: true,
          });
        }
        throw error;
      }

      // Update blacklist
      blacklist.push({
        id: target.id,
        tag: target.tag,
        reason,
        timestamp: new Date().toISOString(),
        moderator: interaction.user.tag,
      });
      await fs.writeFile(blacklistFile, JSON.stringify(blacklist, null, 2));
      logger.info(`Blacklisted ${target.tag} by ${interaction.user.tag}, reason: ${reason}`);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🚫 User Blacklisted')
            .addFields(
              { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in blacklist for ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to blacklist the user.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};