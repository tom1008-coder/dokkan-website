// JS/admin_news.js

// 1. VÉRIFICATION DE LA CONNEXION ADMIN
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || session.user.app_metadata.role !== 'admin') {
        alert("Accès Admin requis.");
        window.location.href = "index.html";
        return;
    }

    chargerListeNews();
});

// 2. GESTION DU FORMULAIRE D'AJOUT AVEC UPLOAD D'IMAGE
document.getElementById('news-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const btnSubmit = document.getElementById('btn-submit-news');
    
    // On désactive le bouton et on met un spinner (car l'upload d'image prend quelques secondes)
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Publication en cours...';

    const badgeText = document.getElementById('news-badge-text').value.trim().toUpperCase();
    const badgeColor = document.getElementById('news-badge-color').value;
    const titre = document.getElementById('news-title').value.trim();
    const contenu = document.getElementById('news-content').value.trim();
    
    const fileInput = document.getElementById('news-image-file');
    const urlInput = document.getElementById('news-image-url').value.trim();

    let finalImageUrl = urlInput || null;

    try {
        // === GESTION DE L'UPLOAD D'IMAGE SUR SUPABASE ===
        // Si un fichier a été sélectionné dans l'input file
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop(); // Récupère l'extension (png, jpg...)
            const fileName = `news_${Date.now()}.${fileExt}`; // Génère un nom unique
            const filePath = `news/${fileName}`; // Le met dans un sous-dossier "news"

            // 1. On envoie l'image dans le bucket 'images' (le même que tes persos)
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw new Error("Erreur lors de l'upload de l'image : " + uploadError.message);

            // 2. On récupère le lien public de cette image fraîchement uploadée
            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            finalImageUrl = publicUrlData.publicUrl;
        }

        // === ENVOI DES DONNÉES DE LA NEWS DANS LA TABLE ===
        const { error } = await supabase.from('news').insert([{
            badge_text: badgeText,
            badge_color: badgeColor,
            titre: titre,
            contenu: contenu,
            image_url: finalImageUrl // Contient soit le lien uploadé, soit le lien texte, soit null
        }]);

        if (error) throw error;

        alert("✅ News publiée avec succès !");
        
        // On vide le formulaire
        document.getElementById('news-form').reset();
        
        // On recharge le tableau
        chargerListeNews();

    } catch (err) {
        console.error("Erreur d'ajout :", err);
        alert("❌ Erreur : " + err.message);
    } finally {
        // On remet le bouton à son état normal
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'PUBLIER LA NEWS';
    }
});

// 3. FONCTION POUR CHARGER ET AFFICHER LE TABLEAU DES NEWS
async function chargerListeNews() {
    const tbody = document.getElementById('news-list-table');
    
    try {
        const { data: newsData, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = ""; 

        if (!newsData || newsData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-secondary py-3">Aucune news dans la base de données.</td></tr>`;
            return;
        }

        newsData.forEach(news => {
            const dateObj = new Date(news.created_at);
            const dateStr = dateObj.toLocaleDateString('fr-FR');
            
            const isDarkText = news.badge_color === 'bg-warning' || news.badge_color === 'bg-info';
            const badgeTextColor = isDarkText ? 'text-dark' : 'text-white';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="small text-white-50 align-middle">${dateStr}</td>
                <td class="align-middle"><span class="badge ${news.badge_color} ${badgeTextColor}">${news.badge_text}</span></td>
                <td class="text-start align-middle text-truncate" style="max-width: 200px;">${news.titre}</td>
                <td class="align-middle">
                    <button class="btn btn-sm btn-outline-danger" onclick="supprimerNews(${news.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erreur de chargement :", err);
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger py-3">Erreur de chargement.</td></tr>`;
    }
}

// 4. FONCTION POUR SUPPRIMER UNE NEWS
async function supprimerNews(id) {
    if (!confirm("⚠️ Es-tu sûr de vouloir supprimer cette news définitivement ?")) {
        return;
    }

    try {
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) throw error;

        chargerListeNews();

    } catch (err) {
        console.error("Erreur de suppression :", err);
        alert("❌ Erreur lors de la suppression : " + err.message);
    }
}