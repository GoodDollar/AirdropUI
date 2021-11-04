import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import CircularProgress from '@mui/material/CircularProgress';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import WalletConnectProvider from "@walletconnect/web3-provider";

import walletConnect, {claimReputation} from '../../lib/connect.serv.js';

const infuraConfig = require('../../private/infura.config.js');

const Web3 = require('web3');
let testUrl = infuraConfig.infuraUrl;

const SwitchAndConnectButton = styled(Button)({
  height: "100px",
  width: "100px",
  backgroundSize: "90%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundColor: "#9c27b0",
  '&.chain-connected': {
      backgroundColor: "#00C3AE",
      '&:hover': {
          backgroundColor: "#049484"
      }
  },  
  '&:hover': {
      backgroundColor: "#60156c"
  }
});

const ErrorSpan = ({message}) => {
  return (
      <Typography variant="span" color="red">
          {message}
      </Typography> 
  );
}

export default function Claim(props) {
  const [claimAddress, setClaimAddress] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [connectedProvider, setConnectedProvider] = useState(null);
  const [errorMessage, setError] = useState(null);
  const [connectedChain, setConnectedChain] = useState(null);
  const [initProvider] = useState('init');
  const [chainId, setChainId] = useState(null);
  const {onClose, open} = props;
  const [query, setQuery] = useState('init');
  const [gRep, setGRep] = useState(null);
  const [providerInstance, setProviderInstance] = useState(null);

  let queryConnectionErrors = ['cancelled', 'wrong-address', 'pending'].join(":");

  // This should be with one useEffect?
  
  const connectedAddressRef = useRef(connectedAddress);
  const connectedChainRef = useRef(connectedChain);
  const providerInstanceRef = useRef(providerInstance);
  const claimAddressRef = useRef(claimAddress);
  
  useEffect(() => {
    connectedChainRef.current = connectedChain;
  }, [connectedChain]);

  useEffect(() => {
    connectedAddressRef.current = connectedAddress;
  }, [connectedAddress]);

  useEffect(() => {
    providerInstanceRef.current = providerInstance;
  }, [providerInstance]);

  useEffect(() => {
    claimAddressRef.current = claimAddress;
  }, [claimAddress]);
  
  // Chain changed triggered both through app-button and manual through wallet
  const providerInit = useCallback((providerName, provInstanceRef) => {
    if (providerName == "MM") {
      let supportedChains = ['0x7a', '0x1', 1, 122].join(':');
          
      // Docs state that a window reload is recommended?
      provInstanceRef.eth.currentProvider.on('chainChanged', (chainId) => {
        if (supportedChains.indexOf(chainId) !== -1) {
          setError(null);
          setQuery('idle');
          setConnectedChain(chainId == "0x7a" ? "Fuse": "Ethereum Mainnet");
          setChainId(chainId == "0x7a" ? 122 : 1);
        } else {
          let res = {
            connectedChain: connectedChainRef.current,
            chainId: chainId,
            connectedAddress: connectedAddressRef.current,
          };
          wrongNetwork(res, providerName);
        }
      });

      // TODO: Handle connection of multiple accounts
      provInstanceRef.eth.currentProvider.on('accountsChanged', (res) => {
        if (res.length === 0) {
          disconnect();
        }
      });
    } else {
      provInstanceRef.on("accountsChanged", (accounts) => {
        // runs on every connection through the WC provider
        console.log('wc accounts changed --> accounts -->', accounts);
      });

      provInstanceRef.on("connect", () => {
        // after clicking connect button in wallet
        console.log('wc connect');
      });

      provInstanceRef.on("chainChanged", (chainId) => {
        console.log("wc chainChanged");
        // do stuff
      })

      provInstanceRef.on("disconnect", (code, res) =>{
        // code 1000 == disconnect
        disconnect();
      });
    }
  }, [initProvider]);

  // Check if user is already connected with metamask/wallet-connect on initialization.
  useEffect(() => {
    setClaimAddress(props.proofData.addr);
    let gRep = props.proofData.reputationInWei / 1e18;
    setGRep(gRep);

    let providerName;
    let web3 = new Web3(Web3.givenProvider || testUrl);
    const Wc3 = new WalletConnectProvider({
      infuraId: infuraConfig.infuraId
    });

    let tryWalletConnect = Wc3.wc.accounts;
    const tryMetamask = web3.eth.getAccounts().then((res) => {
      if (res.length !== 0){
        console.log("trymetamask res -->", res);
        return res[0];
      }
    });

    if (tryWalletConnect.length > 0){
      providerName = "WC";
      setConnectedAddress(tryWalletConnect[0]);
      connectForClaim(providerName);
    } else {
      tryMetamask.then((res) => {
        if (res) {
          providerName = "MM";
          setConnectedAddress(res);
          setProviderInstance(web3);
          providerInit(providerName, providerInstanceRef.current);
          connectForClaim(providerName);
        }
      });
    }
    // TODO: WC and Metamask should not? be able to be both connected
  }, [providerInit]);

  const connectForClaim = async (providerName) => {
    // Provider {
    //     "MM" for METAMASK
    //     "WC" for WalletConnect
    // }
    if (query !== 'idle') {
      setQuery('idle');
    }

    setQuery('loading-connect');

    let conAddr;

    if (!providerInstanceRef.current && providerName == "MM"){
      // user is not connected yet
      const web3 = new Web3(Web3.givenProvider || testUrl);
      setProviderInstance(web3);
      providerInit(providerName, web3);
      conAddr = walletConnect(providerName, web3);
    } else if (providerInstanceRef.current && providerName == "MM") {
      // user has exisiting MetaMask connection(s)
      conAddr = walletConnect(providerName, providerInstanceRef.current);
    } else {
      const Wc3 = new WalletConnectProvider({
        infuraId: infuraConfig.infuraId
      });
      setProviderInstance(Wc3);
      providerInit(providerName, Wc3);

      // TODO: If user closes modal from the dapp, a proper error is returned
      //       If user declines the connection from wallet, nothing returns, and below promise return
      //       stays pending
      conAddr = walletConnect(providerName, Wc3);
    }

    conAddr.then((res) => {
      // Temp, just for testing Wallet-Connect
      // if (res.connectedAddress !== claimAddressRef.current && res.connectedAddress !== infuraConfig.TrustWallet) {
      if (res.connectedAddress !== claimAddressRef.current){
        setError('Sorry, you are not connected to the right address. '+ 
                  'Please disconnect first, then retry with the eligible address.');
        setQuery('wrong-address');
      } else {
        console.log('successfully connected');
        success(res, providerName);
      }
    }).catch((err) => {
      console.log('errorrrr -->', err);
      if (err.message == 'User closed modal'){
        err.code = 311;
      }
      switch (err.code) {
        case 4001:
        case 311: 
          cancelled();
          break;
        case -32002: 
          pending();
          break;
        case 310:
          wrongNetwork(err, providerName);
          break;
      } 
    });
  }

  const addFuseNetwork = async(id) => {
    setQuery("loading-connect");

    providerInstanceRef.current.eth.currentProvider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: id,
        chainName: 'Fuse Mainnet',
        nativeCurrency: {
          name: 'Fuse',
          symbol: 'FUSE',
          decimals: 18
        },
          rpcUrls: ['https://rpc.fuse.io'],
          blockExplorerUrls: ['https://explorer.fuse.io']
        }],
    }).catch((err) => {
      switch (err.code) {
        case -32002:
          pending();
          break;
        case 4001:
          cancelled();
          break;
      }
    });
  }

  // Switching of network by button
  const switchNetwork = async (chainId) => {
    if (connectedProvider !== "WC"){
      providerInstanceRef.current.eth.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId}]
      }).catch((err) => {
        switch (err.code) {
          case 4902:
              addFuseNetwork(chainId);
              break;
          case -32002:
              pending();
              break;
          case 4001:
              cancelled();
              break;
        }
      });
    }  
  }

  // Where to get the abi for the new contract?
  const getReputation = async(chainId) => {
    const claim = claimReputation("abiHere", props.proofData, 
                                  connectedProvider, 
                                  chainId.chainId);
  }

  const handleClose = () => {
    onClose();
  }

  const success = (res, providerName) => {
    // for wallet connect, don't show switch network buttons
    setConnectedChain(res.connectedChain);
    setChainId(res.chainId);
    setConnectedAddress(res.connectedAddress);
    setConnectedProvider(providerName);  
    setQuery('success');  
  }
  
  const wrongNetwork = (res, providerName) => {
    // When wallet is already connect
    if (query !== 'success') {
      success(res, providerName);
    };
    setError('Sorry, you seem to be connected to an unsupported network');
    setConnectedChain('unsupported');
    setQuery('wrong-network');
    setChainId('0x00');
  }

  const pending = () => {
    setError('There is already an pending confirmation in your MetaMask.');
    setQuery('pending');
    setTimeout(() => {
        setError(null);
        setQuery('idle');
    }, 2500);
  }

  const cancelled = () => {
    setQuery('cancelled');
    setError('You cancelled the connection/confirmation, try again!');
    setTimeout(() => {
        setError(null);
        setQuery('idle');
    }, 2500);
  }

  const disconnect = () => {
    setConnectedAddress(null);
    setConnectedProvider(null);
    setConnectedChain(null);
    setProviderInstance(null);
    setChainId(null);
    setError("you have disconnected from the dapp");
    setQuery("cancelled");
    setTimeout(() => {
      setError(null);
      setQuery('idle');
    }, 2500);
  }

  return (
    <Dialog onClose={handleClose} open={open}>
    <DialogContent 
      className="dialogContentContainer" 
      sx={{
        width: "500px",
        height: "max-content",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
      <DialogTitle>You have {gRep} GOOD Tokens to claim!</DialogTitle>
        <Typography variant="span"> 
          Connect your wallet below. 
          Make sure to connect with your eligible address which is:
        </Typography>
        <Typography variant="span" sx={{fontWeight: "bold", fontStyle: "italic"}}>
          {claimAddress}
        </Typography>
          { !connectedAddress ?
            query === 'loading-connect' ? 
              <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> 
            :   
              queryConnectionErrors.indexOf(query) !== -1 ?
                <ErrorSpan message={errorMessage} />
              :
              <Box sx={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <SwitchAndConnectButton
                  fullWidth
                  variant="contained"
                  sx={{
                      backgroundImage: `url('/metamask.svg')`, 
                      marginRight: "40px"
                  }}
                  onClick={() => connectForClaim("MM")}></SwitchAndConnectButton>
                <SwitchAndConnectButton
                  fullWidth
                  variant="contained"
                  sx={{
                      backgroundImage: `url('/walletconnect.svg')`, 
                  }}
                  onClick={() => connectForClaim("WC")}></SwitchAndConnectButton>
              </Box>
              : // First Connect, then >>
                queryConnectionErrors.indexOf(query) !== -1 ?
                  <ErrorSpan message={errorMessage} />
                :
              <div>
                <div>You are currently connected with address:</div>
                <Typography variant="span" sx={{fontStyle: "italic", fontWeight: "bold"}}>
                  {connectedAddress}
                </Typography>
                <div>----------------------</div>
                <div>On network: 
                <Typography variant="span" 
                            style={{fontWeight: "bold"}}>
                    {connectedChain}            
                </Typography>
                </div>
                <Box>   
                  <Typography variant="span">
                    Make sure you are connected to the network for which 
                    you want to claim (Blue): 
                  </Typography>
                  <br />                         
                  <SwitchAndConnectButton
                    fullWidth
                    variant="contained"
                    className={`${chainId == 1 ? "chain-connected" : ""}`}
                    sx={{
                      mt: 3,
                      mb: 2,
                      backgroundImage: `url('/ethereum.svg')`,
                    }}
                    onClick={() => switchNetwork("0x1")}></SwitchAndConnectButton>

                  {connectedProvider === "WC" ? null :
                  <SwitchAndConnectButton
                    fullWidth
                    variant="contained"
                    className={`${chainId == 122 ? "chain-connected" : ""}`}
                    sx={{
                      mt: 3,
                      mb: 2,
                      backgroundImage: `url('/fuse.svg')`
                    }}
                    onClick={() => switchNetwork("0x7a")}></SwitchAndConnectButton>
                  }
                </Box>
                {
                  query === 'wrong-network' ? 
                    <ErrorSpan message={errorMessage} />
                  :
                  <Box>
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{
                        mt: 3, 
                        mb: 2, 
                        backgroundColor: "#00C3AE", 
                          '&:hover': {
                            backgroundColor: "#049484"
                      }}}
                      onClick={() => getReputation({chainId})}>
                        Claim your tokens
                    </Button>
                </Box>
                }
              </div>
          }
      </DialogContent>
    </Dialog>
  )
}