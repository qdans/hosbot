import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import supabase from '../../supabaseClient.js';

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure settings for this server.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild) // Admin only
    .addSubcommand(subcommand =>
        subcommand
            .setName('welcome')
            .setDescription('Configure the welcome message system.')
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to send welcome messages to.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
            .addStringOption(option =>
                option.setName('message')
                .setDescription('Custom message. Use {user} and {server}.')
                .setRequired(false))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('logs')
            .setDescription('Configure the moderation log channel.')
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to send logs to.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('disable')
            .setDescription('Disable a feature.')
            .addStringOption(option =>
                option.setName('feature')
                .setDescription('The feature to disable.')
                .setRequired(true)
                .addChoices(
                    { name: 'Welcome Message', value: 'welcome' },
                    { name: 'Logging', value: 'logs' }
                )
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    if (subcommand === 'welcome') {
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message') || null;

        const { error } = await supabase.from('guild_settings').upsert({
            guild_id: guildId,
            welcome_channel_id: channel.id,
            welcome_message_text: message,
            welcome_message_enabled: true,
        });

        if (error) {
            console.error(error);
            return interaction.editReply('Failed to save welcome settings.');
        }
        return interaction.editReply(`Welcome settings have been saved. Messages will be sent to ${channel}.`);
    }

    if (subcommand === 'logs') {
        const channel = interaction.options.getChannel('channel');
        const { error } = await supabase.from('guild_settings').upsert({
            guild_id: guildId,
            log_channel_id: channel.id,
        });

        if (error) {
            console.error(error);
            return interaction.editReply('Failed to save log settings.');
        }
        return interaction.editReply(`Log settings have been saved. Logs will be sent to ${channel}.`);
    }
    
    if (subcommand === 'disable') {
        const featureToDisable = interaction.options.getString('feature');
        let updateData = {};
        if (featureToDisable === 'welcome') {
            updateData.welcome_message_enabled = false;
        } else if (featureToDisable === 'logs') {
            updateData.log_channel_id = null;
        }

        const { error } = await supabase.from('guild_settings').upsert({
            guild_id: guildId,
            ...updateData
        });

        if (error) {
            console.error(error);
            return interaction.editReply(`Failed to disable the ${featureToDisable} feature.`);
        }
        return interaction.editReply(`The ${featureToDisable} feature has been disabled.`);
    }
}