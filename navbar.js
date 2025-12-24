// navbar.js - Version avec support du Pseudonyme

function updateNavbarUI(session) {
    const loginBtn = document.getElementById('nav-login-btn');
    const userMenu = document.getElementById('nav-user-menu');
    const userEmailSpan = document.getElementById('nav-user-email');

    if (session) {
        // CONNECTÉ
        if (loginBtn) loginBtn.classList.add('d-none');
        if (userMenu) userMenu.classList.remove('d-none');
        
        if (userEmailSpan && session.user) {
            // LOGIQUE D'AFFICHAGE DU NOM :
            // 1. On regarde s'il y a un pseudo (display_name)
            // 2. Sinon on prend le début de l'email
            
            const pseudo = session.user.user_metadata.display_name;
            const emailShort = session.user.email ? session.user.email.split('@')[0] : 'Utilisateur';

            // Si pseudo existe, on l'affiche, sinon on affiche l'email court
            userEmailSpan.textContent = pseudo || emailShort;
        }
    } else {
        // DÉCONNECTÉ
        if (loginBtn) loginBtn.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');
    }
}

// Écouteur de changement d'état
supabase.auth.onAuthStateChange((event, session) => {
    updateNavbarUI(session);
});

// Vérification initiale
supabase.auth.getSession().then(({ data: { session } }) => {
    updateNavbarUI(session);
});

// Gestion Déconnexion
const logoutBtn = document.getElementById('nav-logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'index.html';
        }
    });
}