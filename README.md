TL;DR: <span color="red">Ce dépôté est déprécié. Voir le repo egapro-next pour la partie consultation.</span>

# Site EgaPro de consultation

## Installation

Ce projet est un site statique qui utilise un makefile.

```shell
cd egapro-consultation
gmake serve # lance le site sur le port 8000
```

## Créer une release

Il faut utiliser le script release-prod.

```shell
gmake release-prod
```

Cela va créer un tag qui contiendra le code se trouvant sur le répertoire à ce moment-là.

Note :
- il va mettre à jour une branche distante deploy
- il va créer 2 tags (nom-du-jour et nom-du-jour-published) contenant le code source

