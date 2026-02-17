// JS/amis.js

let currentUser = null;
let debounceTimer; // Variable pour le délai de frappe (debounce)

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert("Vous devez être connecté pour accéder au système d'amis.");
        window.location.href = "auth.html";
        return;
    }
    
    currentUser = session.user;

    // 2. Charger les données
    chargerDemandesEnAttente();
    chargerListeAmis();

    // 3. ÉCOUTEUR SUR L'INPUT (Recherche dynamique avec délai)
    const searchInput = document.getElementById('search-friend-input');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer); // Annule la recherche précédente si on tape vite
        const value = e.target.value.trim();
        const dropdown = document.getElementById('search-dropdown');
        
        // Si moins de 2 caractères, on cache la liste
        if (value.length < 2) {
            dropdown.classList.add('d-none');
            return;
        }

        // On attend 300ms après la dernière frappe pour lancer la requête SQL
        debounceTimer = setTimeout(() => {
            rechercheDynamique(value);
        }, 300); 
    });

    // 4. Cacher la liste si on clique ailleurs sur la page
    document.addEventListener('click', (e) => {
        const input = document.getElementById('search-friend-input');
        const dropdown = document.getElementById('search-dropdown');
        
        if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('d-none');
        }
    });
});

// ==========================================
// FONCTION 1 : CHERCHER DES UTILISATEURS
// ==========================================
async function rechercheDynamique(pseudo) {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '<li class="list-group-item bg-dark text-secondary border-secondary">Recherche en cours...</li>';
    dropdown.classList.remove('d-none');

    try {
        // Recherche des profils qui contiennent le texte tapé (insensible à la casse)
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username')
            .ilike('username', `%${pseudo}%`) 
            .neq('id', currentUser.id) // On s'exclut soi-même des résultats
            .limit(5); // Maximum 5 résultats dans la liste

        if (error) throw error;

        if (users.length === 0) {
            dropdown.innerHTML = '<li class="list-group-item bg-dark text-danger border-secondary">Aucun joueur trouvé.</li>';
            return;
        }

        dropdown.innerHTML = '';
        users.forEach(user => {
            dropdown.innerHTML += `
                <li class="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center custom-hover-item">
                    <span class="fw-bold">${user.username}</span>
                    <button class="btn btn-sm btn-warning fw-bold" onclick="envoyerDemande('${user.id}')">Ajouter</button>
                </li>
            `;
        });
    } catch (err) {
        console.error(err);
        dropdown.innerHTML = '<li class="list-group-item bg-dark text-danger border-secondary">Erreur de recherche.</li>';
    }
}

