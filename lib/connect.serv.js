import WalletConnectProvider from "@walletconnect/web3-provider";
const infuraConfig = require('../private/infura.config.js');

export default async function walletConnect(providerName, providerInstance){
    if (providerName === "MM"){
        const requestAcc = await providerInstance.eth.requestAccounts().then(response => {
            // response holds the address connected
            console.log("response -->", response);
            return response[0];
        });

        const getChain = await providerInstance.eth.getChainId().then((res) => {
            if (res == 1){
                return {
                    connectedChain: "Ethereum Mainnet",
                    chainId: res
                }
            } else if (res == 122){
                return {
                    connectedChain: "Fuse",
                    chainId: res
                }
            } else {
                const error = new Error('This network is not supported');
                error.code = 310;
                error.connectedAddress = requestAcc;
                error.connectedChain = 'unsupported';
                error.chainId = res;
                throw error;
            }
        });

        return {
            connectedAddress: requestAcc,
            connectedChain: getChain.connectedChain,
            chainId: getChain.chainId
        }
        // Else 'WC' which is Wallet-Connect
    } else {
        // const provider = new WalletConnectProvider({
        //     // For testing only, what is the live ID??
        //     infuraId: infuraConfig.infuraId
        // });
    
        let chainConnected = providerInstance.chainId === 1 ? "Ethereum Mainnet" : "Fuse";

        const wcProviderNext = await providerInstance.enable().then((res) => {
            console.log("wcProviderNext res -->", res);
            return {
                connectedAddress: res[0],
                connectedChain: chainConnected,
                chainId: providerInstance.chainId
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
    if (provider = "MM"){
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



