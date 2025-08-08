import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js';

export const data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Revokes the ban for a member.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addStringOption(option =>
        option.setName('user_id')
            .setDescription('The User ID of the person to unban.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('The reason for the unban.')
            .setRequired(false));

export async function execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    await interaction.deferReply({ ephemeral: true });

    try {
        const bannedUser = await interaction.guild.bans.fetch(userId);
        if (!bannedUser) {
            return interaction.editReply("This user is not banned from this server.");
        }

        await interaction.guild.bans.remove(userId, reason);
        
        await supabase.from('temporary_bans').delete().match({ guild_id: interaction.guild.id, user_id: userId });

        const logEmbed = new EmbedBuilder()
            .setColor(0x00ff00) // Green
            .setTitle('Action: Member Unbanned')
            .setAuthor({ name: 'Hosbot Moderation Logs', iconURL: interaction.client.user.displayAvatarURL() })
            .setThumbnail(bannedUser.user.displayAvatarURL())
            .addFields(
                {
                    name: 'Target User',
                    value: `**Discord Name:** ${bannedUser.user.tag}\n**Username:** ${bannedUser.user.username}\n**User ID:** \`${bannedUser.user.id}\``,
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

        await interaction.editReply(`Successfully unbanned user ${bannedUser.user.tag}.`);

    } catch (error) {
        if (error.code === 10026) {
            return interaction.editReply("This user is not banned from this server.");
        }
        console.error(error);
        await interaction.editReply('An error occurred while trying to unban the user.');
    }
}