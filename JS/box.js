// JS/box.js

// --- CONFIGURATION SUPABASE STORAGE ---
const BUCKET_IMAGES = 'images'; // Nom de ton bucket dans Supabase
const EXTENSION_IMAGE = '.png'; // Mets '.jpg' ou '' (vide) selon comment tu as uploadé tes images
const IMAGE_PAR_DEFAUT = 'https://placehold.co/150x150/1a1f2b/FFFFFF/png?text=Image'; 
const COLONNE_SELECT = 'id, nom';

let currentUser = null;
let targetUserId = null;
let isMyBox = true;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérification Session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "auth.html";
        return;
    }
    currentUser = session.user;

    // 2. Vérification de qui on regarde la Box
    const urlParams = new URLSearchParams(window.location.search);
    targetUserId = urlParams.get('user') || currentUser.id;
    isMyBox = (targetUserId === currentUser.id);

    // Si on regarde la box d'un ami, on masque le bouton d'ajout
    if (!isMyBox) {
        const btnAdd = document.getElementById('btn-add-card');
        if (btnAdd) btnAdd.classList.add('d-none');
        chargerNomAmi();
    }

    // 3. Charger les cartes
    chargerBox();
});

// Affiche le pseudo de l'ami si on n'est pas sur notre box
async function chargerNomAmi() {
    try {
        const { data } = await supabase.from('profiles').select('username').eq('id', targetUserId).single();
        if (data) document.getElementById('box-title').textContent = `📦 BOX DE ${data.username.toUpperCase()}`;
    } catch (err) {
        console.error("Erreur nom ami:", err);
    }
}

// Charge et affiche les cartes de la box avec les images de Supabase
async function chargerBox() {
    const grid = document.getElementById('box-grid');
    
    try {
        const { data: boxItems, error: boxError } = await supabase
            .from('user_box')
            .select('id, character_id')
            .eq('user_id', targetUserId);

        if (boxError) throw boxError;

        document.getElementById('box-count').textContent = `${boxItems.length} Cartes`;

        if (boxItems.length === 0) {
            grid.innerHTML = `<div class="col-12"><p class="text-secondary text-center fst-italic py-5">Cette box est vide.</p></div>`;
            return;
        }

        const charIds = boxItems.map(item => item.character_id);
        const { data: charsInfo, error: charsError } = await supabase
            .from('characters')
            .select(COLONNE_SELECT)
            .in('id', charIds);

        if (charsError) throw charsError;

        grid.innerHTML = '';
        boxItems.forEach(item => {
            const charData = charsInfo.find(c => c.id === item.character_id);
            const charName = (charData && charData.nom && charData.nom.base) ? charData.nom.base : `Perso inconnu`;
            
            // 🌟 NOUVEAU CHEMIN : id/id.png 🌟
            const { data: imgData } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(item.character_id + '/' + item.character_id + EXTENSION_IMAGE);
            const imageUrl = imgData.publicUrl;
            
            const btnRemove = isMyBox ? `<button class="btn btn-sm btn-outline-danger mt-3 w-100 fw-bold" onclick="supprimerCarte('${item.id}')">Retirer</button>` : '';

            grid.innerHTML += `
                <div class="col-6 col-md-3 col-lg-2 mb-3">
                    <div class="card bg-dark border-secondary p-2 text-center h-100 d-flex flex-column align-items-center justify-content-between" style="box-shadow: 0 4px 8px rgba(0,0,0,0.4); transition: transform 0.2s;">
                        <div class="w-100 mb-2" style="aspect-ratio: 1/1; overflow: hidden; border-radius: 8px;">
                            <img src="${imageUrl}" onerror="this.src='${IMAGE_PAR_DEFAUT}'" alt="${charName}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                        </div>
                        <span class="text-light fw-bold small text-truncate w-100" title="${charName}">${charName}</span>
                        ${btnRemove}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erreur box:", err);
        grid.innerHTML = `<div class="col-12"><p class="text-danger text-center">Erreur de chargement de la box.</p></div>`;
    }
}

// Retire une carte de la Box
async function supprimerCarte(boxId) {
    if (!confirm("Voulez-vous vraiment retirer cette carte de la Box ?")) return;
    try {
        const { error } = await supabase.from('user_box').delete().eq('id', boxId);
        if (error) throw error;
        chargerBox(); 
    } catch (err) {
        console.error("Erreur suppression:", err);
    }
}

window.supprimerCarte = supprimerCarte;