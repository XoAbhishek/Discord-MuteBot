const {
  Client,
  GatewayIntentBits,
  Partials,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  Events
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

let controlMessage = null;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ✅ Check if user has Admin/Leader role
function isAdminOrLeader(member) {
  return member.roles.cache.some(role =>
    ['Admin', 'Leader'].includes(role.name)
  );
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // Restrict usage
  if (!isAdminOrLeader(message.member) && (content === '!muteon' || content === '!muteoff')) {
    return message.reply('🚫 Only members with **Admin** or **Leader** role can use this command.');
  }

  // 🔁 Clean and re-send new panel
  if (content === '!muteon') {
    // Delete previous panels
    try {
      const fetchedMessages = await message.channel.messages.fetch({ limit: 50 });
      const botPanels = fetchedMessages.filter(msg =>
        msg.author.id === client.user.id &&
        msg.components.length > 0 &&
        msg.content.includes('Voice Control Panel')
      );
      for (const msg of botPanels.values()) {
        await msg.delete().catch(() => {});
      }
    } catch (err) {
      console.log('⚠️ Could not fetch/delete previous panels');
    }

    // Send new panel
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('mute_all')
          .setLabel('🔇 Mute All')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('unmute_all')
          .setLabel('🔊 Unmute All')
          .setStyle(ButtonStyle.Success)
      );

    controlMessage = await message.channel.send({
      content: '**🎛 Voice Control Panel:**',
      components: [row]
    });
  }

  // 🧹 Remove panel
  if (content === '!muteoff') {
    if (controlMessage) {
      await controlMessage.delete().catch(() => {});
      controlMessage = null;
      return message.reply('🧹 Control panel removed.');
    } else {
      return message.reply('❌ No control panel to remove.');
    }
  }
});

// Button logic
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;

  if (!isAdminOrLeader(member)) {
    return interaction.reply({
      content: '🚫 Only **Admin** or **Leader** can use this.',
      ephemeral: true
    });
  }

  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '📢 You must be in a voice channel.',
      ephemeral: true
    });
  }

  const members = voiceChannel.members;

  if (interaction.customId === 'mute_all') {
    members.forEach(m => {
      if (!m.user.bot) m.voice.setMute(true).catch(() => {});
    });
    return interaction.reply({ content: '🔇 Everyone muted!', ephemeral: true });
  }

  if (interaction.customId === 'unmute_all') {
    members.forEach(m => {
      if (!m.user.bot) m.voice.setMute(false).catch(() => {});
    });
    return interaction.reply({ content: '🔊 Everyone unmuted!', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
