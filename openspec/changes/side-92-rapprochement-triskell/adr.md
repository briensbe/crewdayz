# ADR: Rapprochement à la volée Triskell vs Crewdayz

## Status
Accepted

## Context
Pour réconcilier les données d'activité Triskell avec Crewdayz, il fallait choisir entre :
1. Stocker les données de chaque import Triskell dans des tables dédiées de Supabase.
2. Traiter le fichier 100% en mémoire côté client à la volée.

## Decision
Nous choisissons le traitement 100% à la volée côté navigateur.

## Consequences
- **Positif** : Aucune modification de schéma en base Supabase, aucun coût de stockage, confidentialité maximale (les données du fichier ne transitent sur aucun serveur), temps de réponse instantané.
- **Négatif** : Pas d'historique persistant des imports passés (un nouveau contrôle nécessite de redéposer le fichier).
