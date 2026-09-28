# Frontend EQUIP-CORE

Interface React 19 + TypeScript + Vite + Tailwind CSS 3, qui communique avec l'API Gateway (`VITE_API_URL`, `http://localhost:4000` par défaut).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (`http://localhost:5173`) |
| `npm run build` | Contrôle des types (`tsc -b`) puis build de production |
| `npm run lint` | Oxlint |
| `npm test` | Tests unitaires de la logique pure (`tsx --test tests/**/*.test.ts`) |

## Fonctionnalités principales

- **Tableau de bord** : indicateurs issus de `GET /dashboard/kpis` et diagrammes (statut, catégorie, type de bénéficiaire, département, évolution des affectations sur la période choisie). Chaque diagramme a une légende chiffrée, un détail au survol et au clavier, et un état vide / chargement / erreur. Un clic sur un statut ouvre la liste des équipements déjà filtrée (`/equipments?status=…`). La fraîcheur des KPIs est affichée et leur reconstruction est accessible à tous.
- **Équipements** : import CSV / Excel en trois étapes (fichier, association des colonnes pré-remplie par l'aperçu serveur, rapport avec erreurs par ligne), export CSV / Excel, statut « À compléter » visible et filtrable.
- **Postes** : création, modification, activation / désactivation et suppression (refusée par le serveur si le poste a une affectation active).
- **Affectations** : à un utilisateur, un département ou un poste ; la liste affiche le bénéficiaire réel et se filtre par type. Le transfert reste réservé aux affectations à un utilisateur.
- **Affectation groupée** : cases à cocher dans la liste des équipements (seuls les « Disponible » sont sélectionnables, « tout sélectionner » porte sur les résultats filtrés) puis « Affecter la sélection », ou sélection multiple avec recherche dans la fenêtre « Nouvelle Affectation ». Jusqu'à 200 équipements par opération, tout ou rien : le rapport indique le nombre affecté, ou la liste des équipements refusés (aucune affectation n'est alors créée). Un seul équipement passe par l'appel unitaire.

## Droits d'accès (état temporaire)

Tous les utilisateurs authentifiés ont les mêmes droits : l'interface ne masque aucune action selon le rôle. La séparation des fonctionnalités par rôle est prévue dans un changement ultérieur.

## Organisation

```text
src/
├── components/charts/   # Diagrammes SVG sans dépendance (barres, anneau, évolution)
├── components/ui/       # Composants génériques (boutons, modales)
├── pages/               # Une page par écran (dashboard, equipments, positions, assignments…)
├── services/api.ts      # Client axios et types de l'API
└── utils/               # Logique pure testée (agrégations, mapping d'import, bénéficiaires)
tests/                   # Tests unitaires de utils/
```

## Notes

- Les envois de fichiers doivent forcer `Content-Type: multipart/form-data` : l'instance axios envoie du JSON par défaut.
- Le style repose sur Tailwind 3 (`tailwind.config.js`, directives `@tailwind`). Ne pas passer `tailwindcss` en v4 sans migrer la configuration.
