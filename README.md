# Video Weaver

Intègre l’API 8Scale dans mon application pour générer des vidéos avec Wan 2.2.

API Models : GET https://api.8scale.com/v1/models

Modèles disponibles :

wan-2.2/14b/text-to-video

wan-2.2/14b/image-to-video

wan-2.2/14b/multi-scene

Pour le Text-to-Video, utilise l'endpoint officiel 8Scale : POST https://8scale.run/wan-2.2/14b/text-to-video

Headers : Authorization: Bearer ${EIGHTSCALE_API_KEY} Content-Type: application/json

Exemple de requête : { "prompt": "A cinematic mountain range at golden hour", "resolution": "480p", "aspect_ratio": "16:9" }

Dans mon application :

Créer un champ pour le prompt.

Ajouter le choix de résolution : 480p, 580p, 720p.

Ajouter le choix de durée disponible.

Envoyer la génération depuis le backend.

Afficher "Génération en cours".

Récupérer le résultat vidéo.

Afficher la vidéo dans un lecteur.

Permettre à l'utilisateur de télécharger la vidéo.

Afficher les erreurs de l'API.

Afficher le coût estimé avant la génération.

IMPORTANT :

Ne jamais mettre EIGHTSCALE_API_KEY dans le frontend.

Stocker la clé dans les variables d'environnement/secrets du backend.

Ne jamais inventer d'endpoint ou de paramètre.

Utiliser les paramètres réellement retournés par https://api.8scale.com/v1/models.

Prévoir une architecture backend/serverless compatible avec Lovable + Vercel.

Pour les prix, utiliser les données de l'API : 480p 3s = $0.010 480p 5s = $0.015 580p 3s = $0.014 580p 5s = $0.024 720p 3s = $0.024 720p 5s = $0.044

Commence par intégrer Wan 2.2 Text-to-Video. Ensuite prépare la structure pour Image-to-Video et Multi-Scene.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fde4508a-e429-4d1d-bfb0-d622f9ae5ea0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
