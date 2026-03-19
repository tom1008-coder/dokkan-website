// JS/team.js

const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

let toutesLesCartes = [];
let monEquipe = [null, null, null, null, null, null, null];
let slotActifIndex = 0; 
let rosterModal = null;

// Notre dictionnaire qui sera rempli par le fichier links.json
let dictionnaireLiens = {};

// =========================================
// DEFINITION DES LIGNES ET LEURS COULEURS
// =========================================
const PAIRES_LIENS = [
    { id: '0-1', c1: 0, c2: 1, color: '#fbbf24' }, 
    { id: '1-2', c1: 1, c2: 2, color: '#fbbf24' },
    { id: '6-3', c1: 6, c2: 3, color: '#fbbf24' },
    { id: '3-4', c1: 3, c2: 4, color: '#fbbf24' },
    { id: '1-4', c1: 1, c2: 4, color: '#38bdf8' }, 
    { id: '2-3', c1: 2, c2: 3, color: '#38bdf8' }, 
    { id: '1-5', c1: 1, c2: 5, color: '#f87171' }, 
    { id: '3-5', c1: 3, c2: 5, color: '#f87171' }
];

document.addEventListener('DOMContentLoaded', async () => {
    rosterModal = new bootstrap.Modal(document.getElementById('rosterModal'));
    
    // On charge le JSON des liens AVANT de charger la box
    await chargerLiens();
    await chargerBox();
});

// =========================================
// CHARGEMENT DU FICHIER links.json
// =========================================
async function chargerLiens() {
    try {
        const reponse = await fetch('links.json');
        if (!reponse.ok) {
            throw new Error(`Erreur HTTP: ${reponse.status}`);
        }
        dictionnaireLiens = await reponse.json();
        console.log("Liens chargés avec succès !");
    } catch (erreur) {
        console.error("Impossible de charger links.json :", erreur);
        dictionnaireLiens = {};
    }
}

async function chargerBox() {
    const container = document.getElementById("roster-container");
    try {
        const { data, error } = await supabase
            .from('characters')
            .select('id, nom, type, liens')
            .order('created_at', { ascending: false });

        if (error) throw error;
        toutesLesCartes = data;
    } catch (err) {
        console.error("Erreur:", err);
        container.innerHTML = `<p class='text-danger text-center w-100'>Impossible de charger la box.</p>`;
    }
}

