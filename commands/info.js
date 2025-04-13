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
          option.setName('user').setDescription('The user to get info about').setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand.setName('server').setDescription('Get info about the server')),
  cooldown: 3,
  async execute(interaction) {
    try {
      if (interaction.options.getSubcommand() === 'user') {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        logger.info(`User info for ${target.tag} requested by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('👤 User Info')
              .addFields(
                { name: 'Username', value: target.tag, inline: true },
                { name: 'ID', value: target.id, inline: true },
                {
                  name: 'Joined Server',
                  value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Not in server',
                  inline: true,
                },
                { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
              )
              .setThumbnail(target.displayAvatarURL())
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
      } else {
        const { guild } = interaction;
        logger.info(`Server info requested by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('🏰 Server Info')
              .addFields(
                { name: 'Name', value: guild.name, inline: true },
                { name: 'ID', value: guild.id, inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
              )
              .setThumbnail(guild.iconURL())
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
        });
      }
    } catch (error) {
      logger.error(`Error in info by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Troublemaker!')
            .setDescription('Failed to fetch info.')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};