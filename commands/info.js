const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info about a user or the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Get info about a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to get info about')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('server')
        .setDescription('Get info about the server')
    ),
  async execute(interaction) {
    try {
      if (interaction.options.getSubcommand() === 'user') {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id);
        const joined = member.joinedAt.toISOString();
        logger.info(`User info requested for ${target.tag} by ${interaction.user.tag}`);
        const userEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('👤 User Information')
          .addFields(
            { name: 'Username', value: target.tag, inline: true },
            { name: 'ID', value: target.id, inline: true },
            { name: 'Joined Server', value: joined }
          )
          .setThumbnail(target.displayAvatarURL())
          .setFooter({ text: 'Bot v1.0.0' })
          .setTimestamp();
        await interaction.reply({ embeds: [userEmbed] });
      } else {
        const { guild } = interaction;
        logger.info(`Server info requested by ${interaction.user.tag}`);
        const serverEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('🏰 Server Information')
          .addFields(
            { name: 'Name', value: guild.name, inline: true },
            { name: 'ID', value: guild.id, inline: true },
            { name: 'Members', value: `${guild.memberCount}` }
          )
          .setThumbnail(guild.iconURL())
          .setFooter({ text: 'Bot v1.0.0' })
          .setTimestamp();
        await interaction.reply({ embeds: [serverEmbed] });
      }
    } catch (error) {
      logger.error(`Error in info command`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Error')
        .setDescription('An error occurred while fetching info!')
        .setTimestamp();
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};