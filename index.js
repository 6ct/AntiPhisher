'use strict';

{
	let { ANY, ALL, NOT } = require('./StringFilter');
	
	var filter = new ALL(
		new NOT('discord.gift/'),
		new ANY(
			new ALL('.gift/', 'Whо is first?'),
			new ALL('.gift/', 'take it'),
			new ALL('nitro', '@everyone'),
			new ALL(new ANY('discord', 'nitro'), 'airdrop'),
			new ALL('nitro', new ANY('free', 'take', 'gen', 'steam')),
			new ALL('gifts for ', 'nitro for 3 months'),
			new ALL('free', 'distributi\u03bfn'),
			new ALL('@everyone', 'who will catch this gift?'),
			new ALL('@everyone', 'who is first', '.gift/'), // not discord.gift, main NOT clears this outerHTML
		),
	);
}

var Commands = require('./Commands'),
	Counter = require('./Counter'),
	{ Client, Intents, Collection, Constants, Permissions } = require('discord.js'),
	bot_permissions = Permissions.FLAGS.MODERATE_MEMBERS | Permissions.FLAGS.MANAGE_MESSAGES | Permissions.FLAGS.SEND_MESSAGES | Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.EMBED_LINKS | Permissions.FLAGS.MANAGE_THREADS | Permissions.FLAGS.VIEW_CHANNEL,
	path = require('path'),
	count = new Counter(path.join(__dirname, './Count.json')),
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
				return filter.test(content.toLowerCase());
			},
		},
	];

Collection.prototype[Symbol.iterator] = Collection.prototype.entries;

client.once('ready', async () => {
	await client.user.setPresence({
		activities: [{
			type: 'WATCHING',
			name: `for Phishing | ap!help`,
		}],
		status: 'online',
	});
	
	console.log(`Invite is https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${bot_permissions}`);
});

var commands = new Commands(client);

commands.add('ap!stats', 'Displays global statistics for phishing messages filtered.', async message => {
	var result = 'Global statistics:\n';
	
	for(let { label } of filters){
		let a = await count.get(label);
		result += `${wt(label)}: **${a}**\n`;
	}
	
	message.channel.send(result);
});

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

commands.add('ap!test', 'Tests the filter.', async message => {
	message.test_ph = true;
	
	for(let { label, regex, test, explain } of filters){
		let matches = typeof test == 'function' ? test(message.content) : message.content.match(regex);
		
		if(matches){
			try{
				await message.delete();
			}catch(err){
				if(err.code == Constants.APIErrors.MISSING_PERMISSIONS){
					message.channel.send(`I'm missing permission to delete this message!`);
				}else console.error(err);
			}
			
			await message.channel.send(`${message.member} Your message was flagged as ${wt(label)}` + (typeof explain == 'function' ? ` because: ${wt(explain(message, matches))}` : ''));
			return;
		}
	}

	message.channel.send('Your message was not filtered.');
});

commands.listen();

client.login(require('./token.json'));

client.on('messageCreate', async message => {
	// wait for async stack to clear
	await{};
	
	if(message.test_ph || message.channel.type == 'dm' || message.author.bot)return;
	
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
			
			count.add(label);
			
			let response = await message.channel.send(`${message.member} Your message was flagged as ${wt(label)}` + (typeof explain == 'function' ? ` because: ${wt(explain(message, matches))}` : ''));
			
			try{
				await message.member.timeout(60e3 * 2, `User's message was flagged as ${label}.`)
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
