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
        
        // On affiche les 10 dernières sorties par défaut
        const dernieresSorties = toutesLesCartes.slice(-10).reverse();
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

    liste.forEach(carte => {
        const cheminImage = `${BASE_IMG_URL}${carte.id}.png`;
        let couleurBadge = getTypeColor(carte.type);

        // --- GESTION DU NOM ---
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;

        // --- GESTION DES BADGES SPÉCIAUX ---
        let badgeSpecial = "";
        if (carte.transformation) {
            badgeSpecial = `<span class="badge bg-warning text-dark position-absolute top-0 start-0 m-2 shadow-sm" style="z-index:5; font-size:0.7em;">TRANSFO</span>`;
        } else if (carte.revival) {
            badgeSpecial = `<span class="badge bg-info text-dark position-absolute top-0 start-0 m-2 shadow-sm" style="z-index:5; font-size:0.7em;">REVIVAL</span>`;
        } else if (carte.echange) {
            badgeSpecial = `<span class="badge bg-primary text-white position-absolute top-0 start-0 m-2 shadow-sm" style="z-index:5; font-size:0.7em;">ÉCHANGE</span>`;
        }

        // --- PRÉPARATION DES DONNÉES POUR LE SCRIPT AUTO ---
        // On passe les infos via des attributs 'data-' pour que le JS puisse les lire après
        const hasTransfo = carte.transformation ? "true" : "false";
        const hasRevival = carte.revival ? "true" : "false";
        const hasEchange = carte.echange ? "true" : "false";

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
                             onerror="this.src='https://placehold.co/100x100?text=?'">
                        
                        <h6 class="card-title" style="font-size: 0.9rem;">${nomAffiche}</h6>
                        <span class="badge ${couleurBadge}">${carte.type}</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });

    // 2. Une fois le HTML injecté, on lance les cycles automatiques
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

        // Construction de la liste des images pour ce perso
        const imagesList = [`${BASE_IMG_URL}${id}.png`]; // Base
        
        if (hasTransfo) imagesList.push(`${BASE_IMG_URL}${id}_transfo.png`);
        if (hasRevival) imagesList.push(`${BASE_IMG_URL}${id}_revival.png`);
        if (hasEchange) imagesList.push(`${BASE_IMG_URL}${id}_echange.png`);

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
            const dernieresSorties = toutesLesCartes.slice(-10).reverse();
            afficherCartes(dernieresSorties);
        } else {
            const resultat = toutesLesCartes.filter(carte => {
                let nomPourRecherche = "";
                if (typeof carte.nom === 'object' && carte.nom !== null) {
                    const nomSup = carte.nom.transfo || carte.nom.revival || carte.nom.echange || "";
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