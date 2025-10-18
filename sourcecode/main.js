// On importe les modules Electron pour créer une fenêtre
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
require('@electron/remote/main').initialize();

// Variable pour stocker notre fenêtre principale
let mainWindow;

// Variables pour le jeu C
let gameExecutable = null;
let isGameInitialized = false;

// Fonction pour créer la fenêtre du jeu
function createWindow() {
    // On crée une nouvelle fenêtre
    mainWindow = new BrowserWindow({
        width: 520,  // largeur de la fenêtre
        height: 650, // hauteur de la fenêtre
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        resizable: false, // on ne peut pas redimensionner
        frame: false, // pas de bordures
        transparent: true, // fenêtre transparente
        alwaysOnTop: true, // toujours au premier plan
        skipTaskbar: false, // visible dans la barre des tâches
        icon: path.join(__dirname, 'assets/tomy.ico'), // icône de l'app
        title: 'Tomy Simulator' // titre de la fenêtre
    });

    // On charge notre fichier HTML
    mainWindow.loadFile('index.html');
    
    // On active le module remote pour communiquer avec le HTML
    require('@electron/remote/main').enable(mainWindow.webContents);

    // Quand on ferme la fenêtre, on remet la variable à null
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Quand Electron est prêt, on vérifie l'exécutable puis on crée la fenêtre
app.whenReady().then(async () => {
    try {
        // Chercher l'exécutable du jeu
        const isPackaged = app.isPackaged;
        
        if (isPackaged) {
            // Mode production - utiliser directement le chemin unpacked
            gameExecutable = path.join(process.resourcesPath, 'app.asar.unpacked', 'game.exe');
            console.log('Mode production - Jeu C à:', gameExecutable);
        } else {
            // Mode développement - chercher dans le répertoire courant
            gameExecutable = path.join(__dirname, 'game.exe');
            console.log('Mode développement - Jeu C à:', gameExecutable);
        }
        
        // Vérifier que le fichier existe et est exécutable
        if (!fs.existsSync(gameExecutable)) {
            console.error('Fichier game.exe introuvable à:', gameExecutable);
            gameExecutable = null;
        }
        
        if (!gameExecutable) {
            console.error('Exécutable du jeu C introuvable');
        } else {
            console.log('Jeu C prêt !');
        }
        
        createWindow();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du jeu C:', error);
        createWindow();
    }
});

// Quand toutes les fenêtres sont fermées, on quitte l'application
app.on('window-all-closed', () => {
    // Sur Mac, les apps restent ouvertes même sans fenêtre, mais pas sur Windows/Linux
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Sur Mac, quand on clique sur l'icône du dock, on recrée une fenêtre
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Fonction utilitaire pour exécuter le programme C
function runGameCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        if (!gameExecutable) {
            reject(new Error('Jeu C non compilé'));
            return;
        }
        
        const fullArgs = [command, ...args];
        // Encapsuler le chemin avec des guillemets pour gérer les espaces
        const quotedExecutable = `"${gameExecutable}"`;
        const child = spawn(quotedExecutable, fullArgs, {
            cwd: path.dirname(gameExecutable),
            stdio: 'pipe',
            shell: true
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve(output.trim());
            } else {
                reject(new Error(`Command failed: ${errorOutput || output}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Fonction pour commencer un nouveau jeu
ipcMain.handle('new-game', async (event) => {
    try {
        if (!gameExecutable) {
            return { success: false, error: 'Jeu C non disponible' };
        }
        
        console.log('Initialisation d\'un nouveau jeu...');
        const secretNumber = await runGameCommand('init');
        isGameInitialized = true;
        
        console.log('Nouveau jeu - nombre secret:', secretNumber);
        return { success: true, secretNumber: parseInt(secretNumber) };
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du jeu:', error);
        return { success: false, error: 'Impossible d\'initialiser le jeu' };
    }
});

// Fonction pour vérifier une proposition du joueur
ipcMain.handle('make-guess', async (event, guess) => {
    try {
        if (!gameExecutable) {
            return { success: false, error: 'Jeu C non disponible' };
        }
        
        if (!isGameInitialized) {
            return { success: false, error: 'Aucun jeu en cours' };
        }
        
        console.log('Le joueur a proposé:', guess);
        
        // On vérifie que le nombre est entre 1 et 100
        if (guess < 1 || guess > 100) {
            return { success: false, error: 'Erreur, le nombre doit être entre 1 et 100.' };
        }
        
        const result = await runGameCommand('guess', [guess.toString()]);
        const resultCode = parseInt(result);
        
        console.log('Résultat du jeu C:', resultCode);
        
        // Interpréter le résultat du programme C
        if (resultCode === -999) {
            return { success: false, error: 'Erreur, le nombre doit être entre 1 et 100.' };
        } else if (resultCode === -1) {
            // Trop petit
            return { success: true, result: 'too-low', message: 'Le nombre est trop petit.' };
        } else if (resultCode === 1) {
            // Trop grand
            return { success: true, result: 'too-high', message: 'Le nombre est trop grand.' };
        } else if (resultCode === 0) {
            // Trouvé ! Nettoyer l'état du jeu
            try {
                await runGameCommand('clean');
                isGameInitialized = false;
            } catch (error) {
                console.error('Erreur lors du nettoyage:', error);
            }
            return { success: true, result: 'win', message: 'Bravo, vous avez trouvé le nombre !' };
        } else {
            return { success: false, error: 'Résultat inattendu du jeu' };
        }
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        return { success: false, error: 'Erreur de communication avec le jeu' };
    }
});