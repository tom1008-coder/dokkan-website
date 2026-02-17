// JS/add_box.js

// --- CONFIGURATION ---
const BUCKET_IMAGES = 'images'; 
const EXTENSION_IMAGE = '.png'; 
const IMAGE_PAR_DEFAUT = 'https://placehold.co/150x150/1a1f2b/FFFFFF/png?text=Image'; 
const COLONNE_RECHERCHE = 'nom->>base'; 
const COLONNE_SELECT = 'id, nom';

let currentUser = null;
let debounceTimer;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérification Session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "auth.html";
        return;
    }
    currentUser = session.user;

    // 2. Charger les premiers personnages par défaut
    recherchePersonnage(''); 

    // 3. Gestion de la barre de recherche
    const searchInput = document.getElementById('search-char-input');

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const value = e.target.value.trim();
        
        // Délai de 300ms pour ne pas surcharger la base de données quand on tape vite
        debounceTimer = setTimeout(() => recherchePersonnage(value), 300);
    });
});

// Fait la recherche et affiche les résultats dans la grille
async function recherchePersonnage(query) {
    const grid = document.getElementById('character-grid');
    const spinner = document.getElementById('loading-spinner');
    
    // On vide la grille et on affiche le chargement
    grid.innerHTML = '';
    spinner.classList.remove('d-none');

    try {
        let supabaseQuery = supabase
            .from('characters')
            .select(COLONNE_SELECT)
            .limit(50); // On limite à 50 cartes pour éviter les ralentissements

        // Si on a tapé quelque chose, on filtre
        if (query.length > 0) {
            supabaseQuery = supabaseQuery.ilike(COLONNE_RECHERCHE, `%${query}%`);
        }

        const { data: chars, error } = await supabaseQuery;

        if (error) throw error;

        spinner.classList.add('d-none'); // Cache le chargement

        if (chars.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-secondary py-5">Aucun personnage trouvé.</div>';
            return;
        }

        // On génère le HTML pour chaque personnage
        chars.forEach(char => {
            const charName = (char.nom && char.nom.base) ? char.nom.base : "Nom inconnu";
            
            // Récupération de l'image (format: bucket/id/id.png)
            const { data: imgData } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(char.id + '/' + char.id + EXTENSION_IMAGE);
            const imageUrl = imgData.publicUrl;

            // On crée la carte cliquable
            grid.innerHTML += `
                <div class="dokkan-char-card" onclick="ajouterCarte('${char.id}')">
                    <img src="${imageUrl}" onerror="this.src='${IMAGE_PAR_DEFAUT}'" class="dokkan-char-img" alt="${charName}">
                    <div class="dokkan-char-name">${charName}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erreur recherche:", err);
        spinner.classList.add('d-none');
        grid.innerHTML = '<div class="col-12 text-center text-danger py-5">Erreur lors du chargement des personnages.</div>';
    }
}

// Ajoute la carte cliquée
async function ajouterCarte(characterId) {
    try {
        const { error } = await supabase
            .from('user_box')
            .insert([{ user_id: currentUser.id, character_id: characterId }]);

        if (error) {
            if (error.code === '23505') {
                alert("Tu possèdes déjà cette carte !");
            } else {
                throw error;
            }
        } else {
            // Affiche la petite notification verte temporaire
            showToast();
        }
    } catch (err) {
        console.error("Erreur ajout:", err);
        alert("Une erreur est survenue lors de l'ajout.");
    }
}

// Fonction pour afficher la petite notification de succès
function showToast() {
    const toast = document.getElementById('toast-notification');
    toast.classList.add('show');
    
    // Fait disparaître la notification après 2.5 secondes
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Rendre la fonction accessible globalement pour le onclick HTML
window.ajouterCarte = ajouterCarte;