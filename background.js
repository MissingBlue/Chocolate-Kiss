(() => {

const

log = createLog('BG'),
msg = createMsg('BG'),

INPUT_KEYS = [ 'match', 'allFrames', 'runAt' ],
CODE_KEYS = [ '$', 'type' ],
registry = {},
unregistry = {},

// options_ui からメッセージを受信した際に実行されるコールバック関数。
changed = storage => {
	
	log('A change has been notified.', storage),
	msg('Recieved a notification for changing data from option.'),
	registerData(storage.data);
	
},
init = storage => {
	
	log('Initializing...', storage),
	registerData(storage.data),
	msg('Initialized');
	
},

registerData = data => {
	
	if (!Array.isArray(data)) return;
	
	const codeIds = [];
	
	let i,i0,i1,i2,k, datum,codes,code, reg,regDatum,regCodes,regCode;
	
	msg(`Register storage data. ${data.length} storage data and ${Object.keys(registry).length} registred data exists.`);
	
	// data 内に存在しない registry 内のデータは登録を解除した上で registry から削除する。
	for (k in registry) {
		i = -1;
		while ((datum = data[++i]) && datum.uid !== k);
		datum || unregistry[k] &&
			(
				unregistry[k].unregister(),
				msg([ 'A registered data was deleted for mismatch with storage data.', registry[k] ]),
				delete registry[k], unregistry[k]
			);
	}
	
	i = -1;
	while (datum = data[++i]) {
		
		// registry 内に datum.uid に一致するプロパティが存在する場合、既にスクリプトが登録されているか検証する。
		if (datum.uid in registry && unregistry[datum.uid]) {
			
			// 送られてきた datum と registry に登録済みの datum の値の一致を確認する。
			i0 = -1, regDatum = (reg = registry[datum.uid]).datum;
			while ((k = INPUT_KEYS[++i0]) && datum[k] === regDatum[k]);
			
			if (!k) {
				
				if ((codes = datum.codes).length === (regCodes = regDatum.codes).length) {
					
					i0 = -1;
					while (code = codes[++i0]) {
						i1 = -1;
						while (regCode = regCodes[++i1]) {
							if (regCode.id !== code.id) continue;
							i2 = -1;
							while ((k = CODE_KEYS[++i2]) && code[k] === regCode[k]);
							break;
						}
						if (k) break;
					}
					
					// すべて一致した場合、既に登録されているものとして、登録処理を中止する。
					if (!k) {
						
						msg([ 'A content script is already registered.', datum ]);
						
						continue;
						
					}
					
				}
				
			}
			
			unregistry[datum.uid].unregister();
			
		} else reg = registry[datum.uid] = {};
		
		// 送られてきたデータ内にプロパティ match が存在しない場合、registry からデータを削除した上で登録を中止する。
		if (!(registry[datum.uid].datum = datum).match) {
			delete registry[datum.uid], delete unregistry[datum.uid],
			msg([ 'A empty value for match exists. That data is ignored.', datum ]);
			continue;
		}
		
		reg = { matches: [ unescape(datum.match) ], allFrames: datum.allFrames, runAt: datum.runAt },
		
		i0 = -1;
		while (code = datum.codes[++i0]) (reg[k = code.type] || (reg[k] = []))[reg[k].length] = { code: unescape(code.$) };
		
		browser.contentScripts.register(reg).then(((rd, reg) => getXRegistered(rd, reg))(registry[datum.uid], reg));
		
	}
	
	msg(`A process for registering was finished. Registered data are now ${Object.keys(registry).length}.`);
	
},
getXRegistered = (rd,reg) => {
	
	const xRegistered = rcs => {
		
		const l = rd.datum.codes.length,
				message = `A registration for ${unescape(rd.datum.match)} was succeeded. ${l > 1 ? `${l} codes` : 'A code'} will be run on ${rd.datum.allFrames ? 'all frames' : 'a content'} at ${rd.datum.runAt}.`;
		
		unregistry[rd.datum.uid] = rcs, log(message, rd,reg), msg([ message, rd,reg ]);
		
	};
	
	return xRegistered;
	
},
// browser_action ボタンを押した時に実行されるコールバック関数。
// 現状はボタンを押すとそのまま options_ui に関連付けられたページを開く。
pressedBrowserActionButton = () => browser.runtime.openOptionsPage(),

portCollection = {},
connectedPort = port => {
	
	(portCollection[port.sender.id] = port).postMessage(true),
	port.onMessage.addListener(onPortMessage);
	
},
onPortMessage = (message, from) => {
	
	if (message && typeof message === 'object') {
		
		switch (message.type) {
			
			case 'fetch':
			
			typeof message.url === 'string' && message.url && typeof message.responseType === 'string' &&
				fetch(message.url, message.init).then(
						response =>	response[message.responseType]().
											then(response => (message.response = response, from.postMessage(message)))
					);
			
			break;
			
		}
		
	} else log(message, `@${port.sender.id}`);
	
	
};

// options_ui からのメッセージ受信の登録。
browser.runtime.onMessage.addListener(changed),
// browser_action ボタンを押した時のイベントの登録。
browser.browserAction.onClicked.addListener(pressedBrowserActionButton),

//coco
// https://developer.mozilla.org/ja/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#connection-based_messaging
browser.runtime.onConnect.addListener(connectedPort),

browser.storage.local.get().then(init);

})();