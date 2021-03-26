const
hi = console.log.bind(console, 'hi'),
Q	= (selector, root = document) => root.querySelector(selector),
QQ	= (selector, root = document) => root.querySelectorAll(selector),
// uuid を生成
// https://qiita.com/psn/items/d7ac5bdb5b5633bae165
uid4	= (() => {
	
	const	MATH	= Math,
			chrX	= 'x',
			chrY	= 'y',
			UID4F = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
	
	return () => {
		
		let i = -1, id = '', c;
		
		while (c = UID4F[++i]) id +=	c === chrX ?	MATH.floor(MATH.random() * 16).toString(16) :
												c === chrY ?	(MATH.floor(MATH.random() * 4) + 8).toString(16) : c;
		
		return id;
		
	}
	
})(),

// WebExtensions 用のユーティリティー
WX_SHORT_NAME = browser.runtime.getManifest().short_name.toUpperCase(),

createLog = (self, label = WX_SHORT_NAME) => console.log.bind(console, `[${label}#${self}]`),
createOnMessage = (to, label = WX_SHORT_NAME) =>
	
	msg =>	msg.__MSG__ && (!msg.to || msg.to === to) &&
					(
						Array.isArray(msg.detail) ?	console.log(`[${label}@${msg.from}]`, ...msg.detail) :
																console.log(`[${label}@${msg.from}]`, msg.detail)
					),

createMsg = from => (detail, to) => browser.runtime.sendMessage({ from, to, detail, __MSG__: true });