function afficherRoster(liste) {
    const container = document.getElementById("roster-container");
    container.innerHTML = "";

    if (liste.length === 0) {
        container.innerHTML = "<p class='text-white-50 w-100 text-center mt-3'>Aucun personnage trouvé.</p>";
        return;
    }

    liste.forEach(carte => {
        const cheminImage = `${BASE_IMG_URL}${carte.id}/${carte.id}.png`;
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;
        
        let estIndisponible = false;
        if (slotActifIndex < 6) {
            estIndisponible = monEquipe.slice(0, 6).some((p, index) => p && p.id === carte.id && index !== slotActifIndex);
        } else {
            estIndisponible = (monEquipe[6] && monEquipe[6].id === carte.id);
        }

        const inTeamClass = estIndisponible ? "in-team" : "";
        const onClickAttr = estIndisponible ? "" : `onclick="ajouterAEquipe('${carte.id}')"`;

        const codeHTML = `
            <div class="col text-center mb-3">
                <div class="roster-char ${inTeamClass}" ${onClickAttr} title="${nomAffiche}">
                    <img src="${cheminImage}" alt="${nomAffiche}" onerror="this.src='https://placehold.co/100x100?text=?'">
                    <div class="text-white-50 text-truncate mt-1" style="font-size: 0.70rem; max-width: 90px; margin: 0 auto;">
                        ${nomAffiche}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });
}

function selectionnerSlot(index) {
    slotActifIndex = index;
    document.getElementById('roster-search').value = "";
    afficherRoster(toutesLesCartes);
    rosterModal.show();
}

function ajouterAEquipe(persoId) {
    if (slotActifIndex < 6) {
        if (monEquipe.slice(0, 6).some((p, index) => p && p.id === persoId && index !== slotActifIndex)) return;
    } else {
        if (monEquipe[6] && monEquipe[6].id === persoId) return;
    }

    const persoComplet = toutesLesCartes.find(p => p.id === persoId);
    monEquipe[slotActifIndex] = persoComplet;
    
    const slotElement = document.getElementById(`slot-${slotActifIndex}`);
    slotElement.classList.add('filled');

    let roleIndicatorHTML = "";
    if (slotActifIndex === 0) roleIndicatorHTML = `<div class="role-indicator leader-color">L</div>`;
    else if (slotActifIndex === 6) roleIndicatorHTML = `<div class="role-indicator friend-color">F</div>`;

    slotElement.innerHTML = `
        ${roleIndicatorHTML}
        <div class="char-portrait-wrapper">
            <img src="${BASE_IMG_URL}${persoComplet.id}/${persoComplet.id}.png">
            <div class="btn-remove-char" onclick="retirerDeEquipe(event, ${slotActifIndex})"><i class="bi bi-x"></i></div>
            <div class="btn-calc-stats"><i class="bi bi-calculator"></i></div>
        </div>
    `;

    rosterModal.hide();
    calculerEtAfficherLiens();
}

function retirerDeEquipe(event, index) {
    event.stopPropagation(); 
    monEquipe[index] = null; 
    
    const slotElement = document.getElementById(`slot-${index}`);
    slotElement.classList.remove('filled');
    
    let nomBadge = "SUB";
    if (index === 0) nomBadge = "LEADER";
    else if (index === 6) nomBadge = "AMI";
    else nomBadge = `SUB ${index}`;

    slotElement.innerHTML = `<div class="badge-add">${nomBadge}</div><i class="bi bi-plus-lg text-white-50"></i>`;
    calculerEtAfficherLiens();
}

function viderEquipe() {
    if(!confirm("Voulez-vous vraiment vider toute l'équipe ?")) return;

    for (let i = 0; i < 7; i++) {
        monEquipe[i] = null;
        const slotElement = document.getElementById(`slot-${i}`);
        slotElement.classList.remove('filled');
        
        let nomBadge = "SUB";
        if (i === 0) nomBadge = "LEADER";
        else if (i === 6) nomBadge = "AMI";
        else nomBadge = `SUB ${i}`;

        slotElement.innerHTML = `<div class="badge-add">${nomBadge}</div><i class="bi bi-plus-lg text-white-50"></i>`;
    }
    calculerEtAfficherLiens();
}

// =========================================
// CALCUL DES LIENS ENTRE LES CARTES
// =========================================

function extraireLiensArray(carte) {
    if (!carte || !carte.liens) return [];
    let raw = carte.liens;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch(e) { return []; }
    }
    if (Array.isArray(raw)) return raw;
    if (raw.base) return raw.base; 
    return [];
}

function getNomBase(carte) {
    if (!carte || !carte.nom) return "";
    if (typeof carte.nom === 'object' && carte.nom !== null) {
        return carte.nom.base.toLowerCase().trim();
    }
    return String(carte.nom).toLowerCase().trim();
}

function calculerEtAfficherLiens() {
    PAIRES_LIENS.forEach(paire => {
        const carte1 = monEquipe[paire.c1];
        const carte2 = monEquipe[paire.c2];
        const lineEl = document.getElementById(`line-${paire.id}`);
        const badgeEl = document.getElementById(`badge-${paire.id}`);
        const textEl = document.getElementById(`text-${paire.id}`);
        const circleEl = badgeEl.querySelector('circle'); 

        if (carte1 && carte2) {
            const nom1 = getNomBase(carte1);
            const nom2 = getNomBase(carte2);
            
            let intersection = [];

            if (nom1 !== nom2) {
                const liens1 = extraireLiensArray(carte1);
                const liens2 = extraireLiensArray(carte2);
                intersection = liens1.filter(l => liens2.includes(l));
            }

            const nbLiens = intersection.length;

            textEl.textContent = nbLiens;
            badgeEl.style.display = "block";
            
            if (nbLiens > 0) {
                lineEl.style.stroke = paire.color;
                if (circleEl) circleEl.style.stroke = paire.color;
                
                lineEl.dataset.shared = JSON.stringify(intersection);
                lineEl.dataset.color = paire.color;
                badgeEl.dataset.shared = JSON.stringify(intersection);
                badgeEl.dataset.color = paire.color;
            } else {
                lineEl.style.stroke = "#334155";
                if (circleEl) circleEl.style.stroke = "#d97706";
                lineEl.dataset.shared = "[]";
                badgeEl.dataset.shared = "[]";
            }
        } 
        else {
            lineEl.style.stroke = "#334155";
            badgeEl.style.display = "none";
            lineEl.dataset.shared = "[]";
            badgeEl.dataset.shared = "[]";
        }
    });
}

// =========================================
// INFOBULLE (TOOLTIP) AU SURVOL DES LIENS
// =========================================
const tooltip = document.getElementById('link-tooltip');

if (tooltip) {
    document.querySelector('.team-links-svg').addEventListener('mousemove', (e) => {
        let target = e.target;
        let elementWithData = null;

        if (target.classList.contains('link-line')) {
            elementWithData = target;
        } else if (target.parentNode && target.parentNode.classList && target.parentNode.classList.contains('link-badge')) {
            elementWithData = target.parentNode;
        }

        if (elementWithData && elementWithData.dataset.shared && elementWithData.dataset.shared !== "[]") {
            const liensPartages = JSON.parse(elementWithData.dataset.shared);
            const couleurLigne = elementWithData.dataset.color || '#fbbf24';
            
            let html = '<div class="text-white-50 small mb-2 border-bottom border-secondary pb-1">Liens actifs :</div>';
            
            liensPartages.forEach(lien => {
                // Va chercher la stat dans ton fichier JSON (on cible lv10)
                let stat = "Stats inconnues";
                if (dictionnaireLiens[lien] && dictionnaireLiens[lien].lv10) {
                    stat = dictionnaireLiens[lien].lv10;
                }
                
                html += `
                    <div class="mb-2">
                        <div style="color: ${couleurLigne}; font-weight: bold; font-size: 0.85rem;">
                            <i class="bi bi-link-45deg"></i> ${lien}
                        </div>
                        <div style="color: #cbd5e1; font-size: 0.75rem; padding-left: 18px;">
                            ${stat}
                        </div>
                    </div>
                `;
            });

            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    });

    document.querySelector('.team-links-svg').addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

// Barre de recherche
document.getElementById('roster-search').addEventListener('input', (e) => {
    const texteRecherche = e.target.value.toLowerCase();
    if (texteRecherche === "") {
        afficherRoster(toutesLesCartes);
    } else {
        const resultat = toutesLesCartes.filter(carte => {
            let nomPourRecherche = (typeof carte.nom === 'object' && carte.nom !== null) ? (carte.nom.base || "").toLowerCase() : String(carte.nom).toLowerCase();
            return nomPourRecherche.includes(texteRecherche);
        });
        afficherRoster(resultat);
    }
});