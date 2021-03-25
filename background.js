(() => {

const

log = console.log.bind(console, `[${browser.runtime.getManifest().short_name.toUpperCase()}]`),

INPUT_KEYS = [ 'match', 'allFrames', 'runAt' ],
CODE_KEYS = [ '$', 'type' ],
registry = {},

// options_ui からメッセージを受信した際に実行されるコールバック関数。
changed = storage => {
	log('A change has been notified.', storage), registerData(storage.data);
},
init = storage => {
	log('Initializing...', storage), registerData(storage.data);
},

registerData = data => {
	
	if (!Array.isArray(data)) return;
	
	const codeIds = [];
	
	let i,i0,i1,i2,k, datum,codes,code, reg,regDatum,regCodes,regCode;
	
	// data 内に存在しない registry 内のデータは登録を解除した上で registry から削除する。
	for (k in registry) {
		i = -1;
		while ((datum = data[++i]) && datum.uid !== k);
		datum || registry[k].$ && (registry[k].$.unregister(), delete registry[k]);
	}
	
	i = -1;
	while (datum = data[++i]) {
		
		// registry 内に datum.uid に一致するプロパティが存在する場合、既にスクリプトが登録されているか検証する。
		if (datum.uid in registry && (reg = registry[datum.uid]).$) {
			
			// 送られてきた datum と registry に登録済みの datum の値の一致を確認する。
			i0 = -1, regDatum = reg.datum;
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
					if (!k) continue;
					
				}
				
			}
			
			reg.$.unregister();
			
		} else reg = registry[datum.uid] = {};
		
		// 送られてきたデータ内にプロパティ match が存在しない場合、registry からデータを削除した上で登録を中止する。
		if (!(registry[datum.uid].datum = datum).match) {
			delete registry[datum.uid];
			continue;
		}
		
		reg = { matches: [ unescape(datum.match) ], allFrames: datum.allFrames, runAt: datum.runAt },
		
		i0 = -1;
		while (code = datum.codes[++i0]) (reg[k = code.type] || (reg[k] = []))[reg[k].length] = { code: unescape(code.$) };
		
		browser.contentScripts.register(reg).then(((rd, reg) => getXRegistered(rd, reg))(registry[datum.uid], reg));
		
	}
	
},
getXRegistered = (rd,reg) => {
	
	const xRegistered = rcs => {
		
		const l = rd.datum.codes.length;
		
		rd.$ = rcs,
		log(`A registration for ${unescape(rd.datum.match)} was succeeded. ${l > 1 ? `${l} codes` : 'A code'} will be run on ${rd.datum.allFrames ? 'all frames' : 'a content'} at ${rd.datum.runAt}.`, rd,reg);
		
	};
	
	return xRegistered;
	
},
// browser_action ボタンを押した時に実行されるコールバック関数。
// 現状はボタンを押すとそのまま options_ui に関連付けられたページを開く。
pressedBrowserActionButton = () => browser.runtime.openOptionsPage();

// options_ui からのメッセージ受信の登録。
browser.runtime.onMessage.addListener(changed),
// browser_action ボタンを押した時のイベントの登録。
browser.browserAction.onClicked.addListener(pressedBrowserActionButton),

browser.storage.local.get().then(init);

})();
