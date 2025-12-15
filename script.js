// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
const container = document.getElementById('card-container');
const searchInput = document.getElementById('search-input');

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
// Remplace bien l'URL ci-dessous par celle de TON projet si elle diffère
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

// --- SÉCURITÉ ---
// Si on est sur une page sans container (ex: detail.html), on arrête le script ici.
if (!container) {
    throw new Error("Arrêt normal : Script.js ne doit pas s'exécuter sur cette page (pas de container).");
}

let toutesLesCartes = [];

// ============================================================
// 2. CHARGEMENT DES DONNÉES (VERSION SUPABASE)
// ============================================================
async function chargerDonnees() {
    try {
        console.log("Tentative de connexion à Supabase...");

        // On vérifie que 'supabase' (le client) existe bien
        if (typeof supabase === 'undefined') {
            throw new Error("La variable 'supabase' n'existe pas. Vérifie config.js !");
        }

        // On récupère TOUS les personnages depuis la table 'characters'
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

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
    container.innerHTML = "";

    if (!liste || liste.length === 0) {
        container.innerHTML = "<p class='text-center text-secondary mt-3'>Aucun personnage trouvé.</p>";
        return;
    }

    liste.forEach(carte => {
        // --- MODIFICATION ICI POUR SUPABASE STORAGE ---
        // On utilise l'URL en ligne au lieu du dossier local 'img/'
        const cheminImage = `${BASE_IMG_URL}${carte.id}.png`;
        const cheminTransfo = `${BASE_IMG_URL}${carte.id}_transfo.png`; 
        
        // Couleur du type
        let couleurBadge = getTypeColor(carte.type);

        // --- GESTION DU NOM (OBJET vs STRING) ---
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;

        // Gestion de la Transformation (Hover)
        let interactionsImage = "";
        let badgeTransfo = "";

        if (carte.transformation) {
            interactionsImage = `onmouseover="this.src='${cheminTransfo}'" onmouseout="this.src='${cheminImage}'"`;
            badgeTransfo = `<span class="badge bg-warning text-dark position-absolute top-0 start-0 m-2 shadow-sm" style="z-index:5; font-size:0.7em;">TRANSFO</span>`;
        }

        const codeHTML = `
            <div class="col-6 col-md-3 mb-4">
                <div class="dokkan-card h-100" onclick="allerVersPageDetail('${carte.id}')" style="cursor: pointer;">
                    
                    <div class="card-body text-center p-2 position-relative">
                        ${badgeTransfo}

                        <img src="${cheminImage}" 
                             class="img-fluid mb-2" 
                             alt="${nomAffiche}" 
                             style="max-height: 100px;"
                             ${interactionsImage}
                             onerror="this.src='https://placehold.co/100x100?text=Image+Introuvable'">
                        
                        <h6 class="card-title" style="font-size: 0.9rem;">${nomAffiche}</h6>
                        <span class="badge ${couleurBadge}">${carte.type}</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });
}

// ============================================================
// 4. REDIRECTION
// ============================================================
function allerVersPageDetail(id) {
    window.location.href = `detail.html?id=${id}`;
}

// ============================================================
// 5. BARRE DE RECHERCHE INTELLIGENTE
// ============================================================
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const texteRecherche = e.target.value.toLowerCase();

        if (texteRecherche === "") {
            // Si recherche vide, on remet les 10 derniers
            const dernieresSorties = toutesLesCartes.slice(-10).reverse();
            afficherCartes(dernieresSorties);
        } else {
            // Filtrage côté client
            const resultat = toutesLesCartes.filter(carte => {
                let nomPourRecherche = "";
                
                // Recherche dans le nom de base ET le nom transformé
                if (typeof carte.nom === 'object' && carte.nom !== null) {
                    nomPourRecherche = (carte.nom.base + " " + carte.nom.transfo).toLowerCase();
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
    if (t === 'INT') return 'bg-info text-dark';       
    if (t === 'PHY' || t === 'END') return 'bg-warning text-dark';
    return 'bg-secondary';
}

// Lancement
chargerDonnees();