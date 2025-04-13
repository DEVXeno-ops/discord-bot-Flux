const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all commands and how to use them'),
  cooldown: 3,
  async execute(interaction) {
    try {
      const commands = interaction.client.commands;

      const utility = [
        '**/ping**: Check my response time\n*Example*: `/ping`',
        '**/help**: Show this command list\n*Example*: `/help`',
        '**/info**: Get details about a user or server\n*Example*: `/info user @User` or `/info server`',
      ].join('\n');

      const moderation = [
        '**/kick**: Remove a member from the server\n*Example*: `/kick @User Spamming`',
        '**/ban**: Ban a member from the server\n*Example*: `/ban @User Rule violation`',
        '**/mute**: Silence a member for a time\n*Example*: `/mute @User 10m Disruptive`',
        '**/unmute**: Restore a member’s ability to chat\n*Example*: `/unmute @User Pardoned`',
        '**/warn**: Send a warning to a member\n*Example*: `/warn @User Inappropriate behavior`',
        '**/clear**: Delete recent messages\n*Example*: `/clear 10`',
        '**/lock**: Prevent messages in a channel\n*Example*: `/lock #general Spam control`',
        '**/unlock**: Reopen a channel for messages\n*Example*: `/unlock #general`',
        '**/slowmode**: Limit how often users can send messages\n*Example*: `/slowmode 10 #general`',
      ].join('\n');

      const blacklist = [
        '**/blacklist**: Ban and prevent a user from rejoining\n*Example*: `/blacklist @User Trolling`',
        '**/unblacklist**: Remove a user from the blacklist\n*Example*: `/unblacklist 123456789012345678 Mistake`',
        '**/listblacklist**: View all blacklisted users\n*Example*: `/listblacklist 1`',
      ].join('\n');

      logger.info(`Help command executed by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📜 Command Guide')
            .addFields(
              { name: '🔧 Utility Commands', value: utility, inline: false },
              { name: '🛡️ Moderation Commands', value: moderation, inline: false },
              { name: '🚫 Blacklist Commands', value: blacklist, inline: false }
            )
            .setDescription('Use these commands to manage the server. Need more info? Try an example!')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error in help by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('Couldn’t load the command list. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};