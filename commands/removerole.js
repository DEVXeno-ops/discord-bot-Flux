const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to remove the role from').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('The role to remove').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Why are you removing this role?').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason')?.slice(0, 512) || 'No reason provided';

    try {
      // Permission checks
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        logger.warn(`Unauthorized removerole attempt by ${interaction.user.tag} for ${target.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You need **Manage Roles** permission to remove roles.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        logger.warn(`Bot lacks Manage Roles permission for removerole by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                "I need **Manage Roles** permission. Please update my role in Server Settings > Roles."
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        logger.info(`User ${target.tag} not found in guild for removerole by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} is not in this server.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Role validation
      if (role.id === interaction.guild.id) {
        logger.warn(`Attempted to remove @everyone role by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription("You can't remove the @everyone role.")
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!member.roles.cache.has(role.id)) {
        logger.info(`User ${target.tag} does not have role ${role.name} for removerole by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(`${target.tag} does not have the **${role.name}** role.`)
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Hierarchy check
      const botHighestRole = interaction.guild.members.me.roles.highest;
      if (role.position >= botHighestRole.position) {
        logger.warn(`Role ${role.name} too high for removerole by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('❗ Oops!')
              .setDescription(
                `I can’t remove **${role.name}** because it’s higher than or equal to my highest role (**${botHighestRole.name}**). Move my role higher in Server Settings > Roles.`
              )
              .setFooter({ text: 'Bot v1.0.0' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Remove role
      await member.roles.remove(role, reason);
      logger.info(`Removed role ${role.name} from ${target.tag} (ID: ${target.id}) by ${interaction.user.tag}, reason: ${reason}`);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Role Removed')
            .addFields(
              { name: 'User', value: `${target.tag} (ID: ${target.id})`, inline: true },
              { name: 'Role', value: role.name, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'Use /addrole to reassign | Bot v1.0.0' })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      logger.error(`Error removing role ${role.name} from ${target.tag} by ${interaction.user.tag}`, error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❗ Oops!')
            .setDescription('An error occurred while removing the role. Please try again.')
            .setFooter({ text: 'Bot v1.0.0' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};