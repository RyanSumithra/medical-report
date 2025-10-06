
// hardhat.config.js
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // Example testnet: set RPC_URL in .env to your node provider
    sepolia: {
      //url: process.env.RPC_URL || "",
      url: "https://sepolia.infura.io/v3/e3ccdee85f67491a88fe2af1a019dd79",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};