// cards.js - Version Finale (Clean : Image seule + Nom)

const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";
let allCardsData = []; 
let uniqueCategories = new Set();
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
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allCardsData = data;

        extractFiltersData(); 
        renderCards(allCardsData);
        loadingDiv.classList.add('d-none');
    } catch (err) {
        console.error(err);
        loadingDiv.innerHTML = "<p class='text-danger'>Erreur chargement.</p>";
    }
}

// ============================================================
// 2. EXTRACTION DES FILTRES
// ============================================================
function extractFiltersData() {
    allCardsData.forEach(card => {
        // Catégories
        if (card.categories && Array.isArray(card.categories)) {
            card.categories.forEach(cat => uniqueCategories.add(cat));
        }

        // Noms
        let fullName = (typeof card.nom === 'object') ? card.nom.base : card.nom;
        if(fullName) {
            uniqueNames.add(fullName.split(" (")[0]); 
        }
    });

    // Remplissage Select Catégories
    Array.from(uniqueCategories).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filterCategory.appendChild(opt);
    });

    // Remplissage Select Personnages
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
        const displayNom = (typeof card.nom === 'object') ? card.nom.base : card.nom;
        const displayUrl = `${BASE_IMG_URL}${card.id}.png`;
        
        // HTML : Uniquement l'image et le nom en dessous
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
        const cardName = (typeof card.nom === 'object') ? card.nom.base : card.nom;
        const cardNameLower = cardName.toLowerCase();

        if (searchVal && !cardNameLower.includes(searchVal)) return false;
        if (rarityVal && card.rarete !== rarityVal) return false;
        if (typeVal && card.type !== typeVal) return false;
        if (classVal && card.classe !== classVal) return false;
        if (catVal && (!card.categories || !card.categories.includes(catVal))) return false;
        if (charNameVal && !cardName.includes(charNameVal)) return false;

        return true;
    });

    renderCards(filtered);
}

// Listeners
filterSearch.addEventListener('input', applyFilters);
filterRarity.addEventListener('change', applyFilters);
filterType.addEventListener('change', applyFilters);
filterClass.addEventListener('change', applyFilters);
filterCharName.addEventListener('change', applyFilters);
filterCategory.addEventListener('change', applyFilters);

// Démarrage
document.addEventListener('DOMContentLoaded', initCardsPage);