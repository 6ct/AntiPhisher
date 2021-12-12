'use strict';

var token = require('./token.json'),
	{ Client, Intents, Collection } = require('discord.js'),
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
			regex: /fuck this \w+ called (CS:GO|csgo)|stearncommunity\.|steamcommuninty\.|choose a skin and posion the trade/i,
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
	
	for(let { label, regex, test, explain } of filters){
		let matches = typeof test == 'function' ? test(message.content) : message.content.match(regex);
		
		if(matches){
			await message.delete();
			
			let response = await message.channel.send(`${message.member} Your message was flagged as ${wt(label)}` + (typeof explain == 'function' ? ` because: ${wt(explain(message, matches))}` : ''));
			
			await sleep(7.5e3);
			
			await response.delete();
		}
	}
});
client.once('ready', async () => {
	console.log(`Invite is https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=134343746`);
});

client.login(token);

module.exports = client;