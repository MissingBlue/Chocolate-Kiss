// カスタム要素のコンストラクター内で要素の追加処理(append,appendChildなど)をすると
// Uncaught DOMException: Operation is not supported になる。
//
// 現状では name プロパティを通じてグループ化できる input 要素をカスタム要素に組みこむことは難しく現実的ではない。
//
// UFElement;
// 拡張機能、welet で使うことを想定した要素の基底クラス。
// 継承先が実装するプロパティ bind に指定されたオブジェクト内の関数を this で束縛し、インスタンスのメソッドとして持つことと、
// 継承先が持つプロパティ tagName の値を id に持つ template を元に shadow root を設定する。
// また addEvent は addEventListener、observeMutation は (new MutationObserver(callback)).observe(...) の代替で、
// それらを通じてリスナー登録、監視を行うと、メソッド deestroy 実行時にそれらをすべて一括で解除できる。
class UFElement extends HTMLElement {
	
	constructor() {
		
		super();
		
		const CNST = this.constructor;
		
		let k,$;
		
		this._UF_listeners = [],
		this._UF_observers = new Map();
		
		if ('bind' in CNST && CNST.bind && typeof CNST.bind == 'object') {
			const BIND = CNST.bind;
			for (k in BIND) this[k] = BIND[k].bind(this);
		}
		
		'tagName' in CNST && typeof CNST.tagName === 'string' &&
			(k = document.getElementById(CNST.tagName)) && k.tagName === 'TEMPLATE' &&
			(this.shadow = k.content.cloneNode(true), this.attachShadow(CNST.shadowRootInit).appendChild(this.shadow)),
		(this.root = this.shadowRoot ? this.shadowRoot.firstElementChild : this).classList.add(CNST.tagName),
		
		k && (k = k.dataset.css) &&	(
													($ = document.createElement('link')).rel = 'stylesheet',
													$.href = k,
													this.shadowRoot.prepend($)
												);
		
	}
	connectedCallback() {
		
		this.dispatchEvent(new CustomEvent('connected'));
		
	}
	disconnectedCallback() {
		
		this.dispatchEvent(new CustomEvent('disconnected'));
		
	}
	destroy() {
		
		this.parentElement && this.remove(),
		this.clearEvents(),
		this.clearMutationObserver(),
		this.dispatchEvent(new CustomEvent(`${this.constructor.tagName}-destroy`));
		
	}
	
	addEvent(node = this, type, handler, useCapture = false) {
		
		this._UF_listeners[this._UF_listeners.length] = arguments,
		node.addEventListener(type, handler, useCapture);
		
	}
	removeEvent(node = this, type, handler, useCapture = false) {
		
		let i, $;
		
		i = -1;
		while ($ = this._UF_listeners[++i] && $[0] !== node && $[1] !== type && $[2] !== handler && $[3] !== useCapture);
		if (!$) return;
		
		node.removeEventListener($[1], $[2], $[3]), this._UF_listeners.splice(i,1);
		
	}
	clearEvents() {
		
		let i, $;
		
		i = -1;
		while ($ = this._UF_listeners[++i]) $[0].removeEventListener($[1],$[2],$[3]);
		this._UF_listeners.length = 0;
		
	}
	dispatch(name, detail = {}) {
		
		detail && typeof detail === 'object' &&
			Object.prototype.toString.call(detail) === '[object Object]' && (detail.target = this);
		
		if (this.id) {
			
			const listeners = QQ(`[data-for~="${this.id}"]`);
			
			let i,l,l0;
			
			i = -1, l = listeners.length;
			while (++i < l) listeners[i].dispatchEvent(new CustomEvent(name, { detail: { on: this, more: detail } }));
			
		}
		
		this.dispatchEvent(new CustomEvent(name, { detail }));
		
	}
		/*
		if (this.dataset.for) {
			
			const listeners = QQ(`#${this.dataset.for.split(' ').join(',#')}`);
			
			let i,l,l0;
			
			i = -1, l = listeners.length;
			while (++i < l) listeners[i].dispatchEvent(new CustomEvent(name, { detail }));
			
		}
		
		this.dispatchEvent(new CustomEvent(name, { detail }));
		
	}
	*/
	
