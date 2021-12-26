'use strict';

var Commands = require('./Commands'),
	{ Client, Intents, Collection, Constants, Permissions } = require('discord.js'),
	bot_permissions = Permissions.FLAGS.MODERATE_MEMBERS | Permissions.FLAGS.MANAGE_MESSAGES | Permissions.FLAGS.SEND_MESSAGES | Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.EMBED_LINKS | Permissions.FLAGS.MANAGE_THREADS | Permissions.FLAGS.VIEW_CHANNEL,
	sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
	client = new Client({
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		],
		partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
	}),
	wt = str => '``' + str.replace(/[\\`]/g, '\\$&') + '``',
	filters = [
		{
			label: 'Steam Phishing Link',
			regex: /I am giving away all my inventory|fuck this \w+ called (CS:GO|csgo)|stearncommunity\.|steamcommuninty\.|choose a skin and posion the trade/i,
		},
		{
			label: 'Nitro/Steam Phishing Link',
			test(content){
				content = content.toLowerCase();
				
				var has_nitro = content.includes('nitro');
				
				if
					 ( has_nitro && content.includes('@everyone')
					|| (content.includes('discord') || has_nitro) && content.includes('airdrop')
					|| has_nitro && content.includes('free')
					|| has_nitro && content.includes('take')
					|| has_nitro && content.includes('gen')
					|| has_nitro && content.includes('steam')
					|| content.includes('free') && content.includes('distributiοn')
				)return true;
				else return false;
			},
		},
	];

Collection.prototype[Symbol.iterator] = Collection.prototype.entries;

client.on('messageCreate', async message => {
	if(message.channel.type == 'dm' || message.author.bot)return;
	
	var higher_role = message.guild.me.roles.highest.position > message.member.roles.highest.position;
	
	if(higher_role)for(let { label, regex, test, explain } of filters){
		let matches = typeof test == 'function' ? test(message.content) : message.content.match(regex);
		
		if(matches){
			try{
				await message.delete();
			}catch(err){
				if(err.code == Constants.APIErrors.MISSING_PERMISSIONS){
					message.channel.send(`I'm missing permission to delete this message!`);
				}else console.error(err);
			}
			
			let response = await message.channel.send(`${message.member} Your message was flagged as ${wt(label)}` + (typeof explain == 'function' ? ` because: ${wt(explain(message, matches))}` : ''));
			
			try{
				await message.member.timeout(60e3, `User's message was flagged as ${label}.`)
			}catch(err){
				if(err.code == Constants.APIErrors.MISSING_PERMISSIONS){
					message.channel.send(`I'm missing permission to timeout!`);
				}else console.error(err);
			}
			await sleep(7.5e3);
			
			await response.delete();
		}
	}
});

client.once('ready', async () => {
	await client.user.setPresence({
		activities: [{
			type: 'WATCHING',
			name: 'for Phishing | ap!help',
		}],
		status: 'online',
	});
	console.log(`Invite is https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${bot_permissions}`);
});

var commands = new Commands(client);

commands.add('ap!help', 'Displays help.', message => {
	var result = '';
	
	for(let command of commands.list){
		result += '\n';
		
		let perm = command.perm || 'everyone';
		
		result += perm[0].toUpperCase() + perm.substr(1);
		result += ' : ';
		result += command.alias.join(', ');
		result += ' : ' + command.description;
	}
	
	message.channel.send('<https://github.com/6ct/AntiPhisher/wiki>\n```' + result + '```');
});

commands.listen();

client.login(require('./token.json'));