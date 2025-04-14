// commands/help.js
// Interactive command guide with neon UI and category selector

const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed, createSelectMenu } = require('../utils/embeds');
const logger = require('../logger');

// Split text for embed fields
const splitFieldValue = (value, maxLength = 1024) => {
  const chunks = [];
  let currentChunk = '';
  for (const line of value.split('\n')) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse commands with a sleek interface'),
  cooldown: 3,
  async execute(interaction) {
    try {
      // Command categories
      const categories = {
        utility: {
          emoji: '🔧',
          description: [
            '**/ping** 🌩️ Check latency\n*Example*: `/ping`',
            '**/help** 📡 This guide\n*Example*: `/help`',
            '**/info** ℹ️ User/server info\n*Example*: `/info user @User` or `/info server`',
            '**/giveaway** 🎁 Host giveaways\n*Example*: `/giveaway 1h 1 Nitro @Verified`',
            '**/serverstats** 📊 Server stats\n*Example*: `/serverstats`',
          ].join('\n') || 'No utility commands.',
        },
        moderation: {
          emoji: '🛡️',
          description: [
            '**/kick** 👢 Remove member\n*Example*: `/kick @User Spamming`',
            '**/ban** 🔨 Ban member\n*Example*: `/ban @User Rule violation`',
            '**/unban** 🔄 Unban member\n*Example*: `/unban 123456789012345678 Mistake`',
            '**/mute** 🔇 Silence member\n*Example*: `/mute @User 10m Disruptive`',
            '**/unmute** 🔊 Restore chat\n*Example*: `/unmute @User Pardoned`',
            '**/warn** ⚡ Issue warning\n*Example*: `/warn @User Inappropriate behavior`',
            '**/warnings** 📜 Warning history\n*Example*: `/warnings @User`',
            '**/clearwarnings** 🧹 Clear warnings\n*Example*: `/clearwarnings @User Reformed`',
            '**/clear** 🗑️ Delete messages\n*Example*: `/clear 10`',
            '**/addrole** 🎭 Assign role\n*Example*: `/addrole @User Moderator`',
            '**/removerole** 🎨 Remove role\n*Example*: `/removerole @User Moderator`',
            '**/lock** 🔒 Lock channel\n*Example*: `/lock #general Spam control`',
            '**/unlock** 🔓 Unlock channel\n*Example*: `/unlock #general`',
            '**/slowmode** ⏱️ Set slowmode\n*Example*: `/slowmode 10 #general`',
          ].join('\n') || 'No moderation commands.',
        },
        blacklist: {
          emoji: '🚫',
          description: [
            '**/blacklist** 🚫 Blacklist user\n*Example*: `/blacklist @User Trolling`',
            '**/unblacklist** ✅ Remove blacklist\n*Example*: `/unblacklist 123456789012345678 Mistake`',
            '**/listblacklist** 📋 View blacklist\n*Example*: `/listblacklist 1`',
          ].join('\n') || 'No blacklist commands.',
        },
      };

      // Create fields for selected category
      const getCategoryFields = (category = 'all') => {
        const fields = [];
        const addFields = (cat, desc) => {
          const chunks = splitFieldValue(desc);
          chunks.forEach((chunk, i) => {
            fields.push({
              name: i === 0 ? `${categories[cat].emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}` : `${categories[cat].emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (Part ${i + 1})`,
              value: chunk,
              inline: false,
            });
          });
        };

        if (category === 'all') {
          Object.keys(categories).forEach(cat => addFields(cat, categories[cat].description));
        } else {
          addFields(category, categories[category].description);
        }
        return fields;
      };

      // Select menu
      const selectMenu = createSelectMenu({
        id: 'help_category',
        placeholder: 'Choose a category...',
        options: [
          { label: 'All Commands', value: 'all', description: 'View everything', emoji: '📚' },
          { label: 'Utility', value: 'utility', description: 'Fun and info tools', emoji: '🔧' },
          { label: 'Moderation', value: 'moderation', description: 'Server management', emoji: '🛡️' },
          { label: 'Blacklist', value: 'blacklist', description: 'Blacklist controls', emoji: '🚫' },
        ],
      });

      // Initial embed
      const response = createInfoEmbed({
        title: 'Command Nexus',
        description: 'Navigate commands with style! Select a category below.',
        fields: getCategoryFields('all'),
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        image: 'https://your-bot-banner-url.com', // Replace with banner
        menus: [selectMenu],
      });

      const message = await interaction.reply({ ...response, fetchReply: true });
      logger.info(`Help command by ${interaction.user.tag}`);

      // Handle category selection
      const collector = message.createMessageComponentCollector({
        filter: i => i.customId === 'help_category' && i.user.id === interaction.user.id,
        time: 5 * 60 * 1000, // 5 minutes
      });

      collector.on('collect', async i => {
        try {
          const category = i.values[0];
          await i.update(
            createInfoEmbed({
              title: 'Command Nexus',
              description: `Showing **${category === 'all' ? 'All Commands' : category.charAt(0).toUpperCase() + category.slice(1)}**.`,
              fields: getCategoryFields(category),
              thumbnail: interaction.guild.iconURL({ dynamic: true }),
              image: 'https://your-bot-banner-url.com',
              menus: [selectMenu],
            })
          );
          logger.info(`Help category ${category} selected by ${i.user.tag}`);
        } catch (error) {
          logger.error(`Error in help category selection by ${i.user.tag}`, error);
        }
      });

      collector.on('end', async () => {
        try {
          selectMenu.setDisabled(true);
          await message.edit(
            createInfoEmbed({
              title: 'Command Nexus',
              description: 'Category selector timed out.',
              fields: getCategoryFields('all'),
              thumbnail: interaction.guild.iconURL({ dynamic: true }),
              image: 'https://your-bot-banner-url.com',
              menus: [selectMenu],
            })
          );
        } catch (error) {
          logger.error(`Error ending help collector`, error);
        }
      });
    } catch (error) {
      logger.error(`Error in help by ${interaction.user.tag}`, error);
      return interaction.reply(
        createErrorEmbed({
          description: 'Couldn’t load command nexus.',
        })
      );
    }
  },
};