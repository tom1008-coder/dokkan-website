// JS/detail.js

const params = new URLSearchParams(window.location.search);
const idRecherche = params.get("id");
const contentDiv = document.getElementById("content");
const loadingDiv = document.getElementById("loading");

// URL DE BASE SUPABASE
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

// VARIABLES GLOBALES
let currentPersoGlobal = null;
let allPersosGlobal = [];
let linksDataGlobal = null;
let isLevel10Global = false;
let currentFormeGlobal = 'base';
let currentStatLevelGlobal = 'd4';
let currentAwakeningGlobal = 'base';

// Parseur JSON sécurisé
function safeParse(data) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') { try { return JSON.parse(data); } catch (e) { return data; } }
    return data;
}

// Fonction générique pour récupérer un contenu
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

// Formater une date ISO en format lisible (ex: "15 Janvier 2025 à 14h30")
function formatDateToLocal(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('fr-FR', options).replace(':', 'h');
}

async function chargerDetail() {
    if (!idRecherche) { loadingDiv.innerHTML = "<p class='text-danger'>Aucun ID fourni.</p>"; return; }

    try {
        const { data: persoData, error } = await supabase.from('characters').select('*').eq('id', idRecherche).single();
        if (error || !persoData) { console.error(error); loadingDiv.innerHTML = "<p class='text-danger'>Personnage introuvable.</p>"; return; }
        currentPersoGlobal = persoData;

        const { data: allData } = await supabase.from('characters').select('id, nom, liens');
        allPersosGlobal = allData || [];

        const imgEl = document.getElementById("detail-img");
        if (imgEl) {
            const t = currentPersoGlobal.type ? currentPersoGlobal.type.toUpperCase() : "AGI";
            const colors = { INT: "#6f42c1", PUI: "#dc3545", STR: "#dc3545", AGI: "#0d6efd", AGL: "#0d6efd", TEC: "#198754", TEQ: "#198754", END: "#ffc107", PHY: "#ffc107" };
            imgEl.style.border = `4px solid ${colors[t] || "#6c757d"}`;
        }

        try { const res = await fetch("links.json"); linksDataGlobal = await res.json(); } catch (e) { linksDataGlobal = {}; }

        document.getElementById("detail-type").innerText = currentPersoGlobal.type;
        document.getElementById("detail-classe").innerText = currentPersoGlobal.classe;

        // Gestion Boutons Eveil
        const divEveil = document.getElementById("awakening-controls");
        if (currentPersoGlobal.ztur || currentPersoGlobal.seza || currentPersoGlobal.zlr) {
            divEveil.classList.remove("d-none");
            const btnZ = document.getElementById("btn-mode-ztur");
            if (!currentPersoGlobal.ztur && !currentPersoGlobal.zlr) {
                btnZ.style.display = 'none';
            } else {
                btnZ.innerText = currentPersoGlobal.zlr ? "Z-LR" : "Z-TUR";
            }
            if (!currentPersoGlobal.seza) {
                document.getElementById("btn-mode-seza").style.display = 'none';
            }
        }

        // Formes
        const formsArea = document.getElementById("forms-area");
        ['btn-geant', 'btn-transfo', 'btn-revival', 'btn-echange', 'btn-fureur', 'btn-standby'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.add('d-none');
        });

        let hasForm = false;
        if (currentPersoGlobal.geant) { document.getElementById("btn-geant").classList.remove("d-none"); hasForm = true; }
        if (currentPersoGlobal.transformation) { document.getElementById("btn-transfo").classList.remove("d-none"); hasForm = true; }
        if (currentPersoGlobal.revival) { document.getElementById("btn-revival").classList.remove("d-none"); hasForm = true; }
        if (currentPersoGlobal.echange) { document.getElementById("btn-echange").classList.remove("d-none"); hasForm = true; }
        if (currentPersoGlobal.fureur) { document.getElementById("btn-fureur").classList.remove("d-none"); hasForm = true; }
        if (currentPersoGlobal.standby) { document.getElementById("btn-standby").classList.remove("d-none"); hasForm = true; }

        if (hasForm) formsArea.classList.remove("d-none");
        else formsArea.classList.add("d-none");

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
                if (switchLabel) {
                    switchLabel.innerText = isLevel10Global ? "Niveau 10 (MAX)" : "Niveau 1";
                    switchLabel.style.color = isLevel10Global ? "#ffcc00" : "#fff";
                }
                updateLiensDisplay();
            });
        }

        // Affichage Catégories
        const divCats = document.getElementById("detail-cats");
        if (divCats) {
            divCats.innerHTML = "";
            let cats = currentPersoGlobal.categories;
            if (typeof cats === 'string') {
                if (cats.startsWith('[')) { try { cats = JSON.parse(cats); } catch (e) { } }
                else { cats = cats.split(',').map(s => s.trim()); }
            }
            if (Array.isArray(cats)) {
                cats.forEach((cat) => {
                    divCats.innerHTML += `<a href="category.html?cat=${encodeURIComponent(cat)}" class="badge-cat text-decoration-none" style="cursor: pointer;">${cat}</a>`;
                });
            }
        }

        // --- AFFICHAGE DES DATES ET DE L'ÉVEIL ---
        const dateJap = formatDateToLocal(currentPersoGlobal.date_sortie_jap);
        const dateGlo = formatDateToLocal(currentPersoGlobal.date_sortie_glo);
        const dateEveilJap = formatDateToLocal(currentPersoGlobal.date_eveil_jap);
        const dateEveilGlo = formatDateToLocal(currentPersoGlobal.date_eveil_glo);
        
        if (dateJap || dateGlo || dateEveilJap || dateEveilGlo) {
            document.getElementById("dates-section").style.display = "block";
            
            // Colonne Japon (Rouge)
            if (dateJap || dateEveilJap) {
                document.getElementById("box-jap").style.display = "block";
                if (dateJap) {
                    document.getElementById("date-jap-container").style.display = "block";
                    document.getElementById("date-jap").innerText = dateJap;
                }
                if (dateEveilJap) {
                    document.getElementById("date-eveil-jap-container").style.display = "block";
                    document.getElementById("date-eveil-jap").innerText = dateEveilJap;
                }
            }

            // Colonne Globale (Bleu)
            if (dateGlo || dateEveilGlo) {
                document.getElementById("box-glo").style.display = "block";
                if (dateGlo) {
                    document.getElementById("date-glo-container").style.display = "block";
                    document.getElementById("date-glo").innerText = dateGlo;
                }
                if (dateEveilGlo) {
                    document.getElementById("date-eveil-glo-container").style.display = "block";
                    document.getElementById("date-eveil-glo").innerText = dateEveilGlo;
                }
            }
        }

        // --- AFFICHAGE DU PORTAIL ---
        const portailRaw = currentPersoGlobal.portail;
        if (portailRaw && portailRaw.trim() !== "") {
            document.getElementById("portail-section").style.display = "block";
            const portailContent = document.getElementById("portail-content");
            
            if (portailRaw.startsWith("http") && (portailRaw.includes("/storage/") || portailRaw.match(/\.(jpeg|jpg|gif|png|webp)$/i))) {
                portailContent.innerHTML = `<img src="${portailRaw}" class="portail-banner" alt="Bannière du portail">`;
            } else {
                portailContent.innerHTML = `<span class="badge bg-secondary fs-6 p-2 border border-light">${portailRaw}</span>`;
            }
        }

        afficherMemeNom(currentPersoGlobal, allPersosGlobal);

        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";

    } catch (error) {
        console.error("Erreur chargement:", error);
        loadingDiv.innerHTML = "<p class='text-danger'>Erreur critique JS. Voir console.</p>";
    }
}