	observeMutation(callback, node, init) {
		
		let observer;
		
		(observer = this._UF_observers.get(callback)) ||
			(this._UF_observers.set(callback, observer = new MutationObserver(callback))),
		observer.observe(node, init);
		
	}
	disconnectMutationObserver(callback) {
		
		let observer;
		
		(observer = this._UF_observers.get(callback)) && observer.disconnect();
		
	}
	clearMutationObserver() {
		
		let observer;
		
		const ovservers = this._UF_observers.values();
		for (observer of ovservers) observer.disconnect();
		
		this._UF_observers.clear();
		
	}
	
	q(selector) {
		return this.shadowRoot.querySelector(selector);
	}
	qq(selector) {
		return this.shadowRoot.querySelectorAll(selector);
	}
	
}
UFElement.shadowRootInit = { mode: 'open' },
UFElement.uid = () => 'uf-' + uid4();

class InputNode extends UFElement {
	
	constructor() {
		
		super(),
		
		this.node = Q('.node', this.shadowRoot),
		this.codes = Q('.codes', this.shadowRoot),
		// ネイティブのイベントには、Shadow Root の外へ伝播しないものがある。それらは event.composed の値で判別できる。
		this.addEvent(this.match = Q('input[type="text"]', this.shadowRoot),
			'change', event => this.dispatchEvent(new Event(event.type))),
		//this.addEvent(this, 'change', this.save),
		//(this.check = Q('input[type="checkbox"]')) &&
		//	this.addEvent(this.check, 'change', event => this.dispatchEvent(new Event('check'))),
		
		(this.af = Q('#all-frames', this.shadowRoot)) && this.addEvent(this.af, 'change', this.changedAllFrames),
		(this.runs = Q('#run', this.shadowRoot)) && this.addEvent(this.runs, 'change', this.changedRun),
		
		this.addEvent(this.del = Q('button.del', this.shadowRoot), 'click', this.pressedDelButton),
		this.addEvent(this.up = Q('button.up', this.shadowRoot), 'click', this.pressedUpButton),
		this.addEvent(this.down = Q('button.down', this.shadowRoot), 'click', this.pressedDownButton);
		
	}
	observeCodes(callback) {
		
		// この監視は InputNode 内の input[type="hidden"] に対するもの（正確にはその親要素）
		// この関数を通じてその監視を任意のタイミングで開始する。
		//this.observeMutation(this.save, this.codes, this.constructor.codesMutationObserverInit);
		callback && typeof callback === 'function' &&
			this.observeMutation(callback, this.codes, this.constructor.codesMutationObserverInit);
		
	}
	appendNodeTo(node) {
		
		return this.node.appendChild(node);
		
	}
	appendTo() {
		
		this.node.append.apply(this.container, arguments);
		
	}
	setCode(code, type = 'js', id = UFElement.uid()) {
		
		let codeNode;
		
		(codeNode = Q(`.${id}`, this.codes)) || ((codeNode = document.createElement('div')).classList.add(id));
		
		codeNode.dataset.type = type,
		codeNode.textContent = unescape(code);
		
		return codeNode.parentElement ? codeNode : this.codes.appendChild(codeNode);
		
	}
	setRun(run) {
		
		let $,$0;
		
		$ =	Q(`[value="${run}"]`, this.runs) ||
					((this.runs.appendChild($0 = document.createElement('option'))).value = $0.textContent = run, $0),
		
		$.setAttribute('selected', '');
		
	}
	
	get appliesAllFrames() { return this.af.checked; }
	get run() { return this.runs.selectedOptions[0].value; }
	get value() { return escape(this.match.value); }
	set value(v) { this.match.value = unescape(v); }
	
}
InputNode.tagName = 'input-node',
InputNode.codesMutationObserverInit =
	{ attributes: true, attributeFilter: [ 'data-type' ], characterData: true, childList: true, subtree: true },
