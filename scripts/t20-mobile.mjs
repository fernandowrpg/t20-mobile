/**
 * T20 Mobile — interface touch-first para Tormenta20 no Foundry VTT v13.
 *
 * Roda dentro de um cliente Foundry normal (o celular abre /game e loga como
 * sempre), substitui a UI padrao por uma lista de acoes grande e rolavel, e
 * dispara as rolagens NATIVAS do sistema tormenta20 — os cards de chat sao
 * identicos aos da ficha.
 *
 * Alvos verificados: Foundry 13.351 / sistema tormenta20 1.5.015
 */

const MOD = "t20-mobile";

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

Hooks.once("init", () => {
	game.settings.register(MOD, "autoMobile", {
		name: "Ativar automaticamente em telas pequenas",
		hint: "Entra no modo mobile sozinho quando a tela é estreita e tem toque. Você sempre pode forçar com ?t20m=1 na URL.",
		scope: "client",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MOD, "showDialogs", {
		name: "Mostrar diálogo de uso nas rolagens",
		hint: "Desligado, um toque rola direto. Ligado, abre o diálogo de efeitos/uso do sistema.",
		scope: "client",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(MOD, "offerNoCanvas", {
		name: "Oferecer desligar o canvas neste dispositivo",
		hint: "Ao entrar no modo mobile, sugere ligar o \"Disable Game Canvas\" do Foundry, que impede a cena de ser carregada neste aparelho. E uma configuracao de cliente: nao afeta os outros jogadores.",
		scope: "client",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MOD, "killCanvas", {
		name: "Suspender o canvas no modo mobile",
		hint: "Para o renderizador do mapa enquanto o modo mobile está ativo. Economiza muita bateria e memória no celular.",
		scope: "client",
		config: true,
		type: Boolean,
		default: true
	});
});

/* -------------------------------------------- */
/*  Bootstrap                                   */
/* -------------------------------------------- */

Hooks.once("ready", () => {
	if (game.system.id !== "tormenta20") {
		console.warn(`${MOD} | sistema ativo e "${game.system.id}", nao "tormenta20". Abortando.`);
		return;
	}

	game.t20mobile = {
		open: () => T20Mobile.activate(),
		close: () => T20Mobile.deactivate()
	};

	const params = new URLSearchParams(window.location.search);
	const forced = params.get("t20m");

	if (forced === "0") return addLauncher();
	if (forced === "1" || (game.settings.get(MOD, "autoMobile") && isSmallTouchScreen())) {
		T20Mobile.activate();
	} else {
		addLauncher();
	}
});

function isSmallTouchScreen() {
	const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
	return touch && Math.min(window.screen.width, window.screen.height) <= 820;
}

/** Botao flutuante discreto para entrar no modo mobile de um desktop. */
function addLauncher() {
	if (document.getElementById("t20m-launcher")) return;
	const btn = document.createElement("button");
	btn.id = "t20m-launcher";
	btn.type = "button";
	btn.title = "Abrir T20 Mobile";
	btn.textContent = "T20";
	btn.addEventListener("click", () => T20Mobile.activate());
	document.body.appendChild(btn);
}

/* -------------------------------------------- */
/*  Helpers de rolagem                          */
/* -------------------------------------------- */

/**
 * O sistema T20 decide se abre o dialogo de uso a partir do setting
 * `tormenta20.UsageConfig` combinado com `event.shiftKey`:
 *
 *   UsageConfig === "default"  ->  precisa de dialogo quando NAO tem shift
 *   UsageConfig === "shift"    ->  precisa de dialogo quando TEM shift
 *
 * Entao, para PULAR o dialogo, o shiftKey sintetico precisa ser o inverso.
 * Verificado em documents/actor.mjs (rollAtributo/rollPericia) e
 * sheets/actor-base.mjs (_onItemRoll) na 1.5.015.
 */
function syntheticEvent() {
	const wantDialog = game.settings.get(MOD, "showDialogs");
	const usage = game.settings.get("tormenta20", "UsageConfig");
	const skip = !wantDialog;
	const shiftKey = (usage === "default") ? skip : !skip;
	return { shiftKey, altKey: false, ctrlKey: false, metaKey: false, preventDefault: () => {}, stopPropagation: () => {} };
}

/** `configureDialog` para item.roll(), seguindo a mesma logica. */
function wantsItemDialog(item) {
	if (!game.settings.get(MOD, "showDialogs")) return false;
	const hasEffectsOrRolls = !!item.validOnUseEffects?.length || !!item.system?.rolls?.length;
	return hasEffectsOrRolls;
}

/**
 * "Disable Game Canvas" (core.noCanvas) e uma configuracao de CLIENTE: vale
 * por navegador/aparelho. Ligada, o Foundry nem inicializa o WebGL nem carrega
 * a cena, que e o que pesa num celular. Nao afeta os outros jogadores.
 */
function noCanvasActive() {
	try {
		return game.settings.get("core", "noCanvas") === true;
	} catch {
		return false;
	}
}

async function guard(label, fn) {
	try {
		await fn();
	} catch (err) {
		console.error(`${MOD} | falha em "${label}"`, err);
		ui.notifications?.error(`T20 Mobile: erro ao rolar ${label}. Veja o console.`);
	}
}

/* -------------------------------------------- */
/*  Aplicacao                                   */
/* -------------------------------------------- */

class T20Mobile {
	static instance = null;

	static activate() {
		if (this.instance) return;
		this.instance = new T20Mobile();
		this.instance.mount();
	}

	static deactivate() {
		this.instance?.unmount();
		this.instance = null;
	}

	constructor() {
		this.actor = null;
		this.tab = "acoes";
		this.root = null;
		this.banner = null;
		this._hooks = [];
		this._tickerStopped = false;
	}

	/* ---------- ciclo de vida ---------- */

	mount() {
		document.body.classList.add("t20m-on");
		document.getElementById("t20m-launcher")?.remove();

		this.root = document.createElement("div");
		this.root.id = "t20m-root";
		document.body.appendChild(this.root);

		if (game.settings.get(MOD, "killCanvas")) this.suspendCanvas();

		this.actor = this.pickDefaultActor();
		this.registerHooks();
		this.render();
		this.maybeOfferNoCanvas();
	}

	unmount() {
		this._hooks.forEach(([hook, id]) => Hooks.off(hook, id));
		this._hooks = [];
		this.resumeCanvas();
		this.root?.remove();
		this.root = null;
		this.banner?.remove();
		this.banner = null;
		document.body.classList.remove("t20m-on");
		addLauncher();
	}

	/**
	 * Suspender o ticker so ameniza: a cena ja foi carregada. Ligar o
	 * core.noCanvas evita o carregamento por completo, mas exige recarregar.
	 */
	maybeOfferNoCanvas() {
		if (!game.settings.get(MOD, "offerNoCanvas")) return;
		if (noCanvasActive()) return;

		const bar = el("div", "t20m-banner");
		const txt = el("span", "t20m-banner-text");
		txt.textContent = "Carregar a cena pesa no celular. Desligar o canvas neste aparelho?";
		bar.appendChild(txt);

		const yes = el("button", "t20m-banner-yes");
		yes.type = "button";
		yes.textContent = "Desligar e recarregar";
		yes.addEventListener("click", async () => {
			yes.disabled = true;
			try {
				await game.settings.set("core", "noCanvas", true);
				window.location.reload();
			} catch (err) {
				console.error(`${MOD} | nao foi possivel ligar o noCanvas`, err);
				ui.notifications?.error("T20 Mobile: nao consegui alterar a configuracao de canvas.");
				yes.disabled = false;
			}
		});

		const never = el("button", "t20m-banner-no");
		never.type = "button";
		never.textContent = "Agora nao";
		never.addEventListener("click", () => {
			game.settings.set(MOD, "offerNoCanvas", false);
			bar.remove();
			this.banner = null;
		});

		bar.append(yes, never);
		// Fica no body, nao no root: render() faz replaceChildren no root e
		// apagaria o banner a cada troca de aba. Ele e position:fixed mesmo.
		this.banner?.remove();
		this.banner = bar;
		document.body.appendChild(bar);
	}

	suspendCanvas() {
		// Com o noCanvas ligado nao existe canvas para suspender.
		if (noCanvasActive()) return;
		try {
			if (canvas?.app?.ticker?.started) {
				canvas.app.ticker.stop();
				this._tickerStopped = true;
			}
		} catch (err) {
			console.warn(`${MOD} | nao foi possivel suspender o canvas`, err);
		}
	}

	resumeCanvas() {
		try {
			if (this._tickerStopped) canvas?.app?.ticker?.start();
		} catch (err) {
			console.warn(`${MOD} | nao foi possivel retomar o canvas`, err);
		}
		this._tickerStopped = false;
	}

	/* ---------- dados ---------- */

	ownedActors() {
		return game.actors
			.filter((a) => a.isOwner && ["character", "npc"].includes(a.type))
			.sort((a, b) => {
				const mine = (x) => (x.id === game.user.character?.id ? 0 : 1);
				return mine(a) - mine(b) || a.name.localeCompare(b.name, "pt-BR");
			});
	}

	pickDefaultActor() {
		const list = this.ownedActors();
		if (!list.length) return null;
		const remembered = list.find((a) => a.id === this._rememberedId());
		return remembered ?? game.user.character ?? list[0];
	}

	_rememberedId() {
		try {
			return window.localStorage.getItem(`${MOD}:actor`);
		} catch { return null; }
	}

	_remember(id) {
		try { window.localStorage.setItem(`${MOD}:actor`, id); } catch { /* ignore */ }
	}

	/* ---------- hooks de atualizacao ---------- */

	registerHooks() {
		const on = (hook, fn) => this._hooks.push([hook, Hooks.on(hook, fn)]);
		const mine = (doc) => doc?.id === this.actor?.id || doc?.parent?.id === this.actor?.id;

		on("updateActor", (doc) => { if (mine(doc)) this.render(); });
		on("createItem", (doc) => { if (mine(doc)) this.render(); });
		on("updateItem", (doc) => { if (mine(doc)) this.render(); });
		on("deleteItem", (doc) => { if (mine(doc)) this.render(); });
		on("createChatMessage", () => { if (this.tab === "chat") this.render(); else this.flashChat(); });
		on("deleteChatMessage", () => { if (this.tab === "chat") this.render(); });
		on("updateChatMessage", () => { if (this.tab === "chat") this.render(); });
	}

	flashChat() {
		this.root?.querySelector('[data-tab="chat"]')?.classList.add("t20m-pulse");
	}

	/* ---------- render ---------- */

	render() {
		if (!this.root) return;
		const scroll = this.root.querySelector(".t20m-body")?.scrollTop ?? 0;
		this.root.replaceChildren(this.renderHeader(), this.renderBody(), this.renderTabs());
		const body = this.root.querySelector(".t20m-body");
		if (body) body.scrollTop = scroll;
		if (this.tab === "chat") this.renderChatAsync();
	}

	renderHeader() {
		const head = el("header", "t20m-head");

		const select = el("select", "t20m-actor-select");
		for (const a of this.ownedActors()) {
			const opt = el("option");
			opt.value = a.id;
			opt.textContent = a.name;
			if (a.id === this.actor?.id) opt.selected = true;
			select.appendChild(opt);
		}
		select.addEventListener("change", (ev) => {
			this.actor = game.actors.get(ev.target.value) ?? null;
			if (this.actor) this._remember(this.actor.id);
			this.render();
		});
		head.appendChild(select);

		const exit = el("button", "t20m-exit");
		exit.type = "button";
		exit.textContent = "✕";
		exit.title = "Sair do modo mobile";
		exit.addEventListener("click", () => T20Mobile.deactivate());
		head.appendChild(exit);

		if (this.actor) head.appendChild(this.renderVitals());
		return head;
	}

	renderVitals() {
		const a = this.actor;
		const at = a.system.attributes ?? {};
		const wrap = el("div", "t20m-vitals");

		wrap.appendChild(this.resourceBar("PV", "pv", at.pv, "t20m-pv"));
		wrap.appendChild(this.resourceBar("PM", "pm", at.pm, "t20m-pm"));

		const def = el("div", "t20m-stat");
		def.append(labelled("Defesa", at.defesa?.value ?? "—"));
		wrap.appendChild(def);

		const niv = el("div", "t20m-stat");
		niv.append(labelled("N\u00edvel", at.nivel?.value ?? at.nivel ?? "—"));
		wrap.appendChild(niv);

		return wrap;
	}

	resourceBar(label, key, res, cls) {
		const wrap = el("div", `t20m-res ${cls}`);
		const value = res?.value ?? 0;
		const max = res?.max ?? 0;
		const temp = res?.temp ?? 0;
		const pct = max > 0 ? Math.clamp((value / max) * 100, 0, 100) : 0;

		const bar = el("div", "t20m-bar");
		const fill = el("div", "t20m-bar-fill");
		fill.style.width = `${pct}%`;
		bar.appendChild(fill);

		const txt = el("span", "t20m-res-text");
		txt.textContent = `${label} ${value}${temp ? `+${temp}` : ""}/${max}`;

		const minus = stepper("−", () => this.adjust(key, -1));
		const plus = stepper("+", () => this.adjust(key, +1));

		wrap.append(minus, bar, txt, plus);
		return wrap;
	}

	async adjust(key, delta) {
		const path = `system.attributes.${key}.value`;
		const cur = foundry.utils.getProperty(this.actor, path) ?? 0;
		const max = foundry.utils.getProperty(this.actor, `system.attributes.${key}.max`) ?? 0;
		const next = Math.clamp(cur + delta, -99, max || 999);
		await guard(`ajuste de ${key.toUpperCase()}`, () => this.actor.update({ [path]: next }));
	}

	renderTabs() {
		const nav = el("nav", "t20m-tabs");
		const tabs = [
			["acoes", "A\u00e7\u00f5es"],
			["pericias", "Per\u00edcias"],
			["itens", "Itens"],
			["chat", "Chat"]
		];
		for (const [id, label] of tabs) {
			const b = el("button", this.tab === id ? "active" : "");
			b.type = "button";
			b.dataset.tab = id;
			b.textContent = label;
			b.addEventListener("click", () => { this.tab = id; this.render(); });
			nav.appendChild(b);
		}
		return nav;
	}

	renderBody() {
		const body = el("main", "t20m-body");
		if (!this.actor) {
			body.appendChild(note("Voc\u00ea n\u00e3o possui nenhum personagem neste mundo. Pe\u00e7a ao mestre para te dar permiss\u00e3o de Owner em um ator."));
			return body;
		}
		switch (this.tab) {
			case "acoes": this.sectionAcoes(body); break;
			case "pericias": this.sectionPericias(body); break;
			case "itens": this.sectionItens(body); break;
			case "chat": body.appendChild(el("div", "t20m-chat")); break;
		}
		return body;
	}

	/* ---------- aba Acoes ---------- */

	sectionAcoes(body) {
		const a = this.actor;

		// Atributos
		body.appendChild(heading("Atributos"));
		const grid = el("div", "t20m-grid-atr");
		for (const [key, label] of Object.entries(CONFIG.T20.atributos)) {
			const atr = a.system.atributos?.[key];
			const btn = bigButton(
				game.i18n.localize(CONFIG.T20.atributosAbr?.[key] ?? label),
				fmtMod(atr?.value)
			);
			btn.addEventListener("click", () => guard(`atributo ${key}`, () =>
				a.rollAtributo(key, { message: true, event: syntheticEvent() })
			));
			grid.appendChild(btn);
		}
		body.appendChild(grid);

		// Armas
		const armas = a.itemTypes.arma ?? [];
		if (armas.length) {
			body.appendChild(heading("Armas"));
			for (const item of armas) body.appendChild(this.weaponRow(item));
		}

		// Iniciativa — atalho util o suficiente para ter lugar proprio
		if (a.system.pericias?.inic) {
			body.appendChild(heading("R\u00e1pido"));
			const row = el("div", "t20m-quick");
			const ini = bigButton("Iniciativa", fmtMod(a.system.pericias.inic.value));
			ini.addEventListener("click", () => guard("iniciativa", () =>
				a.rollPericia("inic", { message: true, event: syntheticEvent() })
			));
			row.appendChild(ini);
			body.appendChild(row);
		}
	}

	weaponRow(item) {
		const row = el("div", "t20m-row");
		const name = el("div", "t20m-row-name");
		name.textContent = item.name;
		row.appendChild(name);

		const actions = el("div", "t20m-row-actions");

		if (item.hasAttack) {
			const atk = smallButton("Ataque", true);
			// rollAttack desestrutura { options } SEM default no objeto externo:
			// chamar sem argumento lanca TypeError. Verificado na 1.5.015.
			atk.addEventListener("click", () => guard(`ataque com ${item.name}`, () =>
				item.rollAttack({ options: {} })
			));
			actions.appendChild(atk);
		}
		if (item.hasDamage) {
			const dmg = smallButton("Dano", !item.hasAttack);
			dmg.addEventListener("click", () => guard(`dano de ${item.name}`, () =>
				item.rollDamage({ event: syntheticEvent() })
			));
			actions.appendChild(dmg);
		}
		const card = smallButton("Card");
		card.addEventListener("click", () => guard(`uso de ${item.name}`, () =>
			item.roll({ configureDialog: wantsItemDialog(item), event: syntheticEvent() })
		));
		actions.appendChild(card);

		row.appendChild(actions);
		return row;
	}

	/* ---------- aba Pericias ---------- */

	sectionPericias(body) {
		const a = this.actor;
		const entries = Object.entries(a.system.pericias ?? {});
		if (!entries.length) {
			body.appendChild(note("Este ator n\u00e3o tem per\u00edcias no data model."));
			return;
		}

		const filter = el("input", "t20m-filter");
		filter.type = "search";
		filter.placeholder = "Filtrar perícia…";
		filter.autocomplete = "off";
		body.appendChild(filter);

		const list = el("div", "t20m-list");
		const rows = [];

		entries
			.map(([key, p]) => [key, p, game.i18n.localize(p.label ?? key)])
			.sort((x, y) => x[2].localeCompare(y[2], "pt-BR"))
			.forEach(([key, p, label]) => {
				const row = el("button", "t20m-skill");
				row.type = "button";
				const n = el("span", "t20m-skill-name");
				n.textContent = label;
				// `atributo` e o atributo-base da pericia (SkillData.atributo).
				const abl = p.atributo ? game.i18n.localize(CONFIG.T20.atributosAbr?.[p.atributo] ?? p.atributo) : "";
				if (abl) {
					const tag = el("span", "t20m-skill-abl");
					tag.textContent = abl;
					n.appendChild(tag);
				}
				const v = el("span", "t20m-skill-val");
				v.textContent = fmtMod(p.value);
				// Campo real do schema e `treinado` (SkillData), nao `trained`.
				if (p.treinado === false) row.classList.add("untrained");
				// `st` = "somente treinada": sem treino, o teste nem e permitido.
				if (p.st === true && p.treinado === false) row.classList.add("blocked");
				row.append(n, v);
				row.addEventListener("click", () => guard(`pericia ${label}`, () =>
					a.rollPericia(key, { message: true, event: syntheticEvent() })
				));
				list.appendChild(row);
				rows.push([label.toLowerCase(), row]);
			});

		filter.addEventListener("input", () => {
			const q = filter.value.toLowerCase().trim();
			for (const [label, row] of rows) {
				row.style.display = !q || label.includes(q) ? "" : "none";
			}
		});

		body.appendChild(list);
	}

	/* ---------- aba Itens ---------- */

	sectionItens(body) {
		const a = this.actor;
		const groups = [
			["Poderes", a.itemTypes.poder ?? []],
			["Magias", a.itemTypes.magia ?? []],
			["Consum\u00edveis", a.itemTypes.consumivel ?? []],
			["Equipamentos", a.itemTypes.equipamento ?? []]
		];

		let any = false;
		for (const [label, items] of groups) {
			if (!items.length) continue;
			any = true;
			body.appendChild(heading(`${label} (${items.length})`));
			for (const item of items) {
				const row = el("button", "t20m-skill");
				row.type = "button";
				const n = el("span", "t20m-skill-name");
				n.textContent = item.name;
				row.appendChild(n);
				const meta = itemMeta(item);
				if (meta) {
					const m = el("span", "t20m-skill-val");
					m.textContent = meta;
					row.appendChild(m);
				}
				row.addEventListener("click", () => guard(`uso de ${item.name}`, () =>
					item.roll({ configureDialog: wantsItemDialog(item), event: syntheticEvent() })
				));
				body.appendChild(row);
			}
		}
		if (!any) body.appendChild(note("Nenhum poder, magia, consum\u00edvel ou equipamento neste ator."));
	}

	/* ---------- aba Chat ---------- */

	async renderChatAsync() {
		const host = this.root?.querySelector(".t20m-chat");
		if (!host) return;
		this.root.querySelector('[data-tab="chat"]')?.classList.remove("t20m-pulse");

		const messages = game.messages.contents.slice(-25);
		host.replaceChildren();

		for (const msg of messages) {
			const wrap = el("div", "t20m-msg");
			const content = el("div", "t20m-msg-content");
			try {
				// v13 renomeou getHTML -> renderHTML (retorna HTMLElement).
				if (typeof msg.renderHTML === "function") {
					content.appendChild(await msg.renderHTML());
				} else if (typeof msg.getHTML === "function") {
					const jq = await msg.getHTML();
					content.innerHTML = jq instanceof HTMLElement ? jq.outerHTML : jq[0]?.outerHTML ?? "";
				} else {
					content.innerHTML = msg.content ?? "";
				}
			} catch (err) {
				console.warn(`${MOD} | falha ao renderizar mensagem ${msg.id}`, err);
				content.textContent = msg.content?.replace(/<[^>]*>/g, "") ?? "";
			}
			wrap.appendChild(content);

			// Os controles nativos da mensagem sao ligados pelo ChatLog da
			// sidebar, nao pelo elemento. Renderizado solto aqui, o botao de
			// excluir do Foundry fica morto — entao ele e escondido via CSS e
			// nos oferecemos o nosso, que chama msg.delete() direto.
			if (game.user.isGM || msg.isAuthor) {
				const actions = el("div", "t20m-msg-actions");
				const del = el("button", "t20m-msg-del");
				del.type = "button";
				del.textContent = "Excluir";
				del.title = "Excluir esta mensagem";
				del.addEventListener("click", (ev) => {
					ev.stopPropagation();
					guard("excluir mensagem", () => msg.delete());
				});
				actions.appendChild(del);
				wrap.appendChild(actions);
			}

			host.appendChild(wrap);
		}
		host.scrollTop = host.scrollHeight;
	}
}

/* -------------------------------------------- */
/*  Pequenos helpers de DOM                     */
/* -------------------------------------------- */

function el(tag, cls) {
	const node = document.createElement(tag);
	if (cls) node.className = cls;
	return node;
}

function heading(text) {
	const h = el("h2", "t20m-h");
	h.textContent = text;
	return h;
}

function note(text) {
	const p = el("p", "t20m-note");
	p.textContent = text;
	return p;
}

function labelled(label, value) {
	const frag = document.createDocumentFragment();
	const l = el("span", "t20m-stat-label");
	l.textContent = label;
	const v = el("span", "t20m-stat-value");
	v.textContent = value;
	frag.append(l, v);
	return frag;
}

function bigButton(label, value) {
	const b = el("button", "t20m-big");
	b.type = "button";
	const l = el("span", "t20m-big-label");
	l.textContent = label;
	const v = el("span", "t20m-big-value");
	v.textContent = value;
	b.append(l, v);
	return b;
}

function smallButton(label, primary = false) {
	const b = el("button", `t20m-small${primary ? " primary" : ""}`);
	b.type = "button";
	b.textContent = label;
	return b;
}

function stepper(label, fn) {
	const b = el("button", "t20m-step");
	b.type = "button";
	b.textContent = label;
	b.addEventListener("click", (ev) => { ev.stopPropagation(); fn(); });
	return b;
}

function fmtMod(n) {
	const v = Number(n ?? 0);
	if (!Number.isFinite(v)) return "—";
	return v >= 0 ? `+${v}` : `${v}`;
}

function itemMeta(item) {
	const s = item.system ?? {};
	if (item.type === "magia") {
		const circ = s.circulo ?? s.nivel;
		return circ ? `${circ}º círculo` : "";
	}
	if (item.type === "consumivel") {
		const q = s.quantidade?.value ?? s.quantidade;
		return q != null ? `x${q}` : "";
	}
	return "";
}
