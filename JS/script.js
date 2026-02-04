// JS/script.js

// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
const container = document.getElementById('card-container');
const searchInput = document.getElementById('search-input');

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

// --- GESTION DES TIMERS ---
let activeIntervals = []; 

// --- SÉCURITÉ ---
if (!container) {
    throw new Error("Arrêt normal : Script.js ne doit pas s'exécuter sur cette page.");
}

let toutesLesCartes = [];

// ============================================================
// 2. CHARGEMENT DES DONNÉES (VERSION SUPABASE)
// ============================================================
async function chargerDonnees() {
    try {
        console.log("Tentative de connexion à Supabase...");

        if (typeof supabase === 'undefined') {
            throw new Error("La variable 'supabase' n'existe pas. Vérifie config.js !");
        }

        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        toutesLesCartes = data;
        
        // On affiche les 8 dernières sorties par défaut
        const dernieresSorties = toutesLesCartes.slice(-8).reverse();
        afficherCartes(dernieresSorties);

    } catch (erreur) {
        console.error("Erreur Supabase :", erreur);
        container.innerHTML = `<p class='text-danger text-center'>Impossible de charger les données : ${erreur.message}</p>`;
    }
}

// ============================================================
// 3. AFFICHAGE DES CARTES
// ============================================================
function afficherCartes(liste) {
    // 1. On nettoie les anciens timers
    nettoyerIntervalles();
    
    container.innerHTML = "";

    if (!liste || liste.length === 0) {
        container.innerHTML = "<p class='text-center text-secondary mt-3'>Aucun personnage trouvé.</p>";
        return;
    }

    liste.forEach(carte => {
        // CONSTRUCTION URL
        const cheminImage = `${BASE_IMG_URL}${carte.id}/${carte.id}.png`;
        
        // 1. Couleur du badge (Bootstrap class)
        let couleurBadge = getTypeColor(carte.type);
        
        // 2. Couleur du Glow (Code HEX pour CSS variable)
        let hexGlow = getGlowColor(carte.type);

        // GESTION DU NOM
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;

        // --- DÉTECTION LR ---
        const isLR = (carte.tag === 'LR' || carte.rarity === 'LR');
        const lrClass = isLR ? 'is-lr' : '';

        // --- PRÉPARATION DES DONNÉES POUR LE CARROUSEL AUTO ---
        const hasTransfo = carte.transformation ? "true" : "false";
        const hasRevival = carte.revival ? "true" : "false";
        const hasEchange = carte.echange ? "true" : "false";
        const hasFureur = carte.fureur ? "true" : "false"; 
        const hasGeant = carte.geant ? "true" : "false";
        const hasStandby = carte.standby ? "true" : "false"; 

        // --- INJECTION HTML ---
        // On injecte la variable CSS --lr-color directement dans le style de la div .dokkan-card
        const codeHTML = `
            <div class="col-6 col-md-3 mb-4">
                <div class="dokkan-card h-100 ${lrClass}" 
                     onclick="allerVersPageDetail('${carte.id}')" 
                     style="cursor: pointer; --lr-color: ${hexGlow};">
                    
                    <div class="card-body text-center p-2 position-relative">
                        
                        <img src="${cheminImage}" 
                             class="img-fluid mb-1 auto-cycle-img" 
                             alt="${nomAffiche}" 
                             style="max-height: 100px; transition: opacity 0.5s ease;"
                             data-id="${carte.id}"
                             data-transfo="${hasTransfo}"
                             data-revival="${hasRevival}"
                             data-echange="${hasEchange}"
                             data-fureur="${hasFureur}" 
                             data-geant="${hasGeant}" 
                             data-standby="${hasStandby}"
                             onerror="this.src='https://placehold.co/100x100?text=?'">
                        
                        <h6 class="card-title mb-2" style="font-size: 0.9rem; line-height: 1.2;">${nomAffiche}</h6>
                        <span class="badge ${couleurBadge}">${carte.type}</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });

    // 2. On lance les cycles automatiques des images
    lancerCycleAutomatique();
}

// ============================================================
// 4. GESTION DU CARROUSEL AUTOMATIQUE
// ============================================================

function lancerCycleAutomatique() {
    const imagesElements = document.querySelectorAll('.auto-cycle-img');

    imagesElements.forEach(img => {
        const id = img.dataset.id;
        const hasTransfo = img.dataset.transfo === "true";
        const hasRevival = img.dataset.revival === "true";
        const hasEchange = img.dataset.echange === "true";
        const hasFureur = img.dataset.fureur === "true"; 
        const hasGeant = img.dataset.geant === "true";
        const hasStandby = img.dataset.standby === "true"; 

        const imagesList = [`${BASE_IMG_URL}${id}/${id}.png`]; // Base
        
        if (hasStandby) imagesList.push(`${BASE_IMG_URL}${id}/${id}_standby.png`);
        if (hasGeant) imagesList.push(`${BASE_IMG_URL}${id}/${id}_geant.png`);
        if (hasTransfo) imagesList.push(`${BASE_IMG_URL}${id}/${id}_transfo.png`);
        if (hasRevival) imagesList.push(`${BASE_IMG_URL}${id}/${id}_revival.png`);
        if (hasEchange) imagesList.push(`${BASE_IMG_URL}${id}/${id}_echange.png`);
        if (hasFureur) imagesList.push(`${BASE_IMG_URL}${id}/${id}_fureur.png`);

        if (imagesList.length > 1) {
            let currentIndex = 0;
            const intervalId = setInterval(() => {
                img.style.opacity = 0.5;
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % imagesList.length;
                    img.src = imagesList[currentIndex];
                    img.style.opacity = 1;
                }, 200);
            }, 5000); 
            activeIntervals.push(intervalId);
        }
    });
}

function nettoyerIntervalles() {
    activeIntervals.forEach(id => clearInterval(id));
    activeIntervals = [];
}

// ============================================================
// 5. REDIRECTION & RECHERCHE
// ============================================================
function allerVersPageDetail(id) {
    window.location.href = `detail.html?id=${id}`;
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const texteRecherche = e.target.value.toLowerCase();

        if (texteRecherche === "") {
            const dernieresSorties = toutesLesCartes.slice(-8).reverse();
            afficherCartes(dernieresSorties);
        } else {
            const resultat = toutesLesCartes.filter(carte => {
                let nomPourRecherche = "";
                if (typeof carte.nom === 'object' && carte.nom !== null) {
                    const nomSup = carte.nom.transfo || carte.nom.revival || carte.nom.echange || carte.nom.fureur || "";
                    const nomStandby = (carte.standby && carte.standby.form) ? carte.standby.form.nom : "";
                    nomPourRecherche = (carte.nom.base + " " + nomSup + " " + nomStandby).toLowerCase();
                } else {
                    nomPourRecherche = String(carte.nom).toLowerCase();
                }
                return nomPourRecherche.includes(texteRecherche);
            });
            afficherCartes(resultat);
        }
    });
}

// ============================================================
// 6. UTILITAIRES (COULEURS & CLASSES)
// ============================================================

// Retourne la classe Bootstrap pour le Badge
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

// Retourne le Code HEX pour l'effet Glow
function getGlowColor(type) {
    if (!type) return '#ffd700'; // Or par défaut
    const t = type.toUpperCase();
    if (t === 'PUI' || t === 'STR') return '#dc3545'; // Rouge
    if (t === 'AGI' || t === 'AGL') return '#0d6efd'; // Bleu
    if (t === 'TEQ' || t === 'TEC') return '#198754'; // Vert
    if (t === 'INT') return '#6f42c1'; // Violet
    if (t === 'PHY' || t === 'END') return '#ffc107'; // Jaune/Orange
    return '#ffd700';
}

// Lancement
chargerDonnees();