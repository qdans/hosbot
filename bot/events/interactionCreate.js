import { Events, EmbedBuilder } from 'discord.js';

export const name = Events.InteractionCreate;
export async function execute(interaction) {
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'embedCreatorModal') {
            await interaction.deferReply({ ephemeral: true });

            const title = interaction.fields.getTextInputValue('titleInput');
            const description = interaction.fields.getTextInputValue('descriptionInput');
            const color = interaction.fields.getTextInputValue('colorInput');
            const imageUrl = interaction.fields.getTextInputValue('imageUrlInput');

            const embed = new EmbedBuilder()
                .setDescription(description.replace(/\\n/g, '\n'));

            if (title) {
                embed.setTitle(title);
            }

            if (color) {
                if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
                    return interaction.editReply({ content: 'Invalid hex color code. Please use a format like #3498db.' });
                }
                embed.setColor(color);
            } else {
                embed.setColor(0x3498db);
            }

            if (imageUrl) {
                try {
                    new URL(imageUrl);
                    embed.setImage(imageUrl);
                } catch (e) {
                    return interaction.editReply({ content: 'The provided image URL is invalid. Please use a direct link.' });
                }
            }

            try {
                await interaction.channel.send({ embeds: [embed] });
                await interaction.editReply({ content: 'Embed message has been sent successfully!' });
            } catch (e) {
                console.error("Failed to send embed:", e);
                await interaction.editReply({ content: 'Failed to send the embed. Please check my permissions in this channel.' });
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}