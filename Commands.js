'use strict';

var { Permissions } = require('discord.js'),
	overload = require('./overload'),
	o = overload.o,
	admin_bits = Permissions.FLAGS.ADMINISTRATOR | Permissions.FLAGS.MANAGE_GUILD | Permissions.FLAGS.KICK_MEMBERS | Permissions.FLAGS.BAN_MEMBERS;

overload.define('cooldown', arg => {
	return typeof arg == 'number' || arg == undefined;
});

class Command {
	id = Symbol();
	alias = [];
	permission = 'member';
	cooldown = 2.5e3;
	callback(message, value, flags, perms){}
	#description(description){
		if(!description.length)return 'No description.';
		else return description;
	}
	#construct = overload()
		.args(o.any(String, Array), String, String, Function)
		.use(function(alias, description, permission, callback, cooldown){
			this.alias.push(...[].concat(alias));
			this.permission = permission;
			this.callback = callback;
			this.description = this.#description(description);
			if(!isNaN(cooldown))this.cooldown = cooldown;
		})
		.args(o.any(String, Array), String, Function, o.cooldown)
		.use(function(alias, description, callback, cooldown){
			this.alias.push(...[].concat(alias));
			this.callback = callback;
			this.description = this.#description(description);
			if(!isNaN(cooldown))this.cooldown = cooldown;
		})
		.error(function() { console.trace('Bad overload'); })
		.expose()
	;
	constructor(...args){
		this.#construct(...args);
	}
};

class Commands {
	cooldowns = {};
	list = new Set();
	add(...args){
		this.list.add(new Command(...args));
	}
	/* Permissions
	
	[ 'admin', {
		roles?: [ 0000000, ... ],
		members?: [ 0000000, ... ],
	} ]
	*/
	permissions = new Map();
	async on_message(message){
		if(message.member == void[] || message.author.bot)return;
		
		var args = message.content.trim().replace(/\s+/g, ' ').split(' '),
			bitfield = message.member?.permissions.bitfield || 0,
			cperms = {
				member: true,
				owner: message.member == await message.guild.fetchOwner(),
			};
		
		for(let [ key, { members, roles } ] of this.permissions)cperms[key] = 
			members?.includes(member.id) ||
			roles?.some(role => member.roles.cache.has(role));
		
		if(cperms.owner)cperms.admin = true;
		if(cperms.admin || bitfield & admin_bits)cperms.mod = true;
		if(cperms.mod)cperms.helper = true;
		if(cperms.helper)cperms.staff = true;
		
		for(let command of this.list)if(command.alias.includes(args[0])){
			let cooldown = {
					start: Date.now(),
					duration: command.cooldown,
				},
				cd = this.cooldowns[message.author.id] || (this.cooldowns[message.author.id] = {}),
				active_cd = cd[command.id];
			
			if(active_cd && Date.now() - active_cd.start >= active_cd.duration){
				active_cd = false;
				delete cd[command.id];
			}
			
			if(active_cd)return message.channel.send(`You are on cooldown, please wait **${active_cd.duration / 1000}s**`);
			
			cd[command.id] = cooldown;
			
			// missing perm
			if(command.permission && !cperms[command.permission])return message.channel.send(`:no_entry: | Command requires ${command.permission}`);
			
			if(!cperms.mod && !command.bot_usage && message.author.bot)return;
			
			let flags = new Map(),
				first_flag;
			
			for(let [ ind, arg ] of Object.entries(args)){
				// flag cannot be the first argument
				if(!ind || !arg.startsWith('?'))continue;
				
				first_flag = first_flag || ind;
				
				let next = args.findIndex((arg, inde) => inde > ind && arg.startsWith('?'));
				
				flags.set(arg.substr(1), args.slice(ind + 1, next == -1 ? args.length : next).join(' '));
			}
			
			for(let required_flag of [].concat(command.flags||[]))if(!flags.has(required_flag))return message.channel.send(`:interrobang: | Missing required flag: ${required_flag}`); 
			
			for(let [ flag, unions ] of Object.entries(command.union_flags||{}))for(let union of [].concat(unions))if(flags.has(union))flags.set(flag, flags.get(union));
			
			let value = args.slice(1, flags.size ? first_flag : args.length).join(' ');
			
			try{
				command.callback(message, value, flags, cperms);
			}catch(err){
				console.error(err);
				message.channel.send(`:no_entry_sign: | An error occured.`);
			}
			
			break;
		}
	}
	listener = message => this.on_message(message);
	constructor(client){
		this.client = client;
	}
	listen(){
		this.client.on('messageCreate', this.listener);
	}
	unlisten(){
		this.client.off('messageCreate', this.listener);
	}
};

module.exports = Commands;