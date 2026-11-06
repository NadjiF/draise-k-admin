// Configuration d'ESLint (npm run lint).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Règles recommandées de JavaScript, puis celles de TypeScript
  // qui s'appuient sur les types (promesses oubliées, any, etc.).
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // ESLint demande les types à TypeScript, avec notre tsconfig.json.
        projectService: {
          // Ce fichier n'est pas dans tsconfig.json : on l'autorise à part.
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Un paramètre préfixé par _ est volontairement inutilisé. Exemple :
      // Express ne reconnaît un gestionnaire d'erreurs qu'à ses 4 paramètres.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
