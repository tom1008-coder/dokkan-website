// JS/detail.js

const params = new URLSearchParams(window.location.search);
const idRecherche = params.get("id");
const contentDiv = document.getElementById("content");
const loadingDiv = document.getElementById("loading");
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

let currentPersoGlobal = null; 
let linksDataGlobal = null; 
let isLevel10Global = false; 
let currentFormeGlobal = 'base';
let currentStatLevelGlobal = 'd4';
let currentAwakeningGlobal = 'base'; // 'base', 'ztur', 'seza'

function safeParse(data) {
    if (!data) return null;
    if (typeof data === 'object') return data; 
    if (typeof data === 'string') { try { return JSON.parse(data); } catch (e) { return data; } }
    return data;
}

function getContent(rawData, forme, field = 'effet') {
    const data = safeParse(rawData);
    if (!data) return "";

    let content = null;
    if (Array.isArray(data)) {
        content = data; 
    } else {
        content = data[forme] || data.base || data; 
    }

    if (!content) return "";

    if (Array.isArray(content)) {
        const titleLine = content.find(line => typeof line === 'string' && line.trim().startsWith('[') && line.trim().endsWith(']'));
        
        if (field === 'nom') {
            return titleLine ? titleLine.slice(1, -1) : "";
        } else {
            return content.filter(line => line !== titleLine).join("\n");
        }
    } 
    else if (typeof content === 'object') {
        if (field === 'nom') return content.nom || "";
        return content.effet || "";
    } 
    else if (typeof content === 'string') {
        return content;
    }

    return "";
}

function getStatVal(rawStats, level, key) {
    const data = safeParse(rawStats);
    if (!data) return "---";
    let statsSource = data;
    if (data.base && !data.d0) statsSource = data[currentFormeGlobal] || data.base;
    if (!statsSource || !statsSource[level]) return "---";
    return statsSource[level][key] || "---";
}

