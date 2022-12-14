# Obligatorio 2 - blockchain

Bruno Pintos - 214108
Ramiro Gonzalez - 167011

## Descripción del proyecto

Este proyecto se trata de la implementacion de un exchange descentralizado con una implementacion de unico punto de falla que son los owner y la boveda de tokens centralizados.

Tambien permite el pasage de tokens ERC20 del protocolo llamados TETH en ethereum y TPOL en polygon entre redes.

## Gestion del proyecto
El proyecto fue gestionado mediante un github project: https://github.com/orgs/Prog-Contratos-Inteligentes-Blockchain/projects/4/views/1
## Componentes del proyecto

El proyecto esta compuesto por varias carpetas.

### contracts

En esta carpeta se encuentran todos los contratos del proyecto:

-   ERC20_Ethereum
-   ERC20_Polygon
-   Exchange
-   Bridge_Ethereum
-   Bridge_Polygon
    A su vez, hay otros contratos auxiliares, e interfaces (dentro de la carpeta `interfaces`), para no repetir código y encapsular determinadas funcionalidades.

### scripts

En esta carpeta solo se encuentra 1 archivo, el archivo `deploy.js` que deploya los 5 contratos mencionados anteriormente.

### test

En esta carpeta se encuentran todas las pruebas unitarias para los 5 contratos mencionados.

-   token-ethereum.test.js
-   token-polygon.test.js
-   exchange.test.js
-   bridge-ethereum.test.js
-   bridge-polygon.test.js

### web-app

En esta carpeta se encuentra el front-end, una aplicacion React que utiliza los contratos deployados.

## Pasos para hacer el Setup del repositorio

1. Crear un `.env` file en el root del proyecto, y ponerle la información del archivo `.env.sample`

2. De ser necesario, cambiar la configuracion del archivo `hardhat.config.js` (por ejemplo si se quiere deployar en alguna otra red)

3. Instalar dependencias `npm install`

## Pasos para hacer el Deploy del proyecto

Para hacer el deploy del proyecto, depende de en qué red queramos hacerlo, pero tenemos algunos comandos en el package.json:

-   `npm run deploy-hardhat` deployará los contratos en hardhat
-   `npm run deploy-ganache` deployará los contratos en ganache
-   `deploy-goerli` deployará los contratos de Ethereum en goerli (token, exchange y bridge)
-   `deploy-mumbai` deployará los contratos de Polygon en mumbai (token y bridge)
-   `deploy-goerli-mumbai` es una combinación de los dos anteriores, deploya todos los contratos en sus respectivas redes (goerli o mumbai)

Importante: Verificar que tengamos una configuración correcta en `hardhat.config.js` y que tengamos el `.env` completo.

## Pasos para hacer la ejecución del test del proyecto

Para hacer la ejecución del test del proyecto, tenemos 1 comando en el package.json:

-   `npm run test`

Este comando ejecutara todas las pruebas unitarias, para todos los contratos.

## Pasos para la ejecucion de coverage del projecto
```
npm run coverage
```

## Pasos para ejecutar el front end

Leer el `README.md` dentro de la carpeta `web-app`

## Address de contratos deployados en testnet

ERC20_Ethereum: 0x9809F7Ffa67C37ed37a4C2afa2240bdf001D0B1A
ERC20_Polygon: 0x0c569b4Cc5707B276F89a944E087302155b6bF0f
Exchange: 0xE45C3d92a31535716Ba61A35424506Bc6f70EE76
Bridge_Ethereum: 0xf39add3f871E35458F9db18a43EbBC81a28F9a4f
Bridge_Polygon: 0xA6B1D353A9831C1AcB80B20F7f4f0E693951f17a

## Integrantes del equipo

Bruno Pintos - 214108
Ramiro Gonzalez - 167011

# Presentación en video del trabajo

## Descripcion
- El equipo debe realizar una presentación en video del trabajo realizado de 3 a 5 minutos de duración, donde se mostrarán entre otros aspectos los siguientes:
- [ ] Back - Funcionalidades principales desarrolladas
- [ ] Github Project - Cumplimiento de los se pide y tareas a realizar
- [ ] Compilación, test, coverage
- [ ] Deploy del contrato a ganache (para ahorrar costos)
- [ ] Funcionamiento del frontend (En ganche) (En testnet Goerli y Mumbai no funciona correctamente el bridge)
- [ ] Aspectos destacados, como el buen uso de buenas prácticas de codificación y desarrollo.
  - Uso de Herencia: 
    - `Blacklist` para bridges
    - `Validations` para compartir validaciones
    - `ERC20` para compartir implementacion del estandar de token ERC-20
  - Uso de interfaces para exponer metodos de contratos
    - IERC20Ethereum
    - IERC20Polygon
  - Utilizacion de patron `Check-Effect-Interact`
  - Test unitario y TDD para algunas funcionalidades
  - `Ownable` pattern
  - Ahorro de GAS:
    - short circuiting en validaciones (menos costosas primero)
    - tipos de datos (en numeros mayormente uint256 excepto los definidos por letra como decimals)
    - uso de `revert` en lugar de `require`
- [ ] Git - Commits realizados por cada integrante del esquipo y el uso de branches

## Link del video
