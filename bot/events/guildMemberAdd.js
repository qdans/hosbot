import { Events, EmbedBuilder } from 'discord.js';
import supabase from '../supabaseClient.js';

export const name = Events.GuildMemberAdd;
export async function execute(member) {
    const { guild, user } = member;

    const { data, error } = await supabase
        .from('guild_settings')
        .select('welcome_channel_id, welcome_message_enabled, welcome_message_text')
        .eq('guild_id', guild.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching guild settings:', error);
        return;
    }

    if (!data || !data.welcome_message_enabled || !data.welcome_channel_id) {
        return;
    }

    const welcomeChannel = guild.channels.cache.get(data.welcome_channel_id);
    if (!welcomeChannel) {
        return;
    }

    const defaultMessage = `Welcome {user} ({username}) to the **{server}**! We're glad to have you here.`;
    const welcomeText = data.welcome_message_text || defaultMessage;
    const finalMessage = welcomeText
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{username}/g, user.tag)
        .replace(/{server}/g, guild.name);

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setAuthor({ name: `${user.tag} has joined!`, iconURL: user.displayAvatarURL() })
        .setDescription(finalMessage)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

    try {
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (sendError) {
        console.error(`Could not send welcome message to channel ${welcomeChannel.id} in ${guild.name}:`, sendError);
    }
}