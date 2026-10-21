# BakhiraFoot — configuration des commentaires

## Commentaires partagés

La page d'accueil utilise désormais **Utterances**, un module gratuit qui enregistre les commentaires sous forme de discussions GitHub Issues. Il n'a pas besoin de Redis ni de variables secrètes Vercel.

Le dépôt doit rester public et l'onglet Issues doit être activé (c'est le cas actuellement). Les visiteurs devront se connecter à GitHub pour publier. Les commentaires seront partagés entre tous les visiteurs et pourront être supprimés/modérés depuis les Issues du dépôt.

## Activation unique à faire par le propriétaire

1. Ouvrir [l'application Utterances sur GitHub](https://github.com/apps/utterances).
2. Installer l'application pour le dépôt `azizsaadoun1976-ux/BakhiraFoot` uniquement.
3. Recharger la page d'accueil de BakhiraFoot. Utterances créera automatiquement une Issue de discussion quand le premier commentaire sera publié.

Le code du site ne contient aucun token GitHub ni mot de passe. Ne jamais publier de secret dans un fichier du dépôt.

## À savoir

- Les commentaires sont publics et conservés dans les Issues GitHub.
- Les visiteurs ont besoin d'un compte GitHub pour publier.
- Les commentaires ne sont pas filtrés automatiquement selon le vocabulaire; le propriétaire peut les modérer dans GitHub.
- Le fichier historique `api/community.js` reste présent mais la page d'accueil ne l'utilise plus; aucun stockage Upstash/Redis n'est requis pour le nouveau module.
