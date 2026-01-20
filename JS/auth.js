if (typeof supabase === 'undefined') {
    console.error("Supabase non chargé (config.js manquant)");
}

// DOM
const loginBlock = document.getElementById('login-block');
const signupBlock = document.getElementById('signup-block');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const alertArea = document.getElementById('alert-area');

// Alert helper
function showAlert(message, type) {
    alertArea.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// Switch forms
showSignupLink.addEventListener('click', e => {
    e.preventDefault();
    loginBlock.classList.add('d-none');
    signupBlock.classList.remove('d-none');
    alertArea.innerHTML = '';
});

showLoginLink.addEventListener('click', e => {
    e.preventDefault();
    signupBlock.classList.add('d-none');
    loginBlock.classList.remove('d-none');
    alertArea.innerHTML = '';
});

// INSCRIPTION
signupForm.addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const pseudo = document.getElementById('signup-pseudo').value;

    const btn = signupForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Inscription en cours...";

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { pseudo }
            }
        });

        if (error) throw error;

        showAlert(
            "Compte créé ! Vérifie tes emails pour confirmer l’inscription.",
            "success"
        );

        signupForm.reset();

        setTimeout(() => showLoginLink.click(), 3000);

    } catch (err) {
        showAlert(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerText = "S'inscrire";
    }
});

// CONNEXION
loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Connexion en cours...";

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        showAlert("Connexion réussie ! Redirection...", "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (err) {
        let msg = err.message;
        if (msg.includes("Invalid login credentials")) {
            msg = "Email ou mot de passe incorrect.";
        }
        if (msg.includes("Email not confirmed")) {
            msg = "Veuillez confirmer votre email.";
        }
        showAlert(msg, "danger");
    } finally {
        btn.disabled = false;
        btn.innerText = "Se connecter";
    }
});