InputNode.bind = {
	selected() {
		
		this.dispatch('changed-selector');
		
	},
	changedAllFrames() {
		
		this.dispatch('changed-all-frames', null);
		
	},
	changedRun() {
		
		this.dispatch('changed-run', null);
		
	},
	pressedDelButton(event) {
		this.dispatch('pressed-del-button', event.target);
	},
	pressedUpButton(event) {
		this.dispatch('pressed-up-button', event.target);
	},
	pressedDownButton(event) {
		this.dispatch('pressed-down-button', event.target);
	}
};

class EditorNode extends UFElement {
	
	constructor() {
		
		super(),
		
		this.container = Q(`.${this.constructor.tagName}`, this.shadowRoot),
		
		this.addEvent(this.types = Q('#type', this.shadowRoot), 'change', this.selectedType),
		this.addEvent(this.editor = Q('textarea', this.shadowRoot), 'blur', this.changedCode),
		this.addEvent(this.editor, 'input', this.inputCode),
		this.addEvent(this, `${EditorNode.tagName}-change-type`, this.changedValue),
		this.addEvent(this, `${EditorNode.tagName}-change-code`, this.changedValue),
		this.addEvent(this.saveButton = Q('.save', this.shadowRoot), 'click', this.pressedSaveButton),
		
		this.addEvent(this.del = Q('button.del', this.shadowRoot), 'click', this.pressedDelButton),
		this.addEvent(this.up = Q('button.up', this.shadowRoot), 'click', this.pressedUpButton),
		this.addEvent(this.down = Q('button.down', this.shadowRoot), 'click', this.pressedDownButton);
		
	}
	
	setCode(code) {
		
		this.editor.value = unescape(code);
		
	}
	setType(type) {
		
		let $,$0;
		
		($ = Q(`[value="${type}"]`, this.types)) ||
			((this.types.appendChild($0 = document.createElement('option'))).value = $0.textContent = type),
		
		$.setAttribute('selected', '');
		
	}
	
	addClass(...classes) {
		
		this.classList.add(...classes), this.container.classList.add(...classes);
		
	}
	removeClass(...classes) {
		
		this.classList.remove(...classes), this.container.classList.remove(...classes);
		
	}
	
	get type() { return this.types.selectedOptions[0].value; }
	get value() { return escape(this.editor.value); }
	
}
EditorNode.tagName = 'editor-node',
EditorNode.bind = {
	
	pressedSaveButton() {
		
		this.dispatch('pressed-save-button', null);
		
	},
	selectedType() {
		
		this.dispatch('changed-type', null);
		
	},
	inputCode() {
		
		this.dispatch('input-code', null);
		
	},
	changedCode() {
		
		this.dispatch('changed-code', null);
		
	},
	changedValue() {
		
		this.dispatch('changed-value', null);
		
	},
	pressedDelButton(event) {
		
		this.dispatch('pressed-del-button', event.target);
		
	},
	pressedUpButton(event) {
		
		this.dispatch('pressed-up-button', event.target);
		
	},
	pressedDownButton(event) {
		
		this.dispatch('pressed-down-button', event.target);
		
	}
	
};
/*
class EditorContainer extends UFElement {
	
	constructor() {
		
		super();
		
		this.editors = Q('.editors', this.shadowRoot),
		this.addEvent(this.addButton = Q('button', this.shadowRoot), 'click', this.pressedAddButton);
		
	}
	append() {
		
		this.editors.append(...arguments);
		
	}
	prepend(node) {
		
		this.editors.prepend(node);
		
	}
	
}
EditorContainer.tagName = 'editor-container',
EditorContainer.bind = {
	pressedAddButton() {
		
		let $;
		
		($ = document.createElement('editor-node')).id = uid(), this.prepend($);
		
	},
};
*/

// 以下はカスタム要素の定義処理

const customElementConstructors = [ InputNode, EditorNode ];

let i, $;

i = -1;
while ($ = customElementConstructors[++i]) customElements.define($.tagName, $);