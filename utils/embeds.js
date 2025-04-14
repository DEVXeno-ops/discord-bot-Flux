// utils/embeds.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

// Bot branding
const BOT_NAME = 'GiveawayBot'; // ปรับตามชื่อบอท
const BOT_VERSION = 'v1.0.0';
const BOT_AVATAR = 'https://cdn.discordapp.com/avatars/YOUR_BOT_ID/YOUR_BOT_AVATAR.jpg'; // ปรับตาม URL จริง

// Theme definitions
const THEMES = {
  NEON: {
    SUCCESS: '#00FF88', // Neon Green
    ERROR: '#FF0055', // Neon Pink
    WARNING: '#FFA500', // Neon Orange
    INFO: '#00DDFF', // Neon Cyan
    emojis: {
      success: '🌟',
      error: '🚫',
      warning: '⚡',
      info: '📡',
    },
  },
  DARK: {
    SUCCESS: '#2ECC71', // Emerald
    ERROR: '#E74C3C', // Alizarin
    WARNING: '#F1C40F', // Sunflower
    INFO: '#3498DB', // Peter River
    emojis: {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    },
  },
};

// Current theme (configurable)
const CURRENT_THEME = 'NEON';
const COLORS = THEMES[CURRENT_THEME];
const EMOJIS = THEMES[CURRENT_THEME].emojis;

// Base embed with theme
const createBaseEmbed = () => {
  return new EmbedBuilder()
    .setAuthor({ name: BOT_NAME, iconURL: BOT_AVATAR })
    .setFooter({ text: `✨ ${BOT_NAME} ${BOT_VERSION} | Theme: ${CURRENT_THEME}`, iconURL: BOT_AVATAR })
    .setTimestamp();
};

// Success embed
const createSuccessEmbed = ({ title, description, fields = [], thumbnail, image, buttons = [], menus = [] }) => {
  const embed = createBaseEmbed()
    .setColor(COLORS.SUCCESS)
    .setTitle(`${EMOJIS.success} ${title || 'Success'}`)
    .setDescription(description ? `**${description}**\n═══` : 'Action completed!\n═══');
  
  if (fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  const components = [];
  if (buttons.length) components.push(new ActionRowBuilder().addComponents(buttons));
  if (menus.length) components.push(new ActionRowBuilder().addComponents(menus));

  return { embeds: [embed], components };
};

// Error embed
const createErrorEmbed = ({ title = 'Error!', description }) => {
  const embed = createBaseEmbed()
    .setColor(COLORS.ERROR)
    .setTitle(`${EMOJIS.error} ${title}`)
    .setDescription(description ? `**${description}**\n═══` : 'Something went wrong.\n═══');
  
  return { embeds: [embed], components: [], flags: 64 };
};

// Warning embed
const createWarningEmbed = ({ title = 'Warning', description, fields = [] }) => {
  const embed = createBaseEmbed()
    .setColor(COLORS.WARNING)
    .setTitle(`${EMOJIS.warning} ${title}`)
    .setDescription(description ? `**${description}**\n═══` : 'Review the details.\n═══');
  
  if (fields.length) embed.addFields(fields);
  return { embeds: [embed], components: [], flags: 64 };
};

// Info embed
const createInfoEmbed = ({ title, description, fields = [], thumbnail, image, buttons = [], menus = [] }) => {
  const embed = createBaseEmbed()
    .setColor(COLORS.INFO)
    .setTitle(`${EMOJIS.info} ${title || 'Info'}`)
    .setDescription(description ? `**${description}**\n═══` : 'Here’s your info.\n═══');
  
  if (fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  const components = [];
  if (buttons.length) components.push(new ActionRowBuilder().addComponents(buttons));
  if (menus.length) components.push(new ActionRowBuilder().addComponents(menus));

  return { embeds: [embed], components };
};

// Progress bar
const createProgressBar = (currentMs, totalMs, length = 10) => {
  const progress = Math.min(currentMs / totalMs, 1);
  const filled = Math.floor(progress * length);
  const empty = length - filled;
  const percentage = (progress * 100).toFixed(0);
  return `⏳ ${'█'.repeat(filled)}${'░'.repeat(empty)} **${percentage}%**`;
};

// Component factory
const createButton = ({ id, label, style = ButtonStyle.Primary, emoji, disabled = false }) => {
  return new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setEmoji(emoji)
    .setDisabled(disabled);
};

const createSelectMenu = ({ id, placeholder, options }) => {
  return new StringSelectMenuBuilder()
    .setCustomId(id)
    .setPlaceholder(placeholder)
    .addOptions(options.map(opt => ({
      label: opt.label,
      value: opt.value,
      description: opt.description,
      emoji: opt.emoji,
    })));
};

// Permission check
const checkPermissions = (member, permission, commandName, logger) => {
  if (!member.permissions.has(permission)) {
    logger.warn(`Unauthorized ${commandName} attempt by ${member.user.tag}`);
    return createErrorEmbed({
      description: 'You need **Manage Guild** permission.',
    });
  }
  return null;
};

module.exports = {
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  createInfoEmbed,
  createProgressBar,
  createButton,
  createSelectMenu,
  checkPermissions,
};