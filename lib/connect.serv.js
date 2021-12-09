import WalletConnectProvider from "@walletconnect/web3-provider";
const Web3 = require('web3');
const infuraConfig = require('../private/infura.config.js');
import GReputationABI from '@gooddollar/goodprotocol/artifacts/contracts/governance/GReputation.sol/GReputation.json';

const wrongAddressError = (providerInstance, providerName) => {
  const error = new Error('Not connected to the correct address');
  error.code = 312;
  error.res = {
    providerName: providerName,
    providerInstance: providerInstance
  }
  throw error;
}

export default async function walletConnect(providerName, providerInstance, claimAddress = null){
  if (providerName === "MM"){
    const requestAcc = await providerInstance.eth.requestAccounts().then(response => {
      // console.log("response -->", response);
      return response[0];
    });

    const getChain = await providerInstance.eth.getChainId().then((res) => {
      const connectStatus = {
        wrongAddress: (claimAddress !== requestAcc),
        // wrongAddress: (1 !== 1), // only for local testing
        wrongNetwork: (res !== 1 && res !== 122 && res !== 1337),
        connectChain: (res == 1 || res == 122 || res == 1337)
      }

      const thenDo = {
        wrongAddress: () => {wrongAddressError(providerInstance, providerName)},
        wrongNetwork: () => {
          const error = new Error('This network is not supported');
          error.code = 310;
          error.res = {
            connectedAddress: requestAcc,
            connectedChain: 'unsupported',
            chainId: res,
            providerName: "MM",
            providerInstance: providerInstance
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

      for (const [action, status] of Object.entries(connectStatus)) {
        if (status){
          return thenDo[action]();
        } else {
          // unknown error here
        }
      }
    });

    return {
      providerName: "MM",
      connectedAddress: requestAcc,
      connectedChain: getChain.connectedChain,
      chainId: getChain.chainId,
      providerInstance: providerInstance,
      status: 'connected'
    }
    // Else is Wallet-Connect
  } else {
    const wcProviderNext = await providerInstance.currentProvider.enable().then((res) => {
      // TEMP! For testing WC connection  
      // if (claimAddress !== res[0]){
      //   return {
      //     providerName: "WC",
      //     connectedAddress: res[0],
      //     connectedChain: chainConnected,
      //     chainId: providerInstance.chainId,
      //     providerInstance: providerInstance
      //   }
      // }
      if (claimAddress !== res[0]) {
        providerName = "WC";
        wrongAddressError(providerInstance, providerName);
      } 
      else {
        let chainConnected = providerInstance.currentProvider.chainId === 1 ? "Ethereum Mainnet" : "Fuse";
        return {
          providerName: "WC",
          connectedAddress: res[0],
          connectedChain: chainConnected,
          chainId: providerInstance.currentProvider.chainId,
          providerInstance: providerInstance,
          status: 'connected'
        }
      }
    });
    return wcProviderNext;
  }
}

export async function isConnected(claimAddress) {
  if (claimAddress !== null) {
    let providerName, providerInstance, tryMetamask;
    const web3 = new Web3(Web3.givenProvider || infuraConfig.infuraUrl);
    const Wc3 = new WalletConnectProvider({
      infuraId: infuraConfig.infuraId,
      rpc: {
        1: infuraConfig.infuraUrl,
        122: infuraConfig.pocketUrl,
      }
    });
    const web3wc = new Web3(Wc3);

    let tryWalletConnect = Wc3.wc.accounts;
    if (!tryWalletConnect[0]) {
      tryMetamask = await web3.eth.getAccounts();
    }    
    const isConnected = tryWalletConnect[0] ? 'WC' : tryMetamask[0] ? 'MM' : null;
    if (isConnected) {
      providerName = isConnected,
      providerInstance = tryWalletConnect[0] ? web3wc : web3;
      const providerInit = walletConnect(providerName, providerInstance, claimAddress);
      return providerInit;
    }
  }
}

export async function getClaimStatus(currentConnection) {
  let contractAddressess = {
        fuse: '0x3A9299BE789ac3730e4E4c49d6d2Ad1b8BC34DFf',
        rootState: '0x3A9299BE789ac3730e4E4c49d6d2Ad1b8BC34DFf'
      },
      claimStatus = {
        fuse: false,
        rootState: false
      };

  for (const [network, address] of Object.entries(contractAddressess)){
    let web3 = new Web3( (network == 'rootState' ? infuraConfig.pocketUrl : infuraConfig.infuraUrl));
    const latest = await web3.eth.getBlockNumber();
    const gRepContract = new web3.eth.Contract(GReputationABI.abi, address);
    let idHash = web3.utils.keccak256(network);
    let getVotes = await gRepContract.methods.getVotesAtBlockchain(idHash, currentConnection.connectedAddress, latest).call();
    if (getVotes > 0){
      claimStatus[network] = true;
    }
  }

  return claimStatus;
}

export async function getRecipient(contractInstance, currentConnection) {
  const web3 = new Web3(new Web3.providers.HttpProvider(
      currentConnection.chainId == 122 ? infuraConfig.pocketUrl : infuraConfig.infuraUrl)),
      contractAddr = '0x3A9299BE789ac3730e4E4c49d6d2Ad1b8BC34DFf';

  const gRepContract = contractInstance ? contractInstance 
                        : new web3.eth.Contract(GReputationABI.abi, contractAddr);
  const getRec = await gRepContract.methods.reputationRecipients(currentConnection.connectedAddress).call();
  return {
    contractInstance: gRepContract,
    recipient: getRec
  };
}

export async function getPendingTXStatus(currentConnection, pendingTX){
  const web3 = new Web3(
    (currentConnection.chainId == 1 ? infuraConfig.infuraUrl : infuraConfig.pocketUrl)
  );
  const pendingStatus = await web3.eth.getTransactionReceipt(pendingTX).then((res) => {
    if (res) {
      localStorage.removeItem('pendingNewRec');
      localStorage.removeItem('pendingClaim');
    }
    return res;
  });

  return pendingStatus;
}

export async function setNewRecipient(contractInstance, currentConnection, newRecipient) {
  const gRepContract = contractInstance;
  const setRecABI = gRepContract.methods.setReputationRecipient(newRecipient).encodeABI();
  let params = [{
    "from": currentConnection.connectedAddress,
    "to": gRepContract._address,
    "data": setRecABI
  }];

  const newRecTXStatus = currentConnection.providerInstance.eth.currentProvider.request({
    method: 'eth_sendTransaction',
    params
  }).then((txHash) => {
    localStorage.setItem("pendingNewRec", JSON.stringify(txHash))
    return txHash;
  }).catch((err, receipt) => {
    if (err.message == 'User rejected the transaction') {
      err.code = 4001;
    }
    return err;
  });

  return newRecTXStatus;
}

export async function claimReputation(proofData, currentConnection, contractInstance) {
  // proofData contains method arguments
  // provider is "MM" or "WC"
  // ChainId is 1 for "WC". And either 1 or 122 for "MM"
  let chainStateId = currentConnection.chainId == 1 ? 'fuse' : 'rootState';
  // // Fuse = rootState
  // // Ethereum = Fuse
  const gRepContract = contractInstance;
  const proveBalanceABI = gRepContract.methods.proveBalanceOfAtBlockchain(
    chainStateId,
    proofData.addr,
    proofData.reputationInWei,
    proofData.hexProof,
    proofData.proofIndex
  ).encodeABI();

  let params = [{
    "from": currentConnection.connectedAddress,
    "to": gRepContract._address,
    "data": proveBalanceABI
  }];

  const claimRepStatus = currentConnection.providerInstance.eth.currentProvider.request({
    method: 'eth_sendTransaction',
    params
  }).then((res) => {
    localStorage.setItem("pendingClaim", JSON.stringify(hash));
    return res;
  }).catch((err) => {
    console.log("errrr -->", err);
    if (err.message == 'User rejected the transaction') {
      err.code = 4001;
    }
    return err;
  });

  return claimRepStatus;
}



