export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Account hierarchy definition
export const ACCOUNT_HIERARCHY = {
	ASSETS: ['Cash & Bank', 'Investment Accounts', 'Retirement Accounts', 'Property'],
	LIABILITIES: ['Short Term Liabilities', 'Long Term Liabilities'],
};

// Default accounts
export const DEFAULT_ACCOUNTS = [
	{ id: 'acc1',  name: 'Checking Account 1',    subtype: 'Cash & Bank',           assetClass: 'ASSETS',      icon: '🏦', startBalance: 4250,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc2',  name: 'Checking Account 2',    subtype: 'Cash & Bank',           assetClass: 'ASSETS',      icon: '🏦', startBalance: 1850,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc3',  name: 'High Yield Savings',    subtype: 'Cash & Bank',           assetClass: 'ASSETS',      icon: '💰', startBalance: 15000,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc4',  name: 'Petty Cash',            subtype: 'Cash & Bank',           assetClass: 'ASSETS',      icon: '💵', startBalance: 150,    monthlyBalances: Array(12).fill(null) },
	{ id: 'acc5',  name: 'Brokerage Account',     subtype: 'Investment Accounts',   assetClass: 'ASSETS',      icon: '📈', startBalance: 12500,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc6',  name: 'Alternative Investments',subtype: 'Investment Accounts',  assetClass: 'ASSETS',      icon: '🔷', startBalance: 2100,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc7',  name: 'Treasury Bonds',        subtype: 'Investment Accounts',   assetClass: 'ASSETS',      icon: '📜', startBalance: 5000,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc8',  name: '401k (Primary)',        subtype: 'Retirement Accounts',   assetClass: 'ASSETS',      icon: '🥇', startBalance: 85000,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc9',  name: 'Roth IRA',             subtype: 'Retirement Accounts',   assetClass: 'ASSETS',      icon: '🏅', startBalance: 22000,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc10', name: 'Traditional IRA',      subtype: 'Retirement Accounts',   assetClass: 'ASSETS',      icon: '📋', startBalance: 8500,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc11', name: 'HSA Account',          subtype: 'Retirement Accounts',   assetClass: 'ASSETS',      icon: '🏥', startBalance: 4200,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc12', name: 'Primary Home Value',   subtype: 'Property',              assetClass: 'ASSETS',      icon: '🏠', startBalance: 425000, monthlyBalances: Array(12).fill(null) },
	{ id: 'acc13', name: 'Vehicle 1 Value',      subtype: 'Property',              assetClass: 'ASSETS',      icon: '🚗', startBalance: 18000,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc14', name: 'Vehicle 2 Value',      subtype: 'Property',              assetClass: 'ASSETS',      icon: '🚙', startBalance: 12000,  monthlyBalances: Array(12).fill(null) },
	{ id: 'acc15', name: 'Other Real Estate',    subtype: 'Property',              assetClass: 'ASSETS',      icon: '🏢', startBalance: 0,      monthlyBalances: Array(12).fill(null) },
	{ id: 'acc16', name: 'Credit Card 1',        subtype: 'Short Term Liabilities',assetClass: 'LIABILITIES', icon: '💳', startBalance: 1850,   monthlyBalances: Array(12).fill(null) },
	{ id: 'acc17', name: 'Credit Card 2',        subtype: 'Short Term Liabilities',assetClass: 'LIABILITIES', icon: '💳', startBalance: 420,    monthlyBalances: Array(12).fill(null) },
	{ id: 'acc18', name: 'Personal Loan',        subtype: 'Short Term Liabilities',assetClass: 'LIABILITIES', icon: '💰', startBalance: 0,      monthlyBalances: Array(12).fill(null) },
	{ id: 'acc19', name: 'Primary Mortgage',     subtype: 'Long Term Liabilities', assetClass: 'LIABILITIES', icon: '🏠', startBalance: 334500, monthlyBalances: Array(12).fill(null) },
];

// Default recurring bills
export const DEFAULT_BILLS = [
	{ id: 'bill1', name: 'Internet Service',      payeePattern: 'Internet',    matchType: 'Contains', amountType: 'Fixed Amount', amount: 80,   frequency: 'Monthly', nextDueDate: '2025-05-01', dayOfMonth: 1,  billType: 'expense', category: 'Internet',            accountId: 'acc1' },
	{ id: 'bill2', name: 'Auto Insurance',        payeePattern: 'Insurance',   matchType: 'Contains', amountType: 'Fixed Amount', amount: 175,  frequency: 'Monthly', nextDueDate: '2025-05-01', dayOfMonth: 1,  billType: 'expense', category: 'Auto Insurance',      accountId: 'acc1' },
	{ id: 'bill3', name: 'Mobile Phone Plan',     payeePattern: 'Phone',       matchType: 'Contains', amountType: 'Fixed Amount', amount: 80,   frequency: 'Monthly', nextDueDate: '2025-05-01', dayOfMonth: 1,  billType: 'expense', category: 'Mobile Phone',        accountId: 'acc1' },
	{ id: 'bill4', name: 'Credit Card 1 Payment', payeePattern: 'Credit Card', matchType: 'Contains', amountType: 'Fixed Amount', amount: 231,  frequency: 'Monthly', nextDueDate: '2025-05-15', dayOfMonth: 15, billType: 'expense', category: 'Credit Card 1',       accountId: 'acc1' },
	{ id: 'bill5', name: 'Credit Card 2 Payment', payeePattern: 'Credit Card', matchType: 'Contains', amountType: 'Fixed Amount', amount: 438,  frequency: 'Monthly', nextDueDate: '2025-05-15', dayOfMonth: 15, billType: 'expense', category: 'Credit Card 2',       accountId: 'acc1' },
	{ id: 'bill6', name: 'Employment Paycheck',   payeePattern: 'Paycheck',    matchType: 'Contains', amountType: 'Fixed Amount', amount: 4987, frequency: 'Monthly', nextDueDate: '2025-05-01', dayOfMonth: 1,  billType: 'income',  category: 'Primary Salary',      accountId: 'acc1' },
	{ id: 'bill7', name: 'Rental Property Income',payeePattern: 'Rental',      matchType: 'Contains', amountType: 'Fixed Amount', amount: 1840, frequency: 'Monthly', nextDueDate: '2025-05-01', dayOfMonth: 1,  billType: 'income',  category: 'Rental Income',       accountId: 'acc1' },
];

// Category metadata — used for active/passive income splits and need/want splits in dashboard
export const CATEGORY_META = {
	Income: {
		'Primary Salary':        { active: true },
		'Commissions & Bonuses': { active: true },
		'Rental Income':         { active: false },
		'Pretax 401K':           { active: false },
		'Employer 401K Match':   { active: false },
	},
	Expenses: {
		'Utilities':         { need: true },
		'Groceries':         { need: true },
		'Electric Bill':     { need: true },
		'Water Bill':        { need: true },
		'Natural Gas':       { need: true },
		'Internet':          { need: true },
		'Auto Insurance':    { need: true },
		'Mobile Phone':      { need: true },
		'Miscellaneous':     { need: false },
		'Dining Out':        { need: false },
		'Entertainment':     { need: false },
		'Personal Care':     { need: true },
		'Home Repairs':      { need: true },
		'Pet Care':          { need: true },
		'Personal Spending': { need: false },
		'Fuel & Auto':       { need: true },
		'Healthcare':        { need: true },
		'Credit Card 1':     { need: true },
		'Credit Card 2':     { need: true },
		'Home Improvement':  { need: true },
	},
	Savings: {
		'Emergency Fund':    { longTerm: false },
		'Short-Term Savings':{ longTerm: false },
		'401K':              { longTerm: true },
		'Roth IRA':          { longTerm: true },
		'Crypto':            { longTerm: true },
		'Stocks':            { longTerm: true },
	},
	Investments: {
		'Brokerage Account':  { growth: true },
		'Index Funds':        { growth: true },
		'Individual Stocks':  { growth: true },
		'Real Estate (REIT)': { growth: true },
		'Crypto Portfolio':   { growth: false },
	},
	Debt: {
		'Primary Mortgage':     { highPriority: false },
		'Rental Mortgage':      { highPriority: false },
		'Auto Loan':            { highPriority: true },
		'Personal Loan 1':      { highPriority: true },
		'Personal Loan 2':      { highPriority: true },
		'Credit Card 1 Payment':{ highPriority: true },
		'Credit Card 2 Payment':{ highPriority: true },
	},
};

export const DEFAULT_DATA = {
	categories: {
		Income:      ['Primary Salary', 'Commissions & Bonuses', 'Rental Income', 'Pretax 401K', 'Employer 401K Match'],
		Savings:     ['Emergency Fund', 'Short-Term Savings', '401K', 'Roth IRA', 'Crypto', 'Stocks'],
		Investments: ['Brokerage Account', 'Index Funds', 'Individual Stocks', 'Real Estate (REIT)', 'Crypto Portfolio'],
		Expenses:    ['Utilities', 'Groceries', 'Electric Bill', 'Water Bill', 'Natural Gas', 'Internet', 'Auto Insurance', 'Mobile Phone', 'Miscellaneous', 'Dining Out', 'Entertainment', 'Personal Care', 'Home Repairs', 'Pet Care', 'Personal Spending', 'Fuel & Auto', 'Healthcare', 'Credit Card 1', 'Credit Card 2', 'Home Improvement'],
		Debt:        ['Primary Mortgage', 'Rental Mortgage', 'Auto Loan', 'Personal Loan 1', 'Personal Loan 2', 'Credit Card 1 Payment', 'Credit Card 2 Payment'],
	},
	budget: {
		Income: {
			'Primary Salary':        [4987,4987,4987,4987,4987,4987,4987,4987,4987,4987,4987,4987],
			'Commissions & Bonuses': [1160,2200,1160,1160,2500,1160,1160,2200,1160,1160,2500,1603],
			'Rental Income':         [1840,1840,1840,1840,1840,1840,1840,1840,1840,1840,1840,1840],
			'Pretax 401K':           [647,647,647,647,647,647,647,647,647,647,647,647],
			'Employer 401K Match':   [647,647,647,647,647,647,647,647,647,647,647,647],
		},
		Expenses: {
			'Utilities':         [150,150,150,150,150,150,150,150,150,150,150,150],
			'Groceries':         [900,900,900,900,900,900,900,900,900,900,900,900],
			'Electric Bill':     [80,80,80,80,80,80,120,120,120,80,80,80],
			'Water Bill':        [75,75,75,75,75,75,90,90,90,75,75,75],
			'Natural Gas':       [60,60,40,40,30,30,30,30,40,40,60,60],
			'Internet':          [80,80,80,80,80,80,80,80,80,80,80,80],
			'Auto Insurance':    [175,175,175,175,175,175,175,175,175,175,175,175],
			'Mobile Phone':      [80,80,80,80,80,80,80,80,80,80,80,80],
			'Miscellaneous':     [200,200,200,200,200,200,200,200,200,200,200,200],
			'Dining Out':        [300,300,300,300,300,300,300,300,300,300,300,300],
			'Entertainment':     [50,50,50,50,50,50,50,50,50,50,50,50],
			'Personal Care':     [60,60,60,60,60,60,60,60,60,60,60,60],
			'Home Repairs':      [0,0,0,0,0,0,0,0,0,0,0,0],
			'Pet Care':          [100,100,100,100,100,100,100,100,100,100,100,100],
			'Personal Spending': [200,200,200,200,200,200,200,200,200,200,200,200],
			'Fuel & Auto':       [150,150,150,150,150,150,150,150,150,150,150,150],
			'Healthcare':        [100,100,100,100,100,100,100,100,100,100,100,100],
			'Credit Card 1':     [231,231,231,231,231,231,231,231,231,231,231,231],
			'Credit Card 2':     [438,438,438,438,438,438,438,438,438,438,438,438],
			'Home Improvement':  [100,100,100,100,100,100,100,100,100,100,100,100],
		},
		Savings: {
			'Emergency Fund':    [200,200,200,200,200,200,200,200,200,200,200,200],
			'Short-Term Savings':[150,150,150,150,150,150,150,150,150,150,150,150],
			'401K':              [647,647,647,647,647,647,647,647,647,647,647,647],
			'Roth IRA':          [500,500,500,500,500,500,500,500,500,500,500,500],
			'Crypto':            [100,100,100,100,100,100,100,100,100,100,100,100],
			'Stocks':            [250,250,250,250,250,250,250,250,250,250,250,250],
		},
		Investments: {
			'Brokerage Account':  [500,500,500,500,500,500,500,500,500,500,500,500],
			'Index Funds':        [300,300,300,300,300,300,300,300,300,300,300,300],
			'Individual Stocks':  [200,200,200,200,200,200,200,200,200,200,200,200],
			'Real Estate (REIT)': [150,150,150,150,150,150,150,150,150,150,150,150],
			'Crypto Portfolio':   [100,100,100,100,100,100,100,100,100,100,100,100],
		},
		Debt: {
			'Primary Mortgage':     [1461,1461,1461,1461,1461,1461,1461,1461,1461,1461,1461,1461],
			'Rental Mortgage':      [1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200],
			'Auto Loan':            [375,375,375,375,375,375,375,375,375,375,375,375],
			'Personal Loan 1':      [350,350,350,350,350,350,350,350,350,350,350,350],
			'Personal Loan 2':      [280,280,280,280,280,280,280,280,280,280,280,280],
			'Credit Card 1 Payment':[187,187,187,187,187,187,187,187,187,187,187,187],
			'Credit Card 2 Payment':[100,100,100,100,100,100,100,100,100,100,100,100],
		},
	},
	transactions: [],
};