function changerEveil(mode) {
    currentAwakeningGlobal = mode;

    document.getElementById("btn-mode-base").className = mode === 'base' ? "btn btn-light active" : "btn btn-outline-light";
    document.getElementById("btn-mode-ztur").className = mode === 'ztur' ? "btn btn-warning active fw-bold" : "btn btn-outline-warning fw-bold";
    document.getElementById("btn-mode-seza").className = mode === 'seza' ? "btn btn-info active fw-bold" : "btn btn-outline-info fw-bold";

    changerForme(currentFormeGlobal);
}

function changerForme(forme) {
    if (!currentPersoGlobal) return;
    currentFormeGlobal = forme;

    const p = { ...currentPersoGlobal };
    const imgElement = document.getElementById("detail-img");

    let sourceData = p;
    let leaderText = p.leader_skill;
    
    let finishData = null;

    if (currentAwakeningGlobal === 'ztur') {
        leaderText = p.leader_skill_ztur || leaderText;
        sourceData = {
            ...p,
            passif: p.passif_ztur || p.passif,
            spe: p.spe_ztur || p.spe,
            active_skill: p.active_skill_ztur || p.active_skill,
            spe_ex: p.spe_ex,
            standby: p.standby
        };
    } else if (currentAwakeningGlobal === 'seza') {
        leaderText = p.leader_skill_seza || leaderText;
        sourceData = {
            ...p,
            passif: p.passif_seza || p.passif,
            spe: p.spe_seza || p.spe,
            active_skill: p.active_skill_seza || p.active_skill,
            spe_ex: p.spe_ex,
            standby: p.standby
        };
    }

    if (forme === 'standby' && sourceData.standby) {
        const sb = sourceData.standby;
        let formPassif = sb.form?.passif || "Passif en cours...";
        let formNom = sb.form?.nom || "Mode Standby";

        let finish1 = sb.finish1 || (sb.finish ? sb.finish : null);
        let finish2 = sb.finish2 || null;

        let sSpe1 = sb.form?.spe1 || sb.form?.spe || null;
        let sSpe2 = sb.form?.spe2 || null;

        if (currentAwakeningGlobal === 'ztur' && p.standby_ztur) {
            if (p.standby_ztur.effet) formPassif = p.standby_ztur.effet;

            if (p.standby_ztur.finish1?.effet && finish1) {
                finish1 = { ...finish1, effet: p.standby_ztur.finish1.effet };
            }
            if (p.standby_ztur.finish2?.effet && finish2) {
                finish2 = { ...finish2, effet: p.standby_ztur.finish2.effet };
            }
        }

        const standbyData = {
            nom: { standby: formNom },
            passif: { standby: { nom: "PASSIF (Défense & Charge)", effet: formPassif } },
        };

        if (sSpe1 || sSpe2) {
            standbyData.spe = {
                standby: {
                    nom: sSpe1?.nom,
                    effet: sSpe1?.effet,
                    ultime: sSpe2 ? {
                        nom: sSpe2.nom,
                        effet: sSpe2.effet
                    } : null
                }
            };
        } else {
            standbyData.spe = null;
        }

        finishData = { f1: finish1, f2: finish2 };
        standbyData.active_skill = null;

        sourceData = { ...sourceData, ...standbyData };
    } else {
        finishData = null;
    }


    document.getElementById("detail-leader").innerHTML = formaterTexteDokkan(leaderText);

    let suffixe = "";
    if (forme === 'transfo') suffixe = "_transfo";
    else if (forme === 'revival') suffixe = "_revival";
    else if (forme === 'echange') suffixe = "_echange";
    else if (forme === 'fureur') suffixe = "_fureur";
    else if (forme === 'geant') suffixe = "_geant";
    else if (forme === 'standby') suffixe = "_standby";

    const imgFull = `${BASE_IMG_URL}${p.id}/${p.id}_full${suffixe}.png`;
    const imgSimple = `${BASE_IMG_URL}${p.id}/${p.id}${suffixe}.png`;

    imgElement.src = "";
    imgElement.src = imgFull;
    imgElement.onerror = function () {
        if (this.src !== imgSimple) this.src = imgSimple;
        else this.src = 'https://placehold.co/400x600?text=No+Image';
    };

    updateBtnStyles(forme);

    let nomAffiche = getContent(sourceData.nom, forme, 'nom');
    if (!nomAffiche || typeof nomAffiche === 'object') nomAffiche = p.nom?.base || "Nom Inconnu";
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

    afficherFinishSkills(finishData);

    let activeDataToDisplay = sourceData.active_skill;
    let isStandbyType = false;

    if (forme !== 'standby' && p.standby && p.standby.activation) {
        const normalActive = safeParse(sourceData.active_skill);
        let hasNormalActive = false;
        
        if (normalActive) {
            if (normalActive.base || normalActive.transfo) {
                if (normalActive[forme]) hasNormalActive = true;
            } else {
                if (forme === 'base') hasNormalActive = true;
            }
        }

        if (!hasNormalActive) {
            activeDataToDisplay = {
                [forme]: { nom: p.standby.activation?.nom, condition: p.standby.activation?.condition, effet: p.standby.activation?.effet },
                base: { nom: p.standby.activation?.nom, condition: p.standby.activation?.condition, effet: p.standby.activation?.effet }
            };
            isStandbyType = true;
        }
    }

    afficherActiveSkill(activeDataToDisplay, forme, isStandbyType);
    afficherSpeEx(sourceData.spe_ex, forme);

    updateLiensDisplay();
    updateStatsDisplay();
    afficherMeilleursPartenaires(currentPersoGlobal, allPersosGlobal);
}

