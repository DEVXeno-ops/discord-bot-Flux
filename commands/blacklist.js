const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

const blacklistFile = path.join(__dirname, '../blacklist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Ban and blacklist a user, preventing rejoining')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to blacklist').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are they blacklisted?').setRequired(false)
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
              .setTitle('❗ Oops!')
              .setDescription("You need **Ban Members** permission to use this command.")
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription(
                "I need **Ban Members** permission to blacklist users. Please update my role in Server Settings > Roles."
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Input validation
      if (target.id === interaction.user.id) {
        logger.warn(`User ${interaction.user.tag} attempted to blacklist themselves`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You can't blacklist yourself!")
              .setFooter({ text: 'Bot v1.0.0' })
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
              .setTitle('❗ Oops!')
              .setDescription("Bots can't be blacklisted.")
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
        if (error.code !== 'ENOENT') throw error;
      }

      // Check existing blacklist
      if (blacklist.some(e => e.id === target.id)) {
        logger.info(`User ${target.tag} already blacklisted, attempted by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} (ID: ${target.id}) is already blacklisted.`)
              .setFooter({ text: 'Bot v1.0.0' })
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
          logger.warn(`Failed to ban ${target.tag}: Insufficient permissions`);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❗ Oops!')
                .setDescription(
                  `I can't blacklist ${target.tag} (ID: ${target.id}). My role must be higher than theirs in Server Settings > Roles.`
                )
                .setFooter({ text: 'Bot v1.0.0' })
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
              { name: 'User', value: `${target.tag} (ID: ${target.id})`, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /unblacklist to remove | Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error blacklisting ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while blacklisting. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};