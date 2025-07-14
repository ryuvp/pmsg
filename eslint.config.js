// eslint.config.js (CommonJS)
import js from "@eslint/js";
export default [
  js.configs.recommended,
  {
    files           : ["**/*.js"],
    languageOptions : {
      ecmaVersion : "latest",
      sourceType  : "module",
      globals     : {
        console        : "readonly",
        window         : "readonly",
        document       : "readonly",
        setTimeout     : "readonly",
        setInterval    : "readonly",
        clearInterval  : "readonly",
        localStorage   : "readonly",
        sessionStorage : "readonly",
        hashMd5        : "readonly",
        __dirname      : "readonly",
        URL            : "readonly",
        // Agrega aquí cualquier otra global que uses
      }
    },
    plugins : { vue },
    rules   : {
      "indent"      : ["error", 2],
      "key-spacing" : [
        "error",
        {
          "singleLine" : { beforeColon: false, afterColon: true },
          "multiLine"  : { beforeColon: true, afterColon: true, align: "colon" }
        }
      ]
    }
  }
];
