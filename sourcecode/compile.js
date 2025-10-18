// Script pour compiler automatiquement main.c
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function compileMainC() {
    return new Promise((resolve, reject) => {
        // Nom de l'exécutable selon l'OS
        const exeName = process.platform === 'win32' ? 'game.exe' : 'game';
        const exePath = path.join(__dirname, exeName);
        
        // Commande de compilation selon l'OS
        let compileCmd, compileArgs;
        
        if (process.platform === 'win32') {
            // Windows - essayer gcc d'abord, puis cl si MSVC est disponible
            compileCmd = 'gcc';
            compileArgs = ['-o', exeName, 'main.c'];
        } else {
            // Linux/Mac
            compileCmd = 'gcc';
            compileArgs = ['-o', exeName, 'main.c'];
        }
        
        console.log('Compilation du fichier main.c...');
        console.log(`Commande: ${compileCmd} ${compileArgs.join(' ')}`);
        
        const compiler = spawn(compileCmd, compileArgs, {
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        let errorOutput = '';
        
        compiler.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        compiler.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Compilation réussie !');
                console.log(`Exécutable créé: ${exePath}`);
                resolve(exePath);
            } else {
                console.error('❌ Erreur de compilation:');
                console.error(errorOutput);
                reject(new Error(`Compilation failed with code ${code}: ${errorOutput}`));
            }
        });
        
        compiler.on('error', (error) => {
            if (error.code === 'ENOENT') {
                console.error('❌ gcc n\'est pas installé ou introuvable');
                console.error('Veuillez installer gcc ou MinGW pour compiler le code C');
                reject(new Error('gcc not found. Please install gcc or MinGW.'));
            } else {
                reject(error);
            }
        });
    });
}

// Si ce script est appelé directement
if (require.main === module) {
    compileMainC().catch(console.error);
}

module.exports = compileMainC;