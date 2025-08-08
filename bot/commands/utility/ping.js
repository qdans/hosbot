import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bot\'s latency.');

export async function execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    interaction.editReply(`Pong! Roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
}