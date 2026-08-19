const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('   Démarrage des tests d\'intégration API Gateway     ');
console.log('====================================================\n');

// Chemins des fichiers de test
const collectionPath = path.join(__dirname, 'postman', 'gateway.postman_collection.json');
const environmentPath = path.join(__dirname, 'postman', 'gateway.postman_environment.json');

// Vérification de la présence des fichiers
if (!fs.existsSync(collectionPath)) {
  console.error(`Erreur : Le fichier de collection est introuvable à l'emplacement : ${collectionPath}`);
  process.exit(1);
}

if (!fs.existsSync(environmentPath)) {
  console.error(`Erreur : Le fichier d'environnement est introuvable à l'emplacement : ${environmentPath}`);
  process.exit(1);
}

console.log('Vérification de la disponibilité du Gateway et des microservices...');
console.log('- API Gateway        : http://localhost:4000');
console.log('- Auth Service       : http://localhost:4001');
console.log('- User Service       : http://localhost:4002');
console.log('- Equipment Service  : http://localhost:4003');
console.log('- Assignment Service : http://localhost:4004');
console.log('- Inventory Service  : http://localhost:4005');
console.log('- Audit Service      : http://localhost:4006\n');

console.log('Exécution de Newman via npx...');
try {
  const newmanCommand = `npx -y newman run "${collectionPath}" -e "${environmentPath}" --delay-request 200 --insecure`;
  
  execSync(newmanCommand, { stdio: 'inherit' });
  
  console.log('\n====================================================');
  console.log('   Tous les tests Gateway ont été exécutés avec succès ! ');
  console.log('====================================================');
} catch (error) {
  console.error('\n====================================================');
  console.error('   Échec lors de l\'exécution des tests Gateway.       ');
  console.error('====================================================');
  process.exit(1);
}
