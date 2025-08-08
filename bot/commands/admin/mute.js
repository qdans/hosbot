import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutes a member for a specific duration (timeout).')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The member to mute.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('duration')
            .setDescription('Duration of the mute (e.g., 10m, 1h, 7d).')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('The reason for the mute.')
            .setRequired(false));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const durationString = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = interaction.guild.members.resolve(targetUser);

    await interaction.deferReply({ ephemeral: true });

    if (!member) {
        return interaction.editReply("That member could not be found in this server.");
    }
    if (!member.moderatable) {
        return interaction.editReply("I cannot mute this member. Check my role position and permissions.");
    }

    const durationMs = ms(durationString);
    if (!durationMs || durationMs > ms('28d')) {
        return interaction.editReply("Invalid duration. It must be a valid format and no longer than 28 days.");
    }

    try {
        await member.timeout(durationMs, reason);

        const logEmbed = new EmbedBuilder()
            .setColor(0xffa500) // Orange
            .setTitle('Action: Member Muted')
            .setAuthor({ name: 'Hosbot Moderation Logs', iconURL: interaction.client.user.displayAvatarURL() })
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                {
                    name: 'Target User',
                    value: `**Discord Name:** ${targetUser.tag}\n**Username:** ${targetUser.username}\n**User ID:** \`${targetUser.id}\``,
                    inline: false
                },
                {
                    name: 'Moderator',
                    value: `**Discord Name:** ${interaction.user.tag}\n**User ID:** \`${interaction.user.id}\``,
                    inline: false
                },
                {
                    name: 'Details',
                    value: `**Duration:** ${durationString}\n**Reason:** ${reason}`,
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: `Guild ID: ${interaction.guild.id}` });

        const { data: settings } = await supabase
            .from('guild_settings')
            .select('log_channel_id')
            .eq('guild_id', interaction.guild.id)
            .single();

        if (settings && settings.log_channel_id) {
            const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }

        await interaction.editReply(`Successfully muted ${targetUser.tag} for ${durationString}.`);

    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while trying to mute the member.');
    }
}