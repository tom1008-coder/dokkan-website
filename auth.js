// Vérifier que Supabase est bien chargé via config.js
if (typeof supabase === 'undefined') {
    console.error("Erreur critique : Supabase n'est pas défini. Vérifiez que config.js est bien inclus avant auth.js.");
}

// --- Éléments du DOM ---
const loginBlock = document.getElementById('login-block');
const signupBlock = document.getElementById('signup-block');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const alertArea = document.getElementById('alert-area');

// --- Fonction utilitaire pour afficher les messages ---
// type = 'success' (vert) ou 'danger' (rouge)
function showAlert(message, type) {
    alertArea.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// --- Logique de basculement entre les formulaires ---
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault(); // Empêche le lien de recharger la page
    loginBlock.classList.add('d-none');
    signupBlock.classList.remove('d-none');
    alertArea.innerHTML = ''; // Nettoie les messages précédents
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupBlock.classList.add('d-none');
    loginBlock.classList.remove('d-none');
    alertArea.innerHTML = ''; // Nettoie les messages précédents
});


// --- Logique d'INSCRIPTION (Sign Up) ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    // Désactiver le bouton pendant le chargement
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Inscription en cours...';
    alertArea.innerHTML = '';

    try {
        // Appel à l'API Supabase pour créer l'utilisateur
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Succès
        showAlert("Compte créé avec succès ! Veuillez vérifier vos emails pour confirmer votre inscription avant de vous connecter.", "success");
        signupForm.reset(); // Vider le formulaire
        
        // Optionnel : Rebasculer automatiquement vers le formulaire de login après quelques secondes
        setTimeout(() => {
            showLoginLink.click();
        }, 3000);

    } catch (error) {
        // Gestion des erreurs (ex: email déjà utilisé, mot de passe trop faible)
        console.error("Erreur inscription:", error.message);
        showAlert(`Erreur lors de l'inscription : ${error.message}`, "danger");
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.innerHTML = "S'inscrire";
    }
});


// --- Logique de CONNEXION (Login) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    // Désactiver le bouton
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Connexion en cours...';
    alertArea.innerHTML = '';

    try {
        // Appel à l'API Supabase pour se connecter
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Succès : Redirection vers la page d'accueil (ou la "Box" plus tard)
        showAlert("Connexion réussie ! Redirection...", "success");
        console.log("Utilisateur connecté :", data.user);
        
        // Rediriger après 1 seconde
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        // Gestion des erreurs (ex: mauvais mot de passe, email non confirmé)
        console.error("Erreur connexion:", error.message);
        let errorMessage = error.message;
        // Traduction basique des erreurs courantes de Supabase
        if (errorMessage.includes("Invalid login credentials")) {
            errorMessage = "Email ou mot de passe incorrect.";
        } else if (errorMessage.includes("Email not confirmed")) {
             errorMessage = "Veuillez confirmer votre adresse email avant de vous connecter.";
        }
        showAlert(`Erreur de connexion : ${errorMessage}`, "danger");
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Se connecter";
    }
});