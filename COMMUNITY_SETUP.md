# BakhiraFoot — Configuration des commentaires et de la modération

Le module de commentaires utilise une base Redis partagée via l'API REST Upstash. Les identifiants restent uniquement dans les variables d'environnement Vercel; ils ne doivent jamais être placés dans les fichiers du site ni dans GitHub.

## Activer le stockage partagé

1. Crée une base Redis sur https://console.upstash.com/.
2. Dans les paramètres/Connect de la base, copie l'URL REST HTTPS et le token REST.
3. Dans Vercel, ouvre le projet **bakhira-foot** → **Settings** → **Environment Variables**.
4. Ajoute ces deux variables à l'environnement **Production**:
   - **UPSTASH_REDIS_REST_URL** : l'URL REST HTTPS copiée depuis Upstash.
   - **UPSTASH_REDIS_REST_TOKEN** : le token REST secret copié depuis Upstash.
5. Enregistre les variables puis relance un déploiement de Production.

## Comportement

- Les 100 commentaires les plus récents sont partagés entre les visiteurs.
- Le pseudo et le commentaire sont affichés publiquement.
- Les commentaires contenant des insultes/propos obscènes détectés sont refusés; une empreinte SHA-256 de l'adresse IP du réseau est utilisée pour conserver la suspension et limiter les publications.
- Une publication est limitée à une par réseau toutes les 20 secondes.
- Si le stockage n'est pas configuré, l'espace communautaire affiche un message d'indisponibilité et le reste du site continue de fonctionner.

## Limite importante

Le blocage d'accès après une suspension est affiché par community.js sur les pages qui chargent ce script et dépend du même réseau/IP. Ce n'est pas une barrière serveur absolue: un changement de réseau ou la désactivation de JavaScript peut la contourner. Pour une interdiction réellement impossible à contourner, il faut une authentification et un contrôle d'accès côté serveur/edge pour toutes les routes du site.