function updateLiensDisplay() {
    const rawLiens = safeParse(currentPersoGlobal.liens);
    let liensListe = [];

    if (currentFormeGlobal === 'geant' || currentFormeGlobal === 'fureur') {
        liensListe = [];
    }
    else if (rawLiens) {
        if (Array.isArray(rawLiens)) {
            liensListe = rawLiens;
        }
        else if (rawLiens[currentFormeGlobal]) {
            liensListe = rawLiens[currentFormeGlobal];
        }
        else if (rawLiens.base) {
            liensListe = rawLiens.base;
        }
    }
    renderLiens(liensListe);
}

function updateStatsDisplay(levelKey, btnElement) {
    if (levelKey) currentStatLevelGlobal = levelKey;
    else levelKey = currentStatLevelGlobal;
    
    if(!currentPersoGlobal || !currentPersoGlobal.stats) return;

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

function afficherFinishSkills(finishData) {
    const section = document.getElementById("finish-skill-section");
    const col1 = document.getElementById("col-finish1");
    const col2 = document.getElementById("col-finish2");

    if (!section) return;

    if (!finishData || (!finishData.f1 && !finishData.f2)) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    let hasF1 = false;
    if (finishData.f1 && finishData.f1.nom && finishData.f1.nom.trim() !== "") {
        hasF1 = true;
        col1.style.display = "block";
        document.getElementById("detail-finish1-nom").innerText = finishData.f1.nom;
        
        let desc = formaterTexteDokkan(finishData.f1.effet || "Aucun effet.");
        if (finishData.f1.condition) {
            desc += `<div class="mt-2 pt-2 border-top border-secondary text-white-50 small fst-italic">Condition : ${finishData.f1.condition}</div>`;
        }
        document.getElementById("detail-finish1-desc").innerHTML = desc;
    } else {
        col1.style.display = "none";
    }

    let hasF2 = false;
    if (finishData.f2 && finishData.f2.nom && finishData.f2.nom.trim() !== "") {
        hasF2 = true;
        col2.style.display = "block";
        document.getElementById("detail-finish2-nom").innerText = finishData.f2.nom;
        
        let desc = formaterTexteDokkan(finishData.f2.effet || "Aucun effet.");
        if (finishData.f2.condition) {
            desc += `<div class="mt-2 pt-2 border-top border-secondary text-white-50 small fst-italic">Condition : ${finishData.f2.condition}</div>`;
        }
        document.getElementById("detail-finish2-desc").innerHTML = desc;
    } else {
        col2.style.display = "none";
    }

    if (hasF1 && hasF2) {
        col1.className = "col-md-6";
        col2.className = "col-md-6";
    } else {
        if (hasF1) col1.className = "col-12";
        if (hasF2) col2.className = "col-12";
    }
}

function afficherSpeEtUltime(rawSpe, forme, nom, effet) {
    const colSpe = document.getElementById("col-spe");
    const colUlt = document.getElementById("col-ult");
    const titleSpe = document.getElementById("title-spe");
    const badgeSpe = document.getElementById("badge-spe-ki");
    const titleUlt = document.getElementById("title-ult");
    const badgeUlt = document.getElementById("badge-ult-ki");
    
    if (!colSpe || !colUlt) return;

    titleSpe.innerText = "ATTAQUE SPÉCIALE";
    badgeSpe.innerText = "Ki 12";
    
    titleUlt.innerText = "ULTIME";
    badgeUlt.innerText = "Ki 18+";
    
    colSpe.style.display = "none";
    colUlt.style.display = "none";
    
    const speObj = safeParse(rawSpe);
    let currentSpeObj = null;
    if (speObj) {
        if (speObj[forme]) {
            currentSpeObj = speObj[forme];
        } else if (forme === 'base' || (speObj.base && forme !== 'geant' && forme !== 'fureur' && forme !== 'standby')) {
            currentSpeObj = speObj.base;
        }
    }

    let hasSpe = false;
    if (nom && nom.trim() !== "") {
        hasSpe = true;
        colSpe.style.display = "block";
        document.getElementById("detail-spe-nom").innerText = nom;
        
        let fullDesc = formaterTexteDokkan(effet || "Aucun effet.");
        if (currentSpeObj && currentSpeObj.condition) {
            fullDesc += `<div class="mt-2 pt-2 border-top border-secondary text-white-50 small fst-italic">Condition : ${currentSpeObj.condition}</div>`;
        }
        document.getElementById("detail-spe-desc").innerHTML = fullDesc;
    }

    let hasUlt = false;
    if (currentSpeObj && currentSpeObj.ultime && currentSpeObj.ultime.nom && currentSpeObj.ultime.nom.trim() !== "") {
        hasUlt = true;
        colUlt.style.display = "block";
        document.getElementById("detail-ult-nom").innerText = currentSpeObj.ultime.nom;
        
        let fullUltDesc = formaterTexteDokkan(currentSpeObj.ultime.effet);
        if (currentSpeObj.ultime.condition) {
            fullUltDesc += `<div class="mt-2 pt-2 border-top border-secondary text-white-50 small fst-italic">Condition : ${currentSpeObj.ultime.condition}</div>`;
        }
        document.getElementById("detail-ult-desc").innerHTML = fullUltDesc;
    }

    if (hasSpe && hasUlt) {
        colSpe.className = "col-md-6";
        colUlt.className = "col-md-6";
    } else {
        if (hasSpe) colSpe.className = "col-12";
        if (hasUlt) colUlt.className = "col-12";
    }
}

function afficherActiveSkill(rawActive, forme, isStandbyType = false) {
    const section = document.getElementById("active-skill-section");
    const box = document.getElementById("active-skill-box");
    const titleActive = document.getElementById("active-skill-title");
    if (!section) return;

    titleActive.innerText = "ACTIVE SKILL";
    titleActive.className = "fw-bold mb-2 text-active";
    box.className = "skill-box p-3 rounded bg-dark bg-opacity-50 border border-active";

    if (isStandbyType) {
        titleActive.innerText = "STANDBY SKILL (ACTIVATION)"; 
        titleActive.className = "fw-bold mb-2 text-standby";
        box.className = "skill-box p-3 rounded bg-dark bg-opacity-50 border border-standby";
    }

    const activeObj = safeParse(rawActive);
    let currentActive = null;

    if (activeObj) {
        if (forme === 'geant' || forme === 'fureur') {
            currentActive = null;
        } else {
            if (activeObj.base || activeObj.transfo || activeObj.standby) {
                currentActive = activeObj[forme];
            } else {
                if (forme === 'base' || isStandbyType) {
                    currentActive = activeObj;
                }
            }
        }
    }

    if (currentActive && currentActive.nom) {
        document.getElementById("detail-active-nom").innerText = currentActive.nom;
        document.getElementById("detail-active-desc").innerHTML = formaterTexteDokkan(currentActive.effet || "");
        document.getElementById("detail-active-cond").innerText = currentActive.condition ? `Condition: ${currentActive.condition}` : "";
        section.style.display = "block";
    } else {
        section.style.display = "none";
    }
}

function afficherSpeEx(rawEx, forme) {
    const section = document.getElementById("spe-ex-section");
    if (!section) return;

    const exObj = safeParse(rawEx);
    let currentEx = null;

    if (exObj) {
        if (exObj.base) {
            currentEx = exObj[forme];
            if (!currentEx && forme !== 'base') currentEx = null;
        } else {
            currentEx = exObj;
        }
    }

    if (currentEx && currentEx.nom) {
        document.getElementById("detail-spe-ex-nom").innerText = currentEx.nom;
        let desc = formaterTexteDokkan(currentEx.effet || "");

        let meta = "";
        if (currentEx.type) meta += `<span class="badge bg-secondary me-2">${currentEx.type === 'ultime' ? 'Remplace Ultime' : 'Remplace Spé'}</span>`;
        if (currentEx.condition) meta += `<span class="text-warning small fst-italic">${currentEx.condition}</span>`;

        if (meta) desc += `<div class="mt-2 pt-2 border-top border-secondary">${meta}</div>`;

        document.getElementById("detail-spe-ex-desc").innerHTML = desc;
        section.classList.remove("d-none");
    } else {
        section.classList.add("d-none");
    }
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
    } else {
        div.innerHTML = "<span class='text-white-50 small fst-italic'>Aucun lien actif sous cette forme.</span>";
    }
}

