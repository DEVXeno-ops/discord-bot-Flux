require('dotenv').config();
const { Client, Collection, IntentsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const { TOKEN, CLIENT_ID } = process.env;

// Check initial configuration
logger.info('Starting bot configuration check...');
if (!TOKEN) {
  logger.error('TOKEN not found in .env. Please set TOKEN.');
  process.exit(1);
}
if (!CLIENT_ID) {
  logger.error('CLIENT_ID not found in .env. Please set CLIENT_ID.');
  process.exit(1);
}

// Check commands/ directory
const commandsDir = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsDir)) {
  logger.error('commands/ directory not found. Please create it and add command files.');
  process.exit(1);
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
  ],
});

client.commands = new Collection();

const commands = [];
let commandFiles;
try {
  commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
} catch (error) {
  logger.error('Unable to read commands/ directory', error);
  process.exit(1);
}

if (commandFiles.length === 0) {
  logger.warn('No command files found in commands/. Bot will run without commands.');
}

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    if (!command.data || !command.data.name || !command.execute) {
      logger.warn(`Command ${file} is incomplete (missing data, name, or execute)`);
      continue;
    }
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
    logger.info(`Loaded command ${command.data.name} successfully`);
  } catch (error) {
    logger.error(`Failed to load command ${file}`, error);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    logger.info('Registering Global Slash Commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });
    logger.info('Global Slash Commands registered successfully!');
  } catch (error) {
    logger.error('Failed to register Slash Commands', error);
  }
})();

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error in command ${interaction.commandName}`, error);
    const replyContent = { content: 'An error occurred while executing the command!', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyContent);
      } else {
        await interaction.reply(replyContent);
      }
    } catch (replyError) {
      logger.error('Unable to reply to interaction', replyError);
    }
  }
});

// Handle general errors
client.on('error', error => {
  logger.error('Client error occurred', error);
});

client.on('shardError', error => {
  logger.error('Shard error occurred', error);
});

process.on('unhandledRejection', error => {
  logger.error('Unhandled Promise Rejection', error);
});

client.login(TOKEN).catch(error => {
  logger.error('Bot login failed', error);
  process.exit(1);
});

logger.info('Starting bot...');