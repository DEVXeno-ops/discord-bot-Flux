require('dotenv').config();
const { Client, Collection, IntentsBitField, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const { TOKEN, CLIENT_ID } = process.env;

logger.info('Starting bot configuration check...');
if (!TOKEN || !CLIENT_ID) {
  logger.error('Missing TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

const commandsDir = path.join(__dirname, 'commands');
const blacklistFile = path.join(__dirname, 'blacklist.json');

if (!fs.existsSync(commandsDir)) {
  logger.error('commands/ directory not found');
  process.exit(1);
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildBans,
  ],
});

client.commands = new Collection();
client.cooldowns = new Map();

const commands = [];
let commandFiles = [];
try {
  commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
  logger.info(`Found ${commandFiles.length} command files`);
} catch (error) {
  logger.error('Failed to read commands directory', error);
  process.exit(1);
}

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    if (!command.data?.name || !command.execute) {
      logger.warn(`Skipping invalid command file ${file}`);
      continue;
    }
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
    logger.info(`Loaded command ${command.data.name}`);
  } catch (error) {
    logger.error(`Failed to load command ${file}`, error);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    logger.info('Registering global slash commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    logger.info('Global slash commands registered');
  } catch (error) {
    logger.error('Failed to register slash commands', error);
  }
})();

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: '/help | v1.0.0' }], status: 'online' });
});

// Blacklist enforcement on join
client.on('guildMemberAdd', async member => {
  try {
    let blacklist = [];
    try {
      const data = await fsPromises.readFile(blacklistFile, 'utf8');
      blacklist = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') logger.error('Error reading blacklist on join', error);
      return;
    }

    const entry = blacklist.find(e => e.id === member.id);
    if (entry && member.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await member.ban({ reason: `Blacklisted: ${entry.reason}` });
      logger.info(`Auto-banned ${member.user.tag} (ID: ${member.id}) on join`);
    }
  } catch (error) {
    logger.error(`Error enforcing blacklist for ${member.user.tag}`, error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unknown command ${interaction.commandName} by ${interaction.user.tag}`);
    return;
  }

  // Cooldown
  const now = Date.now();
  const cooldownAmount = (command.cooldown || 3) * 1000;
  const userCooldownKey = `${interaction.user.id}-${interaction.commandName}`;

  if (client.cooldowns.has(userCooldownKey)) {
    const expirationTime = client.cooldowns.get(userCooldownKey);
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❗ Cooldown')
        .setDescription(`Please wait ${timeLeft.toFixed(1)}s before reusing \`${interaction.commandName}\`.`)
        .setTimestamp();
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }

  client.cooldowns.set(userCooldownKey, now + cooldownAmount);
  setTimeout(() => client.cooldowns.delete(userCooldownKey), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing ${interaction.commandName} by ${interaction.user.tag}`, error);
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❗ Troublemaker!')
      .setDescription('An error occurred while executing the command.')
      .setTimestamp();
    const replyOptions = { embeds: [errorEmbed], ephemeral: true };
    try {
      interaction.replied || interaction.deferred
        ? await interaction.followUp(replyOptions)
        : await interaction.reply(replyOptions);
    } catch (replyError) {
      logger.error('Failed to send error reply', replyError);
    }
  }
});

client.on('error', error => logger.error('Client error', error));
client.on('shardError', error => logger.error('Shard error', error));
process.on('unhandledRejection', error => logger.error('Unhandled rejection', error));

client.login(TOKEN).catch(error => {
  logger.error('Login failed', error);
  process.exit(1);
});

logger.info('Starting bot...');