// ============================================================
// GESTION DE LA BARRE DE NAVIGATION ET DE LA SESSION
// ============================================================

async function initNavbar() {
    const navPlaceholder = document.getElementById("nav-placeholder");
    if (!navPlaceholder) return;

    try {
        // 1. Charger le fichier HTML de la navbar
        const response = await fetch("nav.html");
        const html = await response.text();
        navPlaceholder.innerHTML = html;

        // 2. Une fois le HTML chargé, on vérifie la connexion Supabase
        verifierConnexion();

        // 3. On attache l'événement de déconnexion (s'il existe)
        setTimeout(() => {
            const logoutBtn = document.getElementById("nav-logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", deconnexion);
            }
        }, 500); // Petit délai pour être sûr que le DOM est prêt

    } catch (error) {
        console.error("Erreur lors du chargement de la navbar :", error);
    }
}

async function verifierConnexion() {
    // Vérifie si Supabase est bien chargé
    if (typeof supabase === 'undefined') {
        console.error("Supabase n'est pas chargé. Vérifiez config.js");
        return;
    }

    // Récupère la session actuelle
    const { data: { session } } = await supabase.auth.getSession();

    // Cible les éléments
    const loginBtn = document.getElementById("nav-login-btn");
    const userMenu = document.getElementById("nav-user-menu");
    const userLabel = document.getElementById("nav-user-email");

    if (session) {
        // --- UTILISATEUR CONNECTÉ ---

        // ✅ On récupère le pseudo depuis user_metadata
        const pseudo =
            session.user.user_metadata?.pseudo
            || session.user.email.split('@')[0];

        // 1. On cache le bouton "Connexion"
        if (loginBtn) loginBtn.classList.add("d-none");

        // 2. On affiche le menu utilisateur
        if (userMenu) userMenu.classList.remove("d-none");

        // 3. On affiche le pseudo
        if (userLabel) userLabel.innerText = "👤 " + pseudo.toUpperCase();

    } else {
        // --- UTILISATEUR NON CONNECTÉ ---

        if (loginBtn) loginBtn.classList.remove("d-none");
        if (userMenu) userMenu.classList.add("d-none");
    }
}


async function deconnexion() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.reload(); // Recharge la page
    } else {
        console.error("Erreur déconnexion:", error);
    }
}

// Lancer le chargement dès que la page est prête
document.addEventListener("DOMContentLoaded", initNavbar);