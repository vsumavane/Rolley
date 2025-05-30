import { config } from "dotenv";
import {
  Client,
  GatewayIntentBits,
  GuildMember,
  TextChannel,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { generateRoleQuestion } from "./utils/gemini.js";

config();

interface RoleConfig {
  emoji: string;
  roleName: string;
  category: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    emoji: "💻",
    roleName: "🧠 Logic Lords",
    category: "Software Development",
  },
  {
    emoji: "🎮",
    roleName: "👾 Game On",
    category: "Gaming",
  },
  {
    emoji: "🎬",
    roleName: "📽️ Cinephile",
    category: "Movies & Series",
  },
  {
    emoji: "🎓",
    roleName: "💼 Parul Alumni",
    category: "Education",
  },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

let roleSelectionMessageId: string | null = null;

// Create and send the role selection message
async function createRoleSelectionMessage(channel: TextChannel): Promise<void> {
  // Check for existing message
  const messages = await channel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(
    (msg) =>
      msg.author.id === client.user?.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title === "Role Selection",
  );

  if (existingMessage) {
    console.log("Found existing role selection message");
    roleSelectionMessageId = existingMessage.id;
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Role Selection")
    .setDescription("React with the emojis below to get your roles!")
    .setColor("#0099ff");

  ROLE_CONFIGS.forEach((config) => {
    embed.addFields({
      name: `${config.emoji} ${config.roleName}`,
      value: `Category: ${config.category}`,
    });
  });

  const message = await channel.send({ embeds: [embed] });
  roleSelectionMessageId = message.id;

  // Add reactions
  for (const config of ROLE_CONFIGS) {
    await message.react(config.emoji);
  }
}

// Handle role verification through DM
async function handleRoleVerification(
  user: User,
  roleConfig: RoleConfig,
  member: GuildMember,
): Promise<void> {
  try {
    // Generate question using Gemini
    const questionData = await generateRoleQuestion(
      roleConfig.roleName,
      roleConfig.category,
    );

    const embed = new EmbedBuilder()
      .setTitle(`Verification for ${roleConfig.roleName}`)
      .setDescription(questionData.question)
      .setColor("#0099ff");

    const buttons = questionData.options.map((option, index) =>
      new ButtonBuilder()
        .setCustomId(`verify_${index}`)
        .setLabel(option)
        .setStyle(ButtonStyle.Primary),
    );

    const row =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        buttons,
      );

    const dmChannel = await user.createDM();
    const verificationMessage = await dmChannel.send({
      embeds: [embed],
      components: [row],
    });

    const filter = (i: any) => i.user.id === user.id;
    const collector = verificationMessage.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
      max: 1,
    });

    collector.on("collect", async (interaction) => {
      const selectedOption =
        questionData.options[parseInt(interaction.customId.split("_")[1])];

      if (selectedOption === questionData.correctAnswer) {
        const role = member.guild.roles.cache.find(
          (r) => r.name === roleConfig.roleName,
        );
        if (role) {
          await member.roles.add(role);
          await interaction.reply({
            content: `✅ Verification successful! You've been given the ${roleConfig.roleName} role.`,
            flags: 64,
          });
        }
      } else {
        await interaction.reply({
          content: "❌ Incorrect answer. Please try again later.",
          flags: 64,
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await dmChannel.send("Verification timed out. Please try again.");
      }
    });
  } catch (error) {
    console.error("Error in role verification:", error);
    await user.send(
      "Sorry, there was an error processing your role verification. Please try again later.",
    );
  }
}

// Handle reaction events
client.on(
  "messageReactionAdd",
  async (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) => {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Error fetching reaction:", error);
        return;
      }
    }

    const message = reaction.message;
    if (
      !message.guild ||
      !(message.channel instanceof TextChannel) ||
      message.channel.name !== "😋-self-roles"
    )
      return;

    // Only process reactions on the role selection message
    if (message.id !== roleSelectionMessageId) return;

    const member = message.guild.members.cache.get(user.id);
    if (!member) return;

    const roleConfig = ROLE_CONFIGS.find(
      (config) => config.emoji === reaction.emoji.name,
    );
    if (!roleConfig) return;

    await handleRoleVerification(user as User, roleConfig, member);
  },
);

// Initialize bot
client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);

  // Find the self-roles channel and create the role selection message
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("No guild found! Make sure the bot is in a server.");
    return;
  }

  const channel = guild.channels.cache.find(
    (ch): ch is TextChannel => ch.name === "😋-self-roles" && ch.type === 0,
  );

  if (!channel) {
    console.error(
      'Could not find the self-roles channel. Please create a channel named "😋-self-roles"',
    );
    return;
  }

  // Check if roles exist
  const missingRoles = ROLE_CONFIGS.filter(
    (config) =>
      !guild.roles.cache.some((role) => role.name === config.roleName),
  );

  if (missingRoles.length > 0) {
    console.error(
      "Missing roles:",
      missingRoles.map((r) => r.roleName).join(", "),
    );
    console.error("Please create these roles in your server");
    return;
  }

  createRoleSelectionMessage(channel).catch((error) => {
    console.error("Error creating role selection message:", error);
  });
});

// Add error handlers
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(process.env.TOKEN).catch((error: Error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
