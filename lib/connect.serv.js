import WalletConnectProvider from "@walletconnect/web3-provider";
const Web3 = require('web3');
// const infuraConfig = require('../private/infura.config.js');
import GReputationABI from '@gooddollar/goodprotocol/artifacts/contracts/governance/GReputation.sol/GReputation.json';
import contracts from '@gooddollar/goodprotocol/releases/deployment.json';

const EthHttps = process.env.NEXT_PUBLIC_ETH_HTTPS,
      EthId = process.env.NEXT_PUBLIC_ETH_ID,
      FuseHttps = process.env.NEXT_PUBLIC_FUSE_HTTPS;

const wrongAddressError = (providerInstance, providerName) => {
  const error = new Error('Not connected to the correct address');
  error.code = 312;
  error.res = {
    providerName: providerName,
    providerInstance: providerInstance
  }
  throw error;
}

/** 
 * @notice Connects the wallet to the dapp
 * @dev Cancellation of connection by user using wallet-connect doesn't return anything
 * so it does local reset after 40 seconds
 * @param providerName custom provider name for local usage
 * @param providerInstance web3 instance of either MetaMask or Wallet-Connect
 * @param claimAddress adress to claim GOOD
 * @return object with connected wallet information, later referred to as 'currentConnection'
 * @return error object when it's not the claim-address or wrong network 
 */

export default async function walletConnect(providerName, providerInstance, claimAddress = null){
  if (providerName === "MM"){
    const requestAcc = await providerInstance.eth.requestAccounts().then(response => {
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

/**
 * @notice Checks if a user has an existing connection
 * @param claimAddress address with GOOD tokens to claim
 * @return provider instance and connect wallet information
 */

export async function isConnected(claimAddress) {
  if (claimAddress !== null) {
    let providerName, providerInstance, tryMetamask;
    const web3 = new Web3(Web3.givenProvider || EthHttps);
    const Wc3 = new WalletConnectProvider({
      infuraId: EthId,
      rpc: {
        1: EthHttps,
        122: FuseHttps,
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

/**
 * @notice Checks if a user already claimed their tokens on a network
 * @param currentConnection contains all the necessary information of the connected wallet
 * @return boolean's for claim-status per network
 */
export async function getClaimStatus(currentConnection) {
  let contractAddressess = {
      productionMain: contracts['production-mainnet'].GReputation,
      production: contracts.production.GReputation
  },
      claimStatus = {
        productionMain: false,
        production: false
      };

  for (const [network, address] of Object.entries(contractAddressess)){
    let web3 = new Web3( (network == 'production' ? FuseHttps : EthHttps));
    const latest = await web3.eth.getBlockNumber();
    const gRepContract = new web3.eth.Contract(GReputationABI.abi, address);
    let idHash = web3.utils.keccak256( (network == 'production' ? 'rootState' : 'fuse') );
    let getVotes = await gRepContract.methods.getVotesAtBlockchain(idHash, currentConnection.connectedAddress, latest).call();
    if (getVotes > 0){
      claimStatus[network] = true;
    }
  }

  return claimStatus;
}


/**
 * @notice gets the current set recipient for _user from contract.
 * @param contractInstance contract instance for connected network. is set when a user is clicking through tabs,
 * is null on first mount.
 * @param currentConnection necessary information of the connected wallet
 * @return contractInstance and current recipient. Is empty address when none is set (default: _user)
 * @dev_notice contractAddr is same for eth/fuse so in this instance no need to get them seperately for different network
 */
export async function getRecipient(contractInstance, currentConnection) {
  const web3 = new Web3(new Web3.providers.HttpProvider(
      currentConnection.chainId == 122 ? FuseHttps : EthHttps)),
      contractAddr = contracts.production.GReputation;

  const gRepContract = contractInstance ? contractInstance 
                        : new web3.eth.Contract(GReputationABI.abi, contractAddr);
  const getRec = await gRepContract.methods.reputationRecipients(currentConnection.connectedAddress).call();
  return {
    contractInstance: gRepContract,
    recipient: getRec
  };
}


/**
 * @notice checks the status of any pending transactions. if confirmed, clears localStorage
 * @param currentConnection necessary information of the connected wallet 
 * @param pendingTX transaction hash of last claim/setNewRecipient
 * @return pending transaction status
 */
export async function getPendingTXStatus(currentConnection, pendingTX){
  const web3 = new Web3(
    (currentConnection.chainId == 1 ? EthHttps : FuseHttps)
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


/**
 * @notice sends setReputationRecipient request to contract with new Recipient.
 * sets localStorage item for pending transaction
 * @param contractInstance contract instance for connected network. Set by getRecipient.
 * @param currentConnection necessary information of the connected wallet
 * @param newRecipient new address which will receive GOOD tokens for _user
 * @return pending transaction hash. Or cancell error object.
 */
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

/**
 * @notice send claim request to GReputation contract
 * @param proofData array of proof data (currently merkle tree path)
 * @param currentConnection necessary information of the connected wallet 
 * @param contractInstance contract instance for connected network. Set by getRecipient.
 * @return pending transaction hash. Or user declined error object
 */
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
    if (err.message == 'User rejected the transaction') {
      err.code = 4001;
    }
    return err;
  });

  return claimRepStatus;
}



