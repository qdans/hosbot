import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The member to ban.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('duration')
            .setDescription('Duration of the ban (e.g., 10m, 1h, 7d). Leave blank for permanent.')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('The reason for the ban.')
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
    if (!member.bannable) {
        return interaction.editReply("I cannot ban this member. Check my role position and permissions.");
    }

    let unbanAt = null;
    if (durationString) {
        const durationMs = ms(durationString);
        if (!durationMs) {
            return interaction.editReply("Invalid duration format. Use formats like '10m', '1h', '7d'.");
        }
        unbanAt = new Date(Date.now() + durationMs);
    }

    try {
        await member.ban({ reason: reason });

        if (unbanAt) {
            await supabase.from('temporary_bans').upsert({
                guild_id: interaction.guild.id,
                user_id: targetUser.id,
                unban_at: unbanAt.toISOString(),
            });
        }

        const logEmbed = new EmbedBuilder()
            .setColor(0xff0000) // Red
            .setTitle('Action: Member Banned')
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
                    value: `**Duration:** ${durationString || 'Permanent'}\n**Reason:** ${reason}`,
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

        await interaction.editReply(`Successfully banned ${targetUser.tag}.`);

    } catch (error) {
        console.error(error);
        await interaction.editReply('An error occurred while trying to ban the member.');
    }
}