async function chargerDetail() {
    if (!idRecherche) { loadingDiv.innerHTML = "<p class='text-danger'>Aucun ID.</p>"; return; }

    try {
        const { data: persoData, error } = await supabase.from('characters').select('*').eq('id', idRecherche).single();
        if (error || !persoData) { console.error(error); loadingDiv.innerHTML = "<p class='text-danger'>Introuvable.</p>"; return; }
        currentPersoGlobal = persoData;

        const { data: allData } = await supabase.from('characters').select('id, nom, liens');
        const allPersos = allData || [];

        const imgEl = document.getElementById("detail-img");
        if(imgEl) {
            const t = currentPersoGlobal.type ? currentPersoGlobal.type.toUpperCase() : "AGI";
            const colors = { INT: "#6f42c1", PUI: "#dc3545", STR: "#dc3545", AGI: "#0d6efd", AGL: "#0d6efd", TEC: "#198754", TEQ: "#198754", END: "#ffc107", PHY: "#ffc107" };
            imgEl.style.border = `4px solid ${colors[t] || "#6c757d"}`;
        }

        try { const res = await fetch("links.json"); linksDataGlobal = await res.json(); } catch (e) { linksDataGlobal = {}; }

        document.getElementById("detail-type").innerText = currentPersoGlobal.type;
        document.getElementById("detail-classe").innerText = currentPersoGlobal.classe;
        
        const divEveil = document.getElementById("awakening-controls");
        
        // Vérifie si le perso a un éveil (ZTUR, SEZA ou ZLR)
        if (currentPersoGlobal.ztur || currentPersoGlobal.seza || currentPersoGlobal.zlr) {
            divEveil.classList.remove("d-none");
            
            const btnZ = document.getElementById("btn-mode-ztur");

            // Gestion du bouton Z-TUR / Z-LR
            if (!currentPersoGlobal.ztur && !currentPersoGlobal.zlr) {
                // Si ni l'un ni l'autre, on cache le bouton
                btnZ.style.display = 'none';
            } else {
                // MODIFICATION ICI : Changement du texte selon le type
                if (currentPersoGlobal.zlr) {
                    btnZ.innerText = "Z-LR";
                } else {
                    btnZ.innerText = "Z-TUR";
                }
            }
            
            // Gestion du bouton SEZA
            if (!currentPersoGlobal.seza) {
                document.getElementById("btn-mode-seza").style.display = 'none';
            }
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return d.toLocaleDateString("fr-FR");
        };
        const dJap = formatDate(currentPersoGlobal.date_jap);
        const dGlb = formatDate(currentPersoGlobal.date_glb);
        const dZ = formatDate(currentPersoGlobal.date_z);
        const dSeza = formatDate(currentPersoGlobal.date_seza);

        if (dJap || dGlb || dZ || dSeza) {
            document.getElementById("dates-section").style.display = "block";
            if (dJap) { document.getElementById("date-jap-box").style.display = "block"; document.getElementById("date-jap").innerText = dJap; }
            if (dGlb) { document.getElementById("date-glb-box").style.display = "block"; document.getElementById("date-glb").innerText = dGlb; }
            if (dZ) { document.getElementById("date-z-box").style.display = "block"; document.getElementById("date-z").innerText = dZ; }
            if (dSeza) { document.getElementById("date-seza-box").style.display = "block"; document.getElementById("date-seza").innerText = dSeza; }
        }

        const areas = {
            transfo: document.getElementById("transfo-area"),
            revival: document.getElementById("revival-area"),
            echange: document.getElementById("echange-area"),
            fureur: document.getElementById("fureur-area")
        };
        Object.values(areas).forEach(el => el && el.classList.add("d-none"));
        if (currentPersoGlobal.transformation && areas.transfo) areas.transfo.classList.remove("d-none");
        if (currentPersoGlobal.revival && areas.revival) areas.revival.classList.remove("d-none");
        if (currentPersoGlobal.echange && areas.echange) areas.echange.classList.remove("d-none");
        if (currentPersoGlobal.fureur && areas.fureur) areas.fureur.classList.remove("d-none");

        changerForme('base');

        const badge = document.getElementById("detail-type");
        if (badge) badge.className = `badge fs-6 me-2 ${getTypeColor(currentPersoGlobal.type)}`;

        const divExtLinks = document.getElementById("external-links");
        if (divExtLinks) {
            divExtLinks.innerHTML = "";
            const ext = safeParse(currentPersoGlobal.liens_externes);
            if (ext) {
                if (ext.wiki) divExtLinks.innerHTML += `<a href="${ext.wiki}" target="_blank" class="btn-dokkan icon-link">Wiki</a>`;
                if (ext.youtube) divExtLinks.innerHTML += `<a href="${ext.youtube}" target="_blank" class="btn-dokkan icon-yt">Showcase</a>`;
            }
        }

        const switchBtn = document.getElementById("linkLevelSwitch");
        const switchLabel = document.getElementById("linkLevelLabel");
        if (switchBtn) {
            switchBtn.checked = false; 
            switchBtn.addEventListener("change", function () {
                isLevel10Global = this.checked;
                if(switchLabel) {
                    switchLabel.innerText = isLevel10Global ? "Niveau 10 (MAX)" : "Niveau 1";
                    switchLabel.style.color = isLevel10Global ? "#ffcc00" : "#fff";
                }
                updateLiensDisplay();
            });
        }

        const divCats = document.getElementById("detail-cats");
        if (divCats) {
            divCats.innerHTML = "";
            let cats = currentPersoGlobal.categories;
            if (typeof cats === 'string') {
                if (cats.startsWith('[')) { try { cats = JSON.parse(cats); } catch(e) {} }
                else { cats = cats.split(',').map(s => s.trim()); }
            }
            if (Array.isArray(cats)) cats.forEach((cat) => divCats.innerHTML += `<span class="badge-cat">${cat}</span>`);
        }

        afficherMeilleursPartenaires(currentPersoGlobal, allPersos);
        afficherMemeNom(currentPersoGlobal, allPersos);

        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";

    } catch (error) {
        console.error("Erreur chargement:", error);
        loadingDiv.innerHTML = "<p class='text-danger'>Erreur critique JS. Voir console.</p>";
    }
}

function changerEveil(mode) {
    currentAwakeningGlobal = mode;
    
    document.getElementById("btn-mode-base").className = mode==='base' ? "btn btn-light active" : "btn btn-outline-light";
    document.getElementById("btn-mode-ztur").className = mode==='ztur' ? "btn btn-warning active fw-bold" : "btn btn-outline-warning fw-bold";
    document.getElementById("btn-mode-seza").className = mode==='seza' ? "btn btn-info active fw-bold" : "btn btn-outline-info fw-bold";

    changerForme(currentFormeGlobal);
}

