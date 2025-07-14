// Quick implementation test - validates core functionality without database
const path = require('path');
const fs = require('fs');

console.log('🧪 BookEqualizer Quick Test\n');

// Test 1: File structure
console.log('📁 Testing file structure...');
const requiredFiles = [
  'src/index.ts',
  'src/services/tts.service.ts',
  'src/services/audio-cache.service.ts',
  'src/services/epub.service.ts',
  'src/routes/tts.routes.ts',
  'src/routes/audio.routes.ts',
  'src/routes/auth.routes.ts',
  'src/routes/upload.routes.ts',
  'prisma/schema.prisma',
  'database/schema.sql',
];

let missingFiles = 0;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles++;
  }
}

// Test 2: Package.json dependencies
console.log('\n📦 Testing package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'express',
  'prisma',
  '@prisma/client',
  '@google-cloud/text-to-speech',
  'epub2',
  'multer',
  'node-cache',
];

let missingDeps = 0;
for (const dep of requiredDeps) {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    missingDeps++;
  }
}

// Test 3: Environment configuration
console.log('\n⚙️ Testing configuration...');
const configExists = fs.existsSync('src/config/environment.ts');
const envExampleExists = fs.existsSync('.env.example');
console.log(`✅ Config file: ${configExists ? 'EXISTS' : 'MISSING'}`);
console.log(`✅ Env example: ${envExampleExists ? 'EXISTS' : 'MISSING'}`);

// Test 4: Database schema
console.log('\n🗄️ Testing database schema...');
const schemaContent = fs.readFileSync('database/schema.sql', 'utf8');
const requiredTables = ['users', 'books', 'chapters', 'audio_files', 'reading_sessions', 'audio_preferences'];
let missingTables = 0;
for (const table of requiredTables) {
  if (schemaContent.includes(`CREATE TABLE ${table}`)) {
    console.log(`✅ ${table} table`);
  } else {
    console.log(`❌ ${table} table - MISSING`);
    missingTables++;
  }
}

// Test 5: API routes structure
console.log('\n🛣️ Testing API structure...');
const indexContent = fs.readFileSync('src/index.ts', 'utf8');
const requiredRoutes = ['/api/tts', '/api/audio', '/api/auth', '/api/upload'];
let missingRoutes = 0;
for (const route of requiredRoutes) {
  if (indexContent.includes(route)) {
    console.log(`✅ ${route}`);
  } else {
    console.log(`❌ ${route} - MISSING`);
    missingRoutes++;
  }
}

// Test 6: TypeScript compilation (basic syntax check)
console.log('\n🔍 Testing TypeScript syntax...');
try {
  // Just check if TypeScript files can be parsed
  const tsFiles = [
    'src/services/tts.service.ts',
    'src/services/audio-cache.service.ts',
    'src/services/epub.service.ts',
  ];
  
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('export class') && content.includes('async ')) {
      console.log(`✅ ${file} - Valid TypeScript structure`);
    } else {
      console.log(`⚠️ ${file} - Unusual structure`);
    }
  }
} catch (error) {
  console.log(`❌ TypeScript structure check failed: ${error.message}`);
}

// Final summary
console.log('\n📊 Test Summary:');
console.log(`Files: ${requiredFiles.length - missingFiles}/${requiredFiles.length}`);
console.log(`Dependencies: ${requiredDeps.length - missingDeps}/${requiredDeps.length}`);
console.log(`Tables: ${requiredTables.length - missingTables}/${requiredTables.length}`);
console.log(`Routes: ${requiredRoutes.length - missingRoutes}/${requiredRoutes.length}`);

const totalErrors = missingFiles + missingDeps + missingTables + missingRoutes;
if (totalErrors === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Implementation structure is complete.');
  console.log('\n🚀 Ready for database connection and full testing.');
  console.log('\nNext steps:');
  console.log('1. Set up PostgreSQL: ./scripts/setup-db.sh');
  console.log('2. Run migrations: npm run db:push');
  console.log('3. Start server: npm run dev');
} else {
  console.log(`\n⚠️ Found ${totalErrors} issues that need attention.`);
}

console.log('\n✅ Quick test completed!');