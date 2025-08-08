import { SlashCommandBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Creates and sends a professional embed message.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages);

export async function execute(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('embedCreatorModal')
        .setTitle('Embed Message Creator');

    const titleInput = new TextInputBuilder()
        .setCustomId('titleInput')
        .setLabel("Title")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('descriptionInput')
        .setLabel("Description")
        .setPlaceholder("Use \\n for a new line.")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
        
    const colorInput = new TextInputBuilder()
        .setCustomId('colorInput')
        .setLabel("Color (Hex Code, e.g., #3498db)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const imageUrlInput = new TextInputBuilder()
        .setCustomId('imageUrlInput')
        .setLabel("Image URL (Direct link to an image)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(imageUrlInput)
    );

    await interaction.showModal(modal);
}