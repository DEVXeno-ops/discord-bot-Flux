// index.js
require('dotenv').config();
const { Client, Collection, IntentsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js'); // เปลี่ยนมาใช้จาก discord.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { createErrorEmbed } = require('./utils/embeds');

const { TOKEN, CLIENT_ID } = process.env;

logger.info('Initializing bot configuration...');
if (!TOKEN) {
  logger.error('Missing TOKEN in .env file');
  process.exit(1);
}
if (!CLIENT_ID) {
  logger.error('Missing CLIENT_ID in .env file');
  process.exit(1);
}

// ตรวจสอบ Routes
if (!Routes || !Routes.applicationCommands) {
  logger.error('Routes.applicationCommands is undefined. Check @discordjs/rest and discord.js installation.');
  process.exit(1);
}

const commandsDir = path.join(__dirname, 'commands');
const blacklistFile = path.join(__dirname, 'blacklist.json');

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

async function loadCommands() {
  try {
    const commandFiles = (await fs.readdir(commandsDir)).filter(file => file.endsWith('.js'));
    logger.info(`Discovered ${commandFiles.length} command files`);
    const commands = [];

    for (const file of commandFiles) {
      try {
        const command = require(path.join(commandsDir, file));
        if (!command.data?.name || !command.execute) {
          logger.warn(`Skipping invalid command file: ${file}`);
          continue;
        }
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Registered command: ${command.data.name}`);
      } catch (error) {
        logger.error(`Failed to load command ${file}`, error);
      }
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
      logger.info('Deploying global slash commands...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      logger.info('Successfully deployed global slash commands');
    } catch (error) {
      logger.error('Failed to deploy slash commands', error);
      throw error;
    }
  } catch (error) {
    logger.error('Error in loadCommands', error);
    process.exit(1);
  }
}

client.once('ready', async () => {
  logger.info(`Bot online as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: '/giveaway | v1.0.0' }], status: 'online' });

  // Initialize commands with persistence
  for (const command of client.commands.values()) {
    if (command.initialize) {
      try {
        await command.initialize(client);
        logger.info(`Initialized command: ${command.data.name}`);
      } catch (error) {
        logger.error(`Failed to initialize command ${command.data.name}`, error);
      }
    }
  }
});

client.on('guildMemberAdd', async member => {
  try {
    let blacklist = [];
    try {
      const data = await fs.readFile(blacklistFile, 'utf8');
      blacklist = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') logger.error(`Error reading blacklist for ${member.user.tag} join`, error);
      return;
    }

    const entry = blacklist.find(e => e.id === member.id);
    if (entry && member.guild.members.me.permissions.has(IntentsBitField.Flags.BanMembers)) {
      await member.ban({ reason: `Blacklisted: ${entry.reason}` });
      logger.info(`Auto-banned ${member.user.tag} (ID: ${member.id}) on join due to blacklist`);
    }
  } catch (error) {
    logger.error(`Error enforcing blacklist on join for ${member.user.tag}`, error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command ${interaction.commandName} executed by ${interaction.user.tag}`);
        return;
      }

      const now = Date.now();
      const cooldownAmount = (command.cooldown || 3) * 1000;
      const userCooldownKey = `${interaction.user.id}-${interaction.commandName}`;

      if (client.cooldowns.has(userCooldownKey)) {
        const expirationTime = client.cooldowns.get(userCooldownKey);
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply(createErrorEmbed({
            title: 'Slow Down!',
            description: `Please wait ${timeLeft.toFixed(1)} seconds before using **/${interaction.commandName}** again.`,
          }));
        }
      }

      client.cooldowns.set(userCooldownKey, now + cooldownAmount);
      setTimeout(() => client.cooldowns.delete(userCooldownKey), cooldownAmount);

      await command.execute(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('giveaway_')) {
        const command = client.commands.get('giveaway');
        if (command && command.handleButton) {
          await command.handleButton(interaction);
        } else {
          await interaction.reply(createErrorEmbed({
            description: 'This giveaway interaction is not supported.',
          }));
        }
      }
    }
  } catch (error) {
    logger.error(`Error in interaction by ${interaction.user.tag}`, error);
    const replyOptions = createErrorEmbed({ description: 'Something went wrong.' });
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    } catch (replyError) {
      logger.error('Failed to send error reply', replyError);
    }
  }
});

client.on('error', error => logger.error('Client error occurred', error));
client.on('shardError', error => logger.error('Shard error occurred', error));
process.on('unhandledRejection', error => logger.error('Unhandled promise rejection', error));

(async () => {
  await loadCommands();
  client.login(TOKEN).catch(error => {
    logger.error('Bot login failed', error);
    process.exit(1);
  });
})();

logger.info('Starting bot...');