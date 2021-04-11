/*
	WebExtension Tips
		
		// srorage.get は、指定したキーの値を返すのではなく、オブジェクトの中に指定したキーとその値を入れて返す。
		// そのため、指定したキーが存在しない場合は、空のオブジェクトが返るが、存在する場合は常に { key: value } と言う形式になり、
		// 以下のように返されたオブジェクトから改めて値を特定する必要がある。
		browser.storage.local.get('key').then(value => console.log(value = value.key || DEFAULT_VALUE));
*/

const storage = {}, indices = {}, data = [];

(() => {


const
boot = () => {

const
init = () => {
	
	let i;
	
	// 初期化ボタン
	Q('#commands > button.init').addEventListener('click', initialize),
	// クリアボタン
	Q('#commands > button.clear').addEventListener('click', clear),
	
	inputContainerObserver.observe(inputContainer, inputContainerObserveInit),
	
	// エディターコンテナに対するエディターの追加、削除時に処理の登録
	editorNodesContainerObserver.observe(editorNodesContainer, editorNodesContainerObserveInit),
	
	// エディター追加処理、ボタンに関するもの
	editorAddButton.addEventListener('click', pressedAddEditorButton),
	editorAddButton.disabled = true,
	
	// 入力フォーム追加ボタン
	addInputButton.addEventListener('click', pressedAddMatchButton),
	
	// すべて保存ボタン
	i = -1;
	while (saveButtons[++i])	saveButtons[i].addEventListener('click', pressedSaveAll),
										saveButtons[i].addEventListener('saved-for', savedFor),
										saveButtons[i].addEventListener('removed-save-for', removedSaveFor);
	
	// Save All イベントに対する処理
	addEventListener('saved', savedAll),
	addEventListener('saved', apply),
	addEventListener('saved-unchanged-all', apply),
	addEventListener('refreshed', apply),
	
	browser.storage.local.get(null).then(xLoad);
	
},
xLoad = localStorage => {
	
	// 保存データの展開処理
	
	let usesPresetData;
	
	// ローカルストレージの正規化
	localStorage.indices && typeof localStorage.indices === 'object' && Object.assign(indices, localStorage.indices),
	storage.indices = indices;
	
	((localStorage.data && Array.isArray(localStorage.data)) ||
		usesPresetData || (usesPresetData = !!(localStorage.data = PRESET_DATA))),
	storage.data = Object.assign(data, localStorage.data),
	
	log(storage),
	
	open(),
	
	// ローカルストレージが存在しなかった場合、プリセットデータを読み込む。
	// その際、初期化処理終了時に保存を行うが、これは恐らく入力フォームのコードデータを保存処理内で作成するためだと思われるがやや不確か。
	usesPresetData && indexing();
	
},
open = (src = data) => {
	
	const	listedInputNodes = [], hasIdx = indices.list && indices.list.length, indexedNodes = QQ('[data-index]');
	
	let i,i0, datum, inputNode;
	
	// ローカルストレージに保存されていたデータに基づいて入力フォームを配置する。
	i = -1;
	while (datum = src[++i]) (i0 = hasIdx ? indices.list.indexOf(datum.uid) : i) === -1 ||
		(
			listedInputNodes[i0] = createListedInputNode(datum.uid, datum.match, addInputButton.dataset.selectorName),
			datum.checked && (Q('input[type="radio"]', inputNode = listedInputNodes[i0]).checked = true)
		);
	inputContainer.append(...listedInputNodes),
	inputNode &&	(
							editorNodesContainer.dataset.index = inputNode.firstElementChild.id,
							editorNodesContainer.append(...createEditorNodes(inputNode.firstElementChild))
						),
	
	// インデックス対象のコンテナーに MutationObserver を登録。
	i = -1;
	while (indexedNodes[++i]) indexer.observe(indexedNodes[i], indexerInit);
	
	// 現在の入力フォーム内のコードデータに MutationObserver を登録。
	i = -1;
	while (listedInputNodes[++i]) listedInputNodes[i].firstElementChild.observeCodes(mutatedCodeNode);
	
	dispatchEvent(new CustomEvent('opened', { detail: src }));
	
},
clear = () => indexing().then(xClear),
xClear = () => {
	
	const listedInputNodes = inputContainer.children, editorNodes = editorNodesContainer.children;
	
	let i;
	
	indexer.disconnect(),
	
	i = -1;
	while (listedInputNodes[++i]) Q('input-node', listedInputNodes[i]).destroy(true);
	inputContainer.replaceChildren();
	
	i = -1;
	while (editorNodes[++i]) editorNodes[i].destroy(true);
	editorNodesContainer.replaceChildren();
	
	dispatchEvent(new CustomEvent('cleared'));
	
},


initialize = () => localStorage.clear().then(() => location.reload()),
pressedSaveAll = event => {
	
	const editorNodes = editorNodesContainer.children;
	
	let i;
	
	i = -1;
	while (editorNodes[++i]) saveCode(editorNodes[i]);
	
	// この処理だと、ループ毎に保存が発生するため、非効率。一方、現状では inputNode 内の code 要素は
	// 属性の変更を監視されているため、どんな方法を用いても一括保存を一度の保存だけで済ますことはできない。
	
},
savedAll = () => {
	
	const changedEditorNodes = QQ('editor-node.changed');
	
	let i;
	
	i = -1;
	while (saveButtons[++i]) saveButtons[i].classList.remove('changed');
	
	i = -1;
	while (changedEditorNodes[++i]) changedEditorNodes[i].removeClass('changed');
	
},
apply = () => {
	
	log('Notify a change for data.', storage);
	
	browser.runtime.sendMessage(storage);
	
},

/*
// 不使用？
saveEditorNodes = event => {
	
	save(editorNodesContainer.dataset.index);
	
},
*/

// エディターコンテナーが空になった際、エディター追加ボタンを不活性化する MutationObserber のコールバック関数
mutatedInputContainer = () => {
	
	editorAddButton.disabled = !inputContainer.children.length;
	
},

// <li> に入れた inputNode と radioNode を作成する。
createListedInputNode = (id = uid(), match = PRESET_MATCH, radioName = 'input') => {
	
	const	listedInputNode = document.createElement('li'),
			inputNode = createInputNode(id, match, radioName),
			radioNode = createRadioNode(id, 'input');
	
	listedInputNode.append(inputNode, radioNode),
	inputNode.addEvent(radioNode, 'input', inputInputNodeRadioButton);
	
	return listedInputNode;
	
},
// inputNode を作成する。
createInputNode = (id = uid(), match = PRESET_MATCH) => {
	
	const	inputNode = document.createElement('input-node'),
			datum = getDatumById(id);
	
	let i,$,$$;
	
	inputNode.id = id,
	inputNode.value = match || datum.match,
	datum && datum.allFrames && (inputNode.af.checked = datum.allFrames),
	datum && ($ = Q(`[value="${datum.runAt}"]`, inputNode.runs)) && (inputNode.runs.selectedIndex = $.index),
	inputNode.addEvent(inputNode, 'click-save-button', sendCodeToInputNode),
	inputNode.addEvent(inputNode, 'connected', connectedInputNodeOfListItem),
	inputNode.addEvent(inputNode, 'disconnected', disconnectedInputNodeOfListItem),
	inputNode.addEvent(inputNode, 'change', changedInputNode),
	inputNode.addEvent(inputNode, 'pressed-del-button', pressedInputNodeDelButton),
	inputNode.addEvent(inputNode, 'pressed-up-button', pressedInputNodeMoveButton),
	inputNode.addEvent(inputNode, 'pressed-down-button', pressedInputNodeMoveButton),
	
	inputNode.addEvent(inputNode, 'changed-all-frames', changedInputNode),
	inputNode.addEvent(inputNode, 'changed-run', changedInputNode);
	
	if (datum && Array.isArray(datum.codes)) {
		i = -1, $$ = datum.codes;
		while ($ = $$[++i]) inputNode.setCode($.$, $.type, $.id);
	}
	
	return inputNode;
	
},
changedInputNode = event => {
	
	save(event.target.id, false);
	
},
pressedInputNodeDelButton = event => {
	
	const	inputNode = event.target,
			listItem = inputNode.parentElement,
			prev = listItem.previousSibling,
			next = listItem.nextSibling,
			hasNext = (!prev && next),
			hasPrev = (!next && prev);
	
	removeEditorNodes(inputNode.id), listItem.remove(), inputNode.destroy(),
	(hasNext || (next && !next.nextSibling)) && applyMovable(next, next.firstElementChild),
	(hasPrev || (prev && !prev.previousSibling)) && applyMovable(prev, prev.firstElementChild);
	
},
pressedInputNodeMoveButton = event => {
	
	const	listedInputItem = event.target.parentNode,
			isUp = event.detail.classList.contains('up'),
			sibling = listedInputItem[isUp ? 'previousSibling' : 'nextSibling'];
	
	sibling && sibling[isUp ? 'before' : 'after'](listedInputItem);
	
},
disconnectedInputNodeOfListItem = event => {
	
	document.getElementById(event.target.id) || (deleteDatumById(event.target.id), localStorage.set({ data }));
	
},
connectedInputNodeOfListItem = event => {
	
	applyNodeMovable(event.target.parentElement, 'input-node');
	
},
pressedAddMatchButton = event => {
	
	const	listedInputNode = createListedInputNode(undefined, undefined, event.target.dataset.selectorName),
			inputNode = listedInputNode.firstElementChild,
			inputRadio = Q('input[type="radio"]', listedInputNode);
	
	inputContainer.prepend(listedInputNode),
	inputRadio.checked = true,
	editorNodesContainer.prepend(createEditor(undefined,undefined,undefined, inputNode.id)),
	changeCurrentInputNode(inputNode.id, true),
	applyNodeMovable(editorNodesContainer.firstElementChild),
	inputNode.observeCodes(saveAll);
	
},
sendCodeToInputNode = event => {
	
	event.target.setCode((event = event.detail.target).value, event.types.selectedOptions[0].value, event.id);
	
},
createRadioNode = (id = uid(), name = 'global') => {
	
	const	radioNode = document.getElementById('radio-button').content.firstElementChild.cloneNode(true),
			inputRadio = Q('input[type="radio"]', radioNode),
			labelRadio = Q('label', radioNode);
	
	inputRadio.name = name,
	inputRadio.id = labelRadio.htmlFor = `${inputRadio.dataset.forInputNode = id}-radio`;
	
	return radioNode;
	
},
inputInputNodeRadioButton = event => changeCurrentInputNode(event.target.dataset.forInputNode),
changeCurrentInputNode = (datumId, disableCreateEditorNodes) => {
	
	let i, $;
	
	setDataChecked(datumId) && saveAll(),
	removeEditorNodes(datumId, true),
	
	i = -1, editorNodesContainer.dataset.index = datumId;
	disableCreateEditorNodes || ($ = document.getElementById(datumId)) &&
		(editorNodesContainer.append(...createEditorNodes($)));
	
},
setDataChecked = (...ids) => {
	
	let i,v, datum,saves;
	
	i = -1;
	while (datum = data[++i]) v = ids.includes(datum.uid), saves || (saves = v !== datum.cheked), datum.checked = v;
	
	return saves;
	
},


applyNodeMovable = (node, movableNodeSelector) => {
	
	const prev = node.previousSibling, next = node.nextSibling;
	
	applyMovable(node, movableNodeSelector ? Q(movableNodeSelector, node) : node),
	((!prev && next) || (next && !next.nextSibling)) &&
		applyMovable(next, movableNodeSelector ? Q(movableNodeSelector, next) : next),
	((!next && prev) || (prev && !prev.previousSibling)) &&
		applyMovable(prev, movableNodeSelector ? Q(movableNodeSelector, prev) : prev);
	
},
applyMovable = (node, movableNode) => {
	
	movableNode.up.disabled = !node.previousSibling,
	movableNode.down.disabled = !node.nextSibling;
	
},


createEditorNodes = inputNode => {
	
	let i, datum, code,codeIndex, codeNode;
	
	i = -1;
	while ((datum = data[++i]) && datum.uid !== inputNode.id);
	if (!datum) return [];
	
	const codes = datum.codes, codeNodes = [], index = indices[inputNode.id], hasIndex = index && index.length;
	
	i = -1;
	while (code = codes[++i]) (codeIndex = hasIndex ? index.indexOf(code.id) : i) === -1 ||
		(codeNode = codeNodes[codeIndex] = createEditor(code.id, code.$, code.type, datum.uid));
	
	return codeNodes;
	
},
createEditor = (id = uid(), code = '', type = 'css', datumId) => {
	
	const	editorNode = createEditorNode(id, code, type, datumId),
			inputNode = document.getElementById(datumId);
	
	inputNode.setCode(code, type, id),
	editorNode.dataset.forInputNode = inputNode.id;
	
	return editorNode;
	
},
createEditorNode = (editorId = uid4(), text = '', type = 'css', dataFor) => {
	
	const editorNode = document.createElement('editor-node');
	
	editorNode.id = editorNode.dataset.saveFor = editorId,
	editorNode.setCode(text),
	editorNode.setType(type),
	dataFor && (editorNode.dataset.forInputNode = dataFor),
	
	editorNode.addEvent(editorNode, 'saved', savedEditorNode),
	editorNode.addEvent(editorNode, 'saved-for', savedFor),
	editorNode.addEvent(editorNode, 'input-code', inputEditorNode),
	
	editorNode.addEvent(editorNode, 'connected', connectedEditorNode),
	editorNode.addEvent(editorNode, 'disconnected', disconnectedEditorNode),
	editorNode.addEvent(editorNode, 'pressed-save-button', saveEditorNode),
	//editorNode.addEvent(editorNode, 'changed-value', changedValueEditorNode),
	//editorNode.addEvent(editorNode, 'changed-type', changedValueEditorNode),
	editorNode.addEvent(editorNode, 'pressed-del-button', pressedEditorNodeDelButton),
	editorNode.addEvent(editorNode, 'pressed-up-button', pressedEditorNodeMoveButton),
	editorNode.addEvent(editorNode, 'pressed-down-button', pressedEditorNodeMoveButton);
	
	return editorNode;
	
},
connectedEditorNode = event => {
	
	applyNodeMovable(event.target);
	
},
disconnectedEditorNode = () => {},
saveEditorNode = event => {
	
	saveCode(event.target);
	
},
savedEditorNode = event => {
	
	let i;
	
	i = -1;
	while (saveButtons[++i]) saveButtons[i].classList.remove('changed');
	
},
inputEditorNode = event => {
	
	let i;
	
	i = -1;
	while (saveButtons[++i]) saveButtons[i].classList.add('changed');
	
	event.target.addClass('changed');
	
},
changedValueEditorNode = event => {
	
	const	editorNode = event.target, type = editorNode.type, value = editorNode.value,
			selector = `.${editorNode.id}`, inputNodes = QQ('input-node');
	
	let i,i0,inputNode,valueNode;
	
	i = -1;
	while (inputNode = inputNodes[++i]) {
		i0 = -1, valueNodes = inputNode.qq(selector);
		while (valueNode = valueNodes[++i0]) valueNode.dataset.type = type, valueNode.textContent = value;
	}
	
},
pressedEditorNodeDelButton = event => {
	
	removeEditorNode(event.target, true);
	
},
pressedEditorNodeMoveButton = event => {
	
	const	editorNode = event.target,
			isUp = event.detail.classList.contains('up'),
			sibling = editorNode[isUp ? 'previousSibling' : 'nextSibling'];
	
	sibling && sibling[isUp ? 'before' : 'after'](editorNode);
	
},
pressedAddEditorButton = event => {
	
	const datumId = getCurrentDatum()[0].uid;
	
	//event.target.dataset.saveFor += `${event.target.dataset.saveFor ? ' ' : ''}datumId`,
	editorNodesContainer.prepend(createEditor(undefined,undefined,undefined, datumId));
	
},
removeEditorNodes = (datumId, excludes = false, removesFor = false) => {
	
	const editorNodes = QQ(excludes ? `:not([data-for-input-node="${datumId}"])` : `[data-for-input-node="${datumId}"]`, editorNodesContainer);
	
	let i, editorNode;
	
	i = -1, editorNodesContainer.dataset.index = '-';
	while (editorNode = editorNodes[++i]) removeEditorNode(editorNode, removesFor);
	
},
removeEditorNode = (editorNode, removesFor = false) => {
	
	let i,saveForNodes;
	
	editorNode.remove(), editorNode.destroy(),
	removesFor && document.getElementById(editorNode.dataset.forInputNode).q(`.${editorNode.id}`).remove();
	
	if (saveForNodes = QQ(`[data-save-for~="${editorNode.id}"]`)) {
		
		const detail = { detail: { id: editorNode.id, target: editorNode } };
		
		i = -1;
		while (saveForNodes[++i]) saveForNodes[i].dispatchEvent(new CustomEvent('removed-save-for', detail));
		
	}
	
},

mutatedEditorNodesContainer = (mr, mo) => {
	
	const editorNodes = editorNodesContainer.children;
	
	let i, savefor, editorNode;
	
	if (editorNodes.length) {
		
		if (saveButtons[0].disabled) {
			
			i = -1;
			while (saveButtons[++i]) saveButtons[i].disabled = false;
			
		}
		
		i = -1, savefor = [];
		while (editorNode = editorNodes[++i]) savefor.includes(editorNode.id) || (savefor[savefor.length] = editorNode.id);
		
		i = -1, savefor = savefor.join(' ');
		while (saveButtons[++i]) saveButtons[i].dataset.saveFor = savefor;
		
	} else {
		
		i = -1;
		while (saveButtons[++i]) saveButtons[i].disabled = true;
		
	}
	
},

/*
createEditorContainer = (id = uid(), dataFor) => {
	
	let editorContainer;
	
	(editorContainer = document.createElement('editor-container')).id = id,
	dataFor && (editorContainer.dataset.for = dataFor);
	
	return editorContainer;
	
},
*/

saveCode = editorNode => {
	
	const	datumId = editorNode.dataset.forInputNode,
			datum = getDatumById(datumId) || (data[data.length] = {}),
			inputNode = document.getElementById(datumId);
	
	inputNode.setCode(editorNode.value, editorNode.type, editorNode.id);
	
},
mutatedCodeNode = (mr,mo) => {
	
	const codeNodes = [];
	
	let i, codeNode,editorNode,inputNode;
	
	i = -1;
	while (mr[++i]){
		
		if (
			codeNodes.includes(codeNode = mr[i].target) ||
			!(editorNode = document.getElementById(codeNode.className)) ||
			!(inputNode = document.getElementById(editorNode.dataset.forInputNode)) ||
			inputNode.classList.contains('saving')
		) continue;
		
		codeNodes[codeNodes.length] = codeNode,
		editorNode.classList.remove('changed'),
		save(inputNode.id, false).then((codeId => () => notifySaveFor(codeId))(codeNode.className));
		
	}
	
},
notifySaveFor = id => {
	
	let i, saveForNodes,detail;
	
	i = -1,
	saveForNodes = QQ(`[data-save-for~="${id}"]`), detail = { detail: id };
	while (saveForNodes[++i]) saveForNodes[i].dispatchEvent(new CustomEvent('saved-for', detail));
	
},
savedFor = event => setChanged(event.target, event.detail),
removedSaveFor = event => setChanged(event.target, event.detail.id),
setChanged = (node, forId) => {
	
	const ids = node.dataset.saveFor.split(' ');
	
	if (forId && !ids.includes(forId)) return;
	
	let i, id,node0;
	
	if (node.id !== forId)  {
		
		i = -1;
		while (id = ids[++i]) if ((node0 = document.getElementById(id)) && node0.classList.contains('changed')) break;
		
	}
	
	id || (node.removeClass ? node.removeClass('changed') : node.classList.remove('changed'));
	
},
setInputNodeValues = (inputNode, datum) => {
	
	typeof inputNode === 'string' &&	(inputNode = document.getElementById(inputNode));
	
	if (!inputNode) return;
	
	datum || (datum = getDatumById(inputNode.id) || (data[data.length] = {})),
	
	datum.uid = inputNode.id,
	datum.match = inputNode.value,
	datum.allFrames = inputNode.appliesAllFrames,
	datum.runAt = inputNode.run,
	
	datum.checked = Q('.radio-node input[type="radio"]', inputNode.parentElement).checked;
	
	return datum;
	
},
storeCode = (codeNode, storedCode = {}) => {
	
	storedCode.id = codeNode.className,
	storedCode.node = meta[storedCode.type = codeNode.dataset.type].node,
	storedCode.parent = meta[storedCode.type = codeNode.dataset.type].parent,
	storedCode.$ = codeNode.textContent;
	
	return storedCode;
	
},
save = (datumId, isSave = true) => {
	
	const	datum = getDatumById(datumId) || (data[data.length] = { uid: datumId }),
			codes = datum.codes || (datum.codes = []),
			inputNode = document.getElementById(datumId),
			codeNodes = inputNode.codes.children;
	
	let i = -1,i0, code, codeNode, result, editorNode;
	
	setInputNodeValues(inputNode, datum);
	
	if (
		editorNodesContainer.dataset.index === inputNode.id &&
		editorNodesContainer.getElementsByClassName('changed').length
	) {
		
		if (isSave) {
			
			// 強制保存
			
			const editorNodes = editorNodesContainer.children;
			
			// .sacving によって、codes.children が変更された際に実行されるコールバック関数の処理を強制的に中断させる。
			inputNode.classList.add('saving'), inputNode.codes.replaceChildren()
			while (editorNode = editorNodes[++i])
				codes[i] = storeCode(inputNode.setCode(editorNode.value, editorNode.type, editorNode.id), codes[i] || {});
			codes.length = i;
			
		} else {
			
			// エディター上では変更されているがその内容に対して保存が適用されていない場合、その変更については保存しない。
			
			if (codeNodes.length) {
				
				while (codeNode = codeNodes[++i]) {
					i0 = -1;
					while ((code = codes[++i0]) && code.id !== codeNode.className);
					(editorNode = document.getElementById(codeNode.className)) && editorNode.classList.contains('changed') ||
						(codes[i0] = storeCode(codeNode, code));
				}
				
			}
			
			
		}
		
	} else {
		
		while (codeNode = codeNodes[++i]) codes[i] = storeCode(codeNode, codes[i] || {});
		codes.length = i;
		
	}
	
	(result = localStorage.set({ data })).then(() => {
			inputNode.classList.remove('saving'),
			inputNode.dispatch(isSave = isSave ? 'saved' : 'refreshed', null),
			dispatchEvent(new CustomEvent(isSave = isSave ? 'saved' : 'refreshed')),
			console.log(`${isSave[0].toUpperCase()}${isSave.slice(1)}`, indices, data)
		});
	
	return result;
	
},
saveUnchangedCodeAll = () => {
	
	const listedInputNodes = inputContainer.children;
	
	let i,i0,i1, listedInputNode,inputNode, datum, codes,code,codeNodes,codeNode,editorNode, result;
	
	i = -1;
	while (listedInputNode = listedInputNodes[++i]) {
		
		if (!(inputNode = Q('input-node', listedInputNode))) continue;
		
		datum = setInputNodeValues(inputNode);
		
		if ((codeNodes = inputNode.codes.children).length) {
			
			i0 = -1, codes = datum.codes || (datum.codes = []);
			while (codeNode = codeNodes[++i0]) {
				i1 = -1;
				while ((code = codes[++i1]) && code.id !== codeNode.className);
				(editorNode = document.getElementById(codeNode.className)) && editorNode.classList.contains('changed') ||
					(codes[i1] = storeCode(codeNode, code));
			}
			
			i0 = -1;
			while (code = codes[++i0]) inputNode.q(`.${code.id}`) || codes.splice(i0--,1);
			
			// 2021-0411
			// 主として初期化含む初回読み込み時に inputNode 追加ボタンを押したあとにページを再読み込みすると
			// 追加した以外の inputNode のコードがすべて消去される。
			// これはこの関数を通じた保存処理特有の問題と思われ、上記状況以外では保存にこの関数を用いないため露見しない。
			// 以下の while 文で getElementById を用いて、対象の inputNode のコード記録用の要素の取得を試みるが、
			// コードの id はエディター要素にしか指定されない。
			// そのため、現在選択状態の inputNode、つまりこの場合は追加した新規 inputNode 以外のコード記録用の要素はそもそも存在しないため、
			// 選択状態以外の inputNode のコード要素そのものが存在しないものとして扱われ、data 上から消去されてしまう。
			// そのため、コードの id からエディターを取得するのではなく、inputNode 内のコード記録用要素を直接取得するように変更した。
			// この変更は現状機能しているように見えるが、ほぼ未検証状態で妥当なものかは不明。
			//i0 = -1;
			//while (code = codes[++i0]) document.getElementById(code.id) || (codes.splice(i0--,1));
			
		} else {
			
			Array.isArray(datum.codes) && (datum.codes.length = 0);
			
		}
		
	}
	(result = localStorage.set({ data })).then(xSavedUnchanged);
	
	return result;
	
},
xSavedUnchanged = () => {
	
	dispatchEvent(new CustomEvent('saved-unchanged-all')), console.log('Saved-Unchanged-All', indices, data);
	
},
saveAll = () => {
	
	const listItems = QQ('#list > li');
	
	let i,i0, listItem, inputNode, datum, codes,code,codeNodes,codeNode, result;
	
	i = -1;
	while (listItem = listItems[++i]) {
		
		datum = setInputNodeValues(inputNode = Q('input-node', listItem), data[i] || (data[i] = {})),
		
		i0 = -1, codeNodes = inputNode.codes.children, codes = datum.codes || (datum.codes = []);
		while (codeNode = codeNodes[++i0]) datum.codes[i0] = storeCode(codeNode, datum.codes[i0] || {});
		codes.length = i0;
		
	}
	data.length = i, (result = localStorage.set({ data })).then(xSaved);
	
	return result;
	
},
xSaved = () => {
	
	dispatchEvent(new CustomEvent('saved')), console.log('Saved', indices, data);
	
},
observedIndexing = (mr,mo) => {
	
	const targets = [], INDICES = {};
	
	let i,i0,$,$$, index;
	
	i = -1;
	while (mr[++i]) (target = mr[i].target).dataset.index === '-' || targets.includes(target) ||
		createIndex(targets[targets.length] = target, INDICES);
	
	targets.length && saveIndex(INDICES, indices);
	
},
indexing = () => {
	
	const targets = QQ('[data-index]'), INDICES = {};
	
	let i,indexes;
	
	i = -1;
	while (targets[++i]) targets[i].dataset.index === '-' || createIndex(indexes = targets[i], INDICES);
	
	return indexes ? saveIndex(INDICES, indices) : new Promise(rs => rs());
	
},
createIndex = (node, indices = {}) => {
	
	const	targets = [],
			indexName = node.dataset.index || node.id;
	
	let i,$,$$, index;
	
	i = -1, (index = indices[indexName]) ? (indices[indexName].length = 0) : (index = indices[indexName] = []),
	$$ = node.dataset.indexingTarget ? QQ(node.dataset.indexingTarget) : node.children;
	while ($ = $$[++i]) $.id && (index[i] = $.id);
	
	return indices;
	
},
saveIndex = (currentIndices, indices = indices) => {
	
	let i,l,k, index,I,L, saves, result;
	
	for (k in currentIndices) {
		i = -1, currentIndex = currentIndices[k], l = (index = indices[k] || (indices[k] = [])).length;
		while (I = currentIndex[++i]) I === index[i] || (index[i] = saves = I);
		L === -1 || (indices[k].length = i) === l || (L = -1);
	}
	
	L === -1 ?	(result = localStorage.set({ indices }).then(saveUnchangedCodeAll)).then(xIndexed) :
					saves ? (result = localStorage.set({ indices })).then(xIndexed) : (result = new Promise(rs=>rs()));
	
	return result;
	
},
xIndexed = () => {
	
	dispatchEvent(new CustomEvent('indexed')), console.log('Indexed', indices, data)
	
},

localStorage = browser.storage.local,
uid = UFElement.uid,
getDatumIndexById = id => {
	let i,datum;
	i = -1;
	while ((datum = data[++i]) && datum.uid !== id);
	return datum ? i : -1;
}
deleteDatumById = id => {
	const i = getDatumIndexById(id);
	return i === -1 ? null : data.splice(i,1);
}
getDatumById = id => {
	const i = getDatumIndexById(id);
	return i === -1 ? null : data[i];
},
getCurrentInputNode = () => Q(`.radio > input:checked`),
getCurrentDatum = () => {
	const currentData = [];
	let i,datum;
	i = -1;
	while (datum = data[++i]) datum.checked && (currentData[currentData.length] = datum);
	return currentData;
},

addInputButton = Q('#matches > button.add'),
inputContainer = Q('#list'),
editorAddButton = Q('#editors button.add'),
editorsContainer = Q('#editors'),
editorNodesContainer = Q('#editor-nodes'),
saveButtons = QQ('.save-all'),

inputContainerObserver = new MutationObserver(mutatedInputContainer),
inputContainerObserveInit = { childList: true },
editorNodesContainerObserver = new MutationObserver(mutatedEditorNodesContainer),
editorNodesContainerObserveInit = { childList: true },

indexer = new MutationObserver(observedIndexing),
indexerInit = { childList: true },

//PRESET_MATCH = 'https?://(?:.*\\.)?example\\.(?:com|net|org)(?:/.*?)?',
PRESET_MATCH = '*://*.example.com/*',
PRESET_DATA= [
	{
		uid: uid(),
		match: PRESET_MATCH,
		codes: [ { type:'js', $: 'console.log(\'hi\');', id: uid() } ],
		checked: true
	}
],
meta = {
	css: { node: 'style', parent: 'head' },
	js: { node: 'script', parent: 'body' }
},

log = createLog('OU'),
msg = createMsg('OU'),
onMessage = createOnMessage('OU'),
// 以下の port 関連の関数や処理はテスト用のもので、options_ui には不要。
// ただし content scripts 上でスニペット的に用いるため削除してはならない。
port = browser.runtime.connect({ name: 'OU' }),
onPortMessage = (message, from) => {
	
	if (message && typeof message === 'object') {
		
		switch (message.type) {
			
			case 'fetch':
			
			const requestNodes = QQ(`${message.selector}`), detail = { detail: message.response };
			
			let i;
			
			i = -1, dispatchEvent(new CustomEvent('fetched', detail));
			while (requestNodes[++i]) requestNodes[i].dispatchEvent(new CustomEvent('fetched', detail));
			
			break;
			
		}
		
	} else if (message === true) {
		
		port.postMessage({ type: 'fetch', url: 'https://raw.githubusercontent.com/MissingBlue/Chocolate-Kiss/main/icon.png', responseType: 'arrayBuffer' });
		
	} else log(message, `${from.sender ? from.sender.id : 'unknown'}`);
	
};

port.onMessage.addListener(onPortMessage),
addEventListener('fetched', event => hi(event)),

removeEventListener('load', init),
Q('title').textContent += ' | ' + browser.runtime.getManifest().name,
browser.runtime.onMessage.addListener(onMessage),

init();


};

addEventListener('load', boot);

})();