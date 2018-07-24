const Discord = require('discord.js');
const config = require('./config.json');
const schedule = require('node-schedule');

const client = new Discord.Client();
var timersChannelId = "";
var timersChannel;
var activeEvents = {};
var scheduledEvents = {};
var undoKey = "";
var undoActiveEvent = true;

client.on('ready', () => {
    // Event runs if bot is online and ready
    console.log(`Bot has started with ${client.users.size} users in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 

    // Job that recurrs every minute
    var rule = new schedule.RecurrenceRule();
    rule.minute = new schedule.Range(0, 59, 1);

    var job = schedule.scheduleJob(rule, function() {
        // If timers channel has been set up
        if (timersChannelId) {
            timersChannel = client.channels.get(timersChannelId);

            // Parse through scheduled events dict
            var scheduledEventsEmbed;
            var scheduledEventsDescText = "```fix";
            var scheduledEventsChanText = "```css";
            var scheduledEventsTimeLeftText = "```yaml";

            for (var key in scheduledEvents) {
                if (parseInt(scheduledEvents[key][3]) <= 0) {
                    // Remove any old scheduled events and add them to active
                    activeEvents[key] = [scheduledEvents[key][0], scheduledEvents[key][1], scheduledEvents[key][2]];
                    undoActiveEvent = true;
                    delete scheduledEvents[key];
                }
                else {
                    // Format strings to display in scheduled events
                    scheduledEventsDescText += "\n" + String(scheduledEvents[key][0]) + "\n";
                    scheduledEventsChanText += "\n" + String(scheduledEvents[key][1]) + "\n";
                    scheduledEventsTimeLeftText += "\n" + String(scheduledEvents[key][3]) + "\n";

                    // Update time left
                    scheduledEvents[key][3] = parseInt(scheduledEvents[key][3]) - 1;
                }
            }
            scheduledEventsDescText += "```";
            scheduledEventsChanText += "```";
            scheduledEventsTimeLeftText += "```";

            // Parse through active events dict
            var activeEventsEmbed;
            var activeEventsDescText = "```fix";
            var activeEventsChanText = "```css";
            var activeEventsTimeLeftText = "```yaml";

            for (var key in activeEvents) {
                if (parseInt(activeEvents[key][2]) <= 0) {
                    // Remove any old active events
                    delete activeEvents[key];
                }
                else {
                    // Format strings to display in active events
                    activeEventsDescText += "\n" + String(activeEvents[key][0]) + "\n";
                    activeEventsChanText += "\n" + String(activeEvents[key][1]) + "\n";
                    activeEventsTimeLeftText += "\n" + String(activeEvents[key][2]) + "\n";
                    
                    // Update time left
                    activeEvents[key][2] = parseInt(activeEvents[key][2]) - 1;
                }
            }
            activeEventsDescText += "```";
            activeEventsChanText += "```";
            activeEventsTimeLeftText += "```";
        
            // Display different embeds if none in progress
            if (Object.keys(scheduledEvents).length > 0) {
                scheduledEventsEmbed = new Discord.MessageEmbed()
                    .setTitle(":calendar: Scheduled events")
                    .setColor(0xfbd204)
                    .addField("Description", scheduledEventsDescText, true)
                    .addField("Channel", scheduledEventsChanText, true)
                    .addField("Time until start", scheduledEventsTimeLeftText, true);
            }
            else {
                scheduledEventsEmbed = new Discord.MessageEmbed()
                    .setTitle(":no_bell: No scheduled events")
                    .setDescription("```Come back later, or ask for a GQ/buff to be popped!```")
                    .setColor(0xffffff)
            }

            if (Object.keys(activeEvents).length > 0) {
                activeEventsEmbed = new Discord.MessageEmbed()
                    .setTitle(":hourglass: In progress")
                    .setColor(0x009900)
                    .addField("Description", activeEventsDescText, true)
                    .addField("Channel", activeEventsChanText, true)
                    .addField("Time left", activeEventsTimeLeftText, true);
            }
            else {
                activeEventsEmbed = new Discord.MessageEmbed()
                    .setTitle(":clock4: No events in progress")
                    .setDescription("```Come back later!```")
                    .setColor(0x990000)
            }

            // Send embeds and delete after 1 min
            timersChannel.send(activeEventsEmbed)
                .then(msg => msg.delete({timeout: 60000}))
                .catch(error => console.log(`Failed to delete message due to ${error}`));

            timersChannel.send(scheduledEventsEmbed)
                .then(msg => msg.delete({timeout: 60000}))
                .catch(error => console.log(`Failed to delete message due to ${error}`));
        }
        else {
            console.log("Timers channel ID has not been set up yet! Use !setup to complete setup");
        }
    })

});


