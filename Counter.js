'use strict';

var fs = require('fs');

class Counter {
	constructor(file){
		this.load = this.create(file);
	}
	data = {};
	async create(file){
		this.file = await fs.promises.open(file, 'w');
		
		var { size } = await this.file.stat();
		
		if(!size)return;
	
		var buffer = Buffer.alloc(size);
		
		var { bytesRead } = await this.file.read(buffer, 0, buffer.byteLength, 0);
		
		if(bytesRead < buffer.byteLength)return void console.error('Error reading file');
		
		try{
			this.data = JSON.parse(buffer);
		}catch(err){
			console.error('Error parsing count:', err);
		}
	}
	async get(label){
		await this.load;
		return this.data[label] || (this.data[label] = 0);
	}
	async add(label){
		await this.load;
		
		var count = this.data[label] || (this.data[label] = 0);
		
		this.data[label] = count + 1;
		
		var buffer = Buffer.from(JSON.stringify(this.data));
		
		await this.file.write(buffer, 0, buffer.byteLength, 0);
		await this.file.truncate(buffer.byteLength);
	}
};

module.exports = Counter;