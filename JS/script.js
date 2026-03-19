// JS/script.js

// ============================================================
// 1. VARIABLES GLOBALES
// ============================================================
const container = document.getElementById('card-container');
const searchInput = document.getElementById('search-input'); 
const newsContainer = document.getElementById('news-container');

// --- URL DE BASE DES IMAGES (SUPABASE STORAGE) ---
const BASE_IMG_URL = "https://dpqxaevnarnhmxihkggk.supabase.co/storage/v1/object/public/images/";

// --- GESTION DES TIMERS ET DONNÉES ---
let activeIntervals = []; 
let toutesLesCartes = [];
let toutesLesNews = [];

// --- SÉCURITÉ ---
if (!container) {
    throw new Error("Arrêt normal : Script.js ne doit pas s'exécuter sur cette page.");
}

// ============================================================
// 2. CHARGEMENT DES DONNÉES (CARTES & NEWS)
// ============================================================
async function chargerDonnees() {
    try {
        console.log("Tentative de connexion à Supabase...");

        if (typeof supabase === 'undefined') {
            throw new Error("La variable 'supabase' n'existe pas. Vérifie config.js !");
        }

        // CHARGEMENT DES CARTES
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        toutesLesCartes = data;
        
        // --- AFFICHAGE DU TOTAL DES CARTES ---
        const totalElement = document.getElementById("total-cards-count");
        if (totalElement) {
            totalElement.innerText = toutesLesCartes.length;
        }

        // On affiche les 8 dernières sorties par défaut
        const dernieresSorties = toutesLesCartes.slice(-8).reverse();
        afficherCartes(dernieresSorties);

        // CHARGEMENT DES NEWS
        chargerNews();

    } catch (erreur) {
        console.error("Erreur Supabase :", erreur);
        container.innerHTML = `<p class='text-danger text-center w-100'>Impossible de charger les données : ${erreur.message}</p>`;
    }
}

