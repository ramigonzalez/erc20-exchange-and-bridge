# Obligatorio 2 - website

### Instructions for running the project

1. Copy the artifacts folder created in the last deploy by the blockchain project
   Paste it inside the `web-app/src` folder (this is for the abis)

2. Create a .env file and put the information that is in the .env.sample file in it

3. Run the development server:
    ```bash
    yarn
    yarn start
    ```

### The app has 3 screens:

1. The home screen is where the metamask connection is created, you can connect to metamask in that screen.

2. The exchange screen has the exchange functionality, you can buy Ethers or TETH (tokens from the Ethereum chain) in that screen

3. The bridge screen has the bridge functionality, you can swap between TETH and TPOL (tokens from the Ethereum and Polygon chain respectivelly)

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
