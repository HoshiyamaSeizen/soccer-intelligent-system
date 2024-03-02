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
	passer: [
		{ act: FL, fl: 'fplc' },
		{ act: KI, fl: 'b', goal: 'teammate' },
	],
	goaler: [
		{ act: FL, fl: 'fplb' },
		{ act: FL, fl: 'fgrb' },
		{ act: KI, fl: 'b', goal: 'gr' },
	],
};

module.exports = strategy;
