// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
const params = new URLSearchParams(window.location.search);
const idRecherche = params.get("id");

const contentDiv = document.getElementById("content");
const loadingDiv = document.getElementById("loading");

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

let currentPersoGlobal = null; 
let linksDataGlobal = null; // Pour les définitions (lv1/lv10)
let isLevel10Global = false; // Pour garder en mémoire l'état du switch
let currentFormeGlobal = 'base'; // <--- NOUVEAU : On stocke la forme active ici

// ============================================================
// 2. FONCTION PRINCIPALE DE CHARGEMENT (Supabase)
// ============================================================
async function chargerDetail() {
    if (!idRecherche) {
        loadingDiv.innerHTML = "<p class='text-danger'>Aucun personnage sélectionné.</p>";
        return;
    }

    try {
        // 1. Récupérer le personnage depuis Supabase
        const { data: persoData, error: errPerso } = await supabase
            .from('characters')
            .select('*')
            .eq('id', idRecherche)
            .single();

        if (errPerso || !persoData) {
            console.error("Erreur Supabase (perso):", errPerso);
            loadingDiv.innerHTML = "<p class='text-danger'>Personnage introuvable ou erreur serveur.</p>";
            return;
        }

        currentPersoGlobal = persoData;

        // =========================================================
        // --- GESTION DE LA COULEUR DE BORDURE ---
        // =========================================================
        const imgElement = document.getElementById("detail-img");
        const type = currentPersoGlobal.type.toUpperCase();
        
        let colorCode = "#6c757d"; 
        if (type === 'INT') colorCode = "#6f42c1";        
        else if (type === 'PUI' || type === 'STR') colorCode = "#dc3545"; 
        else if (type === 'AGI' || type === 'AGL') colorCode = "#0d6efd"; 
        else if (type === 'TEC' || type === 'TEQ') colorCode = "#198754"; 
        else if (type === 'END' || type === 'PHY') colorCode = "#ffc107"; 

        imgElement.style.border = `4px solid ${colorCode}`;

        // 2. Récupérer TOUS les personnages (pour partenaires)
        const { data: allData, error: errAll } = await supabase.from('characters').select('*');
        if (errAll) throw errAll;
        const allPersos = allData || [];

        // 3. Récupérer les définitions des liens
        const responseLinks = await fetch("links.json");
        linksDataGlobal = await responseLinks.json();

        // --- Infos de base ---
        document.getElementById("detail-type").innerText = currentPersoGlobal.type;
        document.getElementById("detail-classe").innerText = currentPersoGlobal.classe;

        // --- GESTION DES BOUTONS (TRANSFO / REVIVAL / ECHANGE) ---
        const transfoArea = document.getElementById("transfo-area");
        const revivalArea = document.getElementById("revival-area");
        const echangeArea = document.getElementById("echange-area");

        if (transfoArea) transfoArea.classList.add("d-none");
        if (revivalArea) revivalArea.classList.add("d-none");
        if (echangeArea) echangeArea.classList.add("d-none");

        if (currentPersoGlobal.transformation) {
            if (transfoArea) transfoArea.classList.remove("d-none");
        } else if (currentPersoGlobal.revival) {
            if (revivalArea) revivalArea.classList.remove("d-none");
        } else if (currentPersoGlobal.echange) {
            if (echangeArea) echangeArea.classList.remove("d-none");
        }

        // --- INITIALISATION ---
        changerForme('base'); // Charge la base par défaut

        // Badge Type
        const badge = document.getElementById("detail-type");
        badge.className = `badge fs-6 me-2 ${getTypeColor(currentPersoGlobal.type)}`;

        // Stats défaut
        const defaultBtn = document.querySelector(".btn-group .btn:last-child");
        if (defaultBtn) updateStatsDisplay("d4", defaultBtn);
        else updateStatsDisplay("d4");

        // Liens externes
        const divExtLinks = document.getElementById("external-links");
        if (divExtLinks) {
            divExtLinks.innerHTML = "";
            if (currentPersoGlobal.liens_externes) {
                if (currentPersoGlobal.liens_externes.wiki)
                    divExtLinks.innerHTML += `<a href="${currentPersoGlobal.liens_externes.wiki}" target="_blank" class="btn-dokkan icon-link">Wiki</a>`;
                if (currentPersoGlobal.liens_externes.youtube)
                    divExtLinks.innerHTML += `<a href="${currentPersoGlobal.liens_externes.youtube}" target="_blank" class="btn-dokkan icon-yt">Showcase</a>`;
            }
        }

        // --- GESTION ROBUSTE DU SWITCH LEVEL 10 ---
        const switchBtn = document.getElementById("linkLevelSwitch");
        const switchLabel = document.getElementById("linkLevelLabel");
        
        if (switchBtn) {
            switchBtn.checked = false; // Reset au chargement
            switchBtn.addEventListener("change", function () {
                isLevel10Global = this.checked;
                switchLabel.innerText = isLevel10Global ? "Niveau 10 (MAX)" : "Niveau 1";
                switchLabel.style.color = isLevel10Global ? "#ffcc00" : "#fff";
                
                // UTILISATION DE LA VARIABLE GLOBALE AU LIEU DE LIRE LE DOM
                // Cela évite les bugs si le DOM n'est pas synchro
                const listeLiens = getLiensActuels(currentPersoGlobal, currentFormeGlobal);
                renderLiens(listeLiens);
            });
        }

        // Catégories
        const divCats = document.getElementById("detail-cats");
        if (divCats) {
            divCats.innerHTML = "";
            if (Array.isArray(currentPersoGlobal.categories))
                currentPersoGlobal.categories.forEach((cat) => {
                    divCats.innerHTML += `<span class="badge-cat">${cat}</span>`;
                });
            else divCats.innerHTML = "<span class='text-muted small'>Aucune catégorie.</span>";
        }

        // Leader & Active Skill
        document.getElementById("detail-leader").innerText = currentPersoGlobal.leader_skill || "Aucune.";

        const activeSection = document.getElementById("active-skill-section");
        if (currentPersoGlobal.active_skill) {
            document.getElementById("detail-active-nom").innerText = currentPersoGlobal.active_skill.nom || "Active Skill";
            document.getElementById("detail-active-desc").innerText = currentPersoGlobal.active_skill.effet || "Aucun effet décrit.";
            document.getElementById("detail-active-cond").innerText = "Condition : " + (currentPersoGlobal.active_skill.condition || "Aucune.");
            activeSection.style.display = "block";
        } else {
            activeSection.style.display = "none";
        }

        // Initialisation Ultime (sera mis à jour par changerForme)
        // ...

        // Partenaires & Même nom
        afficherMeilleursPartenaires(currentPersoGlobal, allPersos);
        afficherMemeNom(currentPersoGlobal, allPersos);

        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";
    } catch (error) {
        console.error("Erreur chargement:", error);
        loadingDiv.innerHTML = "<p class='text-danger'>Impossible de charger les données.</p>";
    }
}