// ==========================================
// FONCTION 2 : ENVOYER UNE DEMANDE D'AMI
// ==========================================
async function envoyerDemande(receiverId) {
    try {
        const { error } = await supabase
            .from('friends')
            .insert([{ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' }]);

        if (error) {
            // Code 23505 = Violation de contrainte UNIQUE (déjà amis ou demande déjà envoyée)
            if (error.code === '23505') {
                alert("Demande déjà envoyée ou vous êtes déjà amis avec ce joueur.");
            } else {
                throw error;
            }
        } else {
            alert("Demande d'ami envoyée avec succès !");
            // On nettoie l'interface
            document.getElementById('search-dropdown').classList.add('d-none');
            document.getElementById('search-friend-input').value = "";
        }
    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'envoi de la demande.");
    }
}

// ==========================================
// FONCTION 3 : CHARGER LES DEMANDES REÇUES
// ==========================================
async function chargerDemandesEnAttente() {
    const container = document.getElementById('pending-requests-container');

    try {
        // On récupère les demandes où l'user est le receveur + on joint la table profiles pour le nom
        const { data: requests, error } = await supabase
            .from('friends')
            .select('id, sender_id, sender:profiles!sender_id(username)')
            .eq('receiver_id', currentUser.id)
            .eq('status', 'pending');

        if (error) throw error;

        if (requests.length === 0) {
            container.innerHTML = `<p class="text-secondary small fst-italic mb-0">Aucune demande en attente.</p>`;
            return;
        }

        container.innerHTML = "";
        requests.forEach(req => {
            const senderName = req.sender ? req.sender.username : "Joueur inconnu"; 

            container.innerHTML += `
                <div class="d-flex justify-content-between align-items-center bg-dark p-2 rounded border border-info mb-2">
                    <span class="text-white fw-bold">${senderName}</span>
                    <div>
                        <button class="btn btn-sm btn-success me-1 fw-bold" onclick="repondreDemande('${req.id}', 'accepted')">✓</button>
                        <button class="btn btn-sm btn-danger fw-bold" onclick="repondreDemande('${req.id}', 'rejected')">✗</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erreur chargement requêtes :", err);
        container.innerHTML = `<p class="text-danger small mb-0">Erreur lors du chargement.</p>`;
    }
}

// ==========================================
// FONCTION 4 : ACCEPTER OU REFUSER
// ==========================================
async function repondreDemande(requestId, action) {
    try {
        if (action === 'accepted') {
            const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
            if (error) throw error;
        } else {
            // Si refusé, on supprime carrément la ligne de la BDD
            const { error } = await supabase.from('friends').delete().eq('id', requestId);
            if (error) throw error;
        }
        
        // On recharge les deux listes pour mettre l'interface à jour
        chargerDemandesEnAttente();
        chargerListeAmis();
    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'action sur la demande.");
    }
}

// ==========================================
// FONCTION 5 : CHARGER LA LISTE D'AMIS
// ==========================================
async function chargerListeAmis() {
    const container = document.getElementById('friends-list-container');

    try {
        // On récupère les relations acceptées où l'user est impliqué (sender OU receiver)
        const { data: friends, error } = await supabase
            .from('friends')
            .select(`
                id, 
                sender_id, 
                receiver_id,
                sender:profiles!sender_id(username),
                receiver:profiles!receiver_id(username)
            `)
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .eq('status', 'accepted');

        if (error) throw error;

        if (friends.length === 0) {
            container.innerHTML = `<div class="col-12"><p class="text-secondary small fst-italic mb-0">Vous n'avez pas encore d'amis ajoutés.</p></div>`;
            return;
        }

        container.innerHTML = "";
        friends.forEach(f => {
            // Déterminer qui est l'ami (en excluant l'utilisateur actuel)
            const isSender = f.sender_id === currentUser.id;
            const friendName = isSender 
                ? (f.receiver ? f.receiver.username : "Inconnu") 
                : (f.sender ? f.sender.username : "Inconnu");

            // On récupère l'ID de l'ami pour le lien de sa Box
            const friendId = isSender ? f.receiver_id : f.sender_id;

            // On prend la première lettre pour faire l'avatar
            const initial = friendName.charAt(0).toUpperCase();

            container.innerHTML += `
                <div class="col-md-12 col-lg-6">
                    <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded border border-secondary" style="box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                        <div class="d-flex align-items-center">
                            <div class="bg-warning rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
                                <span class="text-dark fw-bold fs-5">${initial}</span>
                            </div>
                            <span class="text-white fw-bold text-truncate" style="max-width: 120px;">${friendName}</span>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="box.html?user=${friendId}" class="btn btn-sm btn-info fw-bold">Voir Box</a>
                            <button class="btn btn-sm btn-outline-danger fw-bold" onclick="supprimerAmi('${f.id}')">Retirer</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erreur liste amis :", err);
        container.innerHTML = `<div class="col-12"><p class="text-danger small mb-0">Erreur lors du chargement de la liste.</p></div>`;
    }
}

// ==========================================
// FONCTION 6 : SUPPRIMER UN AMI
// ==========================================
async function supprimerAmi(relationId) {
    if (!confirm("Voulez-vous vraiment retirer ce joueur de votre liste d'amis ?")) return;

    try {
        const { error } = await supabase.from('friends').delete().eq('id', relationId);
        if (error) throw error;
        
        // On recharge la liste une fois supprimé
        chargerListeAmis();
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression de l'ami.");
    }
}