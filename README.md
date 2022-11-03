# Bridge-Template

## Setup

1. Clonar el repositorio

2. Complete sus datos:
  * NUMERO DE ESTUDIANTE:
  * NOMBRE DE ESTUDIANTE:
  * ADDRESS DE SU CUENTA:
  * ADDRESS DEL CONTRATO:

3. Installar hardhat `npm install hardhat --save-dev`

4. Instalar dependencias `npm install`

5. Complete la información del archivo `.env` en el directorio raiz de la carpeta. Si no utilizará Ganache para sus pruebas quitelo de la configuración.

6. Configure el archivo `hardhat.config.js` según sus necesidades

## Task

Se desea crear un ecosistema financiero basado en blockchain, donde los usuarios puedan comprar y vender token fungibles a cambio de ethers e intercambiarlos entre las redes blockchain de Ethereum y Polygon.

Para esto se requiere el desarrollo de un token fungible que siga el estándar ERC-20 visto en el curso. Además, se deberá desarrollar un Exchange para poder comprar y vender el token fungible y un Bridge para poder interactuar con las redes blockchain mencionadas.

El ecosistema debe poder ser integrado a las DApps de la red de Ethereum y a las DApps de la red de Polygon, por lo que será necesario manejar un bridge (puente) entre ambas redes para poder negocios activos en ambos ecosistemas por medio del token fungible de cada ecosistema.

Las interfaces operativas de algunas de las plataformas le serán definidas por el profesor de la materia, por lo que deberá implementar dichas interfaces en sus contratos inteligentes, así como diseñar e implementar todos los contratos y método auxiliares que sean necesarios.
Debe trabajar de forma flexible, de forma de poder afrontar cambios repentinos en los requerimientos del sistema.

Utilice para todos sus comentarios la nomenclatura definida por ´Ethereum Natural Language Specification Format´ (´natspec´). Referencia: https://docs.soliditylang.org/en/v0.8.16/natspec-format.html

Complete el script de deploy `deploy.js` ubicado en la carpeta 'scripts' y deploye el contrato a la red Goerli.
Complete el script de test `contract.test.js` ubicado en la carpeta 'test'.

Ejecute sus teste con el comando: `npx hardhat test`.

## **IMPORTANTE** Suba sus cambios al repositorio

1. Publicar cambios a su repositorio

`git add .`  
`git commit -m "<<your comments here>>"`  
`git push origin main`