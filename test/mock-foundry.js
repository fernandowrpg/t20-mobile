/* Mock minimo do runtime do Foundry v13 + sistema tormenta20 1.5.015.
   Serve para renderizar e testar a UI do T20 Mobile fora do Foundry. */

Math.clamp ??= (v, min, max) => Math.min(Math.max(v, min), max);

window.T20M_CALLS = [];
const log = (what, payload) => {
	window.T20M_CALLS.push({ what, payload });
	console.log("[mock]", what, JSON.stringify(payload));
};

const PT = {
	"T20.AbilityStr": "Forca", "T20.AbilityDex": "Destreza", "T20.AbilityCon": "Constituicao",
	"T20.AbilityInt": "Inteligencia", "T20.AbilityWis": "Sabedoria", "T20.AbilityCha": "Carisma",
	"T20.AbilityStrAbbr": "FOR", "T20.AbilityDexAbbr": "DES", "T20.AbilityConAbbr": "CON",
	"T20.AbilityIntAbbr": "INT", "T20.AbilityWisAbbr": "SAB", "T20.AbilityChaAbbr": "CAR",
	"T20.SkillAcro": "Acrobacia", "T20.SkillAdes": "Adestramento", "T20.SkillAtle": "Atletismo",
	"T20.SkillAtua": "Atuacao", "T20.SkillCava": "Cavalgar", "T20.SkillConh": "Conhecimento",
	"T20.SkillCura": "Cura", "T20.SkillDipl": "Diplomacia", "T20.SkillEnga": "Enganacao",
	"T20.SkillFort": "Fortitude", "T20.SkillFurt": "Furtividade", "T20.SkillGuer": "Guerra",
	"T20.SkillInic": "Iniciativa", "T20.SkillInti": "Intimidacao", "T20.SkillIntu": "Intuicao",
	"T20.SkillInve": "Investigacao", "T20.SkillLuta": "Luta", "T20.SkillMist": "Misticismo",
	"T20.SkillNobr": "Nobreza", "T20.SkillOfic": "Oficio", "T20.SkillPerc": "Percepcao",
	"T20.SkillPilo": "Pilotagem", "T20.SkillPont": "Pontaria", "T20.SkillRefl": "Reflexos",
	"T20.SkillRelig": "Religiao", "T20.SkillSobr": "Sobrevivencia", "T20.SkillVont": "Vontade"
};

// [labelKey, value, treinado, atributo, somenteTreinada]
const SKILLS = {
	acro: ["T20.SkillAcro", 7, true, "des", false], ades: ["T20.SkillAdes", 2, false, "car", true], atle: ["T20.SkillAtle", 9, true, "for", false],
	atua: ["T20.SkillAtua", 1, false, "car", true], cava: ["T20.SkillCava", 3, true], conh: ["T20.SkillConh", 4, false],
	cura: ["T20.SkillCura", 5, true], dipl: ["T20.SkillDipl", 2, true], enga: ["T20.SkillEnga", 2, true],
	fort: ["T20.SkillFort", 11, true, "con", false], furt: ["T20.SkillFurt", 6, true], guer: ["T20.SkillGuer", 4, false],
	inic: ["T20.SkillInic", 8, true], inti: ["T20.SkillInti", 3, true], intu: ["T20.SkillIntu", 5, true],
	inve: ["T20.SkillInve", 4, true], luta: ["T20.SkillLuta", 12, true, "for", false], mist: ["T20.SkillMist", 6, false],
	nobr: ["T20.SkillNobr", 1, false], ofic: ["T20.SkillOfic", 2, false], perc: ["T20.SkillPerc", 7, true],
	pilo: ["T20.SkillPilo", 0, false], pont: ["T20.SkillPont", 8, true], refl: ["T20.SkillRefl", 9, true],
	relig: ["T20.SkillRelig", 3, false], sobr: ["T20.SkillSobr", 6, true], vont: ["T20.SkillVont", 10, true]
};

function makeItem(id, type, name, extra = {}) {
	return {
		id, type, name,
		system: { rolls: extra.rolls ?? [], ...extra.system },
		validOnUseEffects: extra.effects ?? [],
		get hasAttack() { return !!extra.hasAttack; },
		get hasDamage() { return !!extra.hasDamage; },
		roll(opts) { log("item.roll", { name, opts: { configureDialog: opts?.configureDialog } }); },
		rollAttack(opts) {
			if (opts === undefined) throw new TypeError("rollAttack() sem argumento — bug reproduzido");
			log("item.rollAttack", { name });
		},
		rollDamage(opts) { log("item.rollDamage", { name, shiftKey: opts?.event?.shiftKey }); }
	};
}

