/** À appeler au démarrage : le service refuse de démarrer s'il manque un secret (aucune valeur de repli). */
export const assertSecurityConfig = (...names: string[]) => {
  for (const name of names) {
    if (!process.env[name]) throw new Error(`Variable d'environnement ${name} obligatoire`);
  }
};
