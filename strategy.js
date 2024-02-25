const FL = 'flag',
	KI = 'kick',
	CA = 'catch';

const strategy = {
	player: [
		// { act: FL, fl: 'fprt' },
		{ act: KI, fl: 'b', goal: 'gr' },
	],
	goalkeeper: [
		{ act: FL, fl: 'gr' },
		{ act: CA, fl: 'b', goal: 'gl' },
		{ act: KI, fl: 'b', goal: 'gl' },
	],
};

module.exports = strategy;
