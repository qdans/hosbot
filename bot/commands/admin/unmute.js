import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js';

export const data = new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Removes a mute (timeout) from a member.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The member to unmute.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('The reason for unmuting.')
            .setRequired(false));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = interaction.guild.members.resolve(targetUser);

    await interaction.deferReply({ ephemeral: true });

    if (!member) {
        return interaction.editReply("That member could not be found in this server.");
    }
    if (!member.moderatable) {
        return interaction.editReply("I cannot unmute this member. Check my role position and permissions.");
    }
    if (!member.isCommunicationDisabled()) {
        return interaction.editReply("This member is not currently muted.");
    }

    try {
        await member.timeout(null, reason);

        const logEmbed = new EmbedBuilder()
            .setColor(0x00ff00) // Green
            .setTitle('Action: Member Unmuted')
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
                    name: 'Reason',
                    value: reason,
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

        await interaction.editReply(`Successfully unmuted ${targetUser.tag}.`);

    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while trying to unmute the member.');
    }
}