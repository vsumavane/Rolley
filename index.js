require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Add GuildMembers to your intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers  // Add this line
    ]
});

// Add this after your existing event handlers
client.on('guildMemberAdd', async member => {
    // Find the welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
        channel => channel.name === '👋-welcome'
    );

    if (!welcomeChannel) return;

    const onePieceGreetings = [
        `Yohohoho! Welcome aboard ${member.user.username}! Let's make this journey a grand adventure! 🏴‍☠️`,
        `SUUUUPER welcome to our crew, ${member.user.username}! 🚢`,
        `Shishishi! Hey ${member.user.username}, welcome to our nakama! 🍖`,
        `Welcome to the Grand Line, ${member.user.username}! May your adventures be legendary! ⚓`,
        `Ora ora! ${member.user.username} has joined our pirate crew! 🗡️`,
        `A new nakama appears! Welcome ${member.user.username}! Let's set sail together! ⛵`
    ];

    const randomGreeting = onePieceGreetings[Math.floor(Math.random() * onePieceGreetings.length)];
    
    try {
        await welcomeChannel.send(randomGreeting);
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

client.login(process.env.TOKEN)
    .then(() => console.log('Bot is online!'))
    .catch(error => console.error('Error logging in:', error));
