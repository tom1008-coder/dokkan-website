// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
const container = document.getElementById('card-container');
const searchInput = document.getElementById('search-input');

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

// --- GESTION DES TIMERS (Pour éviter les bugs lors de la recherche) ---
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
    // 1. On nettoie les anciens timers avant de redessiner
    nettoyerIntervalles();
    
    container.innerHTML = "";

    if (!liste || liste.length === 0) {
        container.innerHTML = "<p class='text-center text-secondary mt-3'>Aucun personnage trouvé.</p>";
        return;
    }

    const iconPath = "icons/"; // Chemin vers tes icônes
    // Configuration commune pour les tooltips Bootstrap
    const tooltipAttrs = `data-bs-toggle="tooltip" data-bs-placement="top"`;

    liste.forEach(carte => {
        // CONSTRUCTION URL AVEC SOUS-DOSSIER ID
        const cheminImage = `${BASE_IMG_URL}${carte.id}/${carte.id}.png`;
        let couleurBadge = getTypeColor(carte.type);

        // --- GESTION DU NOM ---
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;

        // --- GESTION DES ICÔNES SPÉCIALES (AVEC TOOLTIPS) ---
        let badgeSpecial = "";
        
        // Ordre de priorité pour l'icône affichée
        if (carte.geant) {
            // Tu devras peut-être créer une icone_geant.png ou utiliser celle de fureur
            badgeSpecial = `<img src="${iconPath}icone_fureur.png" class="card-mechanic-icon" 
                            alt="Géant" ${tooltipAttrs} data-bs-title="Mode Géant">`;
        } else if (carte.fureur) {
            badgeSpecial = `<img src="${iconPath}icone_fureur.png" class="card-mechanic-icon" 
                            alt="Fureur" ${tooltipAttrs} data-bs-title="Mode Fureur">`;
        } else if (carte.transformation) {
            badgeSpecial = `<img src="${iconPath}icone_transfo.png" class="card-mechanic-icon" 
                            alt="Transformation" ${tooltipAttrs} data-bs-title="Transformation">`;
        } else if (carte.revival) {
            badgeSpecial = `<img src="${iconPath}icone_revival.png" class="card-mechanic-icon" 
                            alt="Revival" ${tooltipAttrs} data-bs-title="Revival">`;
        } else if (carte.echange) {
            badgeSpecial = `<img src="${iconPath}icone_echange.png" class="card-mechanic-icon" 
                            alt="Echange" ${tooltipAttrs} data-bs-title="Echange">`;
        }

        // --- PRÉPARATION DES DONNÉES POUR LE SCRIPT AUTO ---
        const hasTransfo = carte.transformation ? "true" : "false";
        const hasRevival = carte.revival ? "true" : "false";
        const hasEchange = carte.echange ? "true" : "false";
        const hasFureur = carte.fureur ? "true" : "false"; 
        const hasGeant = carte.geant ? "true" : "false"; // AJOUT GÉANT

        const codeHTML = `
            <div class="col-6 col-md-3 mb-4">
                <div class="dokkan-card h-100" onclick="allerVersPageDetail('${carte.id}')" style="cursor: pointer;">
                    
                    <div class="card-body text-center p-2 position-relative">
                        ${badgeSpecial}

                        <img src="${cheminImage}" 
                             class="img-fluid mb-2 auto-cycle-img" 
                             alt="${nomAffiche}" 
                             style="max-height: 100px; transition: opacity 0.5s ease;"
                             data-id="${carte.id}"
                             data-transfo="${hasTransfo}"
                             data-revival="${hasRevival}"
                             data-echange="${hasEchange}"
                             data-fureur="${hasFureur}" 
                             data-geant="${hasGeant}" 
                             onerror="this.src='https://placehold.co/100x100?text=?'">
                        
                        <h6 class="card-title" style="font-size: 0.9rem;">${nomAffiche}</h6>
                        <span class="badge ${couleurBadge}">${carte.type}</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });

    // --- INITIALISATION DES TOOLTIPS BOOTSTRAP ---
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // 2. On lance les cycles automatiques des images
    lancerCycleAutomatique();
}

// ============================================================
// 4. GESTION DU CYCLE AUTOMATIQUE (5 SECONDES)
// ============================================================

function lancerCycleAutomatique() {
    // On sélectionne toutes les images qu'on vient de créer
    const imagesElements = document.querySelectorAll('.auto-cycle-img');

    imagesElements.forEach(img => {
        const id = img.dataset.id;
        const hasTransfo = img.dataset.transfo === "true";
        const hasRevival = img.dataset.revival === "true";
        const hasEchange = img.dataset.echange === "true";
        const hasFureur = img.dataset.fureur === "true"; 
        const hasGeant = img.dataset.geant === "true"; // LECTURE DONNÉE GÉANT

        // Construction de la liste des images AVEC LE SOUS-DOSSIER
        const imagesList = [`${BASE_IMG_URL}${id}/${id}.png`]; // Base
        
        // Ajout des formes dans le cycle
        if (hasGeant) imagesList.push(`${BASE_IMG_URL}${id}/${id}_geant.png`); // AJOUT IMAGE GÉANT
        if (hasTransfo) imagesList.push(`${BASE_IMG_URL}${id}/${id}_transfo.png`);
        if (hasRevival) imagesList.push(`${BASE_IMG_URL}${id}/${id}_revival.png`);
        if (hasEchange) imagesList.push(`${BASE_IMG_URL}${id}/${id}_echange.png`);
        if (hasFureur) imagesList.push(`${BASE_IMG_URL}${id}/${id}_fureur.png`);

        // S'il y a plus d'une image, on lance le cycle
        if (imagesList.length > 1) {
            let currentIndex = 0;

            const intervalId = setInterval(() => {
                // Petit effet de fondu sortant
                img.style.opacity = 0.5;

                setTimeout(() => {
                    // Changement d'image
                    currentIndex = (currentIndex + 1) % imagesList.length;
                    img.src = imagesList[currentIndex];
                    
                    // Fondu entrant
                    img.style.opacity = 1;
                }, 200);

            }, 5000); // 5000ms = 5 secondes

            // On stocke l'ID pour pouvoir l'arrêter plus tard
            activeIntervals.push(intervalId);
        }
    });
}

function nettoyerIntervalles() {
    // Coupe tous les chronomètres actifs
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
            // On réaffiche les 8 dernières si la recherche est vide
            const dernieresSorties = toutesLesCartes.slice(-8).reverse();
            afficherCartes(dernieresSorties);
        } else {
            const resultat = toutesLesCartes.filter(carte => {
                let nomPourRecherche = "";
                if (typeof carte.nom === 'object' && carte.nom !== null) {
                    const nomSup = carte.nom.transfo || carte.nom.revival || carte.nom.echange || carte.nom.fureur || "";
                    nomPourRecherche = (carte.nom.base + " " + nomSup).toLowerCase();
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
// 6. UTILITAIRES (COULEURS)
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

// Lancement
chargerDonnees();