function updateBtnStyles(forme) {
    const mapBtns = {
        'base': { id: 'btn-base', color: 'primary' },
        'geant': { id: 'btn-geant', color: 'secondary' },
        'transfo': { id: 'btn-transfo', color: 'warning' },
        'revival': { id: 'btn-revival', color: 'success' },
        'echange': { id: 'btn-echange', color: 'info' },
        'fureur': { id: 'btn-fureur', color: 'danger' },
        'standby': { id: 'btn-standby', color: 'purple' }
    };

    Object.values(mapBtns).forEach(conf => {
        const btn = document.getElementById(conf.id);
        if (btn) {
            btn.classList.remove('active');
            if (conf.color !== 'purple') {
                btn.classList.remove(`btn-${conf.color}`);
                btn.classList.add(`btn-outline-${conf.color}`);
            } else {
                btn.classList.remove('btn-purple');
                btn.classList.add('btn-outline-purple');
                btn.style.backgroundColor = "transparent";
                btn.style.color = "#6f42c1";
                btn.style.borderColor = "#6f42c1";
            }
        }
    });

    if (mapBtns[forme]) {
        const activeBtn = document.getElementById(mapBtns[forme].id);
        if (activeBtn) {
            if (mapBtns[forme].color !== 'purple') {
                activeBtn.classList.remove(`btn-outline-${mapBtns[forme].color}`);
                activeBtn.classList.add(`btn-${mapBtns[forme].color}`);
            } else {
                activeBtn.style.backgroundColor = "#6f42c1";
                activeBtn.style.color = "white";
            }
            activeBtn.classList.add('active');
        }
    }
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
    if (!t) return 'bg-secondary';
    t = t.toUpperCase();
    if (t.includes('PUI') || t.includes('STR')) return 'bg-danger';
    if (t.includes('AGI') || t.includes('AGL')) return 'bg-primary';
    if (t.includes('TEC') || t.includes('TEQ')) return 'bg-success';
    if (t.includes('INT')) return 'bg-int';
    if (t.includes('END') || t.includes('PHY')) return 'bg-warning text-dark';
    return 'bg-secondary';
}

