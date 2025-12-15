// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
// Assurez-vous que le script <script src="config.js"></script> est inclus AVANT.
const params = new URLSearchParams(window.location.search);
const idRecherche = params.get("id");

const contentDiv = document.getElementById("content");
const loadingDiv = document.getElementById("loading");

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

let currentPersoGlobal = null; 
let linksDataGlobal = null; // Pour les définitions (lv1/lv10)
let isLevel10Global = false; // Pour garder en mémoire l'état du switch

// ============================================================
// 2. FONCTION PRINCIPALE DE CHARGEMENT (Supabase)
// ============================================================
async function chargerDetail() {
    if (!idRecherche) {
        loadingDiv.innerHTML = "<p class='text-danger'>Aucun personnage sélectionné.</p>";
        return;
    }

    try {
        // 1. Récupérer le personnage depuis Supabase (Table 'characters')
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

        // 2. Récupérer TOUS les personnages pour les partenaires
        const { data: allData, error: errAll } = await supabase
            .from('characters')
            .select('*');

        if (errAll) throw errAll;
        const allPersos = allData || [];

        // 3. Récupérer les définitions des liens (links.json)
        const responseLinks = await fetch("links.json");
        linksDataGlobal = await responseLinks.json();

        // --- Infos de base (Statiques) ---
        document.getElementById("detail-type").innerText = currentPersoGlobal.type;
        document.getElementById("detail-classe").innerText = currentPersoGlobal.classe;

        // --- BOUTONS TRANSFORMATION ---
        const transfoArea = document.getElementById("transfo-area");
        if (transfoArea) {
            if (currentPersoGlobal.transformation) {
                transfoArea.classList.remove("d-none");
            } else {
                transfoArea.classList.add("d-none");
            }
        }

        // --- INITIALISATION (Image, Textes, LIENS) ---
        changerForme('base'); // Charge tout par défaut et appelle renderLiens()

        // Couleur & Stats
        const badge = document.getElementById("detail-type");
        badge.className = `badge fs-6 me-2 ${getTypeColor(currentPersoGlobal.type)}`;

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

        // Gestion Switch Niveau 10
        const switchBtn = document.getElementById("linkLevelSwitch");
        const switchLabel = document.getElementById("linkLevelLabel");
        
        if (switchBtn) {
            switchBtn.checked = false;
            switchBtn.addEventListener("change", function () {
                isLevel10Global = this.checked;
                switchLabel.innerText = isLevel10Global ? "Niveau 10 (MAX)" : "Niveau 1";
                switchLabel.style.color = isLevel10Global ? "#ffcc00" : "#fff";
                
                // On recharge les liens actuels
                const isTransfoActive = document.getElementById("btn-transfo")?.classList.contains("active");
                const formeActuelle = isTransfoActive ? 'transfo' : 'base';
                
                const listeLiens = getLiensActuels(currentPersoGlobal, formeActuelle);
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
        const activeNom = document.getElementById("detail-active-nom");
        const activeDesc = document.getElementById("detail-active-desc");
        const activeCond = document.getElementById("detail-active-cond");

        if (currentPersoGlobal.active_skill) {
            activeNom.innerText = currentPersoGlobal.active_skill.nom || "Active Skill";
            activeDesc.innerText = currentPersoGlobal.active_skill.effet || "Aucun effet décrit.";
            activeCond.innerText = "Condition : " + (currentPersoGlobal.active_skill.condition || "Aucune.");
            activeSection.style.display = "block";
        } else {
            activeSection.style.display = "none";
        }

        // Ultime
        const ultNom = document.getElementById("detail-ult-nom");
        const ultDesc = document.getElementById("detail-ult-desc");
        const blocUltime = document.querySelector(".border-ultimate-glow")?.parentElement;
        const blocSpe = document.querySelector(".border-red-glow")?.parentElement;

        if (currentPersoGlobal.spe && currentPersoGlobal.spe.ultime && blocUltime) {
            ultNom.innerText = currentPersoGlobal.spe.ultime.nom;
            ultDesc.innerText = currentPersoGlobal.spe.ultime.effet;
            blocUltime.style.display = "block";
            if (blocSpe) blocSpe.className = "col-md-6";
        } else if (blocUltime) {
            blocUltime.style.display = "none";
            if (blocSpe) blocSpe.className = "col-md-12";
        }

        // Partenaires & Même nom
        afficherMeilleursPartenaires(currentPersoGlobal, allPersos);
        afficherMemeNom(currentPersoGlobal, allPersos);

        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";
    } catch (error) {
        console.error("Erreur de chargement des données (Supabase/Links):", error);
        loadingDiv.innerHTML = "<p class='text-danger'>Impossible de charger les données (Erreur technique).</p>";
    }
}

// ============================================================
// 2bis. FONCTION UTILITAIRE POUR LES LIENS
// ============================================================
function getLiensActuels(perso, forme) {
    if (!perso || !perso.liens) return [];
    
    // Si liens est un tableau simple (ancien format)
    if (Array.isArray(perso.liens)) return perso.liens; 
    
    // Si liens est un objet {base: [], transfo: []}
    if (forme === 'transfo' && perso.liens.transfo) return perso.liens.transfo;
    if (forme === 'base' && perso.liens.base) return perso.liens.base;
    
    return []; // Fallback
}

// ============================================================
// 3. AFFICHAGE DES LIENS (Globale)
// ============================================================
function renderLiens(listeDesLiens) {
    const divLiens = document.getElementById("detail-liens");
    divLiens.innerHTML = "";

    if (listeDesLiens && Array.isArray(listeDesLiens)) {
        listeDesLiens.forEach((lienNom) => {
            const linkInfo = linksDataGlobal ? linksDataGlobal[lienNom] : null;
            let description = "Effet inconnu";
            if (linkInfo) {
                description = isLevel10Global ? linkInfo.lv10 : linkInfo.lv1;
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
        divLiens.innerHTML = "<span class='text-muted small'>Aucun lien.</span>";
    }
}

// ============================================================
// 4. MEILLEURS PARTENAIRES 
// ============================================================
function afficherMeilleursPartenaires(currentPerso, allPersos) {
    const container = document.getElementById("best-partners-list");
    if (!container) return;

    // Helper pour récupérer le nom de base
    const getNomBase = (p) => (typeof p.nom === 'object') ? p.nom.base.split(" - ")[0].trim() : p.nom.split(" - ")[0].trim();
    const nomBaseCurrent = getNomBase(currentPerso);

    // Helper de sécurité
    const getLiensSafe = (liens) => {
        if (!liens) return [];
        if (Array.isArray(liens)) return liens; // Format simple
        if (liens.base && Array.isArray(liens.base)) return liens.base; // Format objet
        return [];
    };

    const liensBasePerso = getLiensSafe(currentPerso.liens);

    // Filtrage
    const candidats = allPersos.filter((p) => {
        return p.id !== currentPerso.id && getNomBase(p) !== nomBaseCurrent;
    });

    // Calcul scores
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

        // MODIFICATION ICI POUR SUPABASE STORAGE
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

        // MODIFICATION ICI POUR SUPABASE STORAGE
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
    
    // C'est ici qu'on utilise ta nouvelle classe CSS violette
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
// 7. GESTION TRANSFORMATION (IMAGE FULL, TEXTES & LIENS)
// ============================================================
function changerForme(forme) {
    if (!currentPersoGlobal) return;

    const p = currentPersoGlobal;
    const imgElement = document.getElementById("detail-img");
    const btnBase = document.getElementById("btn-base");
    const btnTransfo = document.getElementById("btn-transfo");
    let liensAffiche = [];

    // === GESTION DE L'ÉTAT "BASE" ===
    if (forme === 'base') {
        // MODIFICATION ICI POUR SUPABASE STORAGE (FULL)
        imgElement.src = `${BASE_IMG_URL}${p.id}_full.png`;
        // Fallback sur l'image normale si full n'existe pas
        imgElement.onerror = function() { 
            this.src = `${BASE_IMG_URL}${p.id}.png`; 
            this.onerror = null; 
        };

        if (btnBase) { btnBase.classList.add('active', 'btn-primary'); btnBase.classList.remove('btn-outline-primary'); }
        if (btnTransfo) { btnTransfo.classList.remove('active', 'btn-warning'); btnTransfo.classList.add('btn-outline-warning'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.base : p.nom;
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && typeof p.passif === 'object' && !Array.isArray(p.passif)) ? p.passif.base : p.passif;
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.base) {
            document.getElementById("detail-spe-nom").innerText = p.spe.base.nom;
            document.getElementById("detail-spe-desc").innerText = p.spe.base.effet;
        }

        // Liens Base
        liensAffiche = getLiensActuels(p, 'base');

    // === GESTION DE L'ÉTAT "TRANSFO" ===
    } else if (forme === 'transfo') {
        // MODIFICATION ICI POUR SUPABASE STORAGE (FULL TRANSFO)
        imgElement.src = `${BASE_IMG_URL}${p.id}_full_transfo.png`;
        imgElement.onerror = function() { 
            this.src = `${BASE_IMG_URL}${p.id}_transfo.png`; 
            this.onerror = null; 
        };

        if (btnBase) { btnBase.classList.remove('active', 'btn-primary'); btnBase.classList.add('btn-outline-primary'); }
        if (btnTransfo) { btnTransfo.classList.add('active', 'btn-warning'); btnTransfo.classList.remove('btn-outline-warning'); }

        const nomAffiche = (typeof p.nom === 'object') ? p.nom.transfo : p.nom + " (Transformé)";
        document.getElementById("detail-nom").innerText = nomAffiche;

        let passifTexte = (p.passif && p.passif.transfo) ? p.passif.transfo : "Pas de passif défini.";
        document.getElementById("detail-passif").innerHTML = formaterTexteDokkan(passifTexte);

        if (p.spe && p.spe.transfo) {
            document.getElementById("detail-spe-nom").innerText = p.spe.transfo.nom;
            document.getElementById("detail-spe-desc").innerText = p.spe.transfo.effet;
        }

        // Liens Transfo
        liensAffiche = getLiensActuels(p, 'transfo');
    }

    // Mise à jour des liens en bas
    renderLiens(liensAffiche);
}

// ============================================================
// 8. DÉMARRAGE
// ============================================================
chargerDetail();