// Handle each message
client.on('message', message => {
    
    // Ignore other bots
    if (message.author.bot) return;
    
    // Ignore other prefixes
    if (message.content.indexOf(config.prefix) !== 0) return;
   
    // Separate message into command and args, where args is an array
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    
    // Commands
    if (command === "setup") {
        if (!message.member.hasPermission("MANAGE_MESSAGES")) {
            message.channel.send("You don't have permission to do this!");
        }
        else if (args.length != 1 || isNaN(parseInt(args[args.length-1]))) {
            message.channel.send("Format: `!setup <discord channel id>`");
        }
        else {
            timersChannelId = args[0];
        }
    }

    if (command === "timer") {
        if (args.length < 3 || isNaN(parseInt(args[args.length-1]))) {
            message.channel.send("Format: `!timer <description> <channel> <event length in minutes>`");
        }
        else {
            const desc = args.slice(0, args.length-2).join(" ");
            const chan = args[args.length-2];
            const timeLeft = parseInt(args[args.length-1]);

            activeEvents[desc + chan] = [desc, chan, timeLeft];
            undoKey = desc + chan;
            undoActiveEvent = true;
        }
    }

    if (command === "schedule") {
        if (args.length < 4 || isNaN(parseInt(args[args.length-1])) || isNaN(parseInt(args[args.length-2]))) {
            message.channel.send("Format: `!schedule <description> <channel> <event length in minutes> <time until event starts in minutes>`");
        }
        else {
            const desc = args.slice(0, args.length-3).join(" ");
            const chan = args[args.length-3];
            const eventLength = args[args.length-2];
            const timeLeft = parseInt(args[args.length-1]);

            scheduledEvents[desc + chan] = [desc, chan, eventLength, timeLeft];
            undoKey = desc + chan;
            undoActiveEvent = false;
        }
    }

    if (command === "undo") {
        if (undoActiveEvent) {
            delete activeEvents[undoKey];
        }
        else {
            delete scheduledEvents[undoKey];
        }
    }

    if (command === "delete") {
        if (args.length < 2) {
            message.channel.send("Format: `!delete <original description> <original channel>`");
        }
        else {
            const desc = args.slice(0, args.length-1).join(" ");
            const chan = args[args.length-1];

            delete activeEvents[desc + chan];
        }
    }
  
    if (command === "timershelp") {
        if (args.length != 0) {
            message.channel.send("Format: `!timershelp`");
        }
        else {
            message.channel.send("**Commands**\n`!setup <discord channel id>`\n`!timer <description> <channel> <event length in minutes>`\n`!schedule <description> <channel> <event length in minutes> <time until event starts in minutes>`\n`!undo`\n`!delete <original description> <original channel>`\n`!timersclear`");
        }
    }
  
    if (command === "timersclear") {
        if (message.member.hasPermission("MANAGE_MESSAGES") && timersChannel !== undefined) {
            timersChannel.bulkDelete(100)
                .then(messages => console.log(`Bulk deleted ${messages.size} messages`))
                .catch(error => message.reply("Failed to bulk delete messages: ${error}"));
        }
    }
    
//    if (command === "purge") {
//      if (message.member.hasPermission("MANAGE_MESSAGES")) {
//          message.channel.bulkDelete(100)
//              .then(messages => console.log(`Bulk deleted ${messages.size} messages`))
//                .catch(error => message.reply("Failed to bulk delete messages: ${error}"));
//        }
//    }
});

client.login(config.token);
