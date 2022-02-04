'use stricts';

class WORD {
	static process(args){
		for(let i = 0; i < args.length; i++){
			if(typeof args[i] == 'string'){
				args[i] = new WORD(args[i]);
			}
		}
	}
	constructor(word, case_insensitive = true){
		if(case_insensitive === true){
			this.word = word.toLowerCase();
			this.case_insensitive = true;
		}else{
			this.word = word;
			this.case_insensitive = false;
		}
	}
	test(string){
		if(this.case_insensitive){
			return string.toLowerCase().includes(this.word);
		}else{
			return string.includes(this.word);
		}
	}
};

class NOT {
	constructor(...filters){
		WORD.process(filters);
		this.filters = filters;
	}
	test(string){
		for(let filter of this.filters)if(filter.test(string))return false;
		return true;
	}
};

class ANY {
	constructor(...filters){
		WORD.process(filters);
		this.filters = filters;
	}
	test(string){
		for(let filter of this.filters)if(filter.test(string))return true;
		return false;
	}
};

class ALL {
	constructor(...filters){
		WORD.process(filters);
		this.filters = filters;
	}
	test(string){
		for(let filter of this.filters)if(!filter.test(string))return false;
		return true;
	}
};

exports.NOT = NOT;
exports.ALL = ALL;
exports.ANY = ANY;
exports.WORD = WORD;