// ============================================================
// 2bis. FONCTION UTILITAIRE POUR LES LIENS
// ============================================================
function getLiensActuels(perso, forme) {
    if (!perso || !perso.liens) return [];
    
    // Si liens est un tableau simple (pas de formes différentes)
    if (Array.isArray(perso.liens)) return perso.liens; 
    
    // Si liens est un objet, on cherche la clé correspondante
    if (forme === 'transfo' && perso.liens.transfo) return perso.liens.transfo;
    if (forme === 'revival' && perso.liens.revival) return perso.liens.revival;
    if (forme === 'echange' && perso.liens.echange) return perso.liens.echange;
    
    // Par défaut 'base'
    if (perso.liens.base) return perso.liens.base;
    
    return []; 
}

// ============================================================
// 3. AFFICHAGE DES LIENS
// ============================================================
function renderLiens(listeDesLiens) {
    const divLiens = document.getElementById("detail-liens");
    divLiens.innerHTML = "";

    if (listeDesLiens && Array.isArray(listeDesLiens) && listeDesLiens.length > 0) {
        listeDesLiens.forEach((lienNom) => {
            const linkInfo = linksDataGlobal ? linksDataGlobal[lienNom] : null;
            let description = "Effet inconnu";
            
            if (linkInfo) {
                description = isLevel10Global ? linkInfo.lv10 : linkInfo.lv1;
            } else {
                // Debug si le lien n'est pas trouvé dans le JSON
                console.warn(`Lien non trouvé dans links.json : ${lienNom}`);
            }

            const levelClass = isLevel10Global ? "border-warning" : "";
            const levelText = isLevel10Global ? "Nv 10" : "Nv 1";

            divLiens.innerHTML += `
                <div class="link-container">
                    <span class="badge-link ${levelClass}">${lienNom}</span>
                    <div class="link-tooltip">
                        <strong class="text-warning">${levelText} :</strong> ${description}
                    </div>
                </div>
            `;
        });
    } else {
        divLiens.innerHTML = "<span class='text-muted small'>Aucun lien disponible pour cette forme.</span>";
    }
}