function changerForme(forme) {
    if (!currentPersoGlobal) return;
    currentFormeGlobal = forme;
    const p = currentPersoGlobal;
    const imgElement = document.getElementById("detail-img");

    let sourceData = p;
    let leaderText = p.leader_skill;

    if (currentAwakeningGlobal === 'ztur') {
        leaderText = p.leader_skill_ztur || leaderText;
        sourceData = {
            nom: p.nom,
            passif: p.passif_ztur || p.passif,
            spe: p.spe_ztur || p.spe,
            active_skill: p.active_skill_ztur || p.active_skill,
            liens: p.liens
        };
    } else if (currentAwakeningGlobal === 'seza') {
        leaderText = p.leader_skill_seza || leaderText;
        sourceData = {
            nom: p.nom,
            passif: p.passif_seza || p.passif,
            spe: p.spe_seza || p.spe,
            active_skill: p.active_skill_seza || p.active_skill,
            liens: p.liens
        };
    }

    document.getElementById("detail-leader").innerHTML = formaterTexteDokkan(leaderText);

    let suffixe = "";
    if (forme === 'transfo') suffixe = "_transfo";
    else if (forme === 'revival') suffixe = "_revival";
    else if (forme === 'echange') suffixe = "_echange";
    else if (forme === 'fureur') suffixe = "_fureur";

    const imgFull = `${BASE_IMG_URL}${p.id}_full${suffixe}.png`;
    const imgSimple = `${BASE_IMG_URL}${p.id}${suffixe}.png`;
    imgElement.src = imgFull;
    imgElement.onerror = function() { if (this.src !== imgSimple) this.src = imgSimple; };

    updateBtnStyles(forme);

    let nomAffiche = getContent(sourceData.nom, forme, 'nom'); 
    if(!nomAffiche || typeof nomAffiche === 'object') nomAffiche = "Nom Inconnu";
    document.getElementById("detail-nom").innerText = nomAffiche;

    const passifNom = getContent(sourceData.passif, forme, 'nom');
    const passifEffet = getContent(sourceData.passif, forme, 'effet');
    
    let htmlPassif = "";
    if (passifNom) htmlPassif += `<strong class="text-warning mb-1 d-block">${passifNom}</strong>`;
    
    htmlPassif += formaterTexteDokkan(passifEffet, passifNom);
    
    document.getElementById("detail-passif").innerHTML = htmlPassif;

    const speNom = getContent(sourceData.spe, forme, 'nom');
    const speEffet = getContent(sourceData.spe, forme, 'effet');
    afficherSpeEtUltime(sourceData.spe, forme, speNom, speEffet);

    afficherActiveSkill(sourceData.active_skill, forme);
    updateLiensDisplay();
    updateStatsDisplay();
}

function updateLiensDisplay() {
    const rawLiens = safeParse(currentPersoGlobal.liens);
    let liensListe = [];
    if (rawLiens) {
        if (Array.isArray(rawLiens)) liensListe = rawLiens;
        else if (rawLiens[currentFormeGlobal]) liensListe = rawLiens[currentFormeGlobal];
        else if (rawLiens.base) liensListe = rawLiens.base;
    }
    renderLiens(liensListe);
}

function updateStatsDisplay(levelKey, btnElement) {
    if (levelKey) currentStatLevelGlobal = levelKey; 
    else levelKey = currentStatLevelGlobal;
    const hp = getStatVal(currentPersoGlobal.stats, levelKey, 'hp');
    const atk = getStatVal(currentPersoGlobal.stats, levelKey, 'atk');
    const def = getStatVal(currentPersoGlobal.stats, levelKey, 'def');
    document.getElementById("detail-hp").innerText = hp;
    document.getElementById("detail-atk").innerText = atk;
    document.getElementById("detail-def").innerText = def;
    if (btnElement) {
        btnElement.parentElement.querySelectorAll(".btn").forEach((b) => b.classList.remove("active"));
        btnElement.classList.add("active");
    } else {
        const btns = document.querySelectorAll(".btn-group button[onclick^='updateStatsDisplay']");
        btns.forEach(btn => {
            btn.classList.remove("active");
            if (btn.getAttribute("onclick").includes(`'${levelKey}'`)) btn.classList.add("active");
        });
    }
}

