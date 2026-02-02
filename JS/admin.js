// JS/admin.js

let tomSelectCats, tomSelectLinks, tomSelectEchangeLinks, tomSelectTransfoLinks, tomSelectSearch;
let currentEditId = null;

// INIT TINYMCE
function initTinyMCE(selector = '.rich-text') {
    if (tinymce.get() && tinymce.get().length > 0) {
        tinymce.get().forEach(ed => { if(ed.getBody().closest(selector)) ed.remove(); });
    }
    tinymce.init({
        selector: selector,
        height: 200,
        menubar: false,
        skin: 'oxide-dark', 
        content_css: 'dark',
        plugins: 'advlist autolink lists link charmap preview searchreplace visualblocks code fullscreen insertdatetime table help wordcount emoticons',
        toolbar: 'undo redo | forecolor backcolor | bold italic | alignleft aligncenter alignright | bullist numlist | emoticons | removeformat',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background-color: #151d2e; color: #fff; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #ffffff; opacity: 0.5; }'
    });
}

// LOGS
(function overrideConsole() {
    const logContainer = document.getElementById('live-console-logs');
    if (!logContainer) return;
    function appendLog(message, type='info') {
        const line = document.createElement('div');
        line.innerHTML = `<span style="color:#888;">[${new Date().toLocaleTimeString()}]</span> ${message}`;
        line.className = type==='error'?'log-error':(type==='success'?'log-success':'log-info');
        logContainer.appendChild(line);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    const oLog = console.log, oErr = console.error;
    console.log = function(...args) { oLog.apply(console,args); appendLog(args.map(a=>typeof a==='object'?JSON.stringify(a):a).join(' '),'info'); };
    console.error = function(...args) { oErr.apply(console,args); appendLog(args.map(a=>typeof a==='object'?JSON.stringify(a):a).join(' '),'error'); };
    window.logSuccess = function(msg) { console.log("SUCCESS: "+msg); if(logContainer.lastChild) logContainer.lastChild.className='log-success'; };
})();

// TOGGLE ACTIVE TABS (Ajouté)
window.switchActiveTab = function(tab) {
    const baseBlock = document.getElementById('active-base-block');
    const transfoBlock = document.getElementById('active-transfo-block');
    const btns = document.querySelectorAll('#section-active .btn');
    
    btns.forEach(b => {
        b.classList.remove('btn-danger', 'active');
        b.classList.add('btn-outline-danger');
    });
    
    // Le bouton cliqué devient actif
    const activeBtn = Array.from(btns).find(b => b.innerText.toLowerCase().includes(tab));
    if(activeBtn) {
        activeBtn.classList.remove('btn-outline-danger');
        activeBtn.classList.add('btn-danger', 'active');
    }

    if(tab === 'base') {
        baseBlock.classList.remove('d-none');
        transfoBlock.classList.add('d-none');
    } else {
        baseBlock.classList.add('d-none');
        transfoBlock.classList.remove('d-none');
        // Init tinymce si besoin
        initTinyMCE('#active-transfo-block .rich-text');
    }
};

// INIT TOM SELECT
async function initTomSelects() {
    const config = { create: true, createOnBlur: true, persist: false, plugins: ['remove_button','dropdown_input'], sortField: { field: "text", direction: "asc" } };
    tomSelectCats = new TomSelect("#char-cats", config);
    tomSelectLinks = new TomSelect("#char-links", config);
    tomSelectTransfoLinks = new TomSelect("#transfo-links", config);
    tomSelectEchangeLinks = new TomSelect("#echange-links", config);
    
    tomSelectSearch = new TomSelect("#search-char-edit", {
        valueField: 'id', labelField: 'name', searchField: ['name','id'], placeholder: "Rechercher...", maxItems: 1,
        render: { option: (d,e)=>`<div><b class="text-warning">${e(d.name)}</b> <small>(${e(d.id)})</small></div>`, item: (d,e)=>`<div>${e(d.name)}</div>` },
        onChange: (v) => { if(v) loadCharacterIntoForm(v); }
    });

    console.log("🔄 Chargement données DB...");
    const { data } = await supabase.from('characters').select('id, nom, categories');
    if(data) {
        let allCats = new Set();
        data.forEach(c => {
            let n = c.id; if(c.nom) n = (typeof c.nom==='string')?c.nom:c.nom.base;
            tomSelectSearch.addOption({id:c.id, name:n});
            if(c.categories) {
                let cats = c.categories;
                if(typeof cats==='string' && cats.startsWith('[')) try{cats=JSON.parse(cats)}catch(e){}
                if(Array.isArray(cats)) cats.forEach(x=>allCats.add(x));
            }
        });
        allCats.forEach(x=>tomSelectCats.addOption({value:x, text:x}));
        console.log(`✅ ${allCats.size} Catégories chargées.`);
    }

    try {
        const res = await fetch('links.json'); const json = await res.json();
        const linkKeys = Object.keys(json);
        linkKeys.forEach(l => { 
            tomSelectLinks.addOption({value:l, text:l}); 
            tomSelectTransfoLinks.addOption({value:l, text:l});
            tomSelectEchangeLinks.addOption({value:l, text:l}); 
        });
        console.log(`✅ ${linkKeys.length} Liens chargés.`);
    } catch(e) { console.error("Erreur chargement liens :", e); }
}

// UI ELEMENTS
const els = {
    rarity: document.getElementById('char-rarity'),
    checkTransfo: document.getElementById('has-transfo'), 
    checkActive: document.getElementById('has-active'),
    checkRevival: document.getElementById('has-revival'), 
    checkFureur: document.getElementById('has-fureur'),
    checkGeant: document.getElementById('has-geant'),
    checkEchange: document.getElementById('has-echange'), 
    checkZtur: document.getElementById('has-ztur'), 
    checkZlr: document.getElementById('has-zlr'), 
    checkSeza: document.getElementById('has-seza'),
    checkSpeEx: document.getElementById('has-spe-ex'),
    
    secTransfo: document.getElementById('section-transfo'), 
    secEchange: document.getElementById('section-echange'),
    secActive: document.getElementById('section-active'),
    secRevival: document.getElementById('section-revival'), 
    secAutres: document.getElementById('section-autres'),
    secZtur: document.getElementById('section-ztur'), 
    secSeza: document.getElementById('section-seza'),
    secSpeEx: document.getElementById('section-spe-ex'),
    
    blockZturActive: document.getElementById('ztur-active-block'),
    blockSezaActive: document.getElementById('seza-active-block'),
    
    lrFields: document.querySelectorAll('.lr-field')
};

function updateUI() {
    if(!els.rarity) return;
    const isLR = els.rarity.value === 'LR';
    document.querySelectorAll('.lr-field').forEach(el => isLR ? el.classList.remove('d-none') : el.classList.add('d-none'));

    const toggle = (shouldShow, sec) => {
        if(shouldShow && sec) {
            sec.classList.remove('d-none');
            setTimeout(() => {
                const textareas = sec.querySelectorAll('textarea.rich-text');
                if(textareas.length > 0) {
                    let needsInit = false;
                    textareas.forEach(ta => { if(!tinymce.get(ta.id)) needsInit = true; });
                    if(needsInit) initTinyMCE(`#${sec.id} .rich-text`);
                }
            }, 50);
        } else if(sec) { sec.classList.add('d-none'); }
    };

    toggle(els.checkTransfo.checked, els.secTransfo);
    toggle(els.checkEchange.checked, els.secEchange);
    toggle(els.checkActive.checked, els.secActive);
    toggle(els.checkRevival.checked, els.secRevival); 
    
    const showZ = els.checkZtur.checked || els.checkZlr.checked;
    toggle(showZ, els.secZtur);
    toggle(els.checkActive.checked, els.blockZturActive);
    
    toggle(els.checkSeza.checked, els.secSeza);
    toggle(els.checkActive.checked, els.blockSezaActive);
    
    toggle(els.checkSpeEx.checked, els.secSpeEx);

    const hasFureur = els.checkFureur.checked;
    const hasGeant = els.checkGeant.checked;

    // GESTION BLOC GÉANT Z-TUR
    const geantZturFields = document.querySelectorAll('.geant-ztur-field');
    geantZturFields.forEach(div => {
        if(showZ && hasGeant) div.classList.remove('d-none');
        else div.classList.add('d-none');
    });

    if(hasFureur || hasGeant) {
        els.secAutres.classList.remove('d-none');
        
        const blockFureur = document.getElementById('block-fureur');
        if(hasFureur) {
            blockFureur.classList.remove('d-none');
            if(!document.getElementById('fureur-passif-nom')) {
                const fureurHTML = `
                    <div class="row g-3 mt-2 border-top border-secondary pt-3">
                        <div class="col-md-6">
                            <label class="text-danger">Passif Fureur</label>
                            <input type="text" id="fureur-passif-nom" class="form-control mb-2" placeholder="Nom Passif Fureur">
                            <textarea id="fureur-passif-effet" class="form-control rich-text" rows="3"></textarea>
                        </div>
                        <div class="col-md-6">
                            <label class="text-danger">Spéciale Fureur</label>
                            <input type="text" id="fureur-spe-nom" class="form-control mb-2" placeholder="Nom Spé Fureur">
                            <textarea id="fureur-spe-effet" class="form-control rich-text" rows="3"></textarea>
                        </div>
                    </div>
                `;
                blockFureur.insertAdjacentHTML('beforeend', fureurHTML);
                initTinyMCE('#section-autres .rich-text');
            }
        } else { blockFureur.classList.add('d-none'); }

        const blockGeant = document.getElementById('block-geant');
        if(hasGeant) {
            blockGeant.classList.remove('d-none');
            if(!document.getElementById('geant-passif-nom')) {
                const geantHTML = `
                    <div class="row g-3 mt-2 border-top border-secondary pt-3">
                        <div class="col-md-6">
                            <label class="text-secondary fw-bold">Passif Mode Géant</label>
                            <input type="text" id="geant-passif-nom" class="form-control mb-2" placeholder="Nom Passif Géant">
                            <textarea id="geant-passif-effet" class="form-control rich-text" rows="3"></textarea>
                        </div>
                        <div class="col-md-6">
                            <div class="p-2 border border-secondary rounded mb-2">
                                <label class="text-secondary fw-bold">Spéciale Mode Géant</label>
                                <input type="text" id="geant-spe-nom" class="form-control mb-2" placeholder="Nom Spé Géant">
                                <textarea id="geant-spe-effet" class="form-control rich-text" rows="2"></textarea>
                            </div>
                            <div class="lr-field ${isLR ? '' : 'd-none'} p-2 border border-warning rounded">
                                <label class="text-warning fw-bold">Ultime Mode Géant (LR)</label>
                                <input type="text" id="geant-ult-nom" class="form-control mb-2" placeholder="Nom Ultime Géant">
                                <textarea id="geant-ult-effet" class="form-control rich-text" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                `;
                blockGeant.insertAdjacentHTML('beforeend', geantHTML);
                initTinyMCE('#section-autres .rich-text');
            } else {
                const geantUltBox = blockGeant.querySelector('.lr-field');
                if(geantUltBox) {
                    if(isLR) geantUltBox.classList.remove('d-none');
                    else geantUltBox.classList.add('d-none');
                }
            }
        } else { blockGeant.classList.add('d-none'); }

    } else { els.secAutres.classList.add('d-none'); }

    const hasTransfo = els.checkTransfo.checked;
    document.querySelectorAll('.transfo-field').forEach(div => {
        if(hasTransfo) div.classList.remove('d-none');
        else div.classList.add('d-none');
    });

    const hasZLR = els.checkZlr.checked;
    document.querySelectorAll('.zlr-field').forEach(div => {
        if(hasZLR) div.classList.remove('d-none');
        else div.classList.add('d-none');
    });

    const hasEchange = els.checkEchange.checked;
    document.querySelectorAll('.echange-field').forEach(div => {
        if(hasEchange) div.classList.remove('d-none');
        else div.classList.add('d-none');
    });
}

if(els.rarity) {
    [els.rarity, els.checkTransfo, els.checkActive, els.checkRevival, els.checkFureur, els.checkGeant, els.checkEchange, els.checkZtur, els.checkZlr, els.checkSeza, els.checkSpeEx]
    .forEach(el => el && el.addEventListener('change', updateUI));
}

window.calculerStatsAuto = function() {
    const getVal = (id) => parseInt(document.getElementById(id).value)||0;
    const h0=getVal('hp-d0'), a0=getVal('atk-d0'), d0=getVal('def-d0');
    const h4=getVal('hp-d4'), a4=getVal('atk-d4'), d4=getVal('def-d4');
    if(!h0||!h4) return console.error("PV manquant");
    const c = (mi,ma,p) => Math.round(mi+(ma-mi)*p);
    [1,2,3].forEach(i => {
        const p = i===1?0.4:(i===2?0.6:0.8);
        document.getElementById(`hp-d${i}`).value = c(h0,h4,p);
        document.getElementById(`atk-d${i}`).value = c(a0,a4,p);
        document.getElementById(`def-d${i}`).value = c(d0,d4,p);
    });
};

// LOAD
async function loadCharacterIntoForm(id) {
    console.log("📥 Chargement : " + id);
    const { data, error } = await supabase.from('characters').select('*').eq('id', id).single();
    if(error||!data) return;

    currentEditId = id;
    document.getElementById('btn-submit').innerText = "MODIFIER";
    document.getElementById('btn-submit').className = "btn btn-success btn-lg fw-bold text-dark py-3";

    const formatForEditor = (val) => {
        if(!val) return "";
        if(typeof val !== 'string') return "";
        if(val.trim().startsWith('<') || val.includes('<p>') || val.includes('<div>')) return val;
        return val.replace(/\n/g, '<br>');
    };

    const setVal = (eid, val) => {
        const el = document.getElementById(eid);
        if(el) {
            el.value = val||"";
            if(tinymce.get(eid)) {
                tinymce.get(eid).setContent(formatForEditor(val||""));
            }
        }
    };
    const setCheck = (eid, val) => { const el = document.getElementById(eid); if(el) el.checked = !!val; };

    setVal('char-id', data.id);
    setVal('char-rarity', data.tag||'UR');
    setVal('char-type', data.type);
    setVal('char-class', data.classe);

    setCheck('has-transfo', data.transformation);
    setCheck('has-echange', data.echange);
    setCheck('has-active', data.active_skill && data.active_skill!==null);
    setCheck('has-fureur', data.fureur);
    setCheck('has-geant', data.geant);
    setCheck('has-revival', data.revival);
    setCheck('has-ztur', data.ztur);
    setCheck('has-zlr', data.zlr);
    setCheck('has-seza', data.seza);
    
    updateUI(); 

    setTimeout(() => {
        if(data.stats) {
            let s = data.stats.base ? data.stats.base : data.stats;
            ['d0','d1','d2','d3','d4'].forEach(l => { if(s[l]) { setVal(`hp-${l}`, s[l].hp); setVal(`atk-${l}`, s[l].atk); setVal(`def-${l}`, s[l].def); }});
        }
        setVal('char-leader', data.leader_skill);

        if(data.categories) {
            let c = data.categories;
            if(typeof c==='string' && c.startsWith('[')) try{c=JSON.parse(c)}catch(e){}
            tomSelectCats.setValue(c);
        }
        if(data.liens) {
            let l = data.liens;
            if(typeof l==='string') try{l=JSON.parse(l)}catch(e){}
            if(Array.isArray(l)) tomSelectLinks.setValue(l);
            else { 
                if(l.base) tomSelectLinks.setValue(l.base); 
                if(l.transfo) tomSelectTransfoLinks.setValue(l.transfo); 
                if(l.echange) tomSelectEchangeLinks.setValue(l.echange); 
            }
        }

        const parseP = (arr) => {
            if(!arr) return {nom:"", effet:""};
            if(!Array.isArray(arr) && typeof arr === 'object') return {nom: arr.nom, effet: arr.effet};
            if(Array.isArray(arr)) {
                let n="", e="";
                arr.forEach(li => { 
                    if(li.startsWith('[')&&li.endsWith(']')) n=li.slice(1,-1); 
                    else e+=li+"<br>"; 
                });
                return {nom:n, effet:e.trim()};
            }
            return {nom:"", effet:""};
        };

        if(data.nom) {
            setVal('base-nom', data.nom.base);
            setVal('transfo-nom', data.nom.transfo);
            setVal('echange-nom', data.nom.echange);
            setVal('fureur-nom', data.nom.fureur);
            setVal('geant-nom', data.nom.geant);
            setVal('revival-nom', data.nom.revival);
        }

        if(data.passif) {
            let pb = parseP(data.passif.base);
            setVal('base-passif-nom', pb.nom); setVal('base-passif-effet', pb.effet);
            if(data.passif.transfo) { let pt = parseP(data.passif.transfo); setVal('transfo-passif-nom', pt.nom); setVal('transfo-passif-effet', pt.effet); }
            if(data.passif.echange) { let pe = parseP(data.passif.echange); setVal('echange-passif-nom', pe.nom); setVal('echange-passif-effet', pe.effet); }
            if(data.passif.revival) {
                let pr = parseP(data.passif.revival);
                setVal('revival-passif-nom', pr.nom);
                setVal('revival-passif-effet', pr.effet);
                if(data.passif.revival.condition) setVal('revival-condition', data.passif.revival.condition);
            }
            if(data.passif.fureur) {
                let pf = parseP(data.passif.fureur);
                setVal('fureur-passif-nom', pf.nom); setVal('fureur-passif-effet', pf.effet);
            }
            if(data.passif.geant) {
                let pg = parseP(data.passif.geant);
                setVal('geant-passif-nom', pg.nom); setVal('geant-passif-effet', pg.effet);
            }
        }

        if(data.spe) {
            if(data.spe.base) { setVal('base-spe-nom', data.spe.base.nom); setVal('base-spe-effet', data.spe.base.effet); if(data.spe.base.ultime) { setVal('base-ult-nom', data.spe.base.ultime.nom); setVal('base-ult-effet', data.spe.base.ultime.effet); } }
            if(data.spe.transfo) { setVal('transfo-spe-nom', data.spe.transfo.nom); setVal('transfo-spe-effet', data.spe.transfo.effet); if(data.spe.transfo.ultime) { setVal('transfo-ult-nom', data.spe.transfo.ultime.nom); setVal('transfo-ult-effet', data.spe.transfo.ultime.effet); } }
            if(data.spe.echange) { setVal('echange-spe-nom', data.spe.echange.nom); setVal('echange-spe-effet', data.spe.echange.effet); if(data.spe.echange.ultime) { setVal('echange-ult-nom', data.spe.echange.ultime.nom); setVal('echange-ult-effet', data.spe.echange.ultime.effet); } }
            if(data.spe.revival) { 
                setVal('revival-spe-nom', data.spe.revival.nom); 
                setVal('revival-spe-effet', data.spe.revival.effet); 
                if(data.spe.revival.ultime) {
                    setVal('revival-ult-nom', data.spe.revival.ultime.nom);
                    setVal('revival-ult-effet', data.spe.revival.ultime.effet);
                }
            }
            if(data.spe.fureur) { setVal('fureur-spe-nom', data.spe.fureur.nom); setVal('fureur-spe-effet', data.spe.fureur.effet); }
            if(data.spe.geant) { 
                setVal('geant-spe-nom', data.spe.geant.nom); 
                setVal('geant-spe-effet', data.spe.geant.effet); 
                if(data.spe.geant.ultime) {
                    setVal('geant-ult-nom', data.spe.geant.ultime.nom);
                    setVal('geant-ult-effet', data.spe.geant.ultime.effet);
                }
            }
        }

        setCheck('has-spe-ex', data.spe_ex);
        if(data.spe_ex) {
            if(data.spe_ex.base) { setVal('spe-ex-nom', data.spe_ex.base.nom); setVal('spe-ex-effet', data.spe_ex.base.effet); }
            if(data.spe_ex.transfo) { setVal('spe-ex-transfo-nom', data.spe_ex.transfo.nom); setVal('spe-ex-transfo-effet', data.spe_ex.transfo.effet); }
            if(data.spe_ex.echange) { setVal('spe-ex-echange-nom', data.spe_ex.echange.nom); setVal('spe-ex-echange-effet', data.spe_ex.echange.effet); }
        }

        setVal('ztur-leader', data.leader_skill_ztur);
        if(data.passif_ztur) { 
            let pz = parseP(data.passif_ztur.base); setVal('ztur-passif-nom', pz.nom); setVal('ztur-passif-effet', pz.effet); 
            let pzt = parseP(data.passif_ztur.transfo); 
            setVal('ztur-passif-transfo-nom', pzt.nom);
            setVal('ztur-passif-transfo', pzt.effet); 
            if(data.passif_ztur.echange) {
                let pez = parseP(data.passif_ztur.echange);
                setVal('ztur-passif-echange-nom', pez.nom);
                setVal('ztur-passif-echange', pez.effet);
            }
        }
        if(data.spe_ztur) { 
            if(data.spe_ztur.base) {
                setVal('ztur-spe-nom', data.spe_ztur.base.nom); 
                setVal('ztur-spe-effet', data.spe_ztur.base.effet);
                if(data.spe_ztur.base.ultime) {
                    setVal('ztur-ult-nom', data.spe_ztur.base.ultime.nom);
                    setVal('ztur-ult-effet', data.spe_ztur.base.ultime.effet);
                }
            }
            if(data.spe_ztur.transfo) {
                setVal('ztur-spe-transfo-nom', data.spe_ztur.transfo.nom);
                setVal('ztur-spe-transfo', data.spe_ztur.transfo.effet);
                if(data.spe_ztur.transfo.ultime) {
                    setVal('ztur-ult-transfo-nom', data.spe_ztur.transfo.ultime.nom);
                    setVal('ztur-ult-transfo', data.spe_ztur.transfo.ultime.effet);
                }
            }
            if(data.spe_ztur.echange) {
                setVal('ztur-spe-echange-nom', data.spe_ztur.echange.nom);
                setVal('ztur-spe-echange', data.spe_ztur.echange.effet);
                if(data.spe_ztur.echange.ultime) {
                    setVal('ztur-ult-echange-nom', data.spe_ztur.echange.ultime.nom);
                    setVal('ztur-ult-echange', data.spe_ztur.echange.ultime.effet);
                }
            }
            if(data.spe_ztur.geant) {
                setVal('ztur-spe-geant-nom', data.spe_ztur.geant.nom);
                setVal('ztur-spe-geant-effet', data.spe_ztur.geant.effet);
                if(data.spe_ztur.geant.ultime) {
                    setVal('ztur-ult-geant-nom', data.spe_ztur.geant.ultime.nom);
                    setVal('ztur-ult-geant-effet', data.spe_ztur.geant.ultime.effet);
                }
            }
        }
        if(data.active_skill_ztur && data.active_skill_ztur.base) { setVal('ztur-active-nom', data.active_skill_ztur.base.nom); setVal('ztur-active-cond', data.active_skill_ztur.base.condition); setVal('ztur-active-effet', data.active_skill_ztur.base.effet); }

        setVal('seza-leader', data.leader_skill_seza);
        if(data.passif_seza) { 
            let ps = parseP(data.passif_seza.base); setVal('seza-passif-nom', ps.nom); setVal('seza-passif-effet', ps.effet); 
            let pst = parseP(data.passif_seza.transfo); setVal('seza-passif-transfo', pst.effet); 
        }
        if(data.spe_seza && data.spe_seza.base) { 
            setVal('seza-spe-nom', data.spe_seza.base.nom); setVal('seza-spe-effet', data.spe_seza.base.effet); 
            if(data.spe_seza.transfo) setVal('seza-spe-transfo', data.spe_seza.transfo.effet); 
        }
        if(data.active_skill_seza && data.active_skill_seza.base) { setVal('seza-active-nom', data.active_skill_seza.base.nom); setVal('seza-active-cond', data.active_skill_seza.base.condition); setVal('seza-active-effet', data.active_skill_seza.base.effet); }

        // GESTION ACTIVE SKILL (BASE ET TRANSFO)
        if(data.active_skill) {
            if(data.active_skill.base) {
                setVal('active-nom', data.active_skill.base.nom);
                setVal('active-cond', data.active_skill.base.condition);
                setVal('active-effet', data.active_skill.base.effet);
            }
            if(data.active_skill.transfo) {
                setVal('active-transfo-nom', data.active_skill.transfo.nom);
                setVal('active-transfo-cond', data.active_skill.transfo.condition);
                setVal('active-transfo-effet', data.active_skill.transfo.effet);
            }
        }

        if(data.liens_externes) { let e = data.liens_externes; if(typeof e==='string') try{e=JSON.parse(e)}catch(x){} setVal('ext-wiki', e.wiki); setVal('ext-yt', e.youtube); }
    }, 100);
    window.scrollTo(0,0);
}

document.getElementById('btn-reset-form').addEventListener('click', () => {
    currentEditId = null;
    document.getElementById('add-character-form').reset();
    tomSelectCats.clear(); tomSelectLinks.clear(); tomSelectEchangeLinks.clear(); tomSelectTransfoLinks.clear(); tomSelectSearch.clear();
    if(typeof tinymce !== 'undefined') tinymce.editors.forEach(ed => ed.setContent(''));
    document.getElementById('btn-submit').innerText = "ENREGISTRER";
    document.getElementById('btn-submit').className = "btn btn-warning btn-lg fw-bold text-dark py-3";
    updateUI();
});

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.app_metadata.role !== 'admin') { alert("Accès Admin requis."); window.location.href = "index.html"; return; }
    
    initTomSelects(); 
    initTinyMCE(); 
    updateUI();

    document.getElementById('add-character-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const mode = currentEditId ? "MODIFICATION" : "CRÉATION";
        console.log(`⏳ ${mode} en cours...`);

        const val = (id) => {
            const ed = tinymce.get(id);
            if(ed) return ed.getContent();
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };
        const has = (id) => document.getElementById(id).checked;

        const idChar = val('char-id');
        const rarity = val('char-rarity');
        const isLR = rarity === 'LR';

        const createContentObj = (nom, effet) => {
            if (!nom && (!effet || effet === "")) return null;
            return { nom: nom, effet: effet };
        };

        const nomJson = { 
            base: val('base-nom'), 
            transfo: has('has-transfo') ? val('transfo-nom') : null, 
            echange: has('has-echange') ? val('echange-nom') : null, 
            fureur: has('has-fureur') ? val('fureur-nom') : null, 
            geant: has('has-geant') ? val('geant-nom') : null,
            revival: has('has-revival') ? val('revival-nom') : null 
        };

        const passifJson = { 
            base: createContentObj(val('base-passif-nom'), val('base-passif-effet')), 
            transfo: has('has-transfo') ? createContentObj(val('transfo-passif-nom'), val('transfo-passif-effet')) : null, 
            echange: has('has-echange') ? createContentObj(val('echange-passif-nom'), val('echange-passif-effet')) : null,
            revival: has('has-revival') ? { 
                nom: val('revival-passif-nom'), 
                effet: val('revival-passif-effet'),
                condition: val('revival-condition')
            } : null,
            fureur: has('has-fureur') ? createContentObj(val('fureur-passif-nom'), val('fureur-passif-effet')) : null,
            geant: has('has-geant') ? createContentObj(val('geant-passif-nom'), val('geant-passif-effet')) : null
        };
        
        const zturPassif = { 
            base: createContentObj(val('ztur-passif-nom'), val('ztur-passif-effet')), 
            transfo: has('has-transfo') ? createContentObj(val('ztur-passif-transfo-nom'), val('ztur-passif-transfo')) : null,
            echange: has('has-echange') ? createContentObj(val('ztur-passif-echange-nom'), val('ztur-passif-echange')) : null
        };
        
        const zturSpe = { 
            base: { 
                nom: val('ztur-spe-nom'), 
                effet: val('ztur-spe-effet'),
                ultime: isLR ? { nom: val('ztur-ult-nom'), effet: val('ztur-ult-effet') } : undefined
            }, 
            transfo: has('has-transfo') ? { 
                nom: val('ztur-spe-transfo-nom'), 
                effet: val('ztur-spe-transfo'),
                ultime: isLR ? { nom: val('ztur-ult-transfo-nom'), effet: val('ztur-ult-transfo') } : undefined
            } : null,
            echange: has('has-echange') ? {
                nom: val('ztur-spe-echange-nom'),
                effet: val('ztur-spe-echange'),
                ultime: isLR ? { nom: val('ztur-ult-echange-nom'), effet: val('ztur-ult-echange') } : undefined
            } : null,
            geant: has('has-geant') ? {
                nom: val('ztur-spe-geant-nom'),
                effet: val('ztur-spe-geant-effet'),
                ultime: isLR ? { nom: val('ztur-ult-geant-nom'), effet: val('ztur-ult-geant-effet') } : undefined
            } : null
        };

        let zturActive = null; 
        if(val('ztur-active-nom')||val('ztur-active-effet')) {
            zturActive = { 
                base: {
                    nom:val('ztur-active-nom'), 
                    condition:val('ztur-active-cond'), 
                    effet:val('ztur-active-effet')
                }, 
                transfo: null 
            };
        }

        const hasSpeEx = has('has-spe-ex');
        const speExJson = hasSpeEx ? {
            base: createContentObj(val('spe-ex-nom'), val('spe-ex-effet')),
            transfo: has('has-transfo') ? createContentObj(val('spe-ex-transfo-nom'), val('spe-ex-transfo-effet')) : null,
            echange: has('has-echange') ? createContentObj(val('spe-ex-echange-nom'), val('spe-ex-echange-effet')) : null
        } : null;

        const sezaPassif = { base: createContentObj(val('seza-passif-nom'), val('seza-passif-effet')), transfo: has('has-transfo') ? createContentObj(null, val('seza-passif-transfo')) : null };
        const sezaSpe = { base: { nom: val('seza-spe-nom'), effet: val('seza-spe-effet') }, transfo: has('has-transfo') ? { nom: null, effet: val('seza-spe-transfo') } : null };
        let sezaActive = null; if(val('seza-active-nom')||val('seza-active-effet')) sezaActive = { base: {nom:val('seza-active-nom'), condition:val('seza-active-cond'), effet:val('seza-active-effet')}, transfo:null };

        const getNum = (id) => parseInt(document.getElementById(id).value) || 0;
        const statsJson = {
            d0: { hp: getNum('hp-d0'), atk: getNum('atk-d0'), def: getNum('def-d0') },
            d1: { hp: getNum('hp-d1'), atk: getNum('atk-d1'), def: getNum('def-d1') },
            d2: { hp: getNum('hp-d2'), atk: getNum('atk-d2'), def: getNum('def-d2') },
            d3: { hp: getNum('hp-d3'), atk: getNum('atk-d3'), def: getNum('def-d3') },
            d4: { hp: getNum('hp-d4'), atk: getNum('atk-d4'), def: getNum('def-d4') }
        };

        const speJson = {
            base: { nom: val('base-spe-nom'), effet: val('base-spe-effet'), ultime: isLR ? { nom: val('base-ult-nom'), effet: val('base-ult-effet') } : undefined },
            transfo: has('has-transfo') ? { nom: val('transfo-spe-nom'), effet: val('transfo-spe-effet'), ultime: isLR ? { nom: val('transfo-ult-nom'), effet: val('transfo-ult-effet') } : undefined } : null,
            echange: has('has-echange') ? { nom: val('echange-spe-nom'), effet: val('echange-spe-effet'), ultime: isLR ? { nom: val('echange-ult-nom'), effet: val('echange-ult-effet') } : undefined } : null,
            revival: has('has-revival') ? { 
                nom: val('revival-spe-nom'), 
                effet: val('revival-spe-effet'),
                ultime: isLR ? { nom: val('revival-ult-nom'), effet: val('revival-ult-effet') } : undefined
            } : null,
            fureur: has('has-fureur') ? { 
                nom: val('fureur-spe-nom'), 
                effet: val('fureur-spe-effet') 
            } : null,
            geant: has('has-geant') ? { 
                nom: val('geant-spe-nom'), 
                effet: val('geant-spe-effet'),
                ultime: isLR ? { nom: val('geant-ult-nom'), effet: val('geant-ult-effet') } : undefined
            } : null
        };

        // GESTION ACTIVE SKILL (BASE ET TRANSFO)
        let activeJson = null; 
        if (has('has-active')) {
            activeJson = { 
                base: { 
                    nom: val('active-nom'), 
                    condition: val('active-cond'), 
                    effet: val('active-effet') 
                }, 
                // Si la case Transfo est cochée et que des infos sont saisies
                transfo: (has('has-transfo') && (val('active-transfo-nom') || val('active-transfo-effet'))) ? {
                    nom: val('active-transfo-nom'),
                    condition: val('active-transfo-cond'),
                    effet: val('active-transfo-effet')
                } : null,
                echange: null 
            };
        }

        const liensBase = tomSelectLinks.getValue();
        let liensTransfo = null;
        if(has('has-transfo')) {
            const valTransfo = tomSelectTransfoLinks.getValue();
            liensTransfo = valTransfo.length > 0 ? valTransfo : liensBase;
        }

        const payload = {
            id: idChar, type: val('char-type'), classe: val('char-class'), tag: rarity, 
            transformation: has('has-transfo'), fureur: has('has-fureur'), 
            geant: has('has-geant'), 
            revival: has('has-revival'), echange: has('has-echange'),
            ztur: has('has-ztur'), zlr: has('has-zlr'), seza: has('has-seza'),
            leader_skill: val('char-leader'),
            nom: nomJson, passif: passifJson, spe: speJson, active_skill: activeJson, 
            spe_ex: speExJson,
            stats: statsJson, 
            liens: { 
                base: liensBase, 
                transfo: liensTransfo, 
                echange: has('has-echange') ? (tomSelectEchangeLinks.getValue().length > 0 ? tomSelectEchangeLinks.getValue() : liensBase) : null 
            }, 
            categories: tomSelectCats.getValue(), liens_externes: { wiki: val('ext-wiki'), youtube: val('ext-yt') },
            leader_skill_ztur: val('ztur-leader'), passif_ztur: zturPassif, spe_ztur: zturSpe, active_skill_ztur: zturActive,
            leader_skill_seza: val('seza-leader'), passif_seza: sezaPassif, spe_seza: sezaSpe, active_skill_seza: sezaActive
        };

        try {
            let error;
            if (currentEditId) { 
                const res = await supabase.from('characters').update(payload).eq('id', currentEditId); 
                error = res.error; 
            } else { 
                const res = await supabase.from('characters').insert([payload]); 
                error = res.error; 
            }

            if (error) throw error;

            window.logSuccess(`✅ ${mode} RÉUSSIE pour : ${idChar}`);
            if (mode === "CRÉATION") document.getElementById('btn-reset-form').click();
            window.scrollTo(0,0);

        } catch (err) { 
            console.error("Erreur : " + err.message); 
            if (err.message.includes("duplicate key") || err.code === "23505") {
                alert("⛔ ERREUR : L'ID " + idChar + " existe déjà !");
            } else {
                alert("Erreur technique : " + err.message); 
            }
        }
    });

    // SYNCHRONISATION AUTOMATIQUE
    const syncFields = [
        { src: 'base-spe-nom', dest: 'ztur-spe-nom' },
        { src: 'base-ult-nom', dest: 'ztur-ult-nom' },
        { src: 'active-nom', dest: 'ztur-active-nom' },
        { src: 'transfo-spe-nom', dest: 'ztur-spe-transfo-nom' },
        { src: 'transfo-ult-nom', dest: 'ztur-ult-transfo-nom' },
        { src: 'echange-spe-nom', dest: 'ztur-spe-echange-nom' },
        { src: 'echange-ult-nom', dest: 'ztur-ult-echange-nom' },
        { src: 'transfo-passif-nom', dest: 'ztur-passif-transfo-nom' },
        { src: 'echange-passif-nom', dest: 'ztur-passif-echange-nom' }
    ];

    syncFields.forEach(pair => {
        const srcEl = document.getElementById(pair.src);
        const destEl = document.getElementById(pair.dest);
        
        if (srcEl && destEl) {
            srcEl.addEventListener('input', function() {
                destEl.value = this.value;
            });
        }
    });

});