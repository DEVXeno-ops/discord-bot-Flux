const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('View server statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    try {
      // Permission check
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        logger.warn(`Unauthorized serverstats attempt by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Manage Server** permission to view server stats.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const guild = interaction.guild;
      await guild.members.fetch(); // Ensure member cache

      const totalMembers = guild.memberCount;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      const humans = totalMembers - bots;
      const roles = guild.roles.cache.size - 1; // Exclude @everyone
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
      const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;

      const statsEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📈 ${guild.name} Statistics`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Total Members', value: `${totalMembers}`, inline: true },
          { name: 'Humans', value: `${humans}`, inline: true },
          { name: 'Bots', value: `${bots}`, inline: true },
          { name: 'Roles', value: `${roles}`, inline: true },
          { name: 'Text Channels', value: `${textChannels}`, inline: true },
          { name: 'Voice Channels', value: `${voiceChannels}`, inline: true },
          { name: 'Created', value: createdAt, inline: true }
        )
        .setFooter({ text: 'Bot v1.0.0' })
        .setTimestamp();

      logger.info(`Server stats viewed by ${interaction.user.tag} for ${guild.name}`);
      return interaction.reply({ embeds: [statsEmbed] });
    } catch (error) {
      logger.error(`Error in serverstats by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while fetching server stats.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};