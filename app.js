const Discord = require('discord.js');
const config = require('./config.json');
const schedule = require('node-schedule');

const client = new Discord.Client();
const timersChannelId = "469411286799613972";


client.on('ready', () => {
    // Event runs if the bot starts and logs in successfully
    console.log(`Bot has started with ${client.users.size} users in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 

    // Get timers channel & set up rule for every minute
    const timersChannel = client.channels.get(timersChannelId);

    var rule = new schedule.RecurrenceRule();
    rule.minute = new schedule.Range(0, 59, 1);

    // Timer embed object
	var embed;
    var colTitles = ["Description", "Time left"];
    var colVals = ["```fix\nMission1\n\nMission2```", "```yaml\n10\n\n25```"];

    if (colVals.length > 0) {
        embed = new Discord.MessageEmbed()
            .setTitle(":hourglass: In progress")
            .setColor(0x33cc33)
            .addField(colTitles[0], colVals[0], true)
            .addField(colTitles[1], colVals[1], true);
    }
    else {
		embed = new Discord.MessageEmbed()
            .setTitle(":hourglass: In progress")
			.setDescription("```None```")
            .setColor(0x33cc33)
    }

    // Try sending message, delete after 1 min
    var job = schedule.scheduleJob(rule, function() {
        timersChannel.send(embed)
            .then(msg => msg.delete({timeout: 60000}))
            .catch(error => console.log(`Failed to delete message due to ${error}`));
    })
   

});

client.on('guildCreate', guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on('guildDelete', guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});


// Handle each message
client.on('message', message => {
    
	// Check if in timers channel
//    if (message.channel.id == timerChannelId) {
//        const fetched = await message.channel.fetchMessages({limit: 5});
//    	message.channel.bulkDelete(fetched)
//    	.catch(error => message.reply("`Couldn't delete messages because of: ${error}`")); 
//    }

    // Ignore other bots
    if (message.author.bot) return;
    
    // Ignore other prefixes
    if (message.content.indexOf(config.prefix) !== 0) return;
   
    // Separate message into command and args, where args is an array
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    
    // Commands
    if (command === "hello") {
        message.reply("Hello!");
    }
    
    if (command === "purge") {
		if (message.member.hasPermission("MANAGE_MESSAGES")) {
        	message.channel.bulkDelete(100)
        		.then(messages => console.log(`Bulk deleted ${messages.size} messages`))
                .catch(error => message.reply("Failed to bulk delete messages: ${error}"));
        }
    }
});

client.login(config.token);