function afficherMeilleursPartenaires(currentPerso, allPersos) {
    const container = document.getElementById("best-partners-list");
    if (!container) return;

    if (currentFormeGlobal === 'geant' || currentFormeGlobal === 'fureur') {
        container.innerHTML = "<span class='text-white-50 small fst-italic'>Aucun partenaire (Mode Géant/Fureur).</span>";
        return;
    }

    const getNomBaseClean = (p) => {
        let n = getContent(p.nom, 'base', 'nom');
        if (!n || typeof n !== 'string') n = "Inconnu";
        return n.split(" - ")[0].trim();
    };

    const nomBaseCurrent = getNomBaseClean(currentPerso);
    const rawLiens = safeParse(currentPerso.liens);

    let liensBasePerso = [];
    if (Array.isArray(rawLiens)) {
        liensBasePerso = rawLiens;
    } else if (rawLiens && rawLiens[currentFormeGlobal]) {
        liensBasePerso = rawLiens[currentFormeGlobal];
    } else if (rawLiens && rawLiens.base) {
        liensBasePerso = rawLiens.base;
    }

    const candidats = allPersos.filter((p) => p.id !== currentPerso.id && getNomBaseClean(p) !== nomBaseCurrent);
    const scores = candidats.map((candidat) => {
        const rawC = safeParse(candidat.liens);
        let liensC = [];
        if (Array.isArray(rawC)) liensC = rawC;
        else if (rawC && rawC.base) liensC = rawC.base;

        const liensCommuns = liensC.filter((l) => liensBasePerso.includes(l));
        return { ...candidat, nbLiensCommuns: liensCommuns.length };
    });

    scores.sort((a, b) => b.nbLiensCommuns - a.nbLiensCommuns);
    const top6 = scores.slice(0, 6);

    container.innerHTML = "";
    if (top6.length === 0 || top6[0].nbLiensCommuns === 0) {
        container.innerHTML = "<span class='text-muted small'>Aucun partenaire trouvé.</span>";
        return;
    }

    top6.forEach((p) => {
        const pNom = getContent(p.nom, 'base', 'nom');
        container.innerHTML += `<div class="position-relative text-center" style="width: 60px; cursor: pointer; overflow: visible;" onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}"><img src="${BASE_IMG_URL}${p.id}/${p.id}.png" class="rounded" style="width: 120%; height: 60px; object-fit: cover; margin-left: -10%;" onerror="this.src='https://placehold.co/60x60?text=?'"><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style="font-size: 0.7rem; z-index: 2;">${p.nbLiensCommuns}</span></div>`;
    });
}

function afficherMemeNom(currentPerso, allPersos) {
    const container = document.getElementById("same-name-list");
    if (!container) return;
    const getNomBaseClean = (p) => {
        let n = getContent(p.nom, 'base', 'nom');
        if (!n || typeof n !== 'string') n = "Inconnu";
        return n.split(" - ")[0].trim();
    };
    const nomBaseCurrent = getNomBaseClean(currentPerso);
    const matches = allPersos.filter((p) => p.id !== currentPerso.id && getNomBaseClean(p) === nomBaseCurrent);
    container.innerHTML = "";
    if (matches.length === 0) { container.innerHTML = "<span class='text-muted small'>Aucun autre personnage.</span>"; return; }
    matches.forEach((p) => {
        const pNom = getContent(p.nom, 'base', 'nom');
        container.innerHTML += `<div class="position-relative text-center" style="width: 60px; cursor: pointer; overflow: visible;" onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}"><img src="${BASE_IMG_URL}${p.id}/${p.id}.png" class="rounded" style="width: 120%; height: 60px; object-fit: cover; margin-left: -10%;" onerror="this.src='https://placehold.co/60x60?text=?'"></div>`;
    });
}

chargerDetail();