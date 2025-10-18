// Programme pour deviner un nombre mystère
// On inclut les bibliothèques nécessaires
#include <stdlib.h>  // Pour rand() et srand()
#include <stdio.h>   // Pour printf() et scanf()
#include <time.h>    // Pour time()
#include <string.h>  // Pour strcmp()

// Fichier pour sauvegarder l'état du jeu
#define GAME_STATE_FILE "game_state.txt"

// Fonction pour sauvegarder l'état du jeu
void save_game_state(int secret_number) {
    FILE *file = fopen(GAME_STATE_FILE, "w");
    if (file) {
        fprintf(file, "%d\n", secret_number);
        fclose(file);
    }
}

// Fonction pour charger l'état du jeu
int load_game_state() {
    FILE *file = fopen(GAME_STATE_FILE, "r");
    if (file) {
        int secret_number;
        if (fscanf(file, "%d", &secret_number) == 1) {
            fclose(file);
            return secret_number;
        }
        fclose(file);
    }
    return 0; // Aucun état trouvé
}

// Fonction pour initialiser un nouveau jeu
void init_game() {
    srand(time(NULL));
    int secret_number = rand() % 100 + 1;
    save_game_state(secret_number);
}

// Fonction pour faire une supposition (retourne : -1=trop petit, 0=correct, 1=trop grand)
int make_guess(int guess) {
    int secret_number = load_game_state();
    
    if (secret_number == 0) {
        return -998; // Jeu non initialisé
    }
    
    if (guess < 1 || guess > 100) {
        return -999; // Code d'erreur pour nombre hors limites
    }
    
    if (guess < secret_number) {
        return -1; // Trop petit
    } else if (guess > secret_number) {
        return 1;  // Trop grand
    } else {
        return 0;  // Correct !
    }
}

// Fonction pour obtenir le nombre secret (pour debug/test)
int get_secret_number() {
    return load_game_state();
}

// Fonction pour nettoyer l'état du jeu
void clean_game_state() {
    remove(GAME_STATE_FILE);
}

int main(int argc, char *argv[]) {
    // Mode non-interactif (pour Electron)
    if (argc > 1) {
        if (strcmp(argv[1], "init") == 0) {
            init_game();
            printf("%d\n", get_secret_number()); // On renvoie le nombre secret
            return 0;
        } else if (strcmp(argv[1], "guess") == 0 && argc > 2) {
            int guess = atoi(argv[2]);
            int result = make_guess(guess);
            printf("%d\n", result);
            return 0;
        } else if (strcmp(argv[1], "get") == 0) {
            printf("%d\n", get_secret_number());
            return 0;
        } else if (strcmp(argv[1], "clean") == 0) {
            clean_game_state();
            printf("Game state cleaned\n");
            return 0;
        }
    }
    
    // Mode interactif (cmd/exe traditionnel)
    // Déclaration des variables
    int nb1;
    
    // Initialiser le jeu
    init_game();

    // Afficher le titre du jeu
    printf("=== Jeu du nombre mystère ===\n");
    printf("J'ai choisi un nombre entre 1 et 100. À toi de le deviner !\n\n");

    // Boucle principale du jeu
    while (1) {
        // Demander à l'utilisateur de saisir un nombre
        printf("Choisir un nombre entre 1 et 100 : \n");
        scanf("%d", &nb1);
        
        // Utiliser la fonction make_guess pour vérifier
        int result = make_guess(nb1);
        
        // Vérifier si le nombre est dans la bonne plage
        if (result == -999) {
            printf("Erreur, le nombre doit être entre 1 et 100.\n");
            continue; // Recommencer la boucle
        }
        
        // Afficher le nombre choisi par l'utilisateur
        printf("Vous avez choisi le nombre %d.\n", nb1);
        
        // Comparer le nombre saisi avec le nombre mystère
        if (result == -1) {
            printf("Le nombre est trop petit.\n");
        } else if (result == 1) {
            printf("Le nombre est trop grand.\n");
        } else {
            // L'utilisateur a trouvé le bon nombre
            printf("Bravo, vous avez trouvé le nombre %d.\n", get_secret_number());
            break; // Sortir de la boucle
        }
    }
    
    return 0; // Fin du programme
}