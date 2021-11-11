import WalletConnectProvider from "@walletconnect/web3-provider";
const infuraConfig = require('../private/infura.config.js');

const wrongAddressError = () => {
  const error = new Error('Not connected to the correct address');
  error.code = 312;
  throw error;
}

export default async function walletConnect(providerName, providerInstance, claimAddress = null){
  if (providerName === "MM"){
    const requestAcc = await providerInstance.eth.requestAccounts().then(response => {
      // response holds the address connected
      console.log("response -->", response);
      return response[0];
    });

    const getChain = await providerInstance.eth.getChainId().then((res) => {
      const connectScenarios = {
        wrongAddress: (claimAddress !== requestAcc),
        wrongNetwork: (res !== 1 && res !== 122),
        connectChain: (res == 1 || res == 122)
      }

      const thenDo = {
        wrongAddress: wrongAddressError(),
        wrongNetwork: () => {
          const error = new Error('This network is not supported');
          error.code = 310;
          error.res = {
            connectedAddress: requestAcc,
            connectedChain: 'unsupported',
            chainId: res
          }
          throw error;
        },
        connectChain: () => {
          return {
            connectedChain: res == 1 ? "Ethereum Mainnet" : "Fuse",
            chainId: res
          }
        } 
      }

      for (const [key, value] of Object.entries(connectScenarios)) {
        if (value){
          return thenDo[key]();
        } else {
          // unknown error here
        }
      }
    });  
    return {
      connectedAddress: requestAcc,
      connectedChain: getChain.connectedChain,
      chainId: getChain.chainId
    }
    // Else 'WC' which is Wallet-Connect
  } else {
    let chainConnected = providerInstance.chainId === 1 ? "Ethereum Mainnet" : "Fuse";
    const wcProviderNext = await providerInstance.enable().then((res) => {
      if (claimAddress !== res[0]) {
        wrongAddressError();
      } else {
        return {
          connectedAddress: res[0],
          connectedChain: chainConnected,
          chainId: providerInstance.chainId
        }
      }
    });
    return wcProviderNext;
  }
}

export async function claimReputation(contractABI, proofData, provider, chainId) {
  // proofData contains method arguments
  // provider is "MM" or "WC"
  // ChainId is 1 for "WC". And either 1 or 122 for "MM"
  // contractABI is just a placeholder for now

  // GReputation Fuse Contract = 0x0Fce4a964F2b69a6cD82c3FB40C101863091A5a7
  // GReputation Eth Contract = 0x01C4094f179721155D800094821cf0478943B7B8 ?? fuse mainnet??
  const Web3 = require('web3');
  let web3,
      testUrl = infuraConfig.infuraUrl,
      ethAddr = '0x01C4094f179721155D800094821cf0478943B7B8',
      fuseAddr = '0x0Fce4a964F2b69a6cD82c3FB40C101863091A5a7';
  if (provider == "MM"){
    web3 = new Web3(Web3.givenProvider || testUrl);
  } else {
    // Wallet Connect Provider here!
    const provider = new WalletConnectProvider({
    // For testing only, what is the live ID??
      infuraId: infuraConfig.infuraId
    });
    web3 = new Web3(provider);
  }

  let contractAddr = (chainId == 1 ? ethAddr : fuseAddr),
      chainStateId = (chainId == 1 ? 'fuse' : 'rootState');
  const gRepContract = new web3.eth.Contract(contractABI, contractAddr);

  // // Fuse = rootState
  // // Ethereum = Fuse

  // Add Error Handler
  const claimedReputation = gRepContract.methods.proveBalanceOfAtBlockchain(
    chainStateId,
    proofData.addr,
    proofData.reputationInWei,
    proofData.hexProof,
    proofData.proofIndex
  ).call().then((res) => {
    if (res){
      return "Your reputation is succesfully claimed";
    }
  });
  return "succesfully claimed soldier";
}