function afficherSpeEtUltime(rawSpe, forme, nom, effet) {
    const colSpe = document.getElementById("col-spe");
    const colUlt = document.getElementById("col-ult");
    if (!colSpe || !colUlt) return;
    colUlt.style.display = "none";
    colSpe.className = "col-12"; 
    document.getElementById("detail-spe-nom").innerText = nom || "Attaque Spéciale";
    
    document.getElementById("detail-spe-desc").innerHTML = formaterTexteDokkan(effet || "Aucun effet.");
    
    const speObj = safeParse(rawSpe);
    let currentSpeObj = null;
    if(speObj) currentSpeObj = speObj[forme] || speObj.base;
    if (currentSpeObj && currentSpeObj.ultime && currentSpeObj.ultime.nom) {
        document.getElementById("detail-ult-nom").innerText = currentSpeObj.ultime.nom;
        document.getElementById("detail-ult-desc").innerHTML = formaterTexteDokkan(currentSpeObj.ultime.effet);
        colUlt.style.display = "block";
        colSpe.className = "col-md-6";
    }
}

function afficherActiveSkill(rawActive, forme) {
    const section = document.getElementById("active-skill-section");
    if (!section) return;
    const activeObj = safeParse(rawActive);
    let currentActive = null;
    if (activeObj) {
        currentActive = activeObj[forme] || activeObj.base;
        if (!currentActive && activeObj.nom) currentActive = activeObj;
    }
    if (currentActive && currentActive.nom) {
        document.getElementById("detail-active-nom").innerText = currentActive.nom;
        document.getElementById("detail-active-desc").innerHTML = formaterTexteDokkan(currentActive.effet || "");
        document.getElementById("detail-active-cond").innerText = currentActive.condition ? `Condition: ${currentActive.condition}` : "";
        section.style.display = "block";
    } else { section.style.display = "none"; }
}

function renderLiens(liste) {
    const div = document.getElementById("detail-liens");
    div.innerHTML = "";
    if (liste && Array.isArray(liste) && liste.length > 0) {
        liste.forEach(nom => {
            const info = linksDataGlobal ? linksDataGlobal[nom] : null;
            let desc = info ? (isLevel10Global ? info.lv10 : info.lv1) : "Effet inconnu";
            const cls = isLevel10Global ? "border-warning" : "";
            const txt = isLevel10Global ? "Nv 10" : "Nv 1";
            div.innerHTML += `<div class="link-container"><span class="badge-link ${cls}">${nom}</span><div class="link-tooltip"><strong class="text-warning">${txt}:</strong> ${desc}</div></div>`;
        });
    } else { div.innerHTML = "<span class='text-white small'>Aucun lien.</span>"; }
}

function updateBtnStyles(forme) {
    const setStyle = (base, alt, color) => {
        const bBase = document.getElementById(base);
        const bAlt = document.getElementById(alt);
        if(!bBase || !bAlt) return;
        bBase.classList.remove('active', 'btn-primary'); bBase.classList.add('btn-outline-primary');
        bAlt.classList.remove('active', 'btn-'+color); bAlt.classList.add('btn-outline-'+color);
        if (forme === 'base') { bBase.classList.add('active', 'btn-primary'); bBase.classList.remove('btn-outline-primary'); }
        else if (forme === 'transfo' && alt === 'btn-transfo') { bAlt.classList.add('active', 'btn-warning'); bAlt.classList.remove('btn-outline-warning'); }
        else if (forme === 'revival' && alt === 'btn-revival') { bAlt.classList.add('active', 'btn-info'); bAlt.classList.remove('btn-outline-info'); }
        else if (forme === 'echange' && alt === 'btn-echange') { bAlt.classList.add('active', 'btn-info'); bAlt.classList.remove('btn-outline-info'); }
        else if (forme === 'fureur' && alt === 'btn-fureur') { bAlt.classList.add('active', 'btn-danger'); bAlt.classList.remove('btn-outline-danger'); }
    };
    setStyle("btn-base", "btn-transfo", "warning");
    setStyle("btn-base-revival", "btn-revival", "info");
    setStyle("btn-base-echange", "btn-echange", "info");
    setStyle("btn-base-fureur", "btn-fureur", "danger");
}

