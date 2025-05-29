import { config } from 'dotenv';
import { Client, GatewayIntentBits, GuildMember, TextChannel } from 'discord.js';

config();

// Add GuildMembers to your intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const onePieceGreetings: string[] = [
    `Yohohoho! Welcome aboard {username}! Let's make this journey a grand adventure! 🏴‍☠️`,
    `SUUUUPER welcome to our crew, {username}! 🚢`,
    `Shishishi! Hey {username}, welcome to our nakama! 🍖`,
    `Welcome to the Grand Line, {username}! May your adventures be legendary! ⚓`,
    `Ora ora! {username} has joined our pirate crew! 🗡️`,
    `A new nakama appears! Welcome {username}! Let's set sail together! ⛵`
];

client.on('guildMemberAdd', async (member: GuildMember): Promise<void> => {
    // Find the welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
        (channel): channel is TextChannel => channel.name === '👋-welcome'
    );

    if (!welcomeChannel) return;

    const randomGreeting = onePieceGreetings[Math.floor(Math.random() * onePieceGreetings.length)]
        .replace('{username}', member.user.username);
    
    try {
        await welcomeChannel.send(randomGreeting);
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

client.login(process.env.TOKEN)
    .then(() => console.log('Bot is online!'))
    .catch((error: Error) => console.error('Error logging in:', error));