// ============================================================
// 4. MEILLEURS PARTENAIRES 
// ============================================================
function afficherMeilleursPartenaires(currentPerso, allPersos) {
    const container = document.getElementById("best-partners-list");
    if (!container) return;

    const getNomBase = (p) => (typeof p.nom === 'object') ? p.nom.base.split(" - ")[0].trim() : p.nom.split(" - ")[0].trim();
    const nomBaseCurrent = getNomBase(currentPerso);

    const getLiensSafe = (liens) => {
        if (!liens) return [];
        if (Array.isArray(liens)) return liens; 
        if (liens.base) return liens.base;
        return [];
    };

    const liensBasePerso = getLiensSafe(currentPerso.liens);

    const candidats = allPersos.filter((p) => {
        return p.id !== currentPerso.id && getNomBase(p) !== nomBaseCurrent;
    });

    const scores = candidats.map((candidat) => {
        const liensCandidat = getLiensSafe(candidat.liens);
        const liensCommuns = liensCandidat.filter((l) => liensBasePerso.includes(l));
        return { ...candidat, nbLiensCommuns: liensCommuns.length };
    });

    scores.sort((a, b) => b.nbLiensCommuns - a.nbLiensCommuns);
    const top6 = scores.slice(0, 6);
    container.innerHTML = "";

    if (top6.length === 0) {
        container.innerHTML = "<span class='text-muted small'>Aucun partenaire trouvé.</span>";
        return;
    }

    top6.forEach((p) => {
        let borderClass = "border-secondary";
        if (p.type === "PUI") borderClass = "border-danger";
        else if (p.type === "AGI") borderClass = "border-primary";
        else if (p.type === "TEC") borderClass = "border-success";
        else if (p.type === "INT") borderClass = "border-info";
        else if (p.type === "END") borderClass = "border-warning";
        
        const pNom = (typeof p.nom === 'object') ? p.nom.base : p.nom;

        container.innerHTML += `
            <div class="position-relative text-center" style="width: 60px; cursor: pointer;" onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}">
                <img src="${BASE_IMG_URL}${p.id}.png" class="rounded border border-2 ${borderClass}" style="width: 100%; height: 60px; object-fit: cover; background-color: #222;"
                     onerror="this.src='https://placehold.co/60x60?text=?'">
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style="font-size: 0.7rem;">
                    ${p.nbLiensCommuns}
                </span>
            </div>
        `;
    });
}

// ============================================================
// 4bis. PERSONNAGES DE MÊME NOM
// ============================================================
function afficherMemeNom(currentPerso, allPersos) {
    const container = document.getElementById("same-name-list");
    if (!container) return;

    const getNomBase = (p) => (typeof p.nom === 'object') ? p.nom.base.split(" - ")[0].trim() : p.nom.split(" - ")[0].trim();
    const nomBaseCurrent = getNomBase(currentPerso);

    const matches = allPersos.filter((p) => {
        return p.id !== currentPerso.id && getNomBase(p) === nomBaseCurrent;
    });

    container.innerHTML = "";
    if (matches.length === 0) {
        container.innerHTML = "<span class='text-muted small'>Aucun autre personnage avec ce nom.</span>";
        return;
    }

    matches.forEach((p) => {
        let borderClass = "border-secondary";
        if (p.type === "PUI") borderClass = "border-danger";
        else if (p.type === "AGI") borderClass = "border-primary";
        else if (p.type === "TEC") borderClass = "border-success";
        else if (p.type === "INT") borderClass = "border-info";
        else if (p.type === "END") borderClass = "border-warning";
        
        const pNom = (typeof p.nom === 'object') ? p.nom.base : p.nom;

        container.innerHTML += `
            <div class="position-relative text-center" style="width: 60px; cursor: pointer;" 
                 onclick="window.location.href='detail.html?id=${p.id}'" title="${pNom}">
                <img src="${BASE_IMG_URL}${p.id}.png" class="rounded border border-2 ${borderClass}" style="width: 100%; height: 60px; object-fit: cover; background-color: #222;"
                     onerror="this.src='https://placehold.co/60x60?text=?'">
            </div>
        `;
    });
}

