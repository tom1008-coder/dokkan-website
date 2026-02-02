// cards.js - Version Finale (Clean : Image seule + Nom)

// --- URL DE BASE ---
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
            // TRI PAR DEFAUT : Rareté LR en premier, puis ID décroissant
            .order('tag', { ascending: true }) // 'tag' contient 'LR' ou 'UR'. 'LR' < 'UR' donc LR d'abord si ascending
            .order('id', { ascending: false }); // Les plus récents en premier

        if (error) throw error;
        
        // Tri manuel plus robuste pour être sûr que les LR sont devant
        data.sort((a, b) => {
            if (a.tag === 'LR' && b.tag !== 'LR') return -1;
            if (a.tag !== 'LR' && b.tag === 'LR') return 1;
            return b.id - a.id;
        });

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
        if (card.categories) {
            let cats = card.categories;
            if (typeof cats === 'string') {
                try { cats = JSON.parse(cats); } catch(e) {}
            }
            if (Array.isArray(cats)) {
                cats.forEach(cat => uniqueCategories.add(cat));
            }
        }

        // Noms
        let fullName = (typeof card.nom === 'object' && card.nom !== null) ? card.nom.base : card.nom;
        if(fullName) {
            uniqueNames.add(fullName); // On prend le nom complet pour être précis
        }
    });

    // Remplissage Select Catégories (Tri alphabétique)
    Array.from(uniqueCategories).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filterCategory.appendChild(opt);
    });

    // Remplissage Select Personnages (Tri alphabétique)
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
        
        // MODIFICATION ICI : AJOUT DU DOSSIER ID DANS L'URL
        const displayUrl = `${BASE_IMG_URL}${card.id}/${card.id}.png`;
        
        // HTML : Uniquement l'image et le nom en dessous
        const html = `
            <div class="card-container" onclick="window.location.href='detail.html?id=${card.id}'" title="${displayNom}">
                <img src="${displayUrl}" class="card-img" loading="lazy" onerror="this.src='https://placehold.co/100x100?text=?'">
                <div class="card-name">${displayNom}</div>
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
    const rarityVal = filterRarity.value; // 'LR', 'UR', etc.
    const typeVal = filterType.value;
    const classVal = filterClass.value;
    const charNameVal = filterCharName.value;
    const catVal = filterCategory.value;

    const filtered = allCardsData.filter(card => {
        const cardName = (typeof card.nom === 'object' && card.nom !== null) ? card.nom.base : card.nom;
        const cardNameLower = cardName ? cardName.toLowerCase() : "";

        // Recherche texte (nom ou ID)
        if (searchVal && !cardNameLower.includes(searchVal) && !String(card.id).includes(searchVal)) return false;
        
        // Rareté (colonne 'tag' dans la BDD)
        if (rarityVal && card.tag !== rarityVal) return false;
        
        // Type
        if (typeVal && card.type !== typeVal) return false;
        
        // Classe
        if (classVal && card.classe !== classVal) return false;
        
        // Catégorie
        if (catVal) {
            let cCats = card.categories;
            if (typeof cCats === 'string') {
                try { cCats = JSON.parse(cCats); } catch(e) {}
            }
            if (!Array.isArray(cCats) || !cCats.includes(catVal)) return false;
        }
        
        // Nom Exact (Select)
        if (charNameVal && cardName !== charNameVal) return false;

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