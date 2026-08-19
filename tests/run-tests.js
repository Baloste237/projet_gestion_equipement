const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('   Démarrage des tests d\'intégration Microservices   ');
console.log('====================================================\n');

// Chemins des fichiers de test
const collectionPath = path.join(__dirname, 'postman', 'microservices.postman_collection.json');
const environmentPath = path.join(__dirname, 'postman', 'local.postman_environment.json');

// Vérification de la présence des fichiers
if (!fs.existsSync(collectionPath)) {
  console.error(`Erreur : Le fichier de collection est introuvable à l'emplacement : ${collectionPath}`);
  process.exit(1);
}

if (!fs.existsSync(environmentPath)) {
  console.error(`Erreur : Le fichier d'environnement est introuvable à l'emplacement : ${environmentPath}`);
  process.exit(1);
}

console.log('Vérification de la disponibilité des microservices...');
console.log('Veuillez vous assurer que tous les microservices tournent en tâche de fond.');
console.log('- Port 4001 (auth-service)');
console.log('- Port 4002 (user-service)');
console.log('- Port 4003 (equipment-service)');
console.log('- Port 4004 (assignment-service)');
console.log('- Port 4005 (inventory-service)');
console.log('- Port 4006 (audit-service)\n');

console.log('Exécution de Newman via npx...');
try {
  // Commande newman avec npx
  // --delay-request 200 : Délai de 200ms entre chaque requête pour permettre aux services
  // et aux files d'attente RabbitMQ de traiter les messages asynchrones.
  const newmanCommand = `npx -y newman run "${collectionPath}" -e "${environmentPath}" --delay-request 200 --insecure`;
  
  execSync(newmanCommand, { stdio: 'inherit' });
  
  console.log('\n====================================================');
  console.log('   Tous les tests ont été exécutés avec succès !     ');
  console.log('====================================================');
} catch (error) {
  console.error('\n====================================================');
  console.error('   Échec lors de l\'exécution des tests.             ');
  console.error('====================================================');
  process.exit(1);
}
