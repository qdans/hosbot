import fs from 'node:fs';
import path from 'node:path';
import { Events, Client, Collection, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import supabase from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = `file://${path.join(folderPath, file)}`;
        const command = await import(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = `file://${path.join(eventsPath, file)}`;
    const event = await import(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

async function checkExpiredBans() {
    const now = new Date();
    const { data: expiredBans, error } = await supabase
        .from('temporary_bans')
        .select('*')
        .lt('unban_at', now.toISOString());

    if (error) {
        console.error('Error fetching expired bans:', error);
        return;
    }

    for (const ban of expiredBans) {
        try {
            const guild = await client.guilds.fetch(ban.guild_id);
            await guild.bans.remove(ban.user_id, 'Temporary ban expired.');
            console.log(`Unbanned ${ban.user_id} from ${guild.name}.`);
            
            await supabase.from('temporary_bans').delete().eq('id', ban.id);
        } catch (e) {
            console.error(`Failed to process unban for ${ban.user_id} in guild ${ban.guild_id}:`, e.message);
            if (e.code === 10026 || e.code === 10007) { // Unknown Ban or Unknown Member
                 await supabase.from('temporary_bans').delete().eq('id', ban.id);
            }
        }
    }
}

client.once(Events.ClientReady, () => {
    console.log('Checking for expired bans...');
    checkExpiredBans();
    setInterval(checkExpiredBans, 60000); // Check every 60 seconds
});

client.login(process.env.DISCORD_TOKEN);