// ============================================================
// 3. CHARGEMENT DES NEWS (ET POP-UP)
// ============================================================
async function chargerNews() {
    if (!newsContainer) return;

    try {
        const { data: newsData, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        newsContainer.innerHTML = ""; // On vide le spinner

        if (!newsData || newsData.length === 0) {
            newsContainer.innerHTML = "<p class='text-secondary small fst-italic text-center mt-3'>Aucune news pour le moment.</p>";
            return;
        }

        // On sauvegarde les news globalement pour pouvoir les afficher dans le pop-up
        toutesLesNews = newsData;

        newsData.forEach(news => {
            const dateObj = new Date(news.created_at);
            const dateStr = dateObj.toLocaleDateString('fr-FR').replace(/\//g, '-');
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            let imageHtml = "";
            if (news.image_url && news.image_url.trim() !== "") {
                imageHtml = `<img src="${news.image_url}" class="img-fluid mb-2 border border-secondary rounded" alt="News Image">`;
            }

            let titleColor = "text-white";
            if(news.badge_color.includes("warning")) titleColor = "text-warning";
            if(news.badge_color.includes("info")) titleColor = "text-info";
            if(news.badge_color.includes("success")) titleColor = "text-success";
            if(news.badge_color.includes("danger")) titleColor = "text-danger";

            const isDarkText = news.badge_color === 'bg-warning' || news.badge_color === 'bg-info';
            const badgeTextColor = isDarkText ? 'text-dark' : 'text-white';
            
            const contenuFormatte = news.contenu ? news.contenu.replace(/\n/g, '<br>') : "";

            const newsHtml = `
                <div class="news-card-mini mb-3 shadow-sm clickable-news border border-secondary" onclick="ouvrirModalNews(${news.id})">
                    <div class="news-header-mini">
                        <span class="badge ${news.badge_color} ${badgeTextColor}">${news.badge_text}</span>
                        <span class="news-time">${dateStr} à ${timeStr}</span>
                    </div>
                    ${imageHtml}
                    <h6 class="${titleColor} fw-bold mb-1 mt-1">${news.titre}</h6>
                    <p class="small text-light opacity-75 mb-0 news-text-preview" style="line-height: 1.4;">
                        ${contenuFormatte}
                    </p>
                    <div class="text-end mt-1"><small class="text-info" style="font-size: 0.7rem;">Lire la suite ></small></div>
                </div>
            `;
            newsContainer.innerHTML += newsHtml;
        });

    } catch (err) {
        console.error("Erreur chargement news:", err);
        newsContainer.innerHTML = "<p class='text-danger small text-center mt-3'>Erreur serveur pour les news.</p>";
    }
}

// Fonction pour ouvrir le Pop-up de la News
function ouvrirModalNews(id) {
    const news = toutesLesNews.find(n => n.id === id);
    if (!news) return;

    const dateObj = new Date(news.created_at);
    const dateStr = dateObj.toLocaleDateString('fr-FR').replace(/\//g, '-');
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let titleColor = "text-white";
    if(news.badge_color.includes("warning")) titleColor = "text-warning";
    if(news.badge_color.includes("info")) titleColor = "text-info";
    if(news.badge_color.includes("success")) titleColor = "text-success";
    if(news.badge_color.includes("danger")) titleColor = "text-danger";

    const isDarkText = news.badge_color === 'bg-warning' || news.badge_color === 'bg-info';
    const badgeTextColor = isDarkText ? 'text-dark' : 'text-white';

    document.getElementById("modalNewsTitle").className = `modal-title fw-bold ${titleColor}`;
    document.getElementById("modalNewsTitle").innerText = news.titre;
    
    document.getElementById("modalNewsBadge").className = `badge ${news.badge_color} ${badgeTextColor}`;
    document.getElementById("modalNewsBadge").innerText = news.badge_text;
    
    document.getElementById("modalNewsDate").innerHTML = `<i class="bi bi-clock"></i> Publié le ${dateStr} à ${timeStr}`;

    const imageContainer = document.getElementById("modalNewsImageContainer");
    const imageElement = document.getElementById("modalNewsImage");
    if (news.image_url && news.image_url.trim() !== "") {
        imageElement.src = news.image_url;
        imageContainer.style.display = "block";
    } else {
        imageContainer.style.display = "none";
        imageElement.src = "";
    }

    document.getElementById("modalNewsContent").innerHTML = news.contenu.replace(/\n/g, '<br>');

    const modal = new bootstrap.Modal(document.getElementById('newsModal'));
    modal.show();
}

// ============================================================
// 4. AFFICHAGE DES CARTES (VERSION ICÔNES CARRÉES)
// ============================================================
function afficherCartes(liste) {
    nettoyerIntervalles();
    
    container.innerHTML = "";

    if (!liste || liste.length === 0) {
        container.innerHTML = "<p class='text-center text-secondary mt-3 w-100'>Aucun personnage trouvé.</p>";
        return;
    }

    liste.forEach(carte => {
        const cheminImage = `${BASE_IMG_URL}${carte.id}/${carte.id}.png`;
        let hexGlow = getGlowColor(carte.type);
        const nomAffiche = (typeof carte.nom === 'object' && carte.nom !== null) ? carte.nom.base : carte.nom;
        const isLR = (carte.tag === 'LR' || carte.rarity === 'LR');
        const lrClass = isLR ? 'is-lr' : '';

        const hasTransfo = carte.transformation ? "true" : "false";
        const hasRevival = carte.revival ? "true" : "false";
        const hasEchange = carte.echange ? "true" : "false";
        const hasFureur = carte.fureur ? "true" : "false"; 
        const hasGeant = carte.geant ? "true" : "false";
        const hasStandby = carte.standby ? "true" : "false"; 

        const codeHTML = `
            <div class="col">
                <div class="dokkan-card h-100 ${lrClass}" 
                     onclick="allerVersPageDetail('${carte.id}')" 
                     style="cursor: pointer; --lr-color: ${hexGlow};"
                     title="${nomAffiche}">
                    
                    <img src="${cheminImage}" 
                         class="img-fluid auto-cycle-img" 
                         alt="${nomAffiche}" 
                         style="transition: opacity 0.5s ease;"
                         data-id="${carte.id}"
                         data-transfo="${hasTransfo}"
                         data-revival="${hasRevival}"
                         data-echange="${hasEchange}"
                         data-fureur="${hasFureur}" 
                         data-geant="${hasGeant}" 
                         data-standby="${hasStandby}"
                         onerror="this.src='https://placehold.co/100x100?text=?'">
                    
                    <h6 class="card-title text-truncate mt-2">${nomAffiche}</h6>
                </div>
            </div>
        `;
        container.innerHTML += codeHTML;
    });

    lancerCycleAutomatique();
}

// ============================================================
// 5. GESTION DU CARROUSEL AUTOMATIQUE
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

        const imagesList = [`${BASE_IMG_URL}${id}/${id}.png`];
        
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
// 6. REDIRECTION & RECHERCHE
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
// 7. UTILITAIRES (COULEURS & CLASSES)
// ============================================================
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

// Lancement
document.addEventListener('DOMContentLoaded', chargerDonnees);