// ============================================================
// 5. STATS
// ============================================================
function updateStatsDisplay(levelKey, btnElement) {
    if (!currentPersoGlobal || !currentPersoGlobal.stats) return;
    let statsToShow = currentPersoGlobal.stats.d4 ? currentPersoGlobal.stats[levelKey] : currentPersoGlobal.stats;

    if (statsToShow) {
        document.getElementById("detail-hp").innerText = statsToShow.hp;
        document.getElementById("detail-atk").innerText = statsToShow.atk;
        document.getElementById("detail-def").innerText = statsToShow.def;
    }
    if (btnElement) {
        btnElement.parentElement.querySelectorAll(".btn").forEach((b) => b.classList.remove("active"));
        btnElement.classList.add("active");
    }
}

// ============================================================
// 6. UTILITAIRES
// ============================================================
function getTypeColor(type) {
    if (!type) return 'bg-secondary';
    const t = type.toUpperCase();
    if (t === 'PUI' || t === 'STR') return 'bg-danger';
    if (t === 'AGI' || t === 'AGL') return 'bg-primary';
    if (t === 'TEQ' || t === 'TEC') return 'bg-success';
    if (t === 'INT') return 'bg-int';       
    if (t === 'PHY' || t === 'END') return 'bg-warning text-dark';
    return 'bg-secondary';
}

function formaterTexteDokkan(texte) {
    if (!texte) return "";
    if (Array.isArray(texte)) texte = texte.join("\n");
    let html = texte.replace(/\n/g, "<br>")
        .replace(/\[(.*?)\]/g, `<span class="dokkan-title">$1</span>`)
        .replace(/([+]\d+(\s?%)?)/g, `<span class="dokkan-highlight">$1</span> <span class="stat-up">⬆</span>`)
        .replace(/\b(ATT|DÉF|Ki|PV|ATQ|Critique|CRIT|Garde)\b/g, `<span class="dokkan-highlight">$1</span>`)
        .replace(/\{1\}/g, `<span class="badge-dokkan">1</span>`)
        .replace(/\{inf\}/g, `<span class="badge-dokkan">∞</span>`)
        .replace(/\{tour\}/g, `<span class="badge-dokkan">1 tour</span>`);
    return `<div class="dokkan-text">${html}</div>`;
}

