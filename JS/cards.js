// JS/cards.js

const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

let allCardsData = []; 
let uniqueNames = new Set(); 

// Éléments du DOM
const gridContainer = document.getElementById('cards-grid');
const loadingDiv = document.getElementById('loading-cards');
const noResultsDiv = document.getElementById('no-results');
const countLabel = document.getElementById('results-count');

// Filtres DOM
const filterRarity = document.getElementById('filter-rarity');
const filterType = document.getElementById('filter-type');
const filterClass = document.getElementById('filter-class');
const filterCharName = document.getElementById('filter-character-name');
const filterCategory = document.getElementById('filter-category');
const filterSearch = document.getElementById('filter-search');

// ============================================================
// 1. INITIALISATION
// ============================================================
async function initCardsPage() {
    try {
        // Chargement parallèle (Cartes + Catégories)
        const [resCards, resCats] = await Promise.all([
            supabase.from('characters').select('*').order('tag', {ascending:true}).order('id', {ascending:false}),
            supabase.from('categories').select('nom').order('nom', {ascending:true})
        ]);

        if (resCards.error) throw resCards.error;
        if (resCats.error) console.error("Erreur categories", resCats.error);
        
        // Tri manuel plus robuste
        let data = resCards.data;
        data.sort((a, b) => {
            if (a.tag === 'LR' && b.tag !== 'LR') return -1;
            if (a.tag !== 'LR' && b.tag === 'LR') return 1;
            return b.id - a.id;
        });

        allCardsData = data;

        // Remplissage Filtre Catégories
        if (resCats.data) {
            filterCategory.innerHTML = '<option value="">Toutes les catégories</option>';
            resCats.data.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.nom;
                opt.textContent = c.nom;
                filterCategory.appendChild(opt);
            });
        }

        extractFiltersData(); 
        renderCards(allCardsData);
        loadingDiv.classList.add('d-none');
    } catch (err) {
        console.error(err);
        loadingDiv.innerHTML = "<p class='text-danger'>Erreur chargement.</p>";
    }
}

// ============================================================
// 2. EXTRACTION DES FILTRES (Noms uniquement)
// ============================================================
function extractFiltersData() {
    uniqueNames.clear();
    
    allCardsData.forEach(card => {
        let fullName = (typeof card.nom === 'object' && card.nom !== null) ? card.nom.base : card.nom;
        if(fullName) uniqueNames.add(fullName);
    });

    filterCharName.innerHTML = '<option value="">Tous les personnages</option>';
    Array.from(uniqueNames).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterCharName.appendChild(opt);
    });
}

// ============================================================
// 3. AFFICHAGE DES CARTES
// ============================================================
function renderCards(cards) {
    gridContainer.innerHTML = '';
    countLabel.textContent = `${cards.length} résultats`;

    if (cards.length === 0) {
        noResultsDiv.classList.remove('d-none');
        return;
    } else {
        noResultsDiv.classList.add('d-none');
    }

    cards.forEach(card => {
        const displayNom = (typeof card.nom === 'object' && card.nom !== null) ? card.nom.base : card.nom;
        // URL AVEC SOUS-DOSSIER
        const displayUrl = `${BASE_IMG_URL}${card.id}/${card.id}.png`;
        
        const html = `
            <div class="col">
                <div class="card-container" onclick="window.location.href='detail.html?id=${card.id}'" title="${displayNom}">
                    <div class="card-icon-wrapper">
                        <img src="${displayUrl}" class="card-img" 
                             loading="lazy" onerror="this.src='https://placehold.co/90x90/000/fff?text=?'">
                    </div>
                    <div class="card-name">${displayNom}</div>
                </div>
            </div>
        `;
        gridContainer.innerHTML += html;
    });
}

// ============================================================
// 4. LOGIQUE DE FILTRAGE
// ============================================================
function applyFilters() {
    const searchVal = filterSearch.value.toLowerCase().trim();
    const rarityVal = filterRarity.value; 
    const typeVal = filterType.value;
    const classVal = filterClass.value;
    const charNameVal = filterCharName.value;
    const catVal = filterCategory.value;

    const filtered = allCardsData.filter(card => {
        const cardName = (typeof card.nom === 'object' && card.nom !== null) ? card.nom.base : card.nom;
        const cardNameLower = cardName ? cardName.toLowerCase() : "";

        if (searchVal && !cardNameLower.includes(searchVal) && !String(card.id).includes(searchVal)) return false;
        if (rarityVal && card.tag !== rarityVal) return false;
        if (typeVal && card.type !== typeVal) return false;
        if (classVal && card.classe !== classVal) return false;
        
        // Filtre Catégorie (Compatible tableau text[])
        if (catVal) {
            if (!Array.isArray(card.categories) || !card.categories.includes(catVal)) return false;
        }
        
        if (charNameVal && cardName !== charNameVal) return false;

        return true;
    });

    renderCards(filtered);
}

filterSearch.addEventListener('input', applyFilters);
filterRarity.addEventListener('change', applyFilters);
filterType.addEventListener('change', applyFilters);
filterClass.addEventListener('change', applyFilters);
filterCharName.addEventListener('change', applyFilters);
filterCategory.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', initCardsPage);