function formaterTexteDokkan(texte, titreAExclure) {
    if (!texte) return "";
    let content = texte;
    if (Array.isArray(content)) {
        content = content.join("<br>");
    }
    if (titreAExclure && typeof content === 'string') {
        const safeTitre = titreAExclure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const titrePattern = new RegExp(`(\\[)?${safeTitre}(\\])?\\s*(<br>|,)?\\s*`, 'i');
        content = content.replace(titrePattern, "").trim();
    }
    if (typeof content === 'string' && !content.includes('<p>') && !content.includes('<span') && !content.includes('<div>')) {
        content = content.replace(/\n/g, "<br>");
    }
    return `<div class="dokkan-text">${content}</div>`;
}

function getTypeColor(t) {
    if(!t) return 'bg-secondary';
    t = t.toUpperCase();
    if(t.includes('PUI') || t.includes('STR')) return 'bg-danger';
    if(t.includes('AGI') || t.includes('AGL')) return 'bg-primary';
    if(t.includes('TEC') || t.includes('TEQ')) return 'bg-success';
    if(t.includes('INT')) return 'bg-int';
    if(t.includes('END') || t.includes('PHY')) return 'bg-warning text-dark';
    return 'bg-secondary';
}

function afficherMeilleursPartenaires(currentPerso, allPersos) {
    const container = document.getElementById("best-partners-list");
    if (!container) return;
    const getNomBaseClean = (p) => {
        let n = getContent(p.nom, 'base', 'nom');
        if(!n || typeof n !== 'string') n = "Inconnu";
        return n.split(" - ")[0].trim();
    };
    const nomBaseCurrent = getNomBaseClean(currentPerso);
    const rawLiens = safeParse(currentPerso.liens);
    let liensBasePerso = [];
    if(Array.isArray(rawLiens)) liensBasePerso = rawLiens;
    else if(rawLiens && rawLiens.base) liensBasePerso = rawLiens.base;
    const candidats = allPersos.filter((p) => p.id !== currentPerso.id && getNomBaseClean(p) !== nomBaseCurrent);
    const scores = candidats.map((candidat) => {
        const rawC = safeParse(candidat.liens);
        let liensC = [];
        if(Array.isArray(rawC)) liensC = rawC;
        else if(rawC && rawC.base) liensC = rawC.base;
        const liensCommuns = liensC.filter((l) => liensBasePerso.includes(l));
        return { ...candidat, nbLiensCommuns: liensCommuns.length };
    });
    scores.sort((a, b) => b.nbLiensCommuns - a.nbLiensCommuns);
    const top6 = scores.slice(0, 6);
    container.innerHTML = "";
    if (top6.length === 0) { container.innerHTML = "<span class='text-muted small'>Aucun partenaire trouvé.</span>"; return; }
    top6.forEach((p) => {
        const pNom = getContent(p.nom, 'base', 'nom');
        container.innerHTML += `<div class="position-relative text-center" style="width: 60px; cursor: pointer; overflow: visible;" onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}"><img src="${BASE_IMG_URL}${p.id}.png" class="rounded" style="width: 120%; height: 60px; object-fit: cover; margin-left: -10%;" onerror="this.src='https://placehold.co/60x60?text=?'"><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style="font-size: 0.7rem; z-index: 2;">${p.nbLiensCommuns}</span></div>`;
    });
}

function afficherMemeNom(currentPerso, allPersos) {
    const container = document.getElementById("same-name-list");
    if (!container) return;
    const getNomBaseClean = (p) => {
        let n = getContent(p.nom, 'base', 'nom');
        if(!n || typeof n !== 'string') n = "Inconnu";
        return n.split(" - ")[0].trim();
    };
    const nomBaseCurrent = getNomBaseClean(currentPerso);
    const matches = allPersos.filter((p) => p.id !== currentPerso.id && getNomBaseClean(p) === nomBaseCurrent);
    container.innerHTML = "";
    if (matches.length === 0) { container.innerHTML = "<span class='text-muted small'>Aucun autre personnage.</span>"; return; }
    matches.forEach((p) => {
        const pNom = getContent(p.nom, 'base', 'nom');
        container.innerHTML += `<div class="position-relative text-center" style="width: 60px; cursor: pointer; overflow: visible;" onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}"><img src="${BASE_IMG_URL}${p.id}.png" class="rounded" style="width: 120%; height: 60px; object-fit: cover; margin-left: -10%;" onerror="this.src='https://placehold.co/60x60?text=?'"></div>`;
    });
}

chargerDetail();