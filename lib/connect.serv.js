import WalletConnectProvider from "@walletconnect/web3-provider";
const Web3 = require('web3');
const infuraConfig = require('../private/infura.config.js');
let testUrl = infuraConfig.ropstenUrl;
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
    // Else 'WC' which is Wallet-Connect
  } else {
    let chainConnected = providerInstance.chainId === 1 ? "Ethereum Mainnet" : "Fuse";
    const wcProviderNext = await providerInstance.enable().then((res) => {
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
        return {
          providerName: "WC",
          connectedAddress: res[0],
          connectedChain: chainConnected,
          chainId: providerInstance.chainId,
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
    let providerName, connectedAddress, providerInstance;
    let web3 = new Web3(Web3.givenProvider || testUrl);
    const Wc3 = new WalletConnectProvider({
      infuraId: infuraConfig.infuraId
    });

    let tryWalletConnect = Wc3.wc.accounts;

    const tryMetamask = web3.eth.getAccounts().then((res) => {
      if (res.length !== 0){
        providerName = "MM",
        connectedAddress = res[0],
        providerInstance = web3;
        const providerInit = walletConnect(providerName, providerInstance, claimAddress);
        return providerInit;
        // return {connectedAddress: connectedAddress, providerName: providerName,
        //         providerInstance: providerInstance};
      }
    });

    if (tryWalletConnect.length > 0){
      providerName = "WC";
      connectedAddress = tryWalletConnect[0];
      let connectedChain = 'Ethereum Mainnet';
      let chainId = 1;
      providerInstance = Wc3;
      return {
        providerName: providerName,
        connectedAddress: connectedAddress,
        connectedChain: connectedChain,
        chainId: chainId,
        providerInstance: providerInstance,
        status: 'connected'
      };
    } else {
      return tryMetamask;
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
  console.log("current connection connect.serv -->", currentConnection);
  let web3 = currentConnection.providerInstance,
      contractAddr = '0x3A9299BE789ac3730e4E4c49d6d2Ad1b8BC34DFf';
  // TODO!: change contract back to the correct GoodDollar Contract
  // TODO!: Fetch abi from ?????
  const gRepContract = contractInstance ? contractInstance 
                        : new web3.eth.Contract(GReputationABI.abi, contractAddr);
  const getRec = await gRepContract.methods.reputationRecipients(currentConnection.connectedAddress).call();
  return {
    contractInstance: gRepContract,
    recipient: getRec
  };
}

export async function getPendingTXStatus(currentConnection, pendingTX){
  const pendingStatus = await currentConnection.providerInstance.eth.getTransactionReceipt(pendingTX).then((res) => {
    if (res) {
      localStorage.removeItem('pendingTransaction');
      localStorage.removeItem('pendingClaim');
    }
    return res;
  });

  return pendingStatus;
}

export async function setNewRecipient(contractInstance, currentConnection, newRecipient) {
  const gRepContract = contractInstance;
  let stateHash = currentConnection.providerInstance.utils.keccak256('fuse');
  const setRecipient =  await gRepContract.methods
                             .setReputationRecipient(newRecipient)
                             .send({from: currentConnection.connectedAddress})
                             .on('transactionHash', function(hash){ 
                              console.log('on transaction hash, hash -->', hash);
                              localStorage.setItem("pendingNewRec", JSON.stringify(hash));
                             })
                             .on('confirmation', function(confirmationNumber, receipt){
                                // not triggered during normal proces > receipt?
                                // console.log('on confirmation, confirmationNumber -->', confirmationNumber);
                                // console.log('on confirmation, receipt', receipt);
                             })
                             .on('receipt', function(receipt){ 
                               console.log('on receipt -->', receipt);
                               localStorage.removeItem('pendingNewRec');
                             });
  return setRecipient;
}

export async function claimReputation(proofData, currentConnection) {
  // proofData contains method arguments
  // provider is "MM" or "WC"
  // ChainId is 1 for "WC". And either 1 or 122 for "MM"
  let web3 = currentConnection.providerInstance;
  let contractAddr = '0x3A9299BE789ac3730e4E4c49d6d2Ad1b8BC34DFf',
      chainStateId = (currentConnection.chainId == 1 ? 'fuse' : 'rootState');
  // // Fuse = rootState
  // // Ethereum = Fuse
      const gRepContract = new web3.eth.Contract(GReputationABI.abi, contractAddr);
  // TODO: Add Error Handler
  const claimedReputation = await gRepContract.methods.proveBalanceOfAtBlockchain(
    chainStateId,
    proofData.addr,
    proofData.reputationInWei,
    proofData.hexProof,
    proofData.proofIndex
  ).send({from: currentConnection.connectedAddress})
   .on('transactionHash', function(hash){ 
    console.log('prove balance hash -->', hash);
    localStorage.setItem("pendingClaim", JSON.stringify(hash));
   })
   .on('confirmation', function(confirmationNumber, receipt){
      // console.log('on confirmation, confirmationNumber -->', confirmationNumber);
      // console.log('on confirmation, receipt', receipt);
   })
   .on('receipt', function(receipt){ 
     if (receipt) {
       return receipt;
     }
     localStorage.removeItem('pendingClaim');
   });
  //  .on('error', function(error, receipt) {
  //    console.log('proveBalance on error, error -->', error);
  //   return error;
  //  })
  return claimedReputation;
}