const ITEMS = [
	makeItem("w1", "arma", "Espada Longa +1", { hasAttack: true, hasDamage: true, rolls: [{ type: "ataque" }, { type: "dano" }] }),
	makeItem("w2", "arma", "Arco Curto", { hasAttack: true, hasDamage: true, rolls: [{ type: "ataque" }, { type: "dano" }] }),
	makeItem("p1", "poder", "Ataque Poderoso", { effects: [{}] }),
	makeItem("p2", "poder", "Esquiva Sobrenatural"),
	makeItem("m1", "magia", "Bola de Fogo", { system: { circulo: 3 }, rolls: [{ type: "dano" }] }),
	makeItem("m2", "magia", "Curar Ferimentos", { system: { circulo: 1 }, rolls: [{ type: "dano" }] }),
	makeItem("c1", "consumivel", "Pocao de Cura", { system: { quantidade: { value: 3 } } }),
	makeItem("e1", "equipamento", "Armadura de Couro Batido")
];

const ACTOR = {
	id: "actor1",
	name: "Arandur, o Andarilho",
	type: "character",
	isOwner: true,
	system: {
		atributos: { for: { value: 4 }, des: { value: 3 }, con: { value: 2 }, int: { value: 1 }, sab: { value: 0 }, car: { value: -1 } },
		attributes: {
			pv: { value: 38, max: 52, temp: 4 },
			pm: { value: 9, max: 16, temp: 0 },
			defesa: { value: 21 },
			nivel: { value: 7 }
		},
		pericias: Object.fromEntries(Object.entries(SKILLS).map(([k, [label, value, treinado, atributo = "for", st = false]]) => [k, { label, value, treinado, atributo, st }]))
	},
	itemTypes: {
		arma: ITEMS.filter(i => i.type === "arma"),
		poder: ITEMS.filter(i => i.type === "poder"),
		magia: ITEMS.filter(i => i.type === "magia"),
		consumivel: ITEMS.filter(i => i.type === "consumivel"),
		equipamento: ITEMS.filter(i => i.type === "equipamento")
	},
	rollAtributo(key, opts) { log("actor.rollAtributo", { key, shiftKey: opts?.event?.shiftKey, message: opts?.message }); },
	rollPericia(key, opts) { log("actor.rollPericia", { key, shiftKey: opts?.event?.shiftKey, message: opts?.message }); },
	update(data) { log("actor.update", data); Object.entries(data).forEach(([p, v]) => foundry.utils.setProperty(ACTOR, p, v)); Hooks.call("updateActor", ACTOR); }
};

const ACTOR2 = { ...ACTOR, id: "actor2", name: "Brisa, a Ladina" };

window.foundry = {
	utils: {
		getProperty(obj, path) { return path.split(".").reduce((o, k) => o?.[k], obj); },
		setProperty(obj, path, value) {
			const keys = path.split("."); const last = keys.pop();
			const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
			target[last] = value; return true;
		}
	}
};

const HOOKS = {};
window.Hooks = {
	once(name, fn) { (HOOKS[name] ??= []).push(fn); if (name === "init" || name === "ready") return; },
	on(name, fn) { (HOOKS[name] ??= []).push(fn); return Math.random(); },
	off() {},
	call(name, ...args) { (HOOKS[name] ?? []).forEach(f => f(...args)); },
	_fire(name, ...args) { this.call(name, ...args); }
};

const SETTINGS = {
	"t20-mobile.autoMobile": true,
	"t20-mobile.showDialogs": false,
	"t20-mobile.killCanvas": true,
	"tormenta20.UsageConfig": "default"
};

window.game = {
	system: { id: "tormenta20" },
	i18n: { localize: (k) => PT[k] ?? k },
	settings: {
		register() {},
		get(ns, key) { return SETTINGS[`${ns}.${key}`]; },
		set(ns, key, v) { SETTINGS[`${ns}.${key}`] = v; }
	},
	user: { character: ACTOR },
	actors: {
		_all: [ACTOR, ACTOR2],
		filter(fn) { return this._all.filter(fn); },
		get(id) { return this._all.find(a => a.id === id); }
	},
	messages: {
		contents: [
			{ id: "m1", content: "<div class='message-header'>Arandur</div><div>Teste de <b>Atletismo</b>: <span class='dice-total'>19</span></div>", renderHTML: null },
			{ id: "m2", content: "<div class='message-header'>Brisa</div><div>Dano: <span class='dice-total'>11</span></div>", renderHTML: null }
		]
	}
};

window.ui = { notifications: { error: (m) => console.error("[notif]", m), warn: (m) => console.warn("[notif]", m) } };
window.canvas = { app: { ticker: { started: true, stop() { this.started = false; log("canvas.stop", {}); }, start() { this.started = true; } } } };
window.CONFIG = {
	T20: {
		atributos: { for: "T20.AbilityStr", des: "T20.AbilityDex", con: "T20.AbilityCon", int: "T20.AbilityInt", sab: "T20.AbilityWis", car: "T20.AbilityCha" },
		atributosAbr: { for: "T20.AbilityStrAbbr", des: "T20.AbilityDexAbbr", con: "T20.AbilityConAbbr", int: "T20.AbilityIntAbbr", sab: "T20.AbilityWisAbbr", car: "T20.AbilityChaAbbr" }
	}
};