// ============================================================
// 7. GESTION TRANSFORMATION / REVIVAL / ECHANGE
// ============================================================
function changerForme(forme) {
    if (!currentPersoGlobal) return;
    const p = currentPersoGlobal;
    const imgElement = document.getElementById("detail-img");
    
    // --- MISE À JOUR VARIABLE GLOBALE POUR LE SWITCH ---
    currentFormeGlobal = forme; // Très important pour corriger le bug

    // Récupération des boutons
    const btnBase = document.getElementById("btn-base");
    const btnTransfo = document.getElementById("btn-transfo");
    
    const btnBaseRevival = document.getElementById("btn-base-revival");
    const btnRevival = document.getElementById("btn-revival");

    const btnBaseEchange = document.getElementById("btn-base-echange");
    const btnEchange = document.getElementById("btn-echange");

    let liensAffiche = [];
    let speData = null; 

    // === GESTION DE L'ÉTAT "BASE" ===
    if (forme === 'base') {
        imgElement.src = `${BASE_IMG_URL}${p.id}_full.png`;
        imgElement.onerror = function() { this.src = `${BASE_IMG_URL}${p.id}.png`; this.onerror = null; };

        // Reset boutons (Gestion des classes actives)
        if (btnBase) { btnBase.classList.add('active', 'btn-primary'); btnBase.classList.remove('btn-outline-primary'); }
        if (btnTransfo) { btnTransfo.classList.remove('active', 'btn-warning'); btnTransfo.classList.add('btn-outline-warning'); }

        if (btnBaseRevival) { btnBaseRevival.classList.add('active', 'btn-primary'); btnBaseRevival.classList.remove('btn-outline-primary'); }
        if (btnRevival) { btnRevival.classList.remove('active', 'btn-info'); btnRevival.classList.add('btn-outline-info'); }

        if (btnBaseEchange) { btnBaseEchange.classList.add('active', 'btn-primary'); btnBaseEchange.classList.remove('btn-outline-primary'); }
        if (btnEchange) { btnEchange.classList.remove('active', 'btn-info'); btnEchange.classList.add('btn-outline-info'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.base : p.nom;
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && typeof p.passif === 'object' && !Array.isArray(p.passif)) ? p.passif.base : p.passif;
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.base) speData = p.spe.base;
        liensAffiche = getLiensActuels(p, 'base');

    // === GESTION DE L'ÉTAT "TRANSFO" ===
    } else if (forme === 'transfo') {
        imgElement.src = `${BASE_IMG_URL}${p.id}_full_transfo.png`;
        imgElement.onerror = function() { this.src = `${BASE_IMG_URL}${p.id}_transfo.png`; this.onerror = null; };

        if (btnBase) { btnBase.classList.remove('active', 'btn-primary'); btnBase.classList.add('btn-outline-primary'); }
        if (btnTransfo) { btnTransfo.classList.add('active', 'btn-warning'); btnTransfo.classList.remove('btn-outline-warning'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.transfo : p.nom + " (Transformé)";
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && p.passif.transfo) ? p.passif.transfo : "Pas de passif défini.";
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.transfo) speData = p.spe.transfo;
        liensAffiche = getLiensActuels(p, 'transfo');

    // === GESTION DE L'ÉTAT "REVIVAL" ===
    } else if (forme === 'revival') {
        imgElement.src = `${BASE_IMG_URL}${p.id}_full_revival.png`;
        imgElement.onerror = function() { this.src = `${BASE_IMG_URL}${p.id}_revival.png`; this.onerror = null; };

        if (btnBaseRevival) { btnBaseRevival.classList.remove('active', 'btn-primary'); btnBaseRevival.classList.add('btn-outline-primary'); }
        if (btnRevival) { btnRevival.classList.add('active', 'btn-info'); btnRevival.classList.remove('btn-outline-info'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.revival : p.nom + " (Ressuscité)";
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && p.passif.revival) ? p.passif.revival : "Pas de passif défini.";
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.revival) speData = p.spe.revival;
        liensAffiche = getLiensActuels(p, 'revival');

    // === GESTION DE L'ÉTAT "ECHANGE" ===
    } else if (forme === 'echange') {
        imgElement.src = `${BASE_IMG_URL}${p.id}_full_echange.png`;
        imgElement.onerror = function() { this.src = `${BASE_IMG_URL}${p.id}_echange.png`; this.onerror = null; };

        if (btnBaseEchange) { btnBaseEchange.classList.remove('active', 'btn-primary'); btnBaseEchange.classList.add('btn-outline-primary'); }
        if (btnEchange) { btnEchange.classList.add('active', 'btn-info'); btnEchange.classList.remove('btn-outline-info'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.echange : p.nom + " (Échange)";
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && p.passif.echange) ? p.passif.echange : "Pas de passif défini.";
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.echange) speData = p.spe.echange;
        liensAffiche = getLiensActuels(p, 'echange');
    }

    // --- MISE À JOUR DES ATTAQUES SPÉCIALES ET ULTIME ---
    afficherSpeEtUltime(speData);

    renderLiens(liensAffiche);
    
    // Reset du switch level 10 visuel (optionnel, selon préférence)
    // const switchBtn = document.getElementById("linkLevelSwitch");
}

// --- FONCTION DÉDIÉE POUR AFFICHER LES SPÉS ---
function afficherSpeEtUltime(data) {
    const blocSpe = document.querySelector(".border-red-glow").parentElement;
    const blocUltimeContainer = document.querySelector(".border-ultimate-glow").parentElement; 
    
    // Reset visuel
    blocUltimeContainer.style.display = "none";
    if(blocSpe) blocSpe.className = "col-md-12"; 

    if (!data) return;

    // 1. Spé Normale (Toujours présente si data existe)
    document.getElementById("detail-spe-nom").innerText = data.nom || "???";
    document.getElementById("detail-spe-desc").innerText = data.effet || "???";

    // 2. Ultime (Si présent dans le JSON pour cette forme)
    if (data.ultime) {
        document.getElementById("detail-ult-nom").innerText = data.ultime.nom;
        document.getElementById("detail-ult-desc").innerText = data.ultime.effet;
        
        // On affiche le bloc et on passe les deux en demi-largeur
        blocUltimeContainer.style.display = "block";
        if(blocSpe) blocSpe.className = "col-md-6";
    }
}

// ============================================================
// 8. DÉMARRAGE
// ============================================================
chargerDetail();