// JS/category.js

// 1. Récupération du paramètre URL
const params = new URLSearchParams(window.location.search);
const categoryName = params.get("cat"); // Ex: "Temps limité"

// 2. Éléments du DOM
const leadersContainer = document.getElementById('leaders-container');
const membersContainer = document.getElementById('members-container');
const titleSpan = document.getElementById('category-title');
const countSpan = document.getElementById('result-count');

const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";
let activeIntervals = [];

// 3. Initialisation
if (!categoryName) {
    titleSpan.innerText = "Erreur";
    membersContainer.innerHTML = "<p class='text-danger text-center'>Aucune catégorie spécifiée.</p>";
    leadersContainer.innerHTML = "";
} else {
    // Décodage pour gérer les accents et espaces (ex: "Temps%20limit%C3%A9" -> "Temps limité")
    const decodedCatName = decodeURIComponent(categoryName);
    titleSpan.innerText = decodedCatName;
    chargerPersosParCategorie(decodedCatName);
}

// 4. Fonction de chargement Supabase
async function chargerPersosParCategorie(catName) {
    try {
        // On récupère TOUS les membres de la catégorie
        // Note : On utilise .contains pour chercher dans le tableau JSONB
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .contains('categories', [catName]) 
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Mise à jour du compteur total
        countSpan.innerText = `${data.length} personnage(s) trouvé(s)`;

        // --- FILTRAGE DES LEADERS ---
        // On cherche ceux dont le Leader Skill mentionne le nom de la catégorie
        const leaders = data.filter(perso => estLeaderDeLaCategorie(perso, catName));

        console.log(`Leaders trouvés pour "${catName}" :`, leaders.length); // Debug console

        // --- AFFICHAGE SECTION LEADERS ---
        afficherCartes(leaders, leadersContainer, "Aucun leader trouvé pour cette catégorie.");

        // --- AFFICHAGE SECTION MEMBRES (TOUS) ---
        afficherCartes(data, membersContainer, "Aucun personnage trouvé.");

        // On lance le carrousel pour l'ensemble des images de la page
        lancerCycleAutomatique();

    } catch (err) {
        console.error("Erreur Supabase :", err);
        membersContainer.innerHTML = `<p class='text-danger text-center'>Erreur lors du chargement : ${err.message}</p>`;
    }
}

// --- FONCTION DE COMPARAISON ROBUSTE ---
function estLeaderDeLaCategorie(perso, catName) {
    // 1. On nettoie le nom de la catégorie recherchée
    const searchStr = nettoyerTexte(catName);
    
    // 2. On récupère TOUS les textes de leader (Base, ZTUR, SEZA)
    // On les concatène pour vérifier si le perso est leader à un moment donné de son évolution
    const rawLeaderText = (
        (perso.leader_skill || "") + " " +
        (perso.leader_skill_ztur || "") + " " +
        (perso.leader_skill_seza || "")
    );

    // 3. On nettoie le texte du leader skill (enlève HTML, accents, majuscules)
    const cleanLeaderText = nettoyerTexte(rawLeaderText);

    // 4. Vérification
    return cleanLeaderText.includes(searchStr);
}

// Fonction utilitaire pour "aplatir" le texte et retirer le HTML
function nettoyerTexte(htmlStr) {
    if (!htmlStr) return "";

    // 1. Créer un élément temporaire pour laisser le navigateur décoder le HTML (ex: &quot; -> ")
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlStr;
    let text = tempDiv.textContent || tempDiv.innerText || "";

    // 2. Mettre en minuscule
    text = text.toLowerCase();

    // 3. Remplacer les espaces insécables (&nbsp;) par des espaces normaux
    text = text.replace(/\u00a0/g, " ");

    // 4. (Optionnel) Enlever les accents pour une recherche plus souple
    // text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return text;
}

// 5. Affichage des cartes (Générique)
function afficherCartes(liste, containerCible, messageVide) {
    containerCible.innerHTML = "";

    if (!liste || liste.length === 0) {
        containerCible.innerHTML = `<div class="col-12 text-center text-white-50 fst-italic mt-3 mb-3">${messageVide}</div>`;
        return;
    }

    liste.forEach(carte => {
        // URL Image Base
        const cheminImage = `${BASE_IMG_URL}${carte.id}/${carte.id}.png`;
        
        // Couleurs
        let couleurBadge = getTypeColor(carte.type);
        let hexGlow = getGlowColor(carte.type);

        // Nom
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;

        // Détection LR
        const isLR = (carte.tag === 'LR' || carte.rarity === 'LR');
        const lrClass = isLR ? 'is-lr' : '';

        // Données Formes
        const hasTransfo = carte.transformation ? "true" : "false";
        const hasRevival = carte.revival ? "true" : "false";
        const hasEchange = carte.echange ? "true" : "false";
        const hasFureur = carte.fureur ? "true" : "false"; 
        const hasGeant = carte.geant ? "true" : "false";
        const hasStandby = carte.standby ? "true" : "false";

        // HTML Carte
        const codeHTML = `
            <div class="col-6 col-md-3 mb-4">
                <div class="dokkan-card h-100 ${lrClass}" 
                     onclick="window.location.href='detail.html?id=${carte.id}'" 
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
        containerCible.innerHTML += codeHTML;
    });
}

// 6. Gestion du Carrousel (Images animées)
function lancerCycleAutomatique() {
    // On nettoie d'abord pour éviter les doublons d'intervalles
    nettoyerIntervalles();

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

// 7. Utilitaires Couleurs
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

function getGlowColor(type) {
    if (!type) return '#ffd700'; 
    const t = type.toUpperCase();
    if (t === 'PUI' || t === 'STR') return '#dc3545';
    if (t === 'AGI' || t === 'AGL') return '#0d6efd';
    if (t === 'TEQ' || t === 'TEC') return '#198754';
    if (t === 'INT') return '#6f42c1'; 
    if (t === 'PHY' || t === 'END') return '#ffc107'; 
    